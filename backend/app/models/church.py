import uuid

from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class Church(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "churches"

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    address: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    timezone: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Africa/Douala",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # where the church is, for the "are you at the service?" check on clock-in
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    geofence_radius_m: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=200,
        server_default="200",
    )

    users = relationship(
        "User",
        back_populates="church",
    )

    departments = relationship(
        "Department",
        back_populates="church",
    )

    service_templates = relationship(
        "ServiceTemplate",
        back_populates="church",
    )