from pydantic import BaseModel

from schemas.course import CourseOut
from schemas.faculty import FacultyOut
from schemas.grade_band import GradeBandOut
from schemas.mark import MarkOut
from schemas.permission import PermissionOut
from schemas.program import ProgramOut
from schemas.role_permission import RolePermissionOut
from schemas.semester import SemesterOut
from schemas.staff import StaffOut
from schemas.student import StudentOut
from schemas.user import UserOut


class OverviewOut(BaseModel):
    staff: list[StaffOut]
    faculties: list[FacultyOut]
    programs: list[ProgramOut]
    courses: list[CourseOut]
    semesters: list[SemesterOut]
    grade_bands: list[GradeBandOut]
    students: list[StudentOut]
    marks: list[MarkOut]
    users: list[UserOut]
    permissions: list[PermissionOut]
    role_permissions: list[RolePermissionOut]
