# Friengineers — Website & Content Management

A modern, animated website for **Friengineers** with a built-in content
management backend. Engineered by friends, built on trust. 💙

![Tech](https://img.shields.io/badge/tech-pure%20Python%20stdlib-22d3ee)
![DB](https://img.shields.io/badge/database-SQLite-8b5cf6)
![Deps](https://img.shields.io/badge/dependencies-zero-34d399)

---

## ✨ Features

- **Modern animated landing page**
  - Interactive particle-network hero with glowing gradients
  - Scroll-reveal animations, animated counters, glassmorphism cards
  - Sticky glass navbar with active-link tracking & scroll progress bar
  - Fully responsive with mobile menu & reduced-motion support
- **Content Management Backend** (admin panel)
  - Schema-driven editor for every section (Hero, About, Services,
    Projects, Team, Contact, Footer)
  - Add / edit / remove list items (stats, values, services, projects…)
  - Contact-form message inbox with reply / delete
  - Change password & reset content to defaults
- **Contact form** that stores submissions in the database
- **Zero dependencies** — pure Python standard library + SQLite. Nothing
  to install, nothing to break. Runs on any machine with Python 3.8+.

---

## 🚀 Quick Start

Requires **Python 3.8+**. No `pip install` needed.

```bash
cd friengineers
python3 run.py
```


Then open:

| What            | URL                        |
|-----------------|----------------------------|
| Website         | http://localhost:8080      |
| Admin panel     | http://localhost:8080/admin.html |
| API             | http://localhost:8080/api/content |

### Default admin login

```
username: admin
password: friengineers@2026
```

> ⚠️ **Change this password immediately** from the admin panel → Settings.

---

## 🛠 Running Options

```bash
python3 run.py                # default: 0.0.0.0:8080
python3 run.py --port 9000    # custom port
python3 run.py --host 127.0.0.1   # localhost only
python3 run.py --reset        # reset database to default content
```

Or via environment variables:

```bash
FRIENGINEERS_PORT=9000 python3 run.py
FRIENGINEERS_DB=/path/to.db python3 run.py   # custom database location
```

---

## 📡 API Reference

### Public

| Method | Path            | Description                       |
|--------|-----------------|-----------------------------------|
| GET    | `/api/content`  | All site content (JSON)           |
| GET    | `/api/content/:section` | One section (e.g. `hero`)  |
| POST   | `/api/contact`  | Submit contact form message       |
| GET    | `/api/health`   | Health check                      |

### Admin (requires `Authorization: Bearer <token>`)

| Method | Path                            | Description            |
|--------|---------------------------------|------------------------|
| POST   | `/api/auth/login`               | Login, returns token   |
| POST   | `/api/auth/logout`              | Invalidate token       |
| POST   | `/api/admin/content`            | Save a section         |
| GET    | `/api/admin/messages`           | List contact messages  |
| DELETE | `/api/admin/messages/:id`       | Delete a message       |
| POST   | `/api/admin/change-password`    | Change admin password  |
| POST   | `/api/admin/reset`              | Reset content defaults |

Example — update the hero section:

```bash
curl -X POST http://localhost:8080/api/admin/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"section":"hero","payload":{"badge":"New badge","headline":"Hello","stats":[]}}'
```

---

## 🗂 Project Structure

```
friengineers/
├── run.py                  # Launcher (start the site)
├── public/
│   ├── index.html          # Main animated landing page
│   ├── admin.html          # Content management panel
│   ├── css/
│   │   ├── style.css       # Landing page styles
│   │   └── admin.css       # Admin panel styles
│   ├── js/
│   │   ├── main.js         # Rendering + animations + contact form
│   │   └── admin.js        # Admin logic (schema-driven editor)
│   └── assets/
│       └── favicon.svg
├── server/
│   ├── __init__.py
│   ├── server.py           # HTTP server + API routes
│   ├── db.py               # SQLite storage + auth (PBKDF2)
│   └── seed_data.py        # Default content
└── data/
    └── friengineers.db     # SQLite database (created on first run)
```

---

## 🔐 Security Notes

- Passwords are hashed with **PBKDF2-SHA256** (200,000 iterations, per-user salt).
- Admin sessions use **cryptographically random bearer tokens** (7-day expiry).
- Contact submissions are length-limited and email-validated.
- Static file serving is **path-traversal safe** (resolved and confined to `public/`).
- The admin panel is tagged `noindex, nofollow`.

For production, put it behind **HTTPS** (e.g. nginx + Let's Encrypt) and
change the default credentials.

---

## 🧰 Editing Content

Two ways to keep the site fresh:

1. **Admin panel** (easiest): `http://localhost:8080/admin.html`
   — edit text, add services, add projects, view contact messages.
2. **API directly**: see the reference above, or edit the database with
   any SQLite tool.

After saving in the admin panel, the live site reflects changes
immediately (no restart needed).
