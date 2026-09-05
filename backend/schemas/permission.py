from pydantic import BaseModel, ConfigDict

from models.enums import Action


class PermissionCreate(BaseModel):
    module: str
    action: Action


class PermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    module: str
    action: Action
