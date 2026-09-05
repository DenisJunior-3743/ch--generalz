from pydantic import BaseModel, ConfigDict


class FacultyCreate(BaseModel):
    code: str
    name: str


class FacultyUpdate(BaseModel):
    code: str | None = None
    name: str | None = None


class FacultyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
