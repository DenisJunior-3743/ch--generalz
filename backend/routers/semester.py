from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.enums import Action
from models.semester import Semester
from schemas.semester import SemesterCreate, SemesterOut, SemesterUpdate
from services.security import require_permission

router = APIRouter(prefix="/semesters", tags=["semesters"])


@router.post(
    "",
    response_model=SemesterOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("semesters", Action.CREATE))],
)
def create_semester(semester_in: SemesterCreate, db: Session = Depends(get_db)):
    semester = Semester(**semester_in.model_dump())
    db.add(semester)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This academic year and term combination already exists",
        )
    db.refresh(semester)
    return semester


@router.get(
    "",
    response_model=list[SemesterOut],
    dependencies=[Depends(require_permission("semesters", Action.READ))],
)
def list_semesters(db: Session = Depends(get_db)):
    return db.query(Semester).order_by(Semester.academic_year, Semester.term).all()


def _get_semester_or_404(semester_id: int, db: Session) -> Semester:
    semester = db.get(Semester, semester_id)
    if semester is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Semester not found",
        )
    return semester


@router.put(
    "/{semester_id}",
    response_model=SemesterOut,
    dependencies=[Depends(require_permission("semesters", Action.UPDATE))],
)
def replace_semester(semester_id: int, semester_in: SemesterCreate, db: Session = Depends(get_db)):
    semester = _get_semester_or_404(semester_id, db)
    semester.academic_year = semester_in.academic_year
    semester.term = semester_in.term
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This academic year and term combination already exists",
        )
    db.refresh(semester)
    return semester


@router.patch(
    "/{semester_id}",
    response_model=SemesterOut,
    dependencies=[Depends(require_permission("semesters", Action.UPDATE))],
)
def update_semester(semester_id: int, semester_in: SemesterUpdate, db: Session = Depends(get_db)):
    semester = _get_semester_or_404(semester_id, db)
    for field, value in semester_in.model_dump(exclude_unset=True).items():
        setattr(semester, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This academic year and term combination already exists",
        )
    db.refresh(semester)
    return semester


@router.delete(
    "/{semester_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("semesters", Action.DELETE))],
)
def delete_semester(semester_id: int, db: Session = Depends(get_db)):
    semester = _get_semester_or_404(semester_id, db)
    db.delete(semester)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete this semester — one or more marks reference it",
        )
