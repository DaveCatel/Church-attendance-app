import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class UserDevice(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "user_devices"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    device_identifier: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    device_name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    platform: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    app_version: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    last_sync_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user = relationship(
        "User",
        back_populates="devices",
    )

    attendance_records = relationship(
        "AttendanceRecord",
        back_populates="device",
    )

    sync_events = relationship(
        "SyncEvent",
        back_populates="device",
    )

    __table_args__ = (
        Index(
            "ix_user_devices_user_id",
            "user_id",
        ),
    )