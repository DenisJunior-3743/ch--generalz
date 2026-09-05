from pydantic import BaseModel, ConfigDict, Field

from models.enums import Grade


class MarkEntry(BaseModel):
    course_id: int
    score: int = Field(ge=0, le=100)
    semester_id: int


class MarksBatchCreate(BaseModel):
    marks: list[MarkEntry]


class MarkUpdate(BaseModel):
    course_id: int | None = None
    score: int | None = Field(default=None, ge=0, le=100)
    semester_id: int | None = None


class MarkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_reg_number: str
    course_id: int
    score: int
    grade: Grade
    semester_id: int


class MarkStudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    grade: Grade
    semester_id: int
