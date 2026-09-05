from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.enums import Action
from models.staff import Staff
from models.student import Student
from models.user import User
from schemas.user import UserCreate, UserOut
from services.security import hash_password, require_permission

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("users", Action.CREATE))],
)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    username = user_in.username

    if user_in.staff_id is not None:
        staff = db.get(Staff, user_in.staff_id)
        if staff is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff not found",
            )
        username = staff.email

    if user_in.student_reg_number is not None:
        student = db.get(Student, user_in.student_reg_number)
        if student is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found",
            )
        username = student.reg_number

    user = User(
        username=username,
        password_hash=hash_password(user_in.password),
        role=user_in.role,
        staff_id=user_in.staff_id,
        student_reg_number=user_in.student_reg_number,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken, or this staff/student already has an account",
        )
    db.refresh(user)
    return user
