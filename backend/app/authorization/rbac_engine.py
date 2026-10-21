from datetime import datetime, timezone
from typing import Set, List, Tuple
from fastapi import HTTPException, status, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.auth import User, Role, RolePermission, Permission, UserRole
from app.models.elevation import AccessRequest

async def get_user_effective_roles_and_permissions(user: User, db: AsyncSession) -> Tuple[List[str], Set[str]]:
    """
    Computes both effective roles and permissions for a user, dynamically incorporating
    active Just-In-Time role elevations within their validity window.
    """
    if user.is_superuser:
        perm_res = await db.execute(select(Permission.code))
        all_perms = set(perm_res.scalars().all())
        role_res = await db.execute(select(Role.name))
        all_roles = list(role_res.scalars().all())
        return all_roles, all_perms

    now = datetime.now(timezone.utc)
    effective_permissions: Set[str] = set()
    role_names: List[str] = [ur.role.name for ur in (user.roles or []) if ur.role]

    # 1. Base roles permissions
    stmt = (
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .where(UserRole.user_id == user.id)
    )
    res = await db.execute(stmt)
    effective_permissions.update(res.scalars().all())

    # 2. Dynamic Just-In-Time role elevation grants
    elev_stmt = (
        select(AccessRequest)
        .options(selectinload(AccessRequest.requested_role))
        .where(
            AccessRequest.user_id == user.id,
            AccessRequest.status == "APPROVED"
        )
    )
    elev_res = await db.execute(elev_stmt)
    all_elevations: List[AccessRequest] = elev_res.scalars().all()

    for grant in all_elevations:
        v_from = grant.valid_from
        v_until = grant.valid_until
        if v_from and v_from.tzinfo is None:
            v_from = v_from.replace(tzinfo=timezone.utc)
        if v_until and v_until.tzinfo is None:
            v_until = v_until.replace(tzinfo=timezone.utc)

        if v_until and now > v_until:
            grant.status = "EXPIRED"
            continue

        if v_from and v_until and (v_from <= now <= v_until):
            if grant.requested_role:
                if grant.requested_role.name not in role_names:
                    role_names.append(grant.requested_role.name)
            if grant.requested_permission_code:
                effective_permissions.add(grant.requested_permission_code)
            if grant.requested_role_id:
                role_perm_stmt = (
                    select(Permission.code)
                    .join(RolePermission, RolePermission.permission_id == Permission.id)
                    .where(RolePermission.role_id == grant.requested_role_id)
                )
                rp_res = await db.execute(role_perm_stmt)
                effective_permissions.update(rp_res.scalars().all())

    return role_names, effective_permissions

async def get_user_effective_permissions(user: User, db: AsyncSession) -> Set[str]:
    """
    Computes all active permissions for a user:
    1. Base permissions from user's assigned roles
    2. Active Just-In-Time role elevations (approved and within valid time window)
    """
    _, perms = await get_user_effective_roles_and_permissions(user, db)
    return perms
