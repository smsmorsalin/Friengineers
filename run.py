#!/usr/bin/env python3
"""
Friengineers — launcher.

Usage:
    python3 run.py                  # start the site on http://localhost:8080
    python3 run.py --port 9000      # custom port
    python3 run.py --host 127.0.0.1 # bind to localhost only
    python3 run.py --reset          # wipe the database and re-seed defaults
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from server import db  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Friengineers site server")
    parser.add_argument("--host", default=None, help="Bind address")
    parser.add_argument("--port", type=int, default=None, help="Port (default 8080)")
    parser.add_argument("--reset", action="store_true", help="Reset database to defaults")
    args = parser.parse_args()

    if args.reset:
        print("Resetting database to default content...")
        db_path = Path(db.DB_PATH)
        if db_path.exists():
            db_path.unlink()
        for suffix in ("-wal", "-shm"):
            p = Path(str(db_path) + suffix)
            if p.exists():
                p.unlink()

    if args.host:
        import os
        os.environ["FRIENGINEERS_HOST"] = args.host
    if args.port:
        import os
        os.environ["FRIENGINEERS_PORT"] = str(args.port)

    from server import server as srv
    srv.run()


if __name__ == "__main__":
    main()
