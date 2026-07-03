# MediCore AI — Product Requirements

## Original problem statement (verbatim)

> I make this project but I do not know that which feature is access to which
> role. and Also have some bugs so please solve it. here some static data
> store in it which all are remove it and make one file which I run it
> directly all data stored in database and those all data need real time base.

## Project overview

A hospital management web application with **6 user roles**:
admin, doctor, radiologist, lab_tech, receptionist, patient.

* Frontend: **React 19 + Vite** (started by supervisor with `yarn start`)
* Backend:  **FastAPI + Motor (async MongoDB)**
* Database: **MongoDB** (local, name = `medicore`)
* Auth:     JWT bearer tokens, OAuth2PasswordRequestForm login,
            bcrypt password hashing, optional TOTP MFA, forgot-password
            with OTP, 30-min idle session timeout, full audit logging.

All API routes are mounted under `/api`.

## Architecture

```
/app/
├── backend/
│   ├── server.py                  FastAPI app — all routes under /api
│   ├── seed.py                    One-shot DB seeder (wipes + repopulates)
│   ├── .env                       MONGO_URL, DB_NAME, SECRET_KEY
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx                Routing + role-based page gating
│   │   ├── constants.js           Colours · API_BASE = REACT_APP_BACKEND_URL+/api
│   │   ├── context/AuthContext    Session timer, login/logout, admin-exists check
│   │   ├── services/api.js        All HTTP helpers (auth, patient, doctor, …)
│   │   ├── components/            Sidebar, MFA setup, UI primitives
│   │   └── pages/                 17 feature pages
│   ├── .env                       REACT_APP_BACKEND_URL
│   ├── vite.config.js             Exposes REACT_APP_BACKEND_URL to client
│   └── package.json
├── ROLES.md                       Role → feature matrix
└── memory/                        Test credentials & this PRD
```

## What's been implemented (Iteration 1 — Jan 2026)

* **Migrated** the user-supplied codebase to `/app` (replaces template).
* **Backend adapted** to platform requirements:
  * Every route mounted under `/api` via `APIRouter(prefix="/api")`.
  * Auto-seeded drug/facility/alert collections **removed** —
    seed.py is now the single source of truth.
  * Duplicate `/reports` endpoints **deleted** (cleaner registration).
  * New `/api/doctors` endpoint backed by users-with-role=doctor.
  * New `/api/auth/admin-exists` endpoint so the frontend can switch
    between "first-time admin setup" and "regular login" without
    relying on `localStorage`.
* **Frontend adapted**:
  * `yarn start` now runs Vite on port 3000.
  * `process.env.REACT_APP_BACKEND_URL` exposed through `vite.config.js`.
  * All `MOCK_*` / `SEED_*` static seed arrays that were displayed as
    "fake data" have been removed and replaced with real API fetches:
    `DoctorPage`, `AdminPage`, `MedicinePage`, `ResourcePage`,
    `ContactPage`, `EHRPage`, `PatientPage`, `PatientPortalPage`,
    `AppointmentPage`, `CollaborationPage`, `AuditLogsPage`,
    `ReportPage`, `AnalyticsPage`, `DiagnosisPage`.
  * AuthContext now queries `/auth/admin-exists` instead of using a
    stale localStorage flag.
  * Patient portal sign-out fixed (uses AuthContext.logout properly).
  * Defensive look-ups for doctor/slot so the booking modal no longer
    crashes when the static `"d1"` default no longer exists.
* **Seed script** (`/app/backend/seed.py`):
  * 14 users (1 admin, 5 doctors, 1 radiologist, 1 lab_tech,
    1 receptionist, 5 patients) — all with `Password123!`.
  * 5 patient records linked to their portal accounts.
  * 10 drugs · 4 facilities · 4 resource alerts.
  * 10 appointments (mix of upcoming/completed) · 5 AI scan results.
  * 5 prescriptions · 5 lab results · 5 SOAP visit-notes ·
    5 invoices · 6 message+notification pairs · signed reports.
* **`ROLES.md`** added at repo root — clear role→feature matrix
  along with the granular backend permission map.
* **32 automated backend tests** all passing (see
  `/app/backend/tests/test_medicore_backend.py`).

## Backend test coverage (iteration 1)

| Area                            | Status |
|---------------------------------|:------:|
| Health & DB connectivity        |  ✅   |
| Login (all 6 roles)             |  ✅   |
| /auth/me, /auth/admin-exists    |  ✅   |
| CRUD on patients/appointments   |  ✅   |
| Drugs / prescriptions           |  ✅   |
| Reports + signing               |  ✅   |
| Admin endpoints + 403 for non-admin | ✅ |
| Patient portal endpoints + 403 for non-patient | ✅ |
| Audit logs                      |  ✅   |
| Analytics overview              |  ✅   |
| Doctors directory               |  ✅   |

## Prioritised backlog

P0 (done in iter 1):
- Role → feature documentation
- Replace static MOCK/SEED arrays with API fetches
- Single seed.py for all DB collections
- Backend `/api` prefix + duplicate-route cleanup

P1 (open):
- Frontend automated tests (Playwright) for each role's view
- Visual polish: replace emoji icons with a font-icon set for accessibility

P2 (open / future):
- Split the 2.1k-line `server.py` into routers per domain
- Tighten CORS to known origins from env (currently `*`)
- Real email/SMS providers for password reset and reminders
- WebSocket-based real-time chat (currently REST polling)
- Multi-tenant support (per-clinic isolation)

## Test credentials

See `/app/memory/test_credentials.md`.

## Last updated

Jan 2026 — Iteration 1
