from pydantic import BaseModel, ConfigDict, EmailStr

from models.enums import Gender


class StaffCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    gender: Gender


class StaffUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone_number: str | None = None
    gender: Gender | None = None


class StaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    gender: Gender


class StaffPage(BaseModel):
    items: list[StaffOut]
    total: int
    page: int
    page_size: int
