"""Migrate an existing database to department membership approval.

Run from backend/ after setting DATABASE_URL:
    python -m scripts.migrate_membership_approval

Existing department memberships are marked ACTIVE once, so current users do
not lose access unexpectedly. New signup memberships are created as PENDING.
"""

from sqlalchemy import text

from app.db.database import engine


def main() -> None:
    with engine.begin() as connection:
        status_exists = connection.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'user_departments'
                  AND column_name = 'status'
                """
            )
        ).scalar()

        if not status_exists:
            connection.execute(
                text(
                    "ALTER TABLE user_departments "
                    "ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING'"
                )
            )
            connection.execute(
                text(
                    "ALTER TABLE user_departments "
                    "ADD COLUMN reviewed_at TIMESTAMPTZ NULL"
                )
            )
            connection.execute(
                text(
                    "ALTER TABLE user_departments "
                    "ADD COLUMN reviewed_by UUID NULL "
                    "REFERENCES users(id) ON DELETE SET NULL"
                )
            )
            # Preserve access for memberships that existed before approval was introduced.
            connection.execute(
                text("UPDATE user_departments SET status = 'ACTIVE'")
            )
        else:
            # Older partial migrations may have status but not the review metadata.
            connection.execute(
                text(
                    "ALTER TABLE user_departments "
                    "ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL"
                )
            )
            connection.execute(
                text(
                    "ALTER TABLE user_departments "
                    "ADD COLUMN IF NOT EXISTS reviewed_by UUID NULL "
                    "REFERENCES users(id) ON DELETE SET NULL"
                )
            )

        connection.execute(
            text("ALTER TABLE user_departments DROP CONSTRAINT IF EXISTS ck_user_departments_status")
        )
        connection.execute(
            text(
                "ALTER TABLE user_departments ADD CONSTRAINT "
                "ck_user_departments_status CHECK "
                "(status IN ('PENDING', 'ACTIVE', 'REJECTED'))"
            )
        )
        connection.execute(
            text("CREATE INDEX IF NOT EXISTS ix_user_departments_status ON user_departments(status)")
        )

    print("Department membership approval migration completed.")


if __name__ == "__main__":
    main()
