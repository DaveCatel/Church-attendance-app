import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.ratelimit import (
    forgot_email_limiter,
    forgot_ip_limiter,
    password_change_failures,
    reset_limiter,
)
from app.core.security import hash_password, hash_token, verify_password
from app.db.database import get_db
from app.deps import get_current_user
from app.models import AuthSession, PasswordResetToken, User
from app.schemas import _check_password
from app.services.email import password_reset_email, send_email

router = APIRouter(tags=["account"])

FORGOT_MESSAGE = "If an account exists for that email, we have sent a link to reset the password."


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    new_password: str = Field(min_length=8)

    _pw = field_validator("new_password")(_check_password)


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

    _pw = field_validator("new_password")(_check_password)


def _ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _revoke_sessions(db: Session, user_id, now: datetime) -> None:
    db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )


@router.post("/auth/forgot-password")
def forgot_password(
    body: ForgotIn,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Always answers the same way, so nobody can use it to find out who has an account."""
    forgot_ip_limiter.check_and_hit(_ip(request))

    email = body.email.lower()
    user = db.scalar(select(User).where(User.email == email, User.is_active.is_(True)).limit(1))
    if user is not None:
        try:
            forgot_email_limiter.check_and_hit(email)
        except HTTPException:
            user = None  # too many requests for this address: stay silent

    if user is not None:
        now = datetime.now(timezone.utc)
        raw = secrets.token_urlsafe(32)
        # an older unused link stops working as soon as a new one is requested
        db.execute(
            delete(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None)
            )
        )
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_token(raw),
                expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_MINUTES),
            )
        )
        db.commit()
        link = f"{settings.WEB_BASE_URL.rstrip('/')}/reset-password?token={raw}"
        subject, text = password_reset_email(user.full_name, link, settings.PASSWORD_RESET_MINUTES)
        background.add_task(send_email, user.email, subject, text)

    return {"message": FORGOT_MESSAGE}


@router.post("/auth/reset-password")
def reset_password(body: ResetIn, request: Request, db: Session = Depends(get_db)):
    reset_limiter.check_and_hit(_ip(request))

    now = datetime.now(timezone.utc)
    row = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == hash_token(body.token),
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
    )
    user = db.get(User, row.user_id) if row is not None else None
    if row is None or user is None or not user.is_active:
        raise HTTPException(400, "This reset link is invalid or has expired. Please request a new one.")

    user.password_hash = hash_password(body.new_password)
    row.used_at = now
    _revoke_sessions(db, user.id, now)  # sign the account out everywhere
    db.commit()
    return {"message": "Your password has been changed. You can now sign in."}


@router.post("/users/me/password", status_code=204)
def change_password(
    body: ChangePasswordIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    key = str(user.id)
    password_change_failures.check(key)
    if not verify_password(body.current_password, user.password_hash):
        password_change_failures.hit(key)
        raise HTTPException(400, "Your current password is wrong")
    password_change_failures.reset(key)
    if body.new_password == body.current_password:
        raise HTTPException(400, "Choose a password different from the current one")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return Response(status_code=204)
