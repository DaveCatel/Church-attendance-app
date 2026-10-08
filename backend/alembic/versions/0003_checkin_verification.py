"""check-in verification: church location, service verification mode, review data

Every column is added only if it is missing, so this is safe on a database where some
of them already exist.

Revision ID: 0003
Revises: 0002
"""
import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

# (table, column name, type, nullable, server default)
COLUMNS = [
    ("churches", "latitude", sa.Float(), True, None),
    ("churches", "longitude", sa.Float(), True, None),
    ("churches", "geofence_radius_m", sa.Integer(), False, "200"),
    # existing services keep working exactly as before until an admin turns checking on
    ("service_templates", "verification_mode", sa.String(20), False, "NONE"),
    ("attendance_records", "latitude", sa.Float(), True, None),
    ("attendance_records", "longitude", sa.Float(), True, None),
    ("attendance_records", "accuracy_m", sa.Float(), True, None),
    ("attendance_records", "distance_m", sa.Integer(), True, None),
    ("attendance_records", "ip_address", sa.String(45), True, None),
    ("attendance_records", "verification_flags", sa.String(200), True, None),
    ("attendance_records", "review_status", sa.String(20), False, "OK"),
]


def upgrade() -> None:
    insp = sa.inspect(op.get_bind())
    existing: dict[str, set[str]] = {}
    for table, name, type_, nullable, default in COLUMNS:
        if table not in existing:
            existing[table] = {c["name"] for c in insp.get_columns(table)}
        if name not in existing[table]:
            op.add_column(
                table, sa.Column(name, type_, nullable=nullable, server_default=default)
            )


def downgrade() -> None:
    for table, name, *_ in reversed(COLUMNS):
        names = {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}
        if name in names:
            op.drop_column(table, name)
