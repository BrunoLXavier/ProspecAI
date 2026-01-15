# ACL (Access Control List) Service
# Service Layer - Resource-based Access Control Management
# Implements RF-05 (resource-based ACL with granular permissions)

import json
import os
from typing import Any, Dict, List, Optional
from pathlib import Path
from uuid import UUID, uuid4
from datetime import datetime
import logging
from pydantic import BaseModel
from enum import Enum

logger = logging.getLogger(__name__)


class Permission(str, Enum):
    """Available permissions for resources."""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    EXPORT = "export"
    APPROVE = "approve"
    ASSIGN = "assign"


class ResourceType(str, Enum):
    """Resource types for ACL."""
    FUNDING = "funding"
    PORTFOLIO = "portfolio"
    CRM = "crm"
    OPPORTUNITIES = "opportunities"
    PROPOSALS = "proposals"
    MATCHING = "matching"
    REPORTS = "reports"
    ANALYTICS = "analytics"
    SETTINGS = "settings"
    TRANSLATIONS = "translations"
    ACL = "acl"
    USERS = "users"


class Role(BaseModel):
    """Role with assigned permissions for resources."""
    id: str
    name: str
    description: str
    permissions: Dict[str, List[str]]  # resource_type -> list of permissions
    is_system: bool = False  # System roles cannot be deleted
    created_at: str
    updated_at: str


class RoleCreate(BaseModel):
    """Request to create a new role."""
    name: str
    description: str
    permissions: Dict[str, List[str]]


class RoleUpdate(BaseModel):
    """Request to update a role."""
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[Dict[str, List[str]]] = None


class UserRole(BaseModel):
    """Association between user and role."""
    user_id: str
    role_ids: List[str]


