from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.course import Course
from models.enums import Action, Role
from models.mark import Mark
from models.semester import Semester
from models.student import Student
from models.user import User
from schemas.mark import MarkEntry, MarkOut, MarksBatchCreate, MarkUpdate
from services.grading import score_to_grade
from services.security import get_current_user, require_permission

router = APIRouter(prefix="/students", tags=["marks"])


@router.post(
    "/{reg_number}/marks",
    response_model=list[MarkOut],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("marks", Action.CREATE))],
)
def create_marks(reg_number: str, batch: MarksBatchCreate, db: Session = Depends(get_db)):
    if db.get(Student, reg_number) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    for entry in batch.marks:
        if db.get(Course, entry.course_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course {entry.course_id} not found",
            )
        if db.get(Semester, entry.semester_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Semester {entry.semester_id} not found",
            )

    marks = []
    for entry in batch.marks:
        grade = score_to_grade(db, entry.score)
        if grade is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"No grade band configured for score {entry.score} — ask an admin to set one up",
            )
        marks.append(
            Mark(
                student_reg_number=reg_number,
                course_id=entry.course_id,
                semester_id=entry.semester_id,
                score=entry.score,
                grade=grade,
            )
        )
    db.add_all(marks)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="One or more marks duplicate an existing student/course/semester entry",
        )
    for mark in marks:
        db.refresh(mark)
    return marks


@router.get(
    "/{reg_number}/marks",
    response_model=list[MarkOut],
    dependencies=[Depends(require_permission("marks", Action.READ))],
)
def list_marks(
    reg_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.STUDENT and current_user.student_reg_number != reg_number:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own marks",
        )
    if db.get(Student, reg_number) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    return db.query(Mark).filter(Mark.student_reg_number == reg_number).all()


def _get_mark_or_404(reg_number: str, mark_id: int, db: Session) -> Mark:
    mark = db.get(Mark, mark_id)
    if mark is None or mark.student_reg_number != reg_number:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mark not found",
        )
    return mark


@router.put(
    "/{reg_number}/marks/{mark_id}",
    response_model=MarkOut,
    dependencies=[Depends(require_permission("marks", Action.UPDATE))],
)
def replace_mark(reg_number: str, mark_id: int, entry: MarkEntry, db: Session = Depends(get_db)):
    mark = _get_mark_or_404(reg_number, mark_id, db)

    if db.get(Course, entry.course_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if db.get(Semester, entry.semester_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semester not found")

    grade = score_to_grade(db, entry.score)
    if grade is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No grade band configured for score {entry.score} — ask an admin to set one up",
        )

    mark.course_id = entry.course_id
    mark.semester_id = entry.semester_id
    mark.score = entry.score
    mark.grade = grade
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This student already has a mark for that course and semester",
        )
    db.refresh(mark)
    return mark


@router.patch(
    "/{reg_number}/marks/{mark_id}",
    response_model=MarkOut,
    dependencies=[Depends(require_permission("marks", Action.UPDATE))],
)
def update_mark(reg_number: str, mark_id: int, entry: MarkUpdate, db: Session = Depends(get_db)):
    mark = _get_mark_or_404(reg_number, mark_id, db)
    updates = entry.model_dump(exclude_unset=True)

    if "course_id" in updates and db.get(Course, updates["course_id"]) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if "semester_id" in updates and db.get(Semester, updates["semester_id"]) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semester not found")

    if "score" in updates:
        grade = score_to_grade(db, updates["score"])
        if grade is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"No grade band configured for score {updates['score']} — ask an admin to set one up",
            )
        updates["grade"] = grade

    for field, value in updates.items():
        setattr(mark, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This student already has a mark for that course and semester",
        )
    db.refresh(mark)
    return mark


@router.delete(
    "/{reg_number}/marks/{mark_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("marks", Action.DELETE))],
)
def delete_mark(reg_number: str, mark_id: int, db: Session = Depends(get_db)):
    mark = _get_mark_or_404(reg_number, mark_id, db)
    db.delete(mark)
    db.commit()
