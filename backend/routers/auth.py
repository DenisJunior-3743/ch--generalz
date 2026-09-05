from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.enums import Role
from models.permission import Permission
from models.role_permission import RolePermission
from models.staff import Staff
from models.student import Student
from models.user import User
from schemas.auth import (
    LoginRequest,
    MeOut,
    RegisterStaffRequest,
    RegisterStudentRequest,
    TokenOut,
)
from services.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def get_last_name(user: User, db: Session) -> str | None:
    if user.staff_id is not None:
        staff = db.get(Staff, user.staff_id)
        return staff.last_name if staff else None
    if user.student_reg_number is not None:
        student = db.get(Student, user.student_reg_number)
        return student.last_name if student else None
    return None


@router.post("/login", response_model=TokenOut)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == credentials.username).first()
    if user is None or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenOut(
        access_token=token,
        role=user.role,
        last_name=get_last_name(user, db),
        photo_url=user.photo_url,
    )


@router.get("/me", response_model=MeOut)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    permissions = (
        db.query(Permission)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .filter(RolePermission.role == current_user.role)
        .order_by(Permission.module, Permission.action)
        .all()
    )
    return MeOut(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        staff_id=current_user.staff_id,
        student_reg_number=current_user.student_reg_number,
        last_name=get_last_name(current_user, db),
        photo_url=current_user.photo_url,
        permissions=permissions,
    )


@router.post("/register/student", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register_student(payload: RegisterStudentRequest, db: Session = Depends(get_db)):
    student = db.get(Student, payload.reg_number)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No student record found for this registration number — ask your registrar to complete your registration first",
        )

    if db.query(User).filter(User.student_reg_number == payload.reg_number).first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this student — try logging in instead",
        )

    user = User(
        username=payload.reg_number,
        password_hash=hash_password(payload.password),
        role=Role.STUDENT,
        student_reg_number=payload.reg_number,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this registration number",
        )
    db.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenOut(access_token=token, role=user.role, last_name=student.last_name, photo_url=None)


@router.post("/register/staff", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register_staff(payload: RegisterStaffRequest, db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.email == payload.email).first()
    if staff is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No staff record found for this email — ask an admin to add you as staff first",
        )

    if db.query(User).filter(User.staff_id == staff.id).first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this staff member — try logging in instead",
        )

    user = User(
        username=staff.email,
        password_hash=hash_password(payload.password),
        role=Role.STAFF,
        staff_id=staff.id,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this email",
        )
    db.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenOut(access_token=token, role=user.role, last_name=staff.last_name, photo_url=None)
