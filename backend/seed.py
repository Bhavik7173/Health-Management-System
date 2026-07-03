"""
MediCore AI — Database seed script
==================================

Run with:
    cd /app/backend && python3 seed.py

This single file wipes the database and populates it with realistic
demo data for every collection used by the application:

    users (admin, doctors, radiologist, lab_tech, receptionist, patients)
    patients              · scans            · prescriptions
    appointments          · reports          · visit_notes
    treatment_plans       · vitals_history   · lab_results
    drugs                 · facilities       · alerts
    cases (collaboration) · shared_scans     · telemedicine
    invoices              · messages         · notifications
    audit_logs            · availability

All login passwords default to:   Password123!
"""
import asyncio
import os
import random
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt as _bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# ── Setup ─────────────────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent / ".env")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME   = os.environ["DB_NAME"]

client = AsyncIOMotorClient(MONGO_URL)
db     = client[DB_NAME]

DEFAULT_PASSWORD = "Password123!"


def hash_pw(pw: str) -> str:
    return _bcrypt.hashpw(pw.encode("utf-8")[:72], _bcrypt.gensalt()).decode("utf-8")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def days_ago(n: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=n)).isoformat()


def date_str(offset_days: int = 0) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=offset_days)).date().isoformat()


# ── Static seed data ──────────────────────────────────────────────────────────
USERS_SEED = [
    # Admins
    {"name": "Admin User",          "email": "admin@medicore.ai",         "role": "admin",
     "specialty": "Administration", "location": "Head Office",            "color": "#4CAF82"},

    # Doctors
    {"name": "Dr. Lida Gutierrez",   "email": "lida@medicore.ai",        "role": "doctor",
     "specialty": "Heart Surgeon",   "location": "London, England",       "color": "#F47B7B",
     "phone": "+44 20 7946 0958"},
    {"name": "Dr. Mayme Gomez",      "email": "mayme@medicore.ai",       "role": "doctor",
     "specialty": "Cardiologist",    "location": "New York, USA",         "color": "#5B8DEF",
     "phone": "+1 212 555 0142"},
    {"name": "Dr. Christina Frazier","email": "christina@medicore.ai",   "role": "doctor",
     "specialty": "Neurologist",     "location": "London, England",       "color": "#4CAF82",
     "phone": "+44 20 7946 1212"},
    {"name": "Dr. Alma Reed",        "email": "alma@medicore.ai",        "role": "doctor",
     "specialty": "Oncologist",      "location": "Berlin, Germany",       "color": "#F5A623",
     "phone": "+49 30 12345678"},
    {"name": "Dr. Ravi Patel",       "email": "ravi@medicore.ai",        "role": "doctor",
     "specialty": "General Physician","location": "Mumbai, India",       "color": "#8b5cf6",
     "phone": "+91 22 12345678"},

    # Radiologist
    {"name": "Dr. Sofia Müller",     "email": "sofia@medicore.ai",       "role": "radiologist",
     "specialty": "Diagnostic Radiology","location": "Munich, Germany",  "color": "#4CAF82"},

    # Lab tech
    {"name": "Liam O'Brien",         "email": "lab@medicore.ai",         "role": "lab_tech",
     "specialty": "Clinical Laboratory","location": "Dublin, Ireland",   "color": "#F5A623"},

    # Receptionist
    {"name": "Emma Wilson",          "email": "reception@medicore.ai",   "role": "receptionist",
     "specialty": "Front Desk",      "location": "Main Lobby",           "color": "#8b5cf6"},

    # Patients (their portal accounts)
    {"name": "Sarah Johnson", "email": "sarah@example.com", "role": "patient",
     "phone": "+1 555 0101", "dob": "1990-04-12", "address": "23 Maple Ave, NY"},
    {"name": "James Lee",     "email": "james@example.com", "role": "patient",
     "phone": "+1 555 0102", "dob": "1985-11-03", "address": "55 Oak St, Boston"},
    {"name": "Maria Garcia",  "email": "maria@example.com", "role": "patient",
     "phone": "+1 555 0103", "dob": "1978-07-22", "address": "9 Pine Rd, Miami"},
    {"name": "Tom Chen",      "email": "tom@example.com",   "role": "patient",
     "phone": "+1 555 0104", "dob": "1995-02-18", "address": "12 Cedar Ln, SF"},
    {"name": "Alice Wong",    "email": "alice@example.com", "role": "patient",
     "phone": "+1 555 0105", "dob": "1970-09-30", "address": "88 Birch Way, LA"},
]


