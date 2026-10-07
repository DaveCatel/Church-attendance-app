"""baseline: department membership approval

The tables themselves are created by scripts/init_db.py (create_all). This first
revision makes sure the department approval columns exist, so it also replaces
scripts/migrate_membership_approval.py. Every step checks first, so it is safe on a
database that already has them.

Revision ID: 0001
Revises:
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table("user_departments"):
        return  # brand new database: init_db creates everything with the right columns

    columns = {c["name"] for c in insp.get_columns("user_departments")}
    if "status" not in columns:
        op.add_column(
            "user_departments",
            sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        )
        # people who were already in a department before approval existed stay members
        op.execute("UPDATE user_departments SET status = 'ACTIVE'")
    if "reviewed_at" not in columns:
        op.add_column(
            "user_departments", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True)
        )
    if "reviewed_by" not in columns:
        op.add_column(
            "user_departments",
            sa.Column(
                "reviewed_by",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )


def downgrade() -> None:
    pass  # the baseline is never undone
