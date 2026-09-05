from sqlalchemy import Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy import Enum as SQLEnum

from database import Base
from models.enums import Grade


class Mark(Base):
    __tablename__ = "marks"
    __table_args__ = (
        UniqueConstraint(
            "student_reg_number", "course_id", "semester_id",
            name="uq_student_course_semester",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_reg_number = Column(String(30), ForeignKey("students.reg_number"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    score = Column(Integer, nullable=False)
    grade = Column(SQLEnum(Grade), nullable=False)