# Default system roles
DEFAULT_ROLES: List[Dict[str, Any]] = [
    {
        "id": "admin",
        "name": "Administrator",
        "description": "Full access to all resources",
        "permissions": {rt.value: [p.value for p in Permission] for rt in ResourceType},
        "is_system": True,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    },
    {
        "id": "manager",
        "name": "Manager",
        "description": "Can manage most resources except system settings",
        "permissions": {
            "funding": ["create", "read", "update", "delete", "export"],
            "portfolio": ["create", "read", "update", "delete", "export"],
            "crm": ["create", "read", "update", "delete", "export"],
            "opportunities": ["create", "read", "update", "delete", "export", "approve"],
            "proposals": ["create", "read", "update", "delete", "export", "approve"],
            "matching": ["read", "export"],
            "reports": ["create", "read", "export"],
            "analytics": ["read", "export"],
            "settings": ["read"],
            "translations": ["read"],
            "acl": ["read"],
            "users": ["read"]
        },
        "is_system": True,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    },
    {
        "id": "analyst",
        "name": "Analyst",
        "description": "Can view and analyze data, create reports",
        "permissions": {
            "funding": ["read"],
            "portfolio": ["read"],
            "crm": ["read"],
            "opportunities": ["read", "update"],
            "proposals": ["create", "read", "update"],
            "matching": ["read"],
            "reports": ["create", "read", "export"],
            "analytics": ["read", "export"],
            "settings": ["read"],
            "translations": [],
            "acl": [],
            "users": []
        },
        "is_system": True,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    },
    {
        "id": "viewer",
        "name": "Viewer",
        "description": "Read-only access to most resources",
        "permissions": {
            "funding": ["read"],
            "portfolio": ["read"],
            "crm": ["read"],
            "opportunities": ["read"],
            "proposals": ["read"],
            "matching": ["read"],
            "reports": ["read"],
            "analytics": ["read"],
            "settings": ["read"],
            "translations": [],
            "acl": [],
            "users": []
        },
        "is_system": True,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
]


# Path to ACL configuration file
ACL_CONFIG_DIR = Path(__file__).parent.parent / "config"
ACL_CONFIG_FILE = ACL_CONFIG_DIR / "acl.json"


class ACLService:
    """Service for managing Access Control Lists."""
    
    def __init__(self, config_file: Optional[Path] = None):
        self.config_file = config_file or ACL_CONFIG_FILE
        self._ensure_config_exists()
    
    def _ensure_config_exists(self):
        """Ensure the ACL config file exists with defaults."""
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        
        if not self.config_file.exists():
            self._save_config({
                "roles": DEFAULT_ROLES,
                "user_roles": []
            })
    
    def _load_config(self) -> Dict[str, Any]:
        """Load the ACL configuration."""
        with open(self.config_file, "r", encoding="utf-8") as f:
            return json.load(f)
    
    def _save_config(self, config: Dict[str, Any]) -> None:
        """Save the ACL configuration."""
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
    
    # Role Management
    def list_roles(self) -> List[Role]:
        """List all roles."""
        config = self._load_config()
        return [Role(**r) for r in config.get("roles", [])]
    
    def get_role(self, role_id: str) -> Optional[Role]:
        """Get a role by ID."""
        config = self._load_config()
        for role in config.get("roles", []):
            if role["id"] == role_id:
                return Role(**role)
        return None
    
    def create_role(self, data: RoleCreate) -> Role:
        """Create a new role."""
        config = self._load_config()
        
        # Check for duplicate name
        for role in config.get("roles", []):
            if role["name"].lower() == data.name.lower():
                raise ValueError(f"Role with name '{data.name}' already exists")
        
        now = datetime.utcnow().isoformat() + "Z"
        role_id = str(uuid4())[:8]
        
        new_role = {
            "id": role_id,
            "name": data.name,
            "description": data.description,
            "permissions": data.permissions,
            "is_system": False,
            "created_at": now,
            "updated_at": now
        }
        
        config.setdefault("roles", []).append(new_role)
        self._save_config(config)
        
        return Role(**new_role)
    
    def update_role(self, role_id: str, data: RoleUpdate) -> Optional[Role]:
        """Update a role."""
        config = self._load_config()
        
        for i, role in enumerate(config.get("roles", [])):
            if role["id"] == role_id:
                if role.get("is_system") and data.name is not None:
                    raise ValueError("Cannot rename system roles")
                
                if data.name is not None:
                    role["name"] = data.name
                if data.description is not None:
                    role["description"] = data.description
                if data.permissions is not None:
                    role["permissions"] = data.permissions
                
                role["updated_at"] = datetime.utcnow().isoformat() + "Z"
                
                config["roles"][i] = role
                self._save_config(config)
                
                return Role(**role)
        
        return None
    
    def delete_role(self, role_id: str) -> bool:
        """Delete a role."""
        config = self._load_config()
        
        for i, role in enumerate(config.get("roles", [])):
            if role["id"] == role_id:
                if role.get("is_system"):
                    raise ValueError("Cannot delete system roles")
                
                config["roles"].pop(i)
                
                # Remove role from user assignments
                config["user_roles"] = [
                    ur for ur in config.get("user_roles", [])
                    if role_id not in ur.get("role_ids", [])
                ]
                
                self._save_config(config)
                return True
        
        return False
    
    # User Role Management
    def get_user_roles(self, user_id: str) -> List[Role]:
        """Get all roles for a user."""
        config = self._load_config()
        
        user_role = None
        for ur in config.get("user_roles", []):
            if ur["user_id"] == user_id:
                user_role = ur
                break
        
        if not user_role:
            return []
        
        roles = []
        for role in config.get("roles", []):
            if role["id"] in user_role.get("role_ids", []):
                roles.append(Role(**role))
        
        return roles
    
    def assign_role_to_user(self, user_id: str, role_id: str) -> bool:
        """Assign a role to a user."""
        config = self._load_config()
        
        # Verify role exists
        role_exists = any(r["id"] == role_id for r in config.get("roles", []))
        if not role_exists:
            raise ValueError(f"Role '{role_id}' does not exist")
        
        # Find or create user roles entry
        user_role = None
        for ur in config.get("user_roles", []):
            if ur["user_id"] == user_id:
                user_role = ur
                break
        
        if user_role:
            if role_id not in user_role["role_ids"]:
                user_role["role_ids"].append(role_id)
        else:
            config.setdefault("user_roles", []).append({
                "user_id": user_id,
                "role_ids": [role_id]
            })
        
        self._save_config(config)
        return True
    
    def remove_role_from_user(self, user_id: str, role_id: str) -> bool:
        """Remove a role from a user."""
        config = self._load_config()
        
        for ur in config.get("user_roles", []):
            if ur["user_id"] == user_id:
                if role_id in ur["role_ids"]:
                    ur["role_ids"].remove(role_id)
                    self._save_config(config)
                    return True
        
        return False
    
    def check_permission(self, user_id: str, resource: str, permission: str) -> bool:
        """Check if a user has a specific permission for a resource."""
        roles = self.get_user_roles(user_id)
        
        for role in roles:
            resource_permissions = role.permissions.get(resource, [])
            if permission in resource_permissions:
                return True
        
        return False
    
    def get_user_permissions(self, user_id: str) -> Dict[str, List[str]]:
        """Get all permissions for a user across all resources."""
        roles = self.get_user_roles(user_id)
        
        merged_permissions: Dict[str, set] = {}
        for role in roles:
            for resource, perms in role.permissions.items():
                if resource not in merged_permissions:
                    merged_permissions[resource] = set()
                merged_permissions[resource].update(perms)
        
        return {k: list(v) for k, v in merged_permissions.items()}
    
    def get_resources(self) -> List[str]:
        """Get list of all resource types."""
        return [rt.value for rt in ResourceType]
    
    def get_permissions(self) -> List[str]:
        """Get list of all permission types."""
        return [p.value for p in Permission]


# Singleton instance
acl_service = ACLService()
