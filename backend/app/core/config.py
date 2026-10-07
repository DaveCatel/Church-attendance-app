from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    SECRET_KEY: str

    # "production" turns on stricter checks (see _production_checks) and hides /docs
    ENVIRONMENT: Literal["development", "production"] = "development"

    ACCESS_TOKEN_MINUTES: int = 30
    REFRESH_TOKEN_DAYS: int = 30
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    MEDIA_DIR: str = "media"
    # how long before a service starts that people may clock in
    CHECKIN_OPENS_MINUTES_BEFORE: int = 60

    # public address of the web app; used for the links inside emails
    WEB_BASE_URL: str = "http://localhost:5173"
    PASSWORD_RESET_MINUTES: int = 60

    # brute-force protection on login, signup and password reset
    RATE_LIMIT_ENABLED: bool = True

    # outgoing email (leave SMTP_HOST empty to disable: links are then printed in the
    # server console during development instead of being emailed)
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM: str | None = None  # e.g. Church Attendance <no-reply@yourchurch.org>
    SMTP_SECURITY: Literal["starttls", "ssl", "none"] = "starttls"

    @model_validator(mode="after")
    def _production_checks(self):
        if self.ENVIRONMENT == "production":
            weak = len(self.SECRET_KEY) < 32 or self.SECRET_KEY.lower().startswith("change")
            if weak:
                raise ValueError(
                    "SECRET_KEY is too weak for production. Generate one with: "
                    'python -c "import secrets; print(secrets.token_urlsafe(48))"'
                )
        return self


settings = Settings()
