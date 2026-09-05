from pydantic import BaseModel, ConfigDict, EmailStr

from models.enums import Gender


class StudentCreate(BaseModel):
    reg_number: str
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    gender: Gender
    faculty_id: int
    program_id: int
    intake_year: int


class StudentReplace(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    gender: Gender
    faculty_id: int
    program_id: int
    intake_year: int


class StudentUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone_number: str | None = None
    gender: Gender | None = None
    faculty_id: int | None = None
    program_id: int | None = None
    intake_year: int | None = None


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    reg_number: str
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    gender: Gender
    faculty_id: int
    program_id: int
    intake_year: int


class StudentPage(BaseModel):
    items: list[StudentOut]
    total: int
    page: int
    page_size: int
