/**
 * ACLContext — Frontend Access Control Layer
 * Single source of truth for permission checking on the frontend.
 * Consumes the backend ACL matrix (roles × resources × actions)
 * and provides institute-aware permission checks.
 *
 * Replaces 25+ inline `(user?.roles || []).includes('admin')` checks.
 *
 * Usage:
 *   const { can } = usePermission();
 *   if (can('funding', 'create')) { ... }
 *
 *   <CanAccess resource="crm" action="delete" fallback={<NoPermission />}>
 *     <DeleteButton />
 *   </CanAccess>
 *
 * Implements RNF-02: Security with RBAC enforcement
 */
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ACLAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'approve' | 'assign';

export type ACLResource =
  | 'funding'
  | 'portfolio'
  | 'crm'
  | 'opportunities'
  | 'proposals'
  | 'proposal_templates'
  | 'matching'
  | 'reports'
  | 'analytics'
  | 'settings'
  | 'translations'
  | 'acl'
  | 'users'
  | 'institutes'
  | 'teams'
  | 'infrastructure'
  | 'communications'
  | 'ingestion'
  | 'pii';

/** Permission matrix: resource → set of allowed actions */
export type PermissionMatrix = Record<string, Set<ACLAction>>;

interface ACLContextType {
  /** Check if user has permission for a resource+action */
  can: (resource: string, action: ACLAction) => boolean;
  /** Check if user has ANY of the given actions on a resource */
  canAny: (resource: string, actions: ACLAction[]) => boolean;
  /** Check if user has ALL of the given actions on a resource */
  canAll: (resource: string, actions: ACLAction[]) => boolean;
  /** Whether permissions have been loaded */
  isLoaded: boolean;
  /** Whether user is a system admin */
  isAdmin: boolean;
  /** User's system roles */
  roles: string[];
  /** Reload permissions (e.g., after institute change) */
  reload: () => Promise<void>;
}

// ─── Fallback ACL (matches backend acl.json) ────────────────────────────────

const FALLBACK_ACL: Record<string, Record<string, ACLAction[]>> = {
  admin: {
    '*': ['create', 'read', 'update', 'delete', 'export', 'approve', 'assign'],
  },
  manager: {
    funding: ['create', 'read', 'update', 'delete', 'export'],
    portfolio: ['create', 'read', 'update', 'delete', 'export'],
    crm: ['create', 'read', 'update', 'delete', 'export'],
    opportunities: ['create', 'read', 'update', 'delete', 'export'],
    proposals: ['create', 'read', 'update', 'delete', 'export'],
    matching: ['read'],
    reports: ['read', 'export'],
    analytics: ['read'],
    settings: ['read'],
    translations: ['read'],
    acl: ['read'],
    users: ['read', 'update'],
    institutes: ['read', 'update'],
    teams: ['create', 'read', 'update', 'delete'],
    infrastructure: ['create', 'read', 'update', 'delete'],
    communications: ['create', 'read', 'update', 'delete'],
    ingestion: ['create', 'read'],
    pii: ['read'],
  },
  analyst: {
    funding: ['read'],
    portfolio: ['read'],
    crm: ['read'],
    opportunities: ['read'],
    proposals: ['create', 'read', 'update'],
    matching: ['read'],
    reports: ['create', 'read', 'update'],
    analytics: ['read'],
    settings: ['read'],
    translations: ['read'],
    institutes: ['read'],
    teams: ['read'],
    infrastructure: ['read'],
    communications: ['read'],
    ingestion: ['read'],
    pii: ['read'],
  },
  viewer: {
    funding: ['read'],
    portfolio: ['read'],
    crm: ['read'],
    opportunities: ['read'],
    proposals: ['read'],
    matching: ['read'],
    reports: ['read'],
    analytics: ['read'],
    institutes: ['read'],
    teams: ['read'],
    infrastructure: ['read'],
    communications: ['read'],
  },
};

// ─── Context ─────────────────────────────────────────────────────────────────

const ACLContext = createContext<ACLContextType | null>(null);

export function usePermission(): ACLContextType {
  const ctx = useContext(ACLContext);
  if (!ctx) {
    throw new Error('usePermission must be used within an ACLProvider');
  }
  return ctx;
}

// ─── Helper: Build matrix from roles ─────────────────────────────────────────

