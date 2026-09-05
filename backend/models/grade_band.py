from sqlalchemy import Column, Integer
from sqlalchemy import Enum as SQLEnum

from database import Base
from models.enums import Grade


class GradeBand(Base):
    __tablename__ = "grade_bands"

    id = Column(Integer, primary_key=True, index=True)
    min_score = Column(Integer, nullable=False)
    max_score = Column(Integer, nullable=False)
    grade = Column(SQLEnum(Grade), unique=True, nullable=False)
