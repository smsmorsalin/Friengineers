"""
Friengineers — Database layer.

Uses the Python standard library only (sqlite3 + hashlib + secrets).
No external dependencies, which keeps the whole system reliable and portable.

Tables:
  content  : one row per section (key -> JSON blob)
  admins   : admin accounts with PBKDF2-hashed passwords
  sessions : bearer auth tokens for the admin panel
  messages : contact form submissions
"""

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from pathlib import Path

from .seed_data import DEFAULT_ADMIN, DEFAULT_CONTENT

DB_PATH = os.environ.get(
    "FRIENGINEERS_DB",
    str(Path(__file__).resolve().parent.parent / "data" / "friengineers.db"),
)

_PBKDF2_ITERATIONS = 600_000
_SESSION_TTL = 60 * 60 * 12  # 12 hours


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS
    )
    return "pbkdf2_sha256${}${}${}".format(
        _PBKDF2_ITERATIONS,
        salt.hex(),
        digest.hex(),
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iterations, salt_hex, digest_hex = stored.split("$")
        if algo != "pbkdf2_sha256" or not 100_000 <= int(iterations) <= 2_000_000:
            return False
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
        if len(salt) != 16 or len(expected) != 32:
            return False
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, int(iterations)
        )
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


_DUMMY_PASSWORD_HASH = hash_password("invalid-login", b"0123456789abcdef")


