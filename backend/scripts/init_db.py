"""First-time setup: create tables, roles, the church and the first admin.

    python -m scripts.init_db --church-name "My Church" \
        --admin-name "Jane Doe" --admin-email jane@example.com \
        --admin-phone +237600000000 --admin-password 'a-strong-password'
"""
import argparse

from sqlalchemy import select

from app.core.security import hash_password
from app.db.database import SessionLocal, engine
from app.models import Base, Church, Role, User


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--church-name", required=True)
    p.add_argument("--timezone", default="Africa/Douala")
    p.add_argument("--admin-name", required=True)
    p.add_argument("--admin-email", required=True)
    p.add_argument("--admin-phone", required=True)
    p.add_argument("--admin-password", required=True)
    a = p.parse_args()

    Base.metadata.create_all(engine)

    with SessionLocal() as db:
        roles = {}
        for name, desc in (("admin", "Can manage services and see attendance"), ("member", "Regular user")):
            role = db.scalar(select(Role).where(Role.name == name))
            if role is None:
                role = Role(name=name, description=desc)
                db.add(role)
            roles[name] = role

        church = db.scalar(select(Church).order_by(Church.created_at).limit(1))
        if church is None:
            church = Church(name=a.church_name, timezone=a.timezone)
            db.add(church)
        db.flush()

        email = a.admin_email.lower()
        if db.scalar(select(User.id).where(User.church_id == church.id, User.email == email)):
            print("Admin user already exists, nothing to do.")
        else:
            db.add(
                User(
                    church_id=church.id,
                    role_id=roles["admin"].id,
                    full_name=a.admin_name,
                    email=email,
                    phone="".join(c for c in a.admin_phone if c.isdigit() or c == "+"),
                    password_hash=hash_password(a.admin_password),
                )
            )
            print(f"Created church '{church.name}' and admin {email}.")
        db.commit()


if __name__ == "__main__":
    main()
