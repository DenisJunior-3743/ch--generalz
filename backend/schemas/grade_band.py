from pydantic import BaseModel, ConfigDict, Field, model_validator

from models.enums import Grade


class GradeBandCreate(BaseModel):
    min_score: int = Field(ge=0, le=100)
    max_score: int = Field(ge=0, le=100)
    grade: Grade

    @model_validator(mode="after")
    def check_range(self):
        if self.min_score > self.max_score:
            raise ValueError("min_score must be less than or equal to max_score")
        return self


class GradeBandUpdate(BaseModel):
    min_score: int | None = Field(default=None, ge=0, le=100)
    max_score: int | None = Field(default=None, ge=0, le=100)
    grade: Grade | None = None


class GradeBandOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    min_score: int
    max_score: int
    grade: Grade
