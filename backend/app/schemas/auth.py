from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserOut"

class LoginResponse(BaseModel):
    mfa_required: bool = False
    mfa_setup: bool = False
    temp_token: Optional[str] = None
    secret: Optional[str] = None
    qr_code_base64: Optional[str] = None
    provisioning_uri: Optional[str] = None
    message: Optional[str] = None
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    expires_in: Optional[int] = None
    user: Optional["UserOut"] = None

class Verify2FARequest(BaseModel):
    temp_token: str
    code: str = Field(..., min_length=6, max_length=6)

class UserRoleOut(BaseModel):
    id: int
    name: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    is_superuser: bool
    mfa_enabled: bool = False
    branch_id: Optional[int] = None
    branch_name: Optional[str] = "Main Store"
    department_id: Optional[int] = None
    roles: List[str] = []
    effective_permissions: List[str] = []

    model_config = ConfigDict(from_attributes=True)

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(..., min_length=8)
    branch_id: Optional[int] = None
    department_id: Optional[int] = None
    organization_id: Optional[int] = None
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

class StoreRegisterRequest(BaseModel):
    store_name: str = Field(..., min_length=2, max_length=150)
    owner_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    business_type: str = "general"
    address: Optional[str] = None
    city: Optional[str] = "Hyderabad"