PATIENT_CONDITIONS = {
    "Sarah Johnson": (["Pneumonia"],                ["Penicillin"]),
    "James Lee":     (["Anxiety", "Hypertension"],  []),
    "Maria Garcia":  (["Type 2 Diabetes"],          ["Sulfa"]),
    "Tom Chen":      (["Hypertension"],             []),
    "Alice Wong":    (["High Cholesterol"],         ["Aspirin"]),
}


DRUGS_SEED = [
    {"name": "Amoxicillin",  "category": "Antibiotic",  "dosage": "500mg",  "stock": 1240, "unit": "capsules", "price": 0.85,  "manufacturer": "GenPharma"},
    {"name": "Metformin",    "category": "Diabetes",    "dosage": "850mg",  "stock": 830,  "unit": "tablets",  "price": 0.42,  "manufacturer": "NovaMed"},
    {"name": "Lisinopril",   "category": "Cardiology",  "dosage": "10mg",   "stock": 420,  "unit": "tablets",  "price": 1.10,  "manufacturer": "CardioLife"},
    {"name": "Atorvastatin", "category": "Cardiology",  "dosage": "40mg",   "stock": 95,   "unit": "tablets",  "price": 2.30,  "manufacturer": "StatinPlus"},
    {"name": "Omeprazole",   "category": "Gastrology",  "dosage": "20mg",   "stock": 1800, "unit": "capsules", "price": 0.65,  "manufacturer": "DigestCo"},
    {"name": "Sertraline",   "category": "Psychiatry",  "dosage": "50mg",   "stock": 0,    "unit": "tablets",  "price": 1.75,  "manufacturer": "MindCare"},
    {"name": "Paracetamol",  "category": "Pain Relief", "dosage": "500mg",  "stock": 5400, "unit": "tablets",  "price": 0.12,  "manufacturer": "GenPharma"},
    {"name": "Salbutamol",   "category": "Pulmonology", "dosage": "100mcg", "stock": 320,  "unit": "inhalers", "price": 8.50,  "manufacturer": "BreathEasy"},
    {"name": "Ibuprofen",    "category": "Pain Relief", "dosage": "400mg",  "stock": 2700, "unit": "tablets",  "price": 0.18,  "manufacturer": "PainAway"},
    {"name": "Insulin Glargine", "category": "Diabetes","dosage": "100u/ml","stock": 110,  "unit": "vials",    "price": 28.40, "manufacturer": "DiabCare"},
]


FACILITIES_SEED = [
    {"name": "City General Hospital", "icu": 40, "icu_used": 36, "vents": 20, "vent_used": 17, "staff": 180, "predicted_admissions": 52},
    {"name": "North Medical Center",  "icu": 30, "icu_used": 18, "vents": 15, "vent_used": 9,  "staff": 130, "predicted_admissions": 31},
    {"name": "St. Luke's Hospital",   "icu": 50, "icu_used": 28, "vents": 25, "vent_used": 12, "staff": 200, "predicted_admissions": 44},
    {"name": "Downtown Clinic",       "icu": 15, "icu_used": 6,  "vents": 6,  "vent_used": 2,  "staff": 60,  "predicted_admissions": 18},
]


ALERTS_SEED = [
    {"severity": "critical", "resource": "ICU Beds",      "facility": "City General Hospital", "current": 4,   "predicted": 18},
    {"severity": "high",     "resource": "Ventilators",   "facility": "North Medical Center",  "current": 6,   "predicted": 14},
    {"severity": "medium",   "resource": "Nursing Staff", "facility": "St. Luke's Hospital",   "current": 12,  "predicted": 22},
    {"severity": "low",      "resource": "Vaccines",      "facility": "Downtown Clinic",       "current": 150, "predicted": 280},
]


