// useStatistics Hook
// Manages statistics visibility, preferences, and calculations
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StatisticsModule,
  StatisticDefinition,
  UserStatisticsPreferences,
  ProfileStatisticsPermissions,
  StatisticItem,
  StatCategory,
  getModuleStatistics,
  STAT_CATEGORIES,
} from '@/types/statistics';

// =============================================================================
// Types
// =============================================================================

interface UseStatisticsOptions {
  module: StatisticsModule;
  data: Record<string, any>[] | null;
  customCalculators?: Record<string, (data: Record<string, any>[]) => number | string>;
}

interface UseStatisticsReturn {
  // Computed statistics with values
  statistics: StatisticItem[];
  visibleStatistics: StatisticItem[];
  
  // Configuration
  definitions: StatisticDefinition[];
  allowedDefinitions: StatisticDefinition[];
  
  // User preferences
  preferences: UserStatisticsPreferences | null;
  updatePreferences: (visibleIds: string[]) => Promise<void>;
  toggleStatistic: (statId: string) => void;
  reorderStatistics: (newOrder: string[]) => void;
  setReorderEnabled: (enabled: boolean) => void;
  
  // Profile permissions (admin only)
  permissions: ProfileStatisticsPermissions | null;
  
  // Grouping
  statisticsByCategory: Record<StatCategory, StatisticItem[]>;
  
  // Loading state
  isLoading: boolean;
  isSaving: boolean;
}

// =============================================================================
// Mock Storage (replace with API calls)
// =============================================================================

const STORAGE_KEY_PREFIX = 'prospecai_stat_prefs_';

function loadPreferences(module: StatisticsModule, userId: string): UserStatisticsPreferences | null {
  if (typeof window === 'undefined') return null;
  
  const key = `${STORAGE_KEY_PREFIX}${userId}_${module}`;
  const stored = localStorage.getItem(key);
  
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

function savePreferences(prefs: UserStatisticsPreferences): void {
  if (typeof window === 'undefined') return;
  
  const key = `${STORAGE_KEY_PREFIX}${prefs.userId}_${prefs.module}`;
  localStorage.setItem(key, JSON.stringify({
    ...prefs,
    updatedAt: new Date().toISOString(),
  }));
}

// =============================================================================
// Value Formatters
// =============================================================================

function formatStatValue(
  value: number | string,
  valueType: StatisticDefinition['valueType'],
  locale: string = 'pt-BR'
): string {
  if (typeof value === 'string') return value;
  
  switch (valueType) {
    case 'currency':
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'BRL',
        notation: value >= 1000000 ? 'compact' : 'standard',
        maximumFractionDigits: value >= 1000000 ? 1 : 0,
      }).format(value);
    
    case 'percentage':
      return `${Math.round(value * 100) / 100}%`;
    
    case 'duration':
      // Assume value is in days
      if (value < 1) return `${Math.round(value * 24)}h`;
      if (value < 30) return `${Math.round(value)}d`;
      if (value < 365) return `${Math.round(value / 30)}m`;
      return `${Math.round(value / 365)}a`;
    
    case 'number':
    default:
      return new Intl.NumberFormat(locale, {
        notation: value >= 10000 ? 'compact' : 'standard',
        maximumFractionDigits: 1,
      }).format(value);
  }
}

// =============================================================================
// Statistics Calculator
// =============================================================================

