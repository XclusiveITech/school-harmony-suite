# Running the backend so the preview works

You run it on your own machine; the preview in your browser talks straight to
`http://localhost:8000`. The frontend already points there
(`.env` → `VITE_API_URL=http://localhost:8000`), so nothing in the app changes.

The backend package is `brainstar_django_backend.zip` (in Files).

## 1. Create the database from the dump

Use the dump that already contains the admin login:

```bash
mysql -uroot -p < brainstar_mysql_with_superadmin_v2.sql
```

This creates database **`brainstar`** (93 tables) and the admin user.

## 2. Install and configure

```bash
unzip brainstar_django_backend.zip
cd brainstar_backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Then edit `.env` — the one line that matters:

```
DB_NAME=brainstar
```

`.env.example` ships `DB_NAME=brainstar_db`, but the dump creates `brainstar`,
so leave it as-is and every page will fail to connect.

Also keep:

```
DEBUG=True
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_HOST=127.0.0.1
DB_PORT=3306
```

CORS is already correct for the preview: `settings.py` allows any
`https://*.lovable.app` origin, and `CORS_ALLOW_ALL_ORIGINS` defaults to `DEBUG`.
No edit needed.

## 3. Mark the migrations as applied

The dump already created every table, so a plain `migrate` would try to build
them again and stop with "table already exists". Use:

```bash
python manage.py migrate --fake-initial
```

If that reports a conflict on one app, run it per app:
`python manage.py migrate <app> --fake-initial`.

## 4. Run it

```bash
python manage.py runserver 0.0.0.0:8000
```

Check it is alive in another terminal:

```bash
curl http://localhost:8000/api/health/     # -> {"status": "ok"}
```

## 5. Sign in to the preview

Open the preview, go to `/login`, and use:

```
admin@gmail.com / admin123
```

Keep the Django terminal open — closing it stops the API and every module
falls back to its "backend unreachable" message.

---

## What will work from this package

Auth (login, refresh, `/api/auth/me/`, change password), plus CRUD for:
core (branches, roles, settings), students, staff, academics (subjects,
classes, assessment), finance (ledger, cashbook, invoices, receipts, fees,
suppliers), requisitions, inventory, assets, tuckshop, canteen, boarding,
transport, online classes, portal.

## What will still error, and why

These frontend paths have no matching route in this package yet:

| Frontend calls | Missing from backend |
| --- | --- |
| `/api/hr/...` | backend registers staff under `/api/staff/...` |
| `/api/exams/...` | no exams app (only `academics_examtype`) |
| `/api/uniforms/...` | no uniforms app at all |
| `/api/students/attendance/...` | no attendance model in `students` |
| `/api/.../<id>/process/`, `/cancel/`, `/post/`, `/bulk/`, `/collect/` | no custom actions — `views.py` has no `@action` methods |
| `/api/auth/users/<id>/force-reset/`, `/lock/`, `/unlock/` | not routed in `urls.py` |

The code for those lives in the module guides already in the project:
`BACKEND_UNIFORMS.md`, `BACKEND_ATTENDANCE.md`, `BACKEND_ACADEMICS.md`,
`BACKEND_AUTH.md`, `BACKEND_HR.md`, `BACKEND_FINANCE.md`, `BACKEND_LEDGER.md`,
`BACKEND_PAYABLES.md`, `BACKEND_FEES.md`, `BACKEND_TUCKSHOP.md`,
`BACKEND_ASSETS.md`, `BACKEND_REPORTS.md`.

## If `pip install mysqlclient` fails

It needs a C compiler on some machines. Easiest fix on Windows: install the
prebuilt wheel from https://www.lfd.uci.edu/~gohlke/pythonlibs/#mysqlclient ,
or switch `settings.py` to `django.db.backends.sqlite3` just to prove the API
runs (the dump is MySQL, so you lose your data if you do that).