# ── Wipe & re-create ──────────────────────────────────────────────────────────
COLLECTIONS = [
    "users", "patients", "appointments", "scans", "reports", "drugs",
    "prescriptions", "facilities", "alerts", "messages", "notifications",
    "audit_logs", "availability", "reminders", "cases", "shared_scans",
    "telemedicine", "invoices", "visit_notes", "treatment_plans",
    "vitals_history", "lab_results", "password_resets",
]


async def wipe():
    print("→ wiping collections …")
    for c in COLLECTIONS:
        await db[c].delete_many({})


# ── Seeders ───────────────────────────────────────────────────────────────────
async def seed_users():
    print("→ seeding users …")
    for u in USERS_SEED:
        doc = {
            "_id":           new_id(),
            "name":          u["name"],
            "email":         u["email"],
            "password":      hash_pw(DEFAULT_PASSWORD),
            "role":          u["role"],
            "specialty":     u.get("specialty", ""),
            "location":      u.get("location", ""),
            "color":         u.get("color", "#5B8DEF"),
            "phone":         u.get("phone", ""),
            "dob":           u.get("dob", ""),
            "address":       u.get("address", ""),
            "available":     True,
            "provider":      "email",
            "mfa_enabled":   False,
            "mfa_secret":    None,
            "is_active":     True,
            "failed_logins": 0,
            "last_login":    None,
            "created_at":    now_iso(),
        }
        await db.users.insert_one(doc)
    print(f"   ✓ {len(USERS_SEED)} users")


async def seed_patients():
    print("→ seeding patients …")
    patient_users = await db.users.find({"role": "patient"}).to_list(50)
    doctor_users  = await db.users.find({"role": "doctor"}).to_list(50)
    doctor_names  = [d["name"] for d in doctor_users]

    for pu in patient_users:
        cond, allergies = PATIENT_CONDITIONS.get(pu["name"], ([], []))
        doc = {
            "_id":           new_id(),
            "name":          pu["name"],
            "dob":           pu.get("dob", ""),
            "gender":        random.choice(["Male", "Female"]),
            "blood":         random.choice(["A+", "B+", "O+", "AB+", "O-", "A-"]),
            "phone":         pu.get("phone", ""),
            "email":         pu["email"],
            "address":       pu.get("address", ""),
            "conditions":    cond,
            "allergies":     allergies,
            "doctor":        random.choice(doctor_names) if doctor_names else "",
            "insurance":     random.choice(["Premium Health", "BlueShield", "MediCare", "Aetna"]),
            "insurance_provider": "BlueShield",
            "insurance_number":   f"INS-{random.randint(10000,99999)}",
            "insurance_expiry":   date_str(365),
            "emergency_contacts": [
                {"id": new_id(), "name": "Family Contact", "relationship": "Spouse", "phone": pu.get("phone", "")}
            ],
            "occupation":     random.choice(["Engineer", "Teacher", "Retired", "Designer", "Manager"]),
            "nationality":    "—",
            "marital_status": random.choice(["Single", "Married", "Divorced"]),
            "status":         random.choice(["active", "active", "active", "critical", "stable"]),
            "linked_user_id": pu["_id"],
            "joined":         date_str(-random.randint(30, 365)),
            "vitals": {
                "bp":     f"{random.randint(110,140)}/{random.randint(70,90)}",
                "hr":     str(random.randint(60, 95)),
                "temp":   f"{round(36.4 + random.random()*1.2,1)}°C",
                "weight": f"{random.randint(55,95)}kg",
                "height": f"{random.randint(155,190)}cm",
                "o2":     f"{random.randint(94,99)}%",
            },
            "history":       [],
            "prescriptions": [],
            "labResults":    [],
            "created_at":    now_iso(),
        }
        await db.patients.insert_one(doc)
    print(f"   ✓ {len(patient_users)} patients")


