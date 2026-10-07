import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.deps import require_admin
from app.models import Church, Department, User, UserDepartment
from app.schemas import (
    DepartmentAdminOut,
    DepartmentCreate,
    DepartmentOut,
    DepartmentUpdate,
    MembershipAdminOut,
)
from app.services.email import department_decision_email, send_email

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    """Return active departments for public registration."""
    church = db.scalar(
        select(Church).where(Church.is_active.is_(True)).order_by(Church.created_at).limit(1)
    )
    if church is None:
        raise HTTPException(503, "The app has not been set up yet")

    return db.scalars(
        select(Department)
        .where(Department.church_id == church.id, Department.is_active.is_(True))
        .order_by(Department.name)
    ).all()


@router.get("/admin", response_model=list[DepartmentAdminOut])
def admin_list_departments(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Department)
        .where(Department.church_id == admin.church_id)
        .order_by(Department.name)
    ).all()


@router.post("", response_model=DepartmentAdminOut, status_code=status.HTTP_201_CREATED)
def create_department(
    body: DepartmentCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "Department name cannot be empty")

    existing = db.scalar(
        select(Department).where(
            Department.church_id == admin.church_id,
            Department.name == name,
        )
    )
    if existing:
        raise HTTPException(409, "A department with this name already exists")

    department = Department(
        church_id=admin.church_id,
        name=name,
        description=body.description.strip() if body.description else None,
        is_active=True,
    )
    db.add(department)
    try:
        db.commit()
        db.refresh(department)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A department with this name already exists")
    return department


@router.patch("/{department_id}", response_model=DepartmentAdminOut)
def update_department(
    department_id: uuid.UUID,
    body: DepartmentUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    department = db.scalar(
        select(Department).where(
            Department.id == department_id,
            Department.church_id == admin.church_id,
        )
    )
    if department is None:
        raise HTTPException(404, "Department not found")

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(400, "Department name cannot be empty")
        duplicate = db.scalar(
            select(Department).where(
                Department.church_id == admin.church_id,
                Department.name == name,
                Department.id != department.id,
            )
        )
        if duplicate:
            raise HTTPException(409, "A department with this name already exists")
        department.name = name

    if body.description is not None:
        department.description = body.description.strip() or None
    if body.is_active is not None:
        department.is_active = body.is_active

    try:
        db.commit()
        db.refresh(department)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A department with this name already exists")
    return department


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_department(
    department_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    department = db.scalar(
        select(Department).where(
            Department.id == department_id,
            Department.church_id == admin.church_id,
        )
    )
    if department is None:
        raise HTTPException(404, "Department not found")
    department.is_active = False
    db.commit()


@router.get("/memberships/pending", response_model=list[MembershipAdminOut])
def pending_memberships(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(UserDepartment, User, Department)
        .join(User, User.id == UserDepartment.user_id)
        .join(Department, Department.id == UserDepartment.department_id)
        .where(
            User.church_id == admin.church_id,
            Department.church_id == admin.church_id,
            UserDepartment.status == "PENDING",
        )
        .order_by(UserDepartment.joined_at)
    ).all()
    return [
        MembershipAdminOut(
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            department_id=department.id,
            department_name=department.name,
            status=membership.status,
            is_primary=membership.is_primary,
            joined_at=membership.joined_at,
            reviewed_at=membership.reviewed_at,
            reviewed_by=membership.reviewed_by,
        )
        for membership, user, department in rows
    ]


@router.patch("/memberships/{user_id}/{department_id}/approve", response_model=MembershipAdminOut)
def approve_membership(
    user_id: uuid.UUID,
    department_id: uuid.UUID,
    background: BackgroundTasks,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    membership = db.scalar(
        select(UserDepartment)
        .join(User, User.id == UserDepartment.user_id)
        .join(Department, Department.id == UserDepartment.department_id)
        .where(
            UserDepartment.user_id == user_id,
            UserDepartment.department_id == department_id,
            User.church_id == admin.church_id,
            Department.church_id == admin.church_id,
        )
    )
    if membership is None:
        raise HTTPException(404, "Membership request not found")
    if membership.status != "PENDING":
        raise HTTPException(409, "Membership request is no longer pending")

    membership.status = "ACTIVE"
    membership.reviewed_at = datetime.now(timezone.utc)
    membership.reviewed_by = admin.id
    db.commit()
    db.refresh(membership)

    user = db.get(User, user_id)
    department = db.get(Department, department_id)
    if user.email:
        subject, text = department_decision_email(user.full_name, department.name, approved=True)
        background.add_task(send_email, user.email, subject, text)
    return MembershipAdminOut(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        department_id=department.id,
        department_name=department.name,
        status=membership.status,
        is_primary=membership.is_primary,
        joined_at=membership.joined_at,
        reviewed_at=membership.reviewed_at,
        reviewed_by=membership.reviewed_by,
    )


@router.patch("/memberships/{user_id}/{department_id}/reject", response_model=MembershipAdminOut)
def reject_membership(
    user_id: uuid.UUID,
    department_id: uuid.UUID,
    background: BackgroundTasks,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    membership = db.scalar(
        select(UserDepartment)
        .join(User, User.id == UserDepartment.user_id)
        .join(Department, Department.id == UserDepartment.department_id)
        .where(
            UserDepartment.user_id == user_id,
            UserDepartment.department_id == department_id,
            User.church_id == admin.church_id,
            Department.church_id == admin.church_id,
        )
    )
    if membership is None:
        raise HTTPException(404, "Membership request not found")
    if membership.status != "PENDING":
        raise HTTPException(409, "Membership request is no longer pending")

    membership.status = "REJECTED"
    membership.reviewed_at = datetime.now(timezone.utc)
    membership.reviewed_by = admin.id
    db.commit()
    db.refresh(membership)

    user = db.get(User, user_id)
    department = db.get(Department, department_id)
    if user.email:
        subject, text = department_decision_email(user.full_name, department.name, approved=False)
        background.add_task(send_email, user.email, subject, text)
    return MembershipAdminOut(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        department_id=department.id,
        department_name=department.name,
        status=membership.status,
        is_primary=membership.is_primary,
        joined_at=membership.joined_at,
        reviewed_at=membership.reviewed_at,
        reviewed_by=membership.reviewed_by,
    )