function buildMatrixFromRoles(roles: string[]): PermissionMatrix {
  const matrix: PermissionMatrix = {};

  for (const role of roles) {
    const rolePerms = FALLBACK_ACL[role];
    if (!rolePerms) continue;

    for (const [resource, actions] of Object.entries(rolePerms)) {
      if (resource === '*') {
        // Admin wildcard — will be handled by isAdmin flag
        continue;
      }
      if (!matrix[resource]) {
        matrix[resource] = new Set();
      }
      for (const action of actions) {
        matrix[resource].add(action);
      }
    }
  }

  return matrix;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ACLProvider({ children }: { children: ReactNode }) {
  const auth = useContext(
    React.createContext<ReturnType<typeof useAuth> | null>(null)
  );

  // Safe access to auth — may be null during initial render
  const [permissions, setPermissions] = useState<PermissionMatrix>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  // Try to use AuthContext directly
  let user: { roles: string[]; id?: string } | null = null;
  let selectedInstitutes: string[] = [];
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const authCtx = useAuth();
    user = authCtx.user ? { roles: authCtx.user.roles, id: authCtx.user.id } : null;
    selectedInstitutes = authCtx.selectedInstitutes;
  } catch {
    // AuthContext not available — use empty defaults
  }

  const isAdmin = useMemo(
    () => userRoles.includes('admin'),
    [userRoles]
  );

  const loadPermissions = useCallback(async () => {
    const roles = user?.roles ?? [];
    setUserRoles(roles);

    // Try to load from backend API
    try {
      const params: Record<string, string> = {};
      if (selectedInstitutes.length > 0) {
        params.instituteIds = selectedInstitutes.join(',');
      }
      const response = await apiClient.get('/api/v1/acl/my-permissions', params);

      if (response && typeof response === 'object' && response.permissions) {
        const matrix: PermissionMatrix = {};
        for (const [resource, actions] of Object.entries(response.permissions)) {
          matrix[resource] = new Set(actions as ACLAction[]);
        }
        setPermissions(matrix);
        setIsLoaded(true);
        return;
      }
    } catch {
      // API not available — fall back to local ACL matrix
    }

    // Fallback: build from roles + local ACL config
    const matrix = buildMatrixFromRoles(roles);
    setPermissions(matrix);
    setIsLoaded(true);
  }, [user?.roles, selectedInstitutes]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const can = useCallback(
    (resource: string, action: ACLAction): boolean => {
      if (isAdmin) return true;
      const resourcePerms = permissions[resource];
      if (!resourcePerms) return false;
      return resourcePerms.has(action);
    },
    [isAdmin, permissions]
  );

  const canAny = useCallback(
    (resource: string, actions: ACLAction[]): boolean => {
      return actions.some((action) => can(resource, action));
    },
    [can]
  );

  const canAll = useCallback(
    (resource: string, actions: ACLAction[]): boolean => {
      return actions.every((action) => can(resource, action));
    },
    [can]
  );

  const contextValue = useMemo<ACLContextType>(
    () => ({
      can,
      canAny,
      canAll,
      isLoaded,
      isAdmin,
      roles: userRoles,
      reload: loadPermissions,
    }),
    [can, canAny, canAll, isLoaded, isAdmin, userRoles, loadPermissions]
  );

  return (
    <ACLContext.Provider value={contextValue}>
      {children}
    </ACLContext.Provider>
  );
}

// ─── CanAccess Component ─────────────────────────────────────────────────────

interface CanAccessProps {
  /** ACL resource name */
  resource: string;
  /** Required action */
  action: ACLAction;
  /** Content to render when access is denied */
  fallback?: ReactNode;
  /** Children to render when access is granted */
  children: ReactNode;
}

/**
 * Declarative access control wrapper.
 * Renders children only if user has the required permission.
 */
export function CanAccess({ resource, action, fallback = null, children }: CanAccessProps) {
  const { can, isLoaded } = usePermission();

  // Don't render anything until permissions are loaded
  if (!isLoaded) return null;

  if (!can(resource, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ─── NoPermission Component ─────────────────────────────────────────────────

/**
 * Standard "no permission" fallback UI.
 * Used as default fallback for CanAccess components.
 */
export function NoPermission({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8 text-gray-400 dark:text-gray-500">
      <div className="text-center">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        <p className="text-sm">{message || 'You do not have permission to access this resource.'}</p>
      </div>
    </div>
  );
}

export default ACLProvider;
