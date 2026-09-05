import os

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from gridfs.errors import NoFile
from sqlalchemy.orm import Session

from database import get_db
from models.enums import Action, Role
from models.mark import Mark
from models.user import User
from schemas.mark import MarkStudentOut
from schemas.profile import PhotoOut
from services.mongo import photo_bucket
from services.security import get_current_user, require_permission

load_dotenv()

PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://127.0.0.1:8000")

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5 MB

router = APIRouter(prefix="/me", tags=["me"])


@router.get(
    "/marks",
    response_model=list[MarkStudentOut],
    dependencies=[Depends(require_permission("marks", Action.READ))],
)
def get_my_marks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.STUDENT or current_user.student_reg_number is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a student account can view 'my marks'",
        )
    return (
        db.query(Mark)
        .filter(Mark.student_reg_number == current_user.student_reg_number)
        .all()
    )


@router.put(
    "/photo",
    response_model=PhotoOut,
    dependencies=[Depends(require_permission("profile", Action.UPDATE))],
)
def upload_my_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported image type '{file.content_type}' — use JPEG, PNG, WEBP, or GIF",
        )

    contents = file.file.read()
    if len(contents) > MAX_PHOTO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Image too large — max 5MB",
        )

    if current_user.photo_file_id:
        try:
            photo_bucket.delete(ObjectId(current_user.photo_file_id))
        except NoFile:
            pass

    file_id = photo_bucket.upload_from_stream(
        file.filename or "photo",
        contents,
        metadata={"content_type": file.content_type},
    )

    current_user.photo_file_id = str(file_id)
    current_user.photo_url = f"{PUBLIC_BASE_URL}/files/{file_id}"
    db.commit()

    return PhotoOut(photo_url=current_user.photo_url)


@router.delete(
    "/photo",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("profile", Action.DELETE))],
)
def delete_my_photo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.photo_file_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No photo to delete",
        )

    try:
        photo_bucket.delete(ObjectId(current_user.photo_file_id))
    except NoFile:
        pass

    current_user.photo_file_id = None
    current_user.photo_url = None
    db.commit()
