from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.enums import Action
from models.faculty import Faculty
from schemas.faculty import FacultyCreate, FacultyOut, FacultyUpdate
from services.security import require_permission

router = APIRouter(prefix="/faculties", tags=["faculties"])


@router.post(
    "",
    response_model=FacultyOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("faculties", Action.CREATE))],
)
def create_faculty(faculty_in: FacultyCreate, db: Session = Depends(get_db)):
    faculty = Faculty(**faculty_in.model_dump())
    db.add(faculty)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Faculty code already exists",
        )
    db.refresh(faculty)
    return faculty


@router.get(
    "",
    response_model=list[FacultyOut],
    dependencies=[Depends(require_permission("faculties", Action.READ))],
)
def list_faculties(db: Session = Depends(get_db)):
    return db.query(Faculty).order_by(Faculty.name).all()


def _get_faculty_or_404(faculty_id: int, db: Session) -> Faculty:
    faculty = db.get(Faculty, faculty_id)
    if faculty is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty not found",
        )
    return faculty


@router.put(
    "/{faculty_id}",
    response_model=FacultyOut,
    dependencies=[Depends(require_permission("faculties", Action.UPDATE))],
)
def replace_faculty(faculty_id: int, faculty_in: FacultyCreate, db: Session = Depends(get_db)):
    faculty = _get_faculty_or_404(faculty_id, db)
    faculty.code = faculty_in.code
    faculty.name = faculty_in.name
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Faculty code already exists",
        )
    db.refresh(faculty)
    return faculty


@router.patch(
    "/{faculty_id}",
    response_model=FacultyOut,
    dependencies=[Depends(require_permission("faculties", Action.UPDATE))],
)
def update_faculty(faculty_id: int, faculty_in: FacultyUpdate, db: Session = Depends(get_db)):
    faculty = _get_faculty_or_404(faculty_id, db)
    for field, value in faculty_in.model_dump(exclude_unset=True).items():
        setattr(faculty, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Faculty code already exists",
        )
    db.refresh(faculty)
    return faculty


@router.delete(
    "/{faculty_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("faculties", Action.DELETE))],
)
def delete_faculty(faculty_id: int, db: Session = Depends(get_db)):
    faculty = _get_faculty_or_404(faculty_id, db)
    db.delete(faculty)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete this faculty — one or more programs still belong to it",
        )
