from pydantic import BaseModel, ConfigDict

from models.enums import Role


class RolePermissionCreate(BaseModel):
    role: Role
    permission_id: int


class RolePermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: Role
    permission_id: int
