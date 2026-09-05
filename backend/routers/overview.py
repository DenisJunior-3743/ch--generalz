from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.course import Course
from models.enums import Action
from models.faculty import Faculty
from models.grade_band import GradeBand
from models.mark import Mark
from models.permission import Permission
from models.program import Program
from models.role_permission import RolePermission
from models.semester import Semester
from models.staff import Staff
from models.student import Student
from models.user import User
from schemas.overview import OverviewOut
from services.security import require_permission

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/overview",
    response_model=OverviewOut,
    dependencies=[Depends(require_permission("overview", Action.READ))],
)
def get_overview(db: Session = Depends(get_db)):
    return OverviewOut(
        staff=db.query(Staff).all(),
        faculties=db.query(Faculty).all(),
        programs=db.query(Program).all(),
        courses=db.query(Course).all(),
        semesters=db.query(Semester).all(),
        grade_bands=db.query(GradeBand).order_by(GradeBand.min_score).all(),
        students=db.query(Student).all(),
        marks=db.query(Mark).all(),
        users=db.query(User).all(),
        permissions=db.query(Permission).all(),
        role_permissions=db.query(RolePermission).all(),
    )