async def seed_drugs():
    print("→ seeding drugs …")
    for d in DRUGS_SEED:
        status = "available" if d["stock"] > 100 else ("low" if d["stock"] > 0 else "out")
        await db.drugs.insert_one({
            "_id":          new_id(),
            **d,
            "status":       status,
            "created_at":   now_iso(),
        })
    print(f"   ✓ {len(DRUGS_SEED)} drugs")


async def seed_facilities_and_alerts():
    print("→ seeding facilities & alerts …")
    for f in FACILITIES_SEED:
        await db.facilities.insert_one({
            "_id":        new_id(),
            **f,
            "updated_at": now_iso(),
        })
    for a in ALERTS_SEED:
        await db.alerts.insert_one({
            "_id":        new_id(),
            **a,
            "created_at": now_iso(),
        })
    print(f"   ✓ {len(FACILITIES_SEED)} facilities, {len(ALERTS_SEED)} alerts")


async def seed_appointments_and_scans():
    print("→ seeding appointments & scans …")
    doctors  = await db.users.find({"role": "doctor"}).to_list(50)
    patients = await db.patients.find({}).to_list(50)
    types    = ["Consultation", "Follow-up", "Surgery Consult", "MRI Review", "Lab Results"]
    scan_kinds = [
        ("xray", "Pneumonia",    "abnormal"),
        ("xray", "Normal",       "normal"),
        ("mri",  "Brain Tumor",  "critical"),
        ("ct",   "Normal",       "normal"),
        ("xray", "Tuberculosis", "critical"),
        ("mri",  "Normal",       "normal"),
    ]
    appt_count = 0
    for i, p in enumerate(patients):
        doc = random.choice(doctors) if doctors else None
        if not doc:
            continue
        # Upcoming appointment
        await db.appointments.insert_one({
            "_id":        new_id(),
            "patient":    p["name"],
            "patient_user_id": p.get("linked_user_id", ""),
            "doctor":     doc["name"],
            "doctorId":   doc["_id"],
            "color":      doc.get("color", "#5B8DEF"),
            "avatar":     "".join([w[0] for w in doc["name"].split()][:2]).upper(),
            "date":       date_str(random.randint(1, 14)),
            "time":       random.choice(["09:00", "10:30", "13:00", "14:30", "16:00"]),
            "type":       random.choice(types),
            "notes":      "",
            "status":     random.choice(["confirmed", "pending", "confirmed"]),
            "created_by": doc["_id"],
            "created_at": now_iso(),
        })
        appt_count += 1

        # Past completed appointment
        await db.appointments.insert_one({
            "_id":        new_id(),
            "patient":    p["name"],
            "patient_user_id": p.get("linked_user_id", ""),
            "doctor":     doc["name"],
            "doctorId":   doc["_id"],
            "color":      doc.get("color", "#5B8DEF"),
            "avatar":     "".join([w[0] for w in doc["name"].split()][:2]).upper(),
            "date":       date_str(-random.randint(7, 90)),
            "time":       "11:00",
            "type":       "Consultation",
            "notes":      "Routine follow-up.",
            "status":     "completed",
            "created_by": doc["_id"],
            "created_at": days_ago(random.randint(7, 90)),
        })
        appt_count += 1

        # A scan for some patients
        if i < len(scan_kinds):
            st, dis, sev = scan_kinds[i]
            await db.scans.insert_one({
                "_id":          new_id(),
                "patient_name": p["name"],
                "patient_id":   p["_id"],
                "scan_type":    st,
                "disease":      dis,
                "confidence":   round(random.uniform(0.85, 0.99), 3),
                "status":       sev,
                "doctor":       doc["name"],
                "doctor_id":    doc["_id"],
                "source":       "Backend AI",
                "filename":     f"{p['name'].split()[0].lower()}_{st}.jpg",
                "created_at":   days_ago(random.randint(1, 30)),
            })
    print(f"   ✓ {appt_count} appointments seeded, {min(len(patients), len(scan_kinds))} scans")


