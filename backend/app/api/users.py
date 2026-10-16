from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.auth.security import hash_password
from app.models.auth import User, Role, Permission, UserRole, RolePermission
from app.models.org import Branch
from app.schemas.auth import UserOut, UserCreate, UserUpdate
from app.schemas.rbac import RoleOut, RoleCreate, PermissionOut
from app.authorization.rbac_engine import get_user_effective_permissions
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/api/admin", tags=["Administration"])

@router.get("/users", response_model=List[UserOut])
async def list_users(
    current_user: User = Depends(require_permission("users.view")),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(User)
        .options(selectinload(User.roles).selectinload(UserRole.role))
        .order_by(User.full_name.asc())
    )
    res = await db.execute(stmt)
    users = res.scalars().all()

    out = []
    for u in users:
        role_names = [ur.role.name for ur in u.roles if ur.role]
        effective_perms = await get_user_effective_permissions(u, db)
        out.append(UserOut(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            is_active=u.is_active,
            is_superuser=u.is_superuser,
            branch_id=u.branch_id,
            branch_name="Main Store",
            department_id=u.department_id,
            roles=role_names,
            effective_permissions=list(effective_perms)
        ))
    return out

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    current_user: User = Depends(require_permission("users.manage")),
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this email already exists")

    hashed_pw = hash_password(data.password)
    user = User(
        email=data.email,
        full_name=data.full_name,
        password_hash=hashed_pw,
        branch_id=data.branch_id,
        department_id=data.department_id,
        is_active=True
    )
    db.add(user)
    await db.flush()

    if data.role_ids:
        for r_id in data.role_ids:
            db.add(UserRole(user_id=user.id, role_id=r_id))

    await record_audit_log(
        db, action="USER_CREATED", entity_name="User",
        entity_id=str(user.id), user_id=current_user.id,
        user_email=current_user.email,
        details={"email": user.email, "roles": data.role_ids}
    )
    await db.commit()
    await db.refresh(user)

    stmt = select(User).options(selectinload(User.roles).selectinload(UserRole.role)).where(User.id == user.id)
    r_user = (await db.execute(stmt)).scalar_one()

    return UserOut(
        id=r_user.id,
        email=r_user.email,
        full_name=r_user.full_name,
        is_active=r_user.is_active,
        is_superuser=r_user.is_superuser,
        branch_id=r_user.branch_id,
        roles=[ur.role.name for ur in r_user.roles if ur.role],
        effective_permissions=list(await get_user_effective_permissions(r_user, db))
    )

@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User = Depends(require_permission("users.manage")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).options(selectinload(User.roles).selectinload(UserRole.role)).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from deactivating themselves
    if data.is_active is False and user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Administrators cannot deactivate their own account")

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.branch_id is not None:
        user.branch_id = data.branch_id
    if data.department_id is not None:
        user.department_id = data.department_id

    # Update role assignments if provided
    if data.role_ids is not None:
        await db.execute(delete(UserRole).where(UserRole.user_id == user.id))
        for r_id in data.role_ids:
            db.add(UserRole(user_id=user.id, role_id=r_id))

    await record_audit_log(
        db, action="USER_MODIFIED", entity_name="User",
        entity_id=str(user.id), user_id=current_user.id,
        user_email=current_user.email,
        details={"status_active": user.is_active, "name": user.full_name}
    )
    await db.commit()

    # Re-fetch updated user
    res = await db.execute(stmt)
    r_user = res.scalar_one()

    return UserOut(
        id=r_user.id,
        email=r_user.email,
        full_name=r_user.full_name,
        is_active=r_user.is_active,
        is_superuser=r_user.is_superuser,
        branch_id=r_user.branch_id,
        roles=[ur.role.name for ur in r_user.roles if ur.role],
        effective_permissions=list(await get_user_effective_permissions(r_user, db))
    )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_permission("users.manage")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    # Remove user roles first
    await db.execute(delete(UserRole).where(UserRole.user_id == user.id))
    await db.delete(user)

    await record_audit_log(
        db, action="USER_DELETED", entity_name="User",
        entity_id=str(user_id), user_id=current_user.id,
        user_email=current_user.email,
        details={"deleted_email": user.email}
    )
    await db.commit()

    return {"success": True, "message": f"User {user.email} removed successfully"}

@router.get("/roles", response_model=List[RoleOut])
async def list_roles(
    current_user: User = Depends(require_permission("roles.manage")),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Role)
        .options(selectinload(Role.permissions).selectinload(RolePermission.permission))
        .order_by(Role.name.asc())
    )
    res = await db.execute(stmt)
    roles = res.scalars().all()

    return [
        RoleOut(
            id=r.id,
            name=r.name,
            description=r.description,
            is_system_role=r.is_system_role,
            permissions=[rp.permission.code for rp in r.permissions if rp.permission]
        )
        for r in roles
    ]

@router.get("/permissions", response_model=List[PermissionOut])
async def list_permissions(
    current_user: User = Depends(require_permission("roles.manage")),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Permission).order_by(Permission.module.asc(), Permission.code.asc()))
    return res.scalars().all()
