from pydantic import BaseModel


class PhotoOut(BaseModel):
    photo_url: str
