"""Back up the database with pg_dump.

Run from the backend folder:

    python -m scripts.backup_db                  # writes backups/church_attendance_<time>.dump
    python -m scripts.backup_db --keep 30        # keep the 30 newest backups (default 14)
    python -m scripts.backup_db --dir D:\\backups

Needs the PostgreSQL command line tools (pg_dump) on the PATH. Restore with:

    pg_restore --clean --if-exists --no-owner -d <database> <file.dump>
"""
import argparse
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy.engine import make_url

from app.core.config import settings


def main() -> int:
    parser = argparse.ArgumentParser(description="Back up the church attendance database")
    parser.add_argument("--dir", default="backups", help="where to put the backup files")
    parser.add_argument("--keep", type=int, default=14, help="how many backups to keep")
    args = parser.parse_args()

    if shutil.which("pg_dump") is None:
        print("pg_dump was not found. Install the PostgreSQL client tools and add them to PATH.")
        return 1

    url = make_url(settings.DATABASE_URL)
    out_dir = Path(args.dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / f"church_attendance_{datetime.now():%Y%m%d_%H%M%S}.dump"

    command = ["pg_dump", "--format=custom", "--no-owner", "--file", str(target)]
    if url.host:
        command += ["--host", url.host]
    if url.port:
        command += ["--port", str(url.port)]
    if url.username:
        command += ["--username", url.username]
    command.append(url.database)

    env = dict(os.environ)
    if url.password:
        env["PGPASSWORD"] = url.password  # keeps the password out of the process list

    result = subprocess.run(command, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        target.unlink(missing_ok=True)
        print("Backup failed:\n" + result.stderr.strip())
        return 1

    # keep only the newest backups
    old = sorted(out_dir.glob("church_attendance_*.dump"), reverse=True)[args.keep :]
    for path in old:
        path.unlink(missing_ok=True)

    size_kb = target.stat().st_size / 1024
    print(f"Backup written to {target} ({size_kb:.0f} KB). Removed {len(old)} old backup(s).")
    print("Copy it somewhere off this machine as well; a backup on the same disk is not enough.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