# --------------------------------------------------------------------------
# Schema / seed
# --------------------------------------------------------------------------
def init_db() -> None:
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = _connect()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS content (
                section TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                admin_id INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT,
                body TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                read INTEGER NOT NULL DEFAULT 0
            );
            """
        )

        # Seed default content sections (only if missing).
        now = int(time.time())
        for section, payload in DEFAULT_CONTENT.items():
            conn.execute(
                "INSERT OR IGNORE INTO content(section, payload, updated_at) VALUES (?,?,?)",
                (section, json.dumps(payload, ensure_ascii=False), now),
            )

        # New installs must provide their own password; never ship a usable default.
        admins = conn.execute("SELECT id, username, password_hash FROM admins").fetchall()
        if not admins:
            if (
                not DEFAULT_ADMIN["username"]
                or len(DEFAULT_ADMIN["username"]) > 64
                or len(DEFAULT_ADMIN["password"]) < 12
                or len(DEFAULT_ADMIN["password"]) > 1024
            ):
                raise RuntimeError(
                    "Set FRIENGINEERS_ADMIN_USER (1-64 characters) and "
                    "FRIENGINEERS_ADMIN_PASSWORD (12-1024 characters) before first start."
                )
            conn.execute(
                "INSERT INTO admins(username, password_hash, created_at) VALUES (?,?,?)",
                (
                    DEFAULT_ADMIN["username"],
                    hash_password(DEFAULT_ADMIN["password"]),
                    now,
                ),
            )
        else:
            # Upgrade the previously bundled public default on existing installations.
            for admin in admins:
                if verify_password("friengineers@2026", admin["password_hash"]):
                    if (
                        len(DEFAULT_ADMIN["password"]) < 12
                        or len(DEFAULT_ADMIN["password"]) > 1024
                        or DEFAULT_ADMIN["password"] == "friengineers@2026"
                        or not DEFAULT_ADMIN["username"]
                        or len(DEFAULT_ADMIN["username"]) > 64
                    ):
                        raise RuntimeError(
                            "The bundled admin password is still active. Set FRIENGINEERS_ADMIN_PASSWORD "
                            "to a unique 12-1024 character value before starting."
                        )
                    conn.execute(
                        "UPDATE admins SET username=?, password_hash=? WHERE id=?",
                        (DEFAULT_ADMIN["username"], hash_password(DEFAULT_ADMIN["password"]), admin["id"]),
                    )
                    conn.execute("DELETE FROM sessions WHERE admin_id=?", (admin["id"],))

        conn.commit()
    finally:
        conn.close()


# --------------------------------------------------------------------------
# Content access
# --------------------------------------------------------------------------
def get_section(section: str):
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT payload, updated_at FROM content WHERE section=?", (section,)
        ).fetchone()
        if not row:
            return None
        return json.loads(row["payload"])
    finally:
        conn.close()


def get_all_content():
    conn = _connect()
    try:
        rows = conn.execute("SELECT section, payload, updated_at FROM content").fetchall()
        return {
            r["section"]: json.loads(r["payload"])
            for r in rows
        }
    finally:
        conn.close()


def save_section(section: str, payload: dict) -> None:
    conn = _connect()
    try:
        conn.execute(
            """
            INSERT INTO content(section, payload, updated_at) VALUES (?,?,?)
            ON CONFLICT(section) DO UPDATE SET
                payload=excluded.payload,
                updated_at=excluded.updated_at
            """,
            (section, json.dumps(payload, ensure_ascii=False), int(time.time())),
        )
        conn.commit()
    finally:
        conn.close()


# --------------------------------------------------------------------------
# Admin auth
# --------------------------------------------------------------------------
def authenticate(username: str, password: str):
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT id, username, password_hash FROM admins WHERE username=?", (username,)
        ).fetchone()
        if not row:
            verify_password(password, _DUMMY_PASSWORD_HASH)
            return None
        if not verify_password(password, row["password_hash"]):
            return None
        token = secrets.token_urlsafe(32)
        now = int(time.time())
        conn.execute("DELETE FROM sessions WHERE expires_at < ? OR created_at < ?", (now, now - _SESSION_TTL))
        conn.execute(
            "INSERT INTO sessions(token, admin_id, expires_at, created_at) VALUES (?,?,?,?)",
            (hashlib.sha256(token.encode("utf-8")).hexdigest(), row["id"], now + _SESSION_TTL, now),
        )
        # Upgrade hashes created with the old, lower work factor after a successful login.
        if int(row["password_hash"].split("$")[1]) < _PBKDF2_ITERATIONS:
            conn.execute(
                "UPDATE admins SET password_hash=? WHERE id=?",
                (hash_password(password), row["id"]),
            )
        conn.commit()
        return {"token": token, "username": row["username"]}
    finally:
        conn.close()


def session_admin(token: str):
    conn = _connect()
    try:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        row = conn.execute(
            """
            SELECT s.token, s.expires_at, s.created_at, a.username
            FROM sessions s JOIN admins a ON a.id = s.admin_id
            WHERE s.token=?
            """,
            (token_hash,),
        ).fetchone()
        # Support and migrate sessions issued before token-at-rest hashing.
        if not row:
            row = conn.execute(
                "SELECT s.token, s.expires_at, s.created_at, a.username FROM sessions s "
                "JOIN admins a ON a.id=s.admin_id WHERE s.token=?", (token,)
            ).fetchone()
            if row:
                conn.execute("UPDATE sessions SET token=? WHERE token=?", (token_hash, token))
                conn.commit()
        if not row:
            return None
        now = int(time.time())
        if row["expires_at"] < now or row["created_at"] + _SESSION_TTL < now:
            conn.execute("DELETE FROM sessions WHERE token=?", (row["token"],))
            conn.commit()
            return None
        return {"token": token, "username": row["username"]}
    finally:
        conn.close()


def logout(token: str) -> None:
    conn = _connect()
    try:
        conn.execute("DELETE FROM sessions WHERE token=?", (hashlib.sha256(token.encode("utf-8")).hexdigest(),))
        conn.execute("DELETE FROM sessions WHERE token=?", (token,))
        conn.commit()
    finally:
        conn.close()


def change_password(username: str, current_password: str, new_password: str) -> bool:
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT id, password_hash FROM admins WHERE username=?", (username,)
        ).fetchone()
        if not row or not verify_password(current_password, row["password_hash"]):
            return False
        conn.execute(
            "UPDATE admins SET password_hash=? WHERE username=?",
            (hash_password(new_password), username),
        )
        conn.execute("DELETE FROM sessions WHERE admin_id=?", (row["id"],))
        conn.commit()
        return True
    finally:
        conn.close()


# --------------------------------------------------------------------------
# Contact messages
# --------------------------------------------------------------------------
def add_message(name: str, email: str, subject: str, body: str) -> int:
    conn = _connect()
    try:
        cur = conn.execute(
            "INSERT INTO messages(name, email, subject, body, created_at) VALUES (?,?,?,?,?)",
            (name, email, subject, body, int(time.time())),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def list_messages() -> list[dict]:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT * FROM messages ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def delete_message(message_id: int) -> bool:
    conn = _connect()
    try:
        cur = conn.execute("DELETE FROM messages WHERE id=?", (message_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def mark_message_read(message_id: int) -> None:
    conn = _connect()
    try:
        conn.execute("UPDATE messages SET read=1 WHERE id=?", (message_id,))
        conn.commit()
    finally:
        conn.close()
