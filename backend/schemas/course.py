from pydantic import BaseModel, ConfigDict


class CourseCreate(BaseModel):
    code: str
    name: str


class CourseUpdate(BaseModel):
    code: str | None = None
    name: str | None = None


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
