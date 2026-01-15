# ACL Routes
# Adapters Layer - REST API for Access Control List Management
# Implements RF-05 (resource-based ACL with granular permissions)

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.acl_service import (
    acl_service,
    Role,
    RoleCreate,
    RoleUpdate,
    Permission,
    ResourceType
)

router = APIRouter(prefix="/api/v1/acl", tags=["acl"])


class RolesListResponse(BaseModel):
    """Response for listing roles."""
    roles: List[Role]
    total: int
    resources: List[str]
    permissions: List[str]


class UserPermissionsResponse(BaseModel):
    """Response for user permissions."""
    user_id: str
    roles: List[Role]
    permissions: Dict[str, List[str]]


class AssignRoleRequest(BaseModel):
    """Request to assign a role to a user."""
    user_id: str
    role_id: str


class CheckPermissionRequest(BaseModel):
    """Request to check a permission."""
    user_id: str
    resource: str
    permission: str


class CheckPermissionResponse(BaseModel):
    """Response for permission check."""
    allowed: bool
    user_id: str
    resource: str
    permission: str


@router.get("/roles", response_model=RolesListResponse)
async def list_roles():
    """List all roles."""
    roles = acl_service.list_roles()
    return RolesListResponse(
        roles=roles,
        total=len(roles),
        resources=acl_service.get_resources(),
        permissions=acl_service.get_permissions()
    )


@router.get("/roles/{role_id}", response_model=Role)
async def get_role(role_id: str):
    """Get a role by ID."""
    role = acl_service.get_role(role_id)
    if not role:
        raise HTTPException(status_code=404, detail=f"Role not found: {role_id}")
    return role


@router.post("/roles", response_model=Role, status_code=201)
async def create_role(data: RoleCreate):
    """Create a new role."""
    try:
        return acl_service.create_role(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/roles/{role_id}", response_model=Role)
async def update_role(role_id: str, data: RoleUpdate):
    """Update a role."""
    try:
        role = acl_service.update_role(role_id, data)
        if not role:
            raise HTTPException(status_code=404, detail=f"Role not found: {role_id}")
        return role
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/roles/{role_id}", status_code=204)
async def delete_role(role_id: str):
    """Delete a role."""
    try:
        deleted = acl_service.delete_role(role_id)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Role not found: {role_id}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users/{user_id}/permissions", response_model=UserPermissionsResponse)
async def get_user_permissions(user_id: str):
    """Get all permissions for a user."""
    roles = acl_service.get_user_roles(user_id)
    permissions = acl_service.get_user_permissions(user_id)
    
    return UserPermissionsResponse(
        user_id=user_id,
        roles=roles,
        permissions=permissions
    )


@router.post("/users/assign-role", status_code=200)
async def assign_role_to_user(data: AssignRoleRequest):
    """Assign a role to a user."""
    try:
        acl_service.assign_role_to_user(data.user_id, data.role_id)
        return {"message": f"Role '{data.role_id}' assigned to user '{data.user_id}'"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/users/remove-role", status_code=200)
async def remove_role_from_user(data: AssignRoleRequest):
    """Remove a role from a user."""
    removed = acl_service.remove_role_from_user(data.user_id, data.role_id)
    if not removed:
        raise HTTPException(status_code=404, detail="User-role assignment not found")
    return {"message": f"Role '{data.role_id}' removed from user '{data.user_id}'"}


@router.post("/check-permission", response_model=CheckPermissionResponse)
async def check_permission(data: CheckPermissionRequest):
    """Check if a user has a specific permission for a resource."""
    allowed = acl_service.check_permission(data.user_id, data.resource, data.permission)
    return CheckPermissionResponse(
        allowed=allowed,
        user_id=data.user_id,
        resource=data.resource,
        permission=data.permission
    )


@router.get("/resources", response_model=List[str])
async def list_resources():
    """List all resource types."""
    return acl_service.get_resources()


@router.get("/permissions", response_model=List[str])
async def list_permissions():
    """List all permission types."""
    return acl_service.get_permissions()
