from pydantic import BaseModel, ConfigDict


class ProgramCreate(BaseModel):
    code: str
    name: str
    faculty_id: int


class ProgramUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    faculty_id: int | None = None


class ProgramOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    faculty_id: int
