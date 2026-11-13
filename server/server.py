"""
Friengineers — HTTP server.

Pure Python standard library (http.server), zero external dependencies.

Serves:
  /              -> public/index.html
  /admin.html    -> admin panel
  /api/*         -> JSON API (content, auth, contact, messages)
  /css/* /js/*   -> static assets
  everything else-> static files under public/
"""

import json
import html
import mimetypes
import os
import re
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from html.parser import HTMLParser
from pathlib import Path

from . import db

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"
HOST = os.environ.get("FRIENGINEERS_HOST", "127.0.0.1")
PORT = int(os.environ.get("FRIENGINEERS_PORT", "8080"))

# Public sections allowed to be served to the unauthenticated site.
PUBLIC_SECTIONS = {
    "brand", "hero", "about", "services", "projects",
    "team", "contact", "footer",
}

# Sections the admin panel may write to.
EDITABLE_SECTIONS = PUBLIC_SECTIONS
MAX_BODY_BYTES = 64 * 1024
LOGIN_WINDOW_SECONDS = 15 * 60
LOGIN_MAX_ATTEMPTS = 5
_login_lock = threading.Lock()
_login_failures = {}
_contact_submissions = {}


class _HeadlineSanitizer(HTMLParser):
    """Allow only the decorative gradient span in editable hero headlines."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.open_spans = 0

    def handle_starttag(self, tag, attrs):
        if tag == "span" and attrs == [("class", "grad")]:
            self.parts.append('<span class="grad">')
            self.open_spans += 1

    def handle_endtag(self, tag):
        if tag == "span" and self.open_spans:
            self.parts.append("</span>")
            self.open_spans -= 1

    def handle_data(self, data):
        self.parts.append(html.escape(data, quote=False))

    def close(self):
        super().close()
        if self.open_spans:
            self.parts.extend(["</span>"] * self.open_spans)
            self.open_spans = 0


def _sanitize_headline(value):
    parser = _HeadlineSanitizer()
    parser.feed(str(value))
    parser.close()
    return "".join(parser.parts)


# --------------------------------------------------------------------------
# Route table
# --------------------------------------------------------------------------
class Handler(BaseHTTPRequestHandler):
    server_version = ""

    def version_string(self):
        return "Friengineers"

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; "
            "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        )
        super().end_headers()

    # -- helpers ------------------------------------------------------------
    def _send_json(self, status: int, payload, headers=None) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self):
        try:
            length = int(self.headers.get("Content-Length", 0) or 0)
        except (TypeError, ValueError):
            raise ValueError("Invalid Content-Length")
        if length < 0:
            raise ValueError("Invalid Content-Length")
        if length > MAX_BODY_BYTES:
            raise OverflowError("Request body is too large")
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            body = json.loads(raw.decode("utf-8"))
            return body if isinstance(body, dict) else None
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None

    def _login_rate_limited(self, record_failure=False, success=False):
        ip = self.client_address[0]
        now = time.time()
        with _login_lock:
            attempts = [t for t in _login_failures.get(ip, []) if now - t < LOGIN_WINDOW_SECONDS]
            if success:
                _login_failures.pop(ip, None)
                return False, 0
            if record_failure:
                attempts.append(now)
            _login_failures[ip] = attempts
            if len(_login_failures) > 10000:
                for key, times in list(_login_failures.items()):
                    if not times or now - times[-1] >= LOGIN_WINDOW_SECONDS:
                        _login_failures.pop(key, None)
            if len(attempts) >= LOGIN_MAX_ATTEMPTS:
                return True, max(1, int(LOGIN_WINDOW_SECONDS - (now - attempts[0])))
            return False, 0

    def _contact_rate_limited(self):
        now = time.time()
        ip = self.client_address[0]
        with _login_lock:
            recent = [t for t in _contact_submissions.get(ip, []) if now - t < 600]
            if len(recent) >= 5:
                return True, max(1, int(600 - (now - recent[0])))
            recent.append(now)
            _contact_submissions[ip] = recent
            if len(_contact_submissions) > 10000:
                for key, times in list(_contact_submissions.items()):
                    if not times or now - times[-1] >= 600:
                        _contact_submissions.pop(key, None)
            return False, 0

    def _send_static(self, rel_path: str) -> None:
        rel_path = urllib.parse.unquote(rel_path.lstrip("/"))
        # Resolve safely — never escape the public directory.
        target = (PUBLIC_DIR / rel_path).resolve()
        try:
            target.relative_to(PUBLIC_DIR.resolve())
        except ValueError:
            self.send_error(403, "Forbidden")
            return

        if rel_path == "" or rel_path == "index.html":
            target = PUBLIC_DIR / "index.html"

        if not target.exists() or target.is_dir():
            # Try index.html for directory paths.
            if (target / "index.html").exists():
                target = target / "index.html"
            else:
                self.send_error(404, "Not Found")
                return

        ctype, _ = mimetypes.guess_type(str(target))
        ctype = ctype or "application/octet-stream"
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def _require_admin(self):
        auth = self.headers.get("Authorization", "")
        token = auth[7:] if auth.startswith("Bearer ") else ""
        if not token:
            return None
        return db.session_admin(token)

    # -- GET ----------------------------------------------------------------
    def do_GET(self):  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"

        if path == "/api/content":
            self._send_json(200, db.get_all_content())
            return
        if path.startswith("/api/content/"):
            section = path[len("/api/content/"):]
            if section in PUBLIC_SECTIONS:
                payload = db.get_section(section)
                if payload is None:
                    self._send_json(404, {"error": "Section not found"})
                else:
                    self._send_json(200, payload)
            else:
                self._send_json(404, {"error": "Section not found"})
            return

        if path == "/api/admin/messages":
            admin = self._require_admin()
            if not admin:
                self._send_json(401, {"error": "Unauthorized"})
                return
            self._send_json(200, {"messages": db.list_messages()})
            return

        if path == "/api/health":
            self._send_json(200, {"status": "ok", "service": "friengineers"})
            return

        self._send_static(parsed.path)

    # -- POST ---------------------------------------------------------------
    def do_POST(self):  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        try:
            body = self._read_json()
        except OverflowError:
            self._send_json(413, {"error": "Request body is too large"})
            return
        except ValueError:
            self._send_json(400, {"error": "Invalid Content-Length"})
            return
        if body is None:
            self._send_json(400, {"error": "Invalid JSON body"})
            return

        if path == "/api/auth/login":
            limited, retry_after = self._login_rate_limited()
            if limited:
                self._send_json(
                    429,
                    {"error": "Too many login attempts. Try again later."},
                    {"Retry-After": str(retry_after)},
                )
                return
            username = str(body.get("username", "")).strip()
            password = str(body.get("password", ""))
            if not username or not password or len(username) > 64 or len(password) > 1024:
                self._send_json(400, {"error": "Username and password required"})
                return
            result = db.authenticate(username, password)
            if not result:
                self._login_rate_limited(record_failure=True)
                self._send_json(401, {"error": "Invalid credentials"})
                return
            self._login_rate_limited(success=True)
            self._send_json(200, result)
            return

        if path == "/api/auth/logout":
            admin = self._require_admin()
            if admin:
                db.logout(admin["token"])
            self._send_json(200, {"ok": True})
            return

        if path == "/api/admin/change-password":
            admin = self._require_admin()
            if not admin:
                self._send_json(401, {"error": "Unauthorized"})
                return
            current_password = str(body.get("current_password", ""))
            new_password = str(body.get("new_password", ""))
            if len(new_password) < 12 or len(new_password) > 1024:
                self._send_json(400, {"error": "Password must be between 12 and 1024 characters"})
                return
            if not db.change_password(admin["username"], current_password, new_password):
                self._send_json(403, {"error": "Current password is incorrect"})
                return
            self._send_json(200, {"ok": True})
            return

        if path == "/api/admin/content":
            admin = self._require_admin()
            if not admin:
                self._send_json(401, {"error": "Unauthorized"})
                return
            section = str(body.get("section", "")).strip()
            payload = body.get("payload")
            if section not in EDITABLE_SECTIONS or not isinstance(payload, dict):
                self._send_json(400, {"error": "Invalid section or payload"})
                return
            if len(json.dumps(payload, ensure_ascii=False).encode("utf-8")) > 48 * 1024:
                self._send_json(413, {"error": "Section content is too large"})
                return
            if section == "hero" and isinstance(payload.get("headline"), str):
                payload["headline"] = _sanitize_headline(payload["headline"])
            db.save_section(section, payload)
            self._send_json(200, {"ok": True, "section": section})
            return

        if path == "/api/admin/reset":
            admin = self._require_admin()
            if not admin:
                self._send_json(401, {"error": "Unauthorized"})
                return
            from .seed_data import DEFAULT_CONTENT
            now = int(time.time())
            for section, payload in DEFAULT_CONTENT.items():
                db.save_section(section, payload)
            self._send_json(200, {"ok": True, "reset": True})
            return

        if path == "/api/contact":
            name = str(body.get("name", "")).strip()
            email = str(body.get("email", "")).strip()
            subject = str(body.get("subject", "")).strip()
            message = str(body.get("message", "")).strip()
            if not name or not email or not message:
                self._send_json(400, {"error": "Name, email and message are required"})
                return
            if len(name) > 120 or len(email) > 254 or len(subject) > 200:
                self._send_json(400, {"error": "A contact field is too long"})
                return
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
                self._send_json(400, {"error": "Invalid email address"})
                return
            if len(message) > 5000:
                self._send_json(400, {"error": "Message is too long"})
                return
            limited, retry_after = self._contact_rate_limited()
            if limited:
                self._send_json(
                    429,
                    {"error": "Too many messages from this connection. Please try again later."},
                    {"Retry-After": str(retry_after)},
                )
                return
            msg_id = db.add_message(name, email, subject, message)
            self._send_json(200, {"ok": True, "id": msg_id})
            return

        self._send_json(404, {"error": "Not Found"})

    # -- DELETE -------------------------------------------------------------
    def do_DELETE(self):  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        admin = self._require_admin()
        if not admin:
            self._send_json(401, {"error": "Unauthorized"})
            return

        match = re.match(r"^/api/admin/messages/(\d+)$", path)
        if match:
            ok = db.delete_message(int(match.group(1)))
            if not ok:
                self._send_json(404, {"error": "Message not found"})
                return
            self._send_json(200, {"ok": True})
            return

        self._send_json(404, {"error": "Not Found"})

    # -- misc ---------------------------------------------------------------
    def log_message(self, fmt, *args):  # noqa: A003
        # Quiet, clean logging.
        if os.environ.get("FRIENGINEERS_VERBOSE"):
            super().log_message(fmt, *args)


def create_server(host: str = HOST, port: int = PORT) -> ThreadingHTTPServer:
    db.init_db()
    return ThreadingHTTPServer((host, port), Handler)


def run() -> None:
    db.init_db()
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print("=" * 60)
    print("  Friengineers — website + content API")
    print(f"  Site:   http://localhost:{PORT}")
    print(f"  Admin:  http://localhost:{PORT}/admin.html")
    print(f"  Health: http://localhost:{PORT}/api/health")
    print("=" * 60)
    print("  Admin credentials are configured through environment variables.")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Shutting down...")
        httpd.shutdown()


if __name__ == "__main__":
    run()
