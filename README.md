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
- **Employee directory**
  - Public read-only employee profiles with photo, graduation university, skills, email, and phone
  - Administrators can add, edit, or remove profiles from the admin panel
- **Contact form** that stores submissions in the database
- **Zero dependencies** — pure Python standard library + SQLite. Nothing
  to install, nothing to break. Runs on any machine with Python 3.8+.

---

## 🚀 Quick Start

Requires **Python 3.8+**. No `pip install` needed.

```bash
cd friengineers
# Configure a unique administrator password before the first start.
export FRIENGINEERS_ADMIN_USER=admin
export FRIENGINEERS_ADMIN_PASSWORD='replace-with-a-unique-password-of-12-or-more-characters'
python3 run.py
```

On Windows PowerShell, set the same values in the server's environment before
running `python run.py`:

```powershell
$env:FRIENGINEERS_ADMIN_USER = "admin"
$env:FRIENGINEERS_ADMIN_PASSWORD = "your-private-unique-password"
python run.py
```


Then open:

| What            | URL                        |
|-----------------|----------------------------|
| Website         | http://localhost:8080      |
| Employee directory | http://localhost:8080/employees.html |
| Admin panel     | http://localhost:8080/admin.html |
| API             | http://localhost:8080/api/content |

### Administrator login

Set `FRIENGINEERS_ADMIN_USER` and `FRIENGINEERS_ADMIN_PASSWORD` before the
first start. Keep the password private and use a unique value of 12 or more
characters. Existing databases with the old bundled password must set
`FRIENGINEERS_ADMIN_PASSWORD` once to rotate it at startup.

### Employee directory

Sign in to the admin panel and open **Employees** in the sidebar to add, edit,
or remove a profile. A profile can include the employee's name, photo URL,
job title, bio, graduation university, skills, email, and phone number. Photo
URLs must use `http://` or `https://`.

Visitors can open `/employees.html` or choose **Employees** from the site
navigation to view the directory. Visitors do not get controls to change
profiles; all create, update, and delete requests require an administrator
session. Employee email addresses and phone numbers are shown publicly when
provided in a profile.

---

## 🛠 Running Options

```bash
python3 run.py                # default: 127.0.0.1:8080 (local only)
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
| GET    | `/api/employees` | Public, read-only employee directory |

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
| GET    | `/api/admin/employees`          | List employee profiles |
| POST   | `/api/admin/employees`          | Add or update employee profile |
| DELETE | `/api/admin/employees/:id`      | Delete employee profile |

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
│   ├── employees.html      # Public, read-only employee directory
│   ├── admin.html          # Content management panel
│   ├── css/
│   │   ├── style.css       # Landing page styles
│   │   └── admin.css       # Admin panel styles
│   ├── js/
│   │   ├── main.js         # Rendering + animations + contact form
│   │   ├── employees.js    # Public employee directory rendering
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