function calculateStatValue(
  definition: StatisticDefinition,
  data: Record<string, any>[],
  customCalculators?: Record<string, (data: Record<string, any>[]) => number | string>
): number | string {
  // Check for custom calculator first
  if (customCalculators?.[definition.key]) {
    return customCalculators[definition.key](data);
  }
  
  // Filter data if needed
  let filteredData = data;
  if (definition.filterField && definition.filterValue) {
    filteredData = data.filter(item => 
      item[definition.filterField!] === definition.filterValue
    );
  }
  
  // Calculate based on aggregation type
  switch (definition.aggregation) {
    case 'count':
      return filteredData.length;
    
    case 'sum':
      if (!definition.sourceField) return 0;
      return filteredData.reduce((sum, item) => 
        sum + (Number(item[definition.sourceField!]) || 0), 0
      );
    
    case 'avg':
      if (!definition.sourceField || filteredData.length === 0) return 0;
      const sum = filteredData.reduce((s, item) => 
        s + (Number(item[definition.sourceField!]) || 0), 0
      );
      return Math.round((sum / filteredData.length) * 100) / 100;
    
    case 'min':
      if (!definition.sourceField || filteredData.length === 0) return 0;
      return Math.min(...filteredData.map(item => 
        Number(item[definition.sourceField!]) || 0
      ));
    
    case 'max':
      if (!definition.sourceField || filteredData.length === 0) return 0;
      return Math.max(...filteredData.map(item => 
        Number(item[definition.sourceField!]) || 0
      ));
    
    case 'rate':
      // Needs custom implementation
      return 0;
    
    default:
      return 0;
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useStatistics({
  module,
  data,
  customCalculators,
}: UseStatisticsOptions): UseStatisticsReturn {
  // State
  const [preferences, setPreferences] = useState<UserStatisticsPreferences | null>(null);
  const [permissions, setPermissions] = useState<ProfileStatisticsPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get definitions for this module
  const definitions = useMemo(() => getModuleStatistics(module), [module]);
  
  // Mock user ID (replace with actual auth)
  const userId = 'current-user';
  
  // Load preferences on mount
  useEffect(() => {
    setIsLoading(true);
    
    // Load from storage/API
    const prefs = loadPreferences(module, userId);
    
    if (prefs) {
      setPreferences(prefs);
    } else {
      // Create default preferences from definitions
      const defaultVisible = definitions
        .filter(d => d.defaultVisible)
        .map(d => d.id);
      
      setPreferences({
        userId,
        module,
        visibleStatIds: defaultVisible,
        orderOverride: {},
        reorderEnabled: false,
        updatedAt: new Date().toISOString(),
      });
    }
    
    // TODO: Load profile permissions from API
    // For now, allow all statistics
    setPermissions({
      profileId: 'default',
      role: 'admin',
      module,
      allowedStatIds: definitions.map(d => d.id),
      requiredStatIds: [],
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    });
    
    setIsLoading(false);
  }, [module, definitions, userId]);
  
  // Filter definitions by permissions
  const allowedDefinitions = useMemo(() => {
    if (!permissions) return definitions;
    return definitions.filter(d => permissions.allowedStatIds.includes(d.id));
  }, [definitions, permissions]);
  
  // Calculate statistics
  const statistics = useMemo<StatisticItem[]>(() => {
    if (!data) return [];
    
    return definitions.map(definition => {
      const value = calculateStatValue(definition, data, customCalculators);
      const isAllowed = !permissions || permissions.allowedStatIds.includes(definition.id);
      const isVisible = preferences?.visibleStatIds.includes(definition.id) ?? definition.defaultVisible;
      
      return {
        definition,
        value,
        formattedValue: formatStatValue(value, definition.valueType),
        isVisible: isVisible && isAllowed,
        isAllowed,
      };
    });
  }, [definitions, data, customCalculators, permissions, preferences]);
  
  // Filter to only visible statistics
  const visibleStatistics = useMemo(() => {
    const visible = statistics.filter(s => s.isVisible);
    
    // Apply custom order if set
    if (preferences?.orderOverride) {
      return visible.sort((a, b) => {
        const orderA = preferences.orderOverride![a.definition.id] ?? a.definition.sortOrder;
        const orderB = preferences.orderOverride![b.definition.id] ?? b.definition.sortOrder;
        return orderA - orderB;
      });
    }
    
    return visible.sort((a, b) => a.definition.sortOrder - b.definition.sortOrder);
  }, [statistics, preferences]);
  
  // Group by category
  const statisticsByCategory = useMemo(() => {
    const grouped: Record<StatCategory, StatisticItem[]> = {
      overview: [],
      financial: [],
      performance: [],
      timeline: [],
      distribution: [],
      risk: [],
      ai: [],
    };
    
    allowedDefinitions.forEach(def => {
      const stat = statistics.find(s => s.definition.id === def.id);
      if (stat) {
        grouped[def.category].push(stat);
      }
    });
    
    // Sort within categories
    Object.keys(grouped).forEach(key => {
      grouped[key as StatCategory].sort((a, b) => 
        a.definition.sortOrder - b.definition.sortOrder
      );
    });
    
    return grouped;
  }, [allowedDefinitions, statistics]);
  
  // Update preferences
  const updatePreferences = useCallback(async (visibleIds: string[]) => {
    setIsSaving(true);
    
    const newPrefs: UserStatisticsPreferences = {
      userId,
      module,
      visibleStatIds: visibleIds,
      orderOverride: preferences?.orderOverride,
      reorderEnabled: preferences?.reorderEnabled,
      updatedAt: new Date().toISOString(),
    };
    
    // TODO: Save to API
    savePreferences(newPrefs);
    setPreferences(newPrefs);
    
    setIsSaving(false);
  }, [userId, module, preferences]);
  
  // Toggle single statistic
  const toggleStatistic = useCallback((statId: string) => {
    if (!preferences) return;
    
    const currentVisible = new Set(preferences.visibleStatIds);
    
    if (currentVisible.has(statId)) {
      // Check if it's required
      if (permissions?.requiredStatIds.includes(statId)) return;
      currentVisible.delete(statId);
    } else {
      // Check if it's allowed
      if (permissions && !permissions.allowedStatIds.includes(statId)) return;
      currentVisible.add(statId);
    }
    
    updatePreferences(Array.from(currentVisible));
  }, [preferences, permissions, updatePreferences]);
  
  // Reorder statistics
  const reorderStatistics = useCallback((newOrder: string[]) => {
    if (!preferences) return;
    
    const orderOverride: Record<string, number> = {};
    newOrder.forEach((id, index) => {
      orderOverride[id] = index;
    });
    
    const newPrefs: UserStatisticsPreferences = {
      ...preferences,
      orderOverride,
      updatedAt: new Date().toISOString(),
    };
    
    savePreferences(newPrefs);
    setPreferences(newPrefs);
  }, [preferences]);

  const setReorderEnabled = useCallback((enabled: boolean) => {
    if (!preferences) return;

    const newPrefs: UserStatisticsPreferences = {
      ...preferences,
      reorderEnabled: enabled,
      updatedAt: new Date().toISOString(),
    };

    savePreferences(newPrefs);
    setPreferences(newPrefs);
  }, [preferences]);
  
  return {
    statistics,
    visibleStatistics,
    definitions,
    allowedDefinitions,
    preferences,
    updatePreferences,
    toggleStatistic,
    reorderStatistics,
    setReorderEnabled,
    permissions,
    statisticsByCategory,
    isLoading,
    isSaving,
  };
}

// =============================================================================
// Custom Calculators for Complex Statistics
// =============================================================================

export const FUNDING_CALCULATORS: Record<string, (data: Record<string, any>[]) => number> = {
  expiring7d: (data) => {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return data.filter(f => {
      const deadline = new Date(f.submissionEnd);
      return f.status === 'open' && deadline > now && deadline <= in7Days;
    }).length;
  },
  expiring30d: (data) => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return data.filter(f => {
      const deadline = new Date(f.submissionEnd);
      return f.status === 'open' && deadline > now && deadline <= in30Days;
    }).length;
  },
  trlLow: (data) => data.filter(f => f.trlMax <= 3).length,
  trlMid: (data) => data.filter(f => f.trlMin >= 4 && f.trlMax <= 6).length,
  trlHigh: (data) => data.filter(f => f.trlMin >= 7).length,
  highConfidence: (data) => data.filter(f => (f.aiConfidenceScore || 0) >= 0.8).length,
};

export const PORTFOLIO_CALCULATORS: Record<string, (data: Record<string, any>[]) => number> = {
  activeBudget: (data) => 
    data.filter(p => p.status === 'active')
        .reduce((sum, p) => sum + (p.budget || 0), 0),
  completionRate: (data) => {
    if (data.length === 0) return 0;
    const completed = data.filter(p => p.status === 'completed').length;
    return Math.round((completed / data.length) * 100);
  },
  avgDuration: (data) => {
    const withDates = data.filter(p => p.startDate && p.endDate);
    if (withDates.length === 0) return 0;
    const totalDays = withDates.reduce((sum, p) => {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round(totalDays / withDates.length);
  },
  trlResearch: (data) => data.filter(p => p.trl <= 3).length,
  trlDevelopment: (data) => data.filter(p => p.trl >= 4 && p.trl <= 6).length,
  trlDeployment: (data) => data.filter(p => p.trl >= 7).length,
};

export const OPPORTUNITIES_CALCULATORS: Record<string, (data: Record<string, any>[]) => number> = {
  weightedValue: (data) => 
    data.reduce((sum, o) => sum + (o.estimated_value || 0) * ((o.probability || 0) / 100), 0),
  winRate: (data) => {
    const closed = data.filter(o => o.stage === 'won' || o.stage === 'lost');
    if (closed.length === 0) return 0;
    const won = closed.filter(o => o.stage === 'won').length;
    return Math.round((won / closed.length) * 100);
  },
  wonValue: (data) => 
    data.filter(o => o.stage === 'won')
        .reduce((sum, o) => sum + (o.estimated_value || 0), 0),
  closingThisMonth: (data) => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return data.filter(o => {
      const deadline = new Date(o.deadline);
      return deadline >= now && deadline <= endOfMonth;
    }).length;
  },
  overdue: (data) => {
    const now = new Date();
    return data.filter(o => {
      const deadline = new Date(o.deadline);
      return deadline < now && o.stage !== 'won' && o.stage !== 'lost';
    }).length;
  },
};

export const PROPOSALS_CALCULATORS: Record<string, (data: Record<string, any>[]) => number> = {
  approvalRate: (data) => {
    const reviewed = data.filter(p => p.status === 'approved' || p.status === 'rejected');
    if (reviewed.length === 0) return 0;
    const approved = reviewed.filter(p => p.status === 'approved').length;
    return Math.round((approved / reviewed.length) * 100);
  },
  approvedValue: (data) => 
    data.filter(p => p.status === 'approved')
        .reduce((sum, p) => sum + (p.total_value || 0), 0),
  pendingValue: (data) => 
    data.filter(p => p.status === 'in_review' || p.status === 'submitted')
        .reduce((sum, p) => sum + (p.total_value || 0), 0),
  highConfidence: (data) => data.filter(p => (p.ai_confidence || 0) >= 0.8).length,
};

export const INGESTION_CALCULATORS: Record<string, (data: Record<string, any>[]) => number> = {
  processing: (data) => 
    data.filter(j => ['validating', 'processing', 'pii_detection'].includes(j.status)).length,
  successRate: (data) => {
    const finished = data.filter(j => j.status === 'completed' || j.status === 'failed');
    if (finished.length === 0) return 0;
    const completed = finished.filter(j => j.status === 'completed').length;
    return Math.round((completed / finished.length) * 100);
  },
  piiPending: (data) => 
    data.reduce((sum, j) => sum + (j.pii_detected_count - j.pii_anonymized_count), 0),
};

export const PII_CALCULATORS: Record<string, (data: Record<string, any>[]) => number> = {
  approvalRate: (data) => {
    const reviewed = data.filter(d => d.status === 'approved' || d.status === 'rejected');
    if (reviewed.length === 0) return 0;
    const approved = reviewed.filter(d => d.status === 'approved').length;
    return Math.round((approved / reviewed.length) * 100);
  },
  anonymizationRate: (data) => {
    if (data.length === 0) return 0;
    const anonymized = data.filter(d => d.status === 'anonymized').length;
    return Math.round((anonymized / data.length) * 100);
  },
};
