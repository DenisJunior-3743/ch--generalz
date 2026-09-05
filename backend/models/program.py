from sqlalchemy import Column, ForeignKey, Integer, String

from database import Base


class Program(Base):
    __tablename__ = "programs"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=False)
