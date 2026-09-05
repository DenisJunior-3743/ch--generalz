from pydantic import BaseModel, EmailStr

from models.enums import Role
from schemas.permission import PermissionOut


class LoginRequest(BaseModel):
    username: str  # a student's reg_number, a staff member's email, or an admin's username
    password: str


class RegisterStudentRequest(BaseModel):
    reg_number: str
    password: str


class RegisterStaffRequest(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    last_name: str | None
    photo_url: str | None


class MeOut(BaseModel):
    id: int
    username: str
    role: Role
    staff_id: int | None
    student_reg_number: str | None
    last_name: str | None
    photo_url: str | None
    permissions: list[PermissionOut]
