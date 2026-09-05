from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.course import Course
from models.enums import Action
from schemas.course import CourseCreate, CourseOut, CourseUpdate
from services.security import require_permission

router = APIRouter(prefix="/courses", tags=["courses"])


@router.post(
    "",
    response_model=CourseOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("courses", Action.CREATE))],
)
def create_course(course_in: CourseCreate, db: Session = Depends(get_db)):
    course = Course(**course_in.model_dump())
    db.add(course)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Course code already exists",
        )
    db.refresh(course)
    return course


@router.get(
    "",
    response_model=list[CourseOut],
    dependencies=[Depends(require_permission("courses", Action.READ))],
)
def list_courses(db: Session = Depends(get_db)):
    return db.query(Course).order_by(Course.name).all()


def _get_course_or_404(course_id: int, db: Session) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )
    return course


@router.put(
    "/{course_id}",
    response_model=CourseOut,
    dependencies=[Depends(require_permission("courses", Action.UPDATE))],
)
def replace_course(course_id: int, course_in: CourseCreate, db: Session = Depends(get_db)):
    course = _get_course_or_404(course_id, db)
    course.code = course_in.code
    course.name = course_in.name
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Course code already exists",
        )
    db.refresh(course)
    return course


@router.patch(
    "/{course_id}",
    response_model=CourseOut,
    dependencies=[Depends(require_permission("courses", Action.UPDATE))],
)
def update_course(course_id: int, course_in: CourseUpdate, db: Session = Depends(get_db)):
    course = _get_course_or_404(course_id, db)
    for field, value in course_in.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Course code already exists",
        )
    db.refresh(course)
    return course


@router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("courses", Action.DELETE))],
)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = _get_course_or_404(course_id, db)
    db.delete(course)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete this course — one or more marks reference it",
        )
