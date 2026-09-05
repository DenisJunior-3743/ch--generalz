from pydantic import BaseModel, ConfigDict, model_validator

from models.enums import Role


class UserCreate(BaseModel):
    password: str
    role: Role
    username: str | None = None
    staff_id: int | None = None
    student_reg_number: str | None = None

    @model_validator(mode="after")
    def check_reference(self):
        if self.role == Role.ADMIN:
            if self.staff_id is not None or self.student_reg_number is not None:
                raise ValueError("an admin account must not reference a staff or student record")
            if not self.username:
                raise ValueError("username is required when role is 'admin'")
        if self.role == Role.STAFF:
            if self.staff_id is None:
                raise ValueError("staff_id is required when role is 'staff'")
            if self.student_reg_number is not None:
                raise ValueError("a staff account must not reference a student record")
            if self.username is not None:
                raise ValueError("username must not be set for a staff account — it's derived automatically from the staff member's email")
        if self.role == Role.STUDENT:
            if self.student_reg_number is None:
                raise ValueError("student_reg_number is required when role is 'student'")
            if self.staff_id is not None:
                raise ValueError("a student account must not reference a staff record")
            if self.username is not None:
                raise ValueError("username must not be set for a student account — it's derived automatically from the student's registration number")
        return self


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: Role
    staff_id: int | None
    student_reg_number: str | None