async def seed_prescriptions():
    print("→ seeding prescriptions …")
    doctors  = await db.users.find({"role": "doctor"}).to_list(50)
    patients = await db.patients.find({}).to_list(50)
    drugs    = await db.drugs.find({"status": {"$ne": "out"}}).to_list(50)
    rxs = [
        ("Amoxicillin 500mg",  "500mg 3×/day", "7 days",  "dispensed"),
        ("Sertraline 50mg",    "50mg 1×/day",  "30 days", "pending"),
        ("Metformin 850mg",    "850mg 2×/day", "90 days", "dispensed"),
        ("Lisinopril 10mg",    "10mg 1×/day",  "30 days", "pending"),
        ("Atorvastatin 40mg",  "40mg 1×/day",  "30 days", "cancelled"),
    ]
    for i, p in enumerate(patients):
        doc  = random.choice(doctors) if doctors else None
        if not doc: continue
        drug, dosage, dur, status = rxs[i % len(rxs)]
        await db.prescriptions.insert_one({
            "_id":              new_id(),
            "patient":          p["name"],
            "patient_user_id":  p.get("linked_user_id", ""),
            "drug":             drug,
            "dosage":           dosage,
            "duration":         dur,
            "refills":          random.randint(0, 3),
            "notes":            "Take with food.",
            "doctor":           doc["name"],
            "doctor_id":        doc["_id"],
            "date":             date_str(-random.randint(1, 30)),
            "status":           status,
            "created_at":       days_ago(random.randint(1, 30)),
        })
    print(f"   ✓ {len(patients)} prescriptions")


