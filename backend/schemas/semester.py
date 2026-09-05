from pydantic import BaseModel, ConfigDict

from models.enums import Term


class SemesterCreate(BaseModel):
    academic_year: str
    term: Term


class SemesterUpdate(BaseModel):
    academic_year: str | None = None
    term: Term | None = None


class SemesterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    academic_year: str
    term: Term
