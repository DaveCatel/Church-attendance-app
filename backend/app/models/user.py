import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    church_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("churches.id", ondelete="CASCADE"),
        nullable=False,
    )

    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
    )

    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    profile_photo_url: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    email_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    phone_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    church = relationship(
        "Church",
        back_populates="users",
    )

    role = relationship(
        "Role",
        back_populates="users",
    )

    departments = relationship(
        "UserDepartment",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="UserDepartment.user_id",
    )

    devices = relationship(
        "UserDevice",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    sessions = relationship(
        "AuthSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    attendance_records = relationship(
        "AttendanceRecord",
        back_populates="user",
    )

    __table_args__ = (
        UniqueConstraint(
            "church_id",
            "email",
            name="uq_users_church_email",
        ),
        UniqueConstraint(
            "church_id",
            "phone",
            name="uq_users_church_phone",
        ),
        Index("ix_users_church_id", "church_id"),
        Index("ix_users_role_id", "role_id"),
    )