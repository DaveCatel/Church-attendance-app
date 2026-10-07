"""Occurrence generation and clock-in window rules."""
from datetime import date, datetime, time, timedelta, timezone, tzinfo
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import AttendanceRecord, Church, ServiceOccurrence, ServiceTemplate


def church_tz(church: Church) -> tzinfo:
    try:
        return ZoneInfo(church.timezone)
    except Exception:
        return timezone(timedelta(hours=1))  # WAT, no DST


def build_occurrence(template: ServiceTemplate, day: date, tz: tzinfo) -> ServiceOccurrence:
    start = datetime.combine(day, template.default_start_time or time(0, 0), tzinfo=tz)
    end = (
        datetime.combine(day, template.default_end_time, tzinfo=tz)
        if template.default_end_time
        else None
    )
    return ServiceOccurrence(
        service_template_id=template.id,
        service_date=day,
        start_time=start,
        end_time=end,
        status="SCHEDULED",
    )


def ensure_occurrences(db: Session, church: Church, start: date, end: date) -> None:
    """Create missing occurrences of recurring services between start and end (inclusive)."""
    tz = church_tz(church)
    templates = db.scalars(
        select(ServiceTemplate).where(
            ServiceTemplate.church_id == church.id,
            ServiceTemplate.is_recurring.is_(True),
            ServiceTemplate.is_active.is_(True),
            ServiceTemplate.day_of_week.is_not(None),
        )
    ).all()
    if not templates:
        return

    existing = set(
        db.execute(
            select(ServiceOccurrence.service_template_id, ServiceOccurrence.service_date).where(
                ServiceOccurrence.service_template_id.in_([t.id for t in templates]),
                ServiceOccurrence.service_date.between(start, end),
            )
        ).all()
    )

    created = False
    day = start
    while day <= end:
        for t in templates:
            if day.weekday() == t.day_of_week and (t.id, day) not in existing:
                db.add(build_occurrence(t, day, tz))
                created = True
        day += timedelta(days=1)

    if created:
        try:
            db.commit()
        except IntegrityError:  # another request created them first
            db.rollback()


def attendance_state(
    occ: ServiceOccurrence, record: AttendanceRecord | None, now: datetime, tz: tzinfo
) -> str:
    if record is not None:
        return "completed" if record.clock_out else "clocked_in"
    opens, closes = window(occ, tz)
    if now < opens:
        return "upcoming"
    if now > closes:
        return "missed"
    return "open"


def window(occ: ServiceOccurrence, tz: tzinfo) -> tuple[datetime, datetime]:
    opens = occ.start_time - timedelta(minutes=settings.CHECKIN_OPENS_MINUTES_BEFORE)
    closes = occ.end_time or datetime.combine(occ.service_date, time(23, 59, 59), tzinfo=tz)
    return opens, closes
