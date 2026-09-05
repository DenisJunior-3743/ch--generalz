from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.enums import Action, Role
from models.faculty import Faculty
from models.program import Program
from models.student import Student
from models.user import User
from schemas.student import StudentCreate, StudentOut, StudentPage, StudentReplace, StudentUpdate
from services.security import get_current_user, require_permission

router = APIRouter(prefix="/students", tags=["students"])


@router.post(
    "",
    response_model=StudentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("students", Action.CREATE))],
)
def create_student(student_in: StudentCreate, db: Session = Depends(get_db)):
    if db.get(Faculty, student_in.faculty_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty not found",
        )

    program = db.get(Program, student_in.program_id)
    if program is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Program not found",
        )

    if program.faculty_id != student_in.faculty_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Selected program does not belong to the selected faculty",
        )

    student = Student(**student_in.model_dump())
    db.add(student)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this registration number or email already exists",
        )
    db.refresh(student)
    return student


@router.get(
    "",
    response_model=StudentPage,
    dependencies=[Depends(require_permission("students", Action.READ))],
)
def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Student)
    if current_user.role == Role.STUDENT:
        query = query.filter(Student.reg_number == current_user.student_reg_number)

    total = query.count()
    items = (
        query.order_by(Student.reg_number)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return StudentPage(items=items, total=total, page=page, page_size=page_size)


@router.get(
    "/{reg_number}",
    response_model=StudentOut,
    dependencies=[Depends(require_permission("students", Action.READ))],
)
def get_student(
    reg_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.STUDENT and current_user.student_reg_number != reg_number:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own student record",
        )

    student = db.get(Student, reg_number)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    return student


def _get_student_or_404(reg_number: str, db: Session) -> Student:
    student = db.get(Student, reg_number)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    return student


def _validate_faculty_program(db: Session, faculty_id: int, program_id: int) -> None:
    if db.get(Faculty, faculty_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty not found",
        )

    program = db.get(Program, program_id)
    if program is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Program not found",
        )

    if program.faculty_id != faculty_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Selected program does not belong to the selected faculty",
        )


@router.put(
    "/{reg_number}",
    response_model=StudentOut,
    dependencies=[Depends(require_permission("students", Action.UPDATE))],
)
def replace_student(reg_number: str, student_in: StudentReplace, db: Session = Depends(get_db)):
    student = _get_student_or_404(reg_number, db)
    _validate_faculty_program(db, student_in.faculty_id, student_in.program_id)

    for field, value in student_in.model_dump().items():
        setattr(student, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already used by another student",
        )
    db.refresh(student)
    return student


@router.patch(
    "/{reg_number}",
    response_model=StudentOut,
    dependencies=[Depends(require_permission("students", Action.UPDATE))],
)
def update_student(reg_number: str, student_in: StudentUpdate, db: Session = Depends(get_db)):
    student = _get_student_or_404(reg_number, db)
    updates = student_in.model_dump(exclude_unset=True)

    effective_faculty_id = updates.get("faculty_id", student.faculty_id)
    effective_program_id = updates.get("program_id", student.program_id)
    if "faculty_id" in updates or "program_id" in updates:
        _validate_faculty_program(db, effective_faculty_id, effective_program_id)

    for field, value in updates.items():
        setattr(student, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already used by another student",
        )
    db.refresh(student)
    return student


@router.delete(
    "/{reg_number}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("students", Action.DELETE))],
)
def delete_student(reg_number: str, db: Session = Depends(get_db)):
    student = _get_student_or_404(reg_number, db)
    db.delete(student)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete this student — they still have marks and/or a login account referencing them",
        )
