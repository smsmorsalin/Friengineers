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
import mimetypes
import os
import re
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from . import db

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"
HOST = os.environ.get("FRIENGINEERS_HOST", "0.0.0.0")
PORT = int(os.environ.get("FRIENGINEERS_PORT", "8080"))

# Public sections allowed to be served to the unauthenticated site.
PUBLIC_SECTIONS = {
    "brand", "hero", "about", "services", "projects",
    "team", "contact", "footer",
}

# Sections the admin panel may write to.
EDITABLE_SECTIONS = PUBLIC_SECTIONS


# --------------------------------------------------------------------------
# Route table
# --------------------------------------------------------------------------
class Handler(BaseHTTPRequestHandler):
    server_version = "Friengineers/1.0"

    # -- helpers ------------------------------------------------------------
    def _send_json(self, status: int, payload) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return None

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
        body = self._read_json()
        if body is None:
            self._send_json(400, {"error": "Invalid JSON body"})
            return

        if path == "/api/auth/login":
            username = str(body.get("username", "")).strip()
            password = str(body.get("password", ""))
            if not username or not password:
                self._send_json(400, {"error": "Username and password required"})
                return
            result = db.authenticate(username, password)
            if not result:
                self._send_json(401, {"error": "Invalid credentials"})
                return
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
            new_password = str(body.get("new_password", ""))
            if len(new_password) < 8:
                self._send_json(400, {"error": "Password must be at least 8 characters"})
                return
            db.change_password(admin["username"], new_password)
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
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
                self._send_json(400, {"error": "Invalid email address"})
                return
            if len(message) > 5000:
                self._send_json(400, {"error": "Message is too long"})
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
    print("  Default admin login:  admin / friengineers@2026")
    print("  (Change it from the admin panel after first login!)")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Shutting down...")
        httpd.shutdown()


if __name__ == "__main__":
    run()
