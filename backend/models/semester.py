from sqlalchemy import Column, Integer, String, UniqueConstraint
from sqlalchemy import Enum as SQLEnum

from database import Base
from models.enums import Term


class Semester(Base):
    __tablename__ = "semesters"
    __table_args__ = (
        UniqueConstraint("academic_year", "term", name="uq_academic_year_term"),
    )

    id = Column(Integer, primary_key=True, index=True)
    academic_year = Column(String(20), nullable=False)
    term = Column(SQLEnum(Term), nullable=False)