async def seed_visit_notes_and_reports():
    print("→ seeding visit notes, lab results & reports …")
    doctors  = await db.users.find({"role": "doctor"}).to_list(50)
    patients = await db.patients.find({}).to_list(50)
    scans    = await db.scans.find({}).to_list(50)

    for p in patients:
        doc = random.choice(doctors) if doctors else None
        if not doc:
            continue
        await db.visit_notes.insert_one({
            "_id":          new_id(),
            "patient_id":   p["_id"],
            "patient_name": p["name"],
            "visit_date":   date_str(-random.randint(5, 60)),
            "visit_type":   random.choice(["Outpatient", "Follow-up", "Specialist"]),
            "subjective":   "Patient reports feeling stable. No new complaints.",
            "objective":    f"Vitals normal. BP {p['vitals']['bp']}, HR {p['vitals']['hr']}.",
            "assessment":   ", ".join(p.get("conditions", [])) or "Routine check-up",
            "plan":         "Continue current medication. Re-evaluate in 4 weeks.",
            "follow_up":    "1 month",
            "severity":     "normal",
            "is_private":   False,
            "doctor_id":    doc["_id"],
            "doctor_name":  doc["name"],
            "doctor_role":  doc["role"],
            "created_at":   now_iso(),
            "updated_at":   now_iso(),
        })

        # Lab result
        await db.lab_results.insert_one({
            "_id":          new_id(),
            "patient_id":   p["_id"],
            "patient_name": p["name"],
            "test":         random.choice(["CBC", "Lipid Panel", "HbA1c", "Blood Glucose"]),
            "result":       "Within normal range",
            "reference":    "—",
            "unit":         "",
            "status":       "normal",
            "notes":        "",
            "lab_date":     date_str(-random.randint(1, 20)),
            "ordered_by":   doc["name"],
            "entered_by":   "Liam O'Brien",
            "created_at":   now_iso(),
        })

    # Sign reports for half the scans
    for s in scans[: len(scans) // 2 + 1]:
        await db.reports.insert_one({
            "_id":             new_id(),
            "report_number":   f"RPT-{date_str().replace('-','')}-{new_id()[:6].upper()}",
            "scan_id":         s["_id"],
            "patient_name":    s["patient_name"],
            "scan_type":       s["scan_type"],
            "scan_date":       s["created_at"][:10],
            "diagnosis":       s["disease"],
            "severity":        s["status"],
            "confidence":      s["confidence"],
            "findings":        f"Imaging consistent with {s['disease']}.",
            "impression":      f"{s['disease']} — clinical correlation recommended.",
            "recommendation":  "Follow-up imaging in 4 weeks.",
            "status":          "signed",
            "ai_generated":    True,
            "signature":       s["doctor"],
            "signature_date":  date_str(),
            "author_id":       s["doctor_id"],
            "author_name":     s["doctor"],
            "author_role":     "doctor",
            "signed_at":       now_iso(),
            "signed_by":       s["doctor"],
            "created_at":      now_iso(),
            "updated_at":      now_iso(),
        })
    print(f"   ✓ {len(patients)} visit notes, {len(patients)} lab results, reports signed")


async def seed_messages_and_notifications():
    print("→ seeding messages & notifications …")
    users = await db.users.find({"role": {"$in": ["doctor", "admin", "radiologist"]}}).to_list(50)
    if len(users) < 2:
        return
    samples = [
        "Good morning! Patient report ready for review.",
        "Scan results uploaded to the system.",
        "Can we discuss case 42? Something unusual on the MRI.",
        "See you at the morning meeting!",
        "System update scheduled tonight 2-4 AM.",
    ]
    for i in range(len(users) - 1):
        a, b = users[i], users[i + 1]
        text = samples[i % len(samples)]
        await db.messages.insert_one({
            "_id":        new_id(),
            "from_id":    a["_id"],
            "to_id":      b["_id"],
            "text":       text,
            "read":       False,
            "created_at": days_ago(i),
        })
        await db.notifications.insert_one({
            "_id":        new_id(),
            "user_id":    b["_id"],
            "title":      "New message",
            "message":    f"{a['name']}: {text[:60]}",
            "type":       "message",
            "read":       False,
            "created_at": days_ago(i),
        })
    print(f"   ✓ {len(users)-1} messages & notifications")


async def seed_invoices():
    print("→ seeding invoices …")
    patients = await db.patients.find({}).to_list(50)
    for p in patients:
        items = [
            {"desc": "Consultation", "qty": 1, "unit_price": 120},
            {"desc": "Lab tests",    "qty": 2, "unit_price": 45},
        ]
        subtotal = sum(i["qty"] * i["unit_price"] for i in items)
        tax_amt  = round(subtotal * 0.08, 2)
        total    = round(subtotal + tax_amt, 2)
        await db.invoices.insert_one({
            "_id":              new_id(),
            "invoice_number":   f"INV-{date_str().replace('-','')}-{new_id()[:6].upper()}",
            "patient_id":       p.get("linked_user_id") or p["_id"],
            "patient_name":     p["name"],
            "items":            items,
            "discount":         0.0,
            "tax_rate":         8.0,
            "insurance_claim":  False,
            "insurance_provider": "",
            "notes":            "",
            "subtotal":         subtotal,
            "discount_amount":  0.0,
            "tax_amount":       tax_amt,
            "total":            total,
            "status":           random.choice(["paid", "unpaid"]),
            "created_by":       "",
            "created_by_name":  "System",
            "created_at":       days_ago(random.randint(0, 30)),
            "due_date":         date_str(30),
            "paid_at":          None,
            "payment_method":   None,
        })
    print(f"   ✓ {len(patients)} invoices")


async def main():
    print("┌─────────────────────────────────────────────┐")
    print("│   MediCore AI — Database seed script        │")
    print(f"│   DB: {DB_NAME:<37}│")
    print("└─────────────────────────────────────────────┘")
    await wipe()
    await seed_users()
    await seed_patients()
    await seed_drugs()
    await seed_facilities_and_alerts()
    await seed_appointments_and_scans()
    await seed_prescriptions()
    await seed_visit_notes_and_reports()
    await seed_messages_and_notifications()
    await seed_invoices()
    print()
    print("✅  Seed complete — login with any of these credentials")
    print(f"   Default password: {DEFAULT_PASSWORD}")
    print()
    for u in USERS_SEED:
        print(f"   {u['role']:13}  {u['email']}")
    print()


if __name__ == "__main__":
    asyncio.run(main())
