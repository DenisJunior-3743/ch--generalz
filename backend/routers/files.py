from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from gridfs.errors import NoFile

from services.mongo import photo_bucket

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/{file_id}")
def get_file(file_id: str):
    try:
        object_id = ObjectId(file_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    try:
        grid_out = photo_bucket.open_download_stream(object_id)
    except NoFile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    content_type = (grid_out.metadata or {}).get("content_type", "application/octet-stream")
    return StreamingResponse(grid_out, media_type=content_type)
