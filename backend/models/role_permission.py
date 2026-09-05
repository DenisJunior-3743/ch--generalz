from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy import Enum as SQLEnum

from database import Base
from models.enums import Role


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (
        UniqueConstraint("role", "permission_id", name="uq_role_permission"),
    )

    id = Column(Integer, primary_key=True, index=True)
    role = Column(SQLEnum(Role), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False)
