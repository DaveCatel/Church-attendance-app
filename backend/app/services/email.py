"""Sending email over SMTP, plus the wording of the emails the app sends.

send_email never raises: a mail problem must not break the request that triggered it.
Run it through FastAPI BackgroundTasks so the response is not delayed.
"""
import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

log = logging.getLogger("uvicorn.error")


def email_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def send_email(to: str | None, subject: str, body: str) -> None:
    if not to:
        return
    if not email_configured():
        log.warning("Email is not configured (SMTP_HOST / SMTP_FROM); not sending %r to %s", subject, to)
        if settings.ENVIRONMENT != "production":
            log.warning("---- email body (shown in development only) ----\n%s\n----", body)
        return

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        if settings.SMTP_SECURITY == "ssl":
            server = smtplib.SMTP_SSL(
                settings.SMTP_HOST, settings.SMTP_PORT, timeout=20, context=ssl.create_default_context()
            )
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
        with server:
            if settings.SMTP_SECURITY == "starttls":
                server.starttls(context=ssl.create_default_context())
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
            server.send_message(msg)
    except Exception:
        log.exception("Could not send email %r to %s", subject, to)


def password_reset_email(name: str, link: str, minutes: int) -> tuple[str, str]:
    subject = "Reset your Church Attendance password"
    body = (
        f"Hello {name},\n\n"
        "We received a request to reset your password. Open this link to choose a new one. "
        f"It works once and expires in {minutes} minutes:\n\n"
        f"{link}\n\n"
        "If you did not ask for this, you can ignore this email. Your password stays the same.\n"
    )
    return subject, body


def department_decision_email(name: str, department: str, approved: bool) -> tuple[str, str]:
    if approved:
        subject = f"You are now a member of {department}"
        body = (
            f"Hello {name},\n\n"
            f"An admin approved your request to join {department}. "
            "You can now see and clock in to its services.\n"
        )
    else:
        subject = f"Your request to join {department}"
        body = (
            f"Hello {name},\n\n"
            f"An admin did not approve your request to join {department} this time. "
            "If you think this is a mistake, please speak to a church admin.\n"
        )
    return subject, body
