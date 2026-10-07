import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.deps import get_current_user
from app.models import (
    AttendanceRecord,
    ServiceOccurrence,
    ServiceParticipant,
    ServiceTemplate,
    Department,
    User,
    UserDepartment,
)
from app.schemas import ClockIn, HistoryItem, ServiceCard, TodayOut
from app.services.scheduling import attendance_state, church_tz, ensure_occurrences, window

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _card(occ, template, record, now, tz) -> ServiceCard:
    opens, _ = window(occ, tz)
    return ServiceCard(
        occurrence_id=occ.id,
        name=template.name,
        description=template.description,
        service_type=template.service_type,
        service_date=occ.service_date,
        start_time=occ.start_time,
        end_time=occ.end_time,
        opens_at=opens,
        state=attendance_state(occ, record, now, tz),
        clock_in=record.clock_in if record else None,
        clock_out=record.clock_out if record else None,
    )


def _load(db: Session, user: User, occurrence_id: uuid.UUID):
    row = db.execute(
        select(ServiceOccurrence, ServiceTemplate)
        .join(ServiceTemplate, ServiceTemplate.id == ServiceOccurrence.service_template_id)
        .where(
            ServiceOccurrence.id == occurrence_id,
            ServiceTemplate.church_id == user.church_id,
            ServiceTemplate.is_active.is_(True),
            ServiceOccurrence.status != "CANCELLED",
        )
    ).first()
    if row is None:
        raise HTTPException(404, "Service not found")
    return row


def _is_service_eligible(
    db: Session, user: User, template: ServiceTemplate
) -> bool:
    participant_exists = db.scalar(
        select(ServiceParticipant.id)
        .where(ServiceParticipant.service_template_id == template.id)
        .limit(1)
    ) is not None

    # No participant rows means the service is open to all eligible church users.
    if not participant_exists:
        return True

    direct_match = select(ServiceParticipant.id).where(
        ServiceParticipant.service_template_id == template.id,
        ServiceParticipant.user_id == user.id,
    ).exists()

    active_department_match = (
        select(ServiceParticipant.id)
        .join(
            UserDepartment,
            UserDepartment.department_id == ServiceParticipant.department_id,
        )
        .join(
            Department,
            Department.id == UserDepartment.department_id,
        )
        .where(
            ServiceParticipant.service_template_id == template.id,
            UserDepartment.user_id == user.id,
            UserDepartment.status == "ACTIVE",
            Department.church_id == user.church_id,
        )
        .exists()
    )

    return bool(
        db.scalar(select(or_(direct_match, active_department_match)))
    )


def _require_service_eligibility(
    db: Session, user: User, template: ServiceTemplate
) -> None:
    if not _is_service_eligible(db, user, template):
        raise HTTPException(403, "You are not eligible for this service")


def _record(db: Session, user: User, occurrence_id: uuid.UUID) -> AttendanceRecord | None:
    return db.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.user_id == user.id,
            AttendanceRecord.service_occurrence_id == occurrence_id,
        )
    )


@router.get("/today", response_model=TodayOut)
def today(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tz = church_tz(user.church)
    now = datetime.now(timezone.utc)
    today_date = now.astimezone(tz).date()
    horizon = today_date + timedelta(days=14)
    ensure_occurrences(db, user.church, today_date, horizon)

    rows = db.execute(
        select(ServiceOccurrence, ServiceTemplate)
        .join(ServiceTemplate, ServiceTemplate.id == ServiceOccurrence.service_template_id)
        .where(
            ServiceTemplate.church_id == user.church_id,
            ServiceTemplate.is_active.is_(True),
            ServiceOccurrence.status != "CANCELLED",
            ServiceOccurrence.service_date.between(today_date, horizon),
        )
        .order_by(ServiceOccurrence.start_time)
    ).all()

    rows = [(o, t) for o, t in rows if _is_service_eligible(db, user, t)]
    records = {
        r.service_occurrence_id: r
        for r in db.scalars(
            select(AttendanceRecord).where(
                AttendanceRecord.user_id == user.id,
                AttendanceRecord.service_occurrence_id.in_([o.id for o, _ in rows]),
            )
        )
    }
    cards = [_card(o, t, records.get(o.id), now, tz) for o, t in rows]
    return TodayOut(
        server_time=now,
        timezone=str(tz),
        today=[c for c in cards if c.service_date == today_date],
        upcoming=[c for c in cards if c.service_date > today_date][:10],
    )


@router.post("/clock-in", response_model=ServiceCard)
def clock_in(body: ClockIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    occ, template = _load(db, user, body.occurrence_id)
    _require_service_eligibility(db, user, template)
    tz = church_tz(user.church)
    now = datetime.now(timezone.utc)

    if _record(db, user, occ.id) is not None:
        raise HTTPException(409, "You have already clocked in to this service")

    state = attendance_state(occ, None, now, tz)
    if state == "upcoming":
        opens, _ = window(occ, tz)
        raise HTTPException(
            400, f"Clock-in opens at {opens.astimezone(tz):%H:%M}"
        )
    if state == "missed":
        raise HTTPException(400, "This service has ended")

    record = AttendanceRecord(
        user_id=user.id,
        service_occurrence_id=occ.id,
        clock_in=now,
        clock_in_server_time=now,
        clock_in_device_time=body.device_time,
        clock_in_source="ONLINE",
        sync_status="SYNCED",
    )
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "You have already clocked in to this service")
    return _card(occ, template, record, now, tz)


@router.post("/clock-out", response_model=ServiceCard)
def clock_out(body: ClockIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    occ, template = _load(db, user, body.occurrence_id)
    _require_service_eligibility(db, user, template)
    tz = church_tz(user.church)
    now = datetime.now(timezone.utc)

    record = _record(db, user, occ.id)
    if record is None:
        raise HTTPException(400, "You have not clocked in to this service")
    if record.clock_out is not None:
        raise HTTPException(409, "You have already clocked out")

    record.clock_out = now
    record.clock_out_server_time = now
    record.clock_out_device_time = body.device_time
    record.clock_out_source = "ONLINE"
    db.commit()
    return _card(occ, template, record, now, tz)


@router.get("/me", response_model=list[HistoryItem])
def my_history(
    limit: int = Query(30, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(AttendanceRecord, ServiceOccurrence, ServiceTemplate.name)
        .join(ServiceOccurrence, ServiceOccurrence.id == AttendanceRecord.service_occurrence_id)
        .join(ServiceTemplate, ServiceTemplate.id == ServiceOccurrence.service_template_id)
        .where(AttendanceRecord.user_id == user.id)
        .order_by(AttendanceRecord.clock_in.desc())
        .limit(limit)
    ).all()
    return [
        HistoryItem(
            occurrence_id=o.id,
            name=name,
            service_date=o.service_date,
            clock_in=r.clock_in,
            clock_out=r.clock_out,
        )
        for r, o, name in rows
    ]
