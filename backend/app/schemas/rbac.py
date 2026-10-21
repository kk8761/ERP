from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class PermissionOut(BaseModel):
    id: int
    code: str
    module: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_system_role: bool
    permissions: List[str] = []

    model_config = ConfigDict(from_attributes=True)

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permission_codes: List[str] = []

class RoleUpdate(BaseModel):
    description: Optional[str] = None
    permission_codes: Optional[List[str]] = None
