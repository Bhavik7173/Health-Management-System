# MediCore AI — Role-Based Access Control (RBAC)

The platform supports **six roles**.  Each role can access only the
pages listed below.  The backend additionally enforces a per-action
permission matrix (`ROLE_PERMISSIONS` in `server.py`).

| Role            | Login email (seed)        | Description                                      |
|-----------------|---------------------------|--------------------------------------------------|
| `admin`         | `admin@medicore.ai`       | Full access to everything                        |
| `doctor`        | `lida@medicore.ai`        | Clinical workflow: patients, EHR, prescriptions  |
| `radiologist`   | `sofia@medicore.ai`       | Imaging review & report signing                  |
| `lab_tech`      | `lab@medicore.ai`         | Laboratory results entry                         |
| `receptionist`  | `reception@medicore.ai`   | Front-desk: appointments & patient registration  |
| `patient`       | `sarah@example.com`       | Patient portal only — own records                |

Default password for **all** seeded accounts: **`Password123!`**

## Feature → Role matrix

Legend:  ✅ = full access · 🔎 = read-only · — = no access

| Feature / Page          | admin | doctor | radiologist | lab_tech | receptionist | patient |
|-------------------------|:-----:|:------:|:-----------:|:--------:|:------------:|:-------:|
| Dashboard               |   ✅  |   ✅   |     ✅      |    ✅    |      ✅      |    —    |
| Patients                |   ✅  |   ✅   |     🔎      |    🔎    |      ✅      |    —    |
| Appointments / Schedule |   ✅  |   ✅   |      —      |     —    |      ✅      |    —    |
| Doctors directory       |   ✅  |   ✅   |      —      |     —    |      ✅      |    —    |
| Diagnosis (AI scans)    |   ✅  |   ✅   |     ✅      |    ✅    |       —      |    —    |
| EHR                     |   ✅  |   ✅   |     ✅      |     —    |       —      |    —    |
| Reports                 |   ✅  |   ✅   |     ✅      |    ✅    |       —      |    —    |
| Medicine / Prescriptions|   ✅  |   ✅   |      —      |     —    |       —      |    —    |
| Analytics               |   ✅  |   ✅   |      —      |     —    |       —      |    —    |
| Resources (ICU/forecast)|   ✅  |   ✅   |     ✅      |     —    |       —      |    —    |
| Chat / Messages         |   ✅  |   ✅   |     ✅      |    ✅    |      ✅      |    —    |
| Collaboration cases     |   ✅  |   ✅   |     ✅      |     —    |       —      |    —    |
| Admin panel             |   ✅  |    —   |      —      |     —    |       —      |    —    |
| Audit logs              |   ✅  |    —   |      —      |     —    |       —      |    —    |
| Patient Portal          |    —  |    —   |      —      |     —    |       —      |   ✅    |

The mapping is enforced in two places:

* **Frontend**: `/app/frontend/src/App.jsx → ROLE_ACCESS`, and the
  sidebar shown for each role in `components/Sidebar.jsx → ROLE_NAV`.
* **Backend**: `/app/backend/server.py → ROLE_PERMISSIONS` plus
  `require_roles(...)` decorators on individual endpoints.

## Granular API permissions (backend)

```
admin        : *                                    # everything
doctor       : patients:*  scans:*  appointments:*  prescriptions:*
               messages:*  analytics:read
radiologist  : scans:*  patients:read  reports:write  messages:*
lab_tech     : scans:*  labs:write  patients:read
receptionist : patients:*  appointments:*  billing:read
patient      : own:read  appointments:own  prescriptions:own  reports:own
```

## How to seed / reset the database

```bash
cd /app/backend
python3 seed.py
```

This wipes every collection and re-populates with realistic demo data
(14 users, 5 patients, 10 drugs, 4 facilities, 4 alerts, 10
appointments, 5 scans, signed reports, prescriptions, lab results,
visit notes, invoices, messages and notifications).
