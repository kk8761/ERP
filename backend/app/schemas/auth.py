from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserOut"

class UserRoleOut(BaseModel):
    id: int
    name: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    is_superuser: bool
    branch_id: Optional[int] = None
    branch_name: Optional[str] = "Main Store"
    department_id: Optional[int] = None
    roles: List[str] = []
    effective_permissions: List[str] = []

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(..., min_length=8)
    branch_id: Optional[int] = None
    department_id: Optional[int] = None
    role_ids: List[int] = []

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    branch_id: Optional[int] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None
    role_ids: Optional[List[int]] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
