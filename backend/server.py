from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
import bcrypt as _bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta, date
from typing import Optional, List
from enum import Enum
import os, uuid, random
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY           = os.getenv("SECRET_KEY", "medicore-secret-key")
ALGORITHM            = "HS256"
TOKEN_EXPIRE_MINUTES = int(os.getenv("TOKEN_EXPIRE_MINUTES", 1440))
MONGO_URL            = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME              = os.getenv("DB_NAME", "medicore")

app = FastAPI(title="MediCore AI API", version="3.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncIOMotorClient(MONGO_URL)
db     = client[DB_NAME]

api_router = APIRouter(prefix="/api")


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ── helpers ───────────────────────────────────────────────────────────────────
def hash_pw(pw):
    pw_bytes = pw.encode("utf-8")[:72]   # bcrypt hard limit
    return _bcrypt.hashpw(pw_bytes, _bcrypt.gensalt()).decode("utf-8")

def verify_pw(plain, hashed):
    try:
        return _bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False
def now_iso():      return datetime.utcnow().isoformat()
def new_id():       return str(uuid.uuid4())

def create_token(data: dict, minutes: int = None) -> str:
    exp_mins = minutes if minutes is not None else TOKEN_EXPIRE_MINUTES
    payload = {**data, "exp": datetime.utcnow() + timedelta(minutes=exp_mins)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email   = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def user_out(u):
    return {"id": u["_id"], "name": u["name"], "email": u["email"],
            "role": u["role"], "created_at": u.get("created_at", "")}

def make_token_response(user_doc):
    return {"access_token": create_token({"sub": user_doc["email"]}),
            "token_type": "bearer", "user": user_out(user_doc)}

def fix_id(doc):
    if doc and "_id" in doc:
        doc["id"] = doc.pop("_id")
    return doc

def fix_ids(docs):
    return [fix_id(d) for d in docs]

import pyotp, qrcode, io, base64, hashlib, secrets
from fastapi.responses import JSONResponse
from fastapi import Request

# ══════════════════════════════════════════════════════════════════════════════
# ROLES — all 6 roles with their permissions
# ══════════════════════════════════════════════════════════════════════════════
ROLES = {
    "admin":        {"label": "Administrator",   "icon": "🛡️",  "color": "#4CAF82"},
    "doctor":       {"label": "Doctor",          "icon": "👨‍⚕️", "color": "#5B8DEF"},
    "radiologist":  {"label": "Radiologist",     "icon": "🔬",  "color": "#F47B7B"},
    "lab_tech":     {"label": "Lab Technician",  "icon": "🧪",  "color": "#F5A623"},
    "receptionist": {"label": "Receptionist",    "icon": "🗂️",  "color": "#8b5cf6"},
    "patient":      {"label": "Patient",         "icon": "🏥",  "color": "#94a3b8"},
}

ROLE_PERMISSIONS = {
    "admin":        ["*"],
    "doctor":       ["patients:read","patients:write","scans:read","scans:write","appointments:read","appointments:write","prescriptions:write","messages:*","analytics:read"],
    "radiologist":  ["scans:read","scans:write","patients:read","reports:write","messages:*"],
    "lab_tech":     ["scans:read","scans:write","labs:write","patients:read"],
    "receptionist": ["patients:read","patients:write","appointments:read","appointments:write","billing:read"],
    "patient":      ["own:read","appointments:own","prescriptions:own","reports:own"],
}

def has_permission(role: str, perm: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role, [])
    if "*" in perms: return True
    if perm in perms: return True
    # Check wildcard namespace e.g. "messages:*"
    ns = perm.split(":")[0]
    return f"{ns}:*" in perms

def require_roles(*roles):
    async def check(cu=Depends(get_current_user)):
        if cu["role"] not in roles:
            raise HTTPException(403, f"Access denied. Required: {', '.join(roles)}")
        return cu
    return check

# ── Audit log helper ──────────────────────────────────────────────────────────
async def audit(user_id: str, action: str, resource: str, detail: str = "", ip: str = ""):
    await db.audit_logs.insert_one({
        "_id":       new_id(),
        "user_id":   user_id,
        "action":    action,      # LOGIN, LOGOUT, CREATE, UPDATE, DELETE, VIEW, MFA_ENABLED, etc.
        "resource":  resource,    # users, patients, scans, etc.
        "detail":    detail,
        "ip":        ip,
        "timestamp": now_iso(),
    })

# ── Session management ────────────────────────────────────────────────────────
SESSION_TIMEOUT_MINUTES = 30   # configurable

# ══════════════════════════════════════════════════════════════════════════════
# AUTH — EXTENDED
# ══════════════════════════════════════════════════════════════════════════════
class RegisterIn(BaseModel):
    name:     str
    email:    EmailStr
    password: str
    role:     str = "doctor"
    # Patient-specific optional fields
    dob:      str = ""
    phone:    str = ""
    address:  str = ""

@api_router.post("/auth/register")
async def register(data: RegisterIn, request: Request):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(400, "Email already registered")
    if data.role not in ROLES:
        raise HTTPException(400, f"Invalid role. Must be one of: {', '.join(ROLES.keys())}")

    user = {
        "_id":        new_id(),
        "name":       data.name,
        "email":      data.email,
        "password":   hash_pw(data.password),
        "role":       data.role,
        "created_at": now_iso(),
        "provider":   "email",
        "mfa_enabled":  False,
        "mfa_secret":   None,
        "is_active":    True,
        "last_login":   None,
        "failed_logins": 0,
        # Patient-specific
        "dob":      data.dob,
        "phone":    data.phone,
        "address":  data.address,
    }
    await db.users.insert_one(user)
    await audit(user["_id"], "REGISTER", "users", f"New {data.role} account: {data.email}",
                request.client.host if request.client else "")
    return make_token_response(user)

@api_router.post("/auth/login")
async def login(form: OAuth2PasswordRequestForm = Depends(), request: Request = None):
    user = await db.users.find_one({"email": form.username})
    if not user or not verify_pw(form.password, user.get("password","")):
        if user:
            await db.users.update_one({"_id": user["_id"]}, {"$inc": {"failed_logins": 1}})
        ip = request.client.host if request and request.client else ""
        await audit(user["_id"] if user else "unknown", "LOGIN_FAILED", "auth",
                    f"Failed login for {form.username}", ip)
        raise HTTPException(401, "Invalid email or password")

    if not user.get("is_active", True):
        raise HTTPException(403, "Account is deactivated. Contact your administrator.")

    # Reset failed logins + update last_login
    ip = request.client.host if request and request.client else ""
    await db.users.update_one({"_id": user["_id"]}, {
        "$set": {"last_login": now_iso(), "failed_logins": 0}
    })
    await audit(user["_id"], "LOGIN", "auth", f"Successful login from {ip}", ip)

    # If MFA is enabled, return mfa_required flag instead of full token
    if user.get("mfa_enabled"):
        temp = create_token({"sub": user["email"], "mfa_pending": True}, minutes=5)
        return {"mfa_required": True, "temp_token": temp, "user_name": user["name"]}

    return make_token_response(user)

@api_router.post("/auth/verify-mfa")
async def verify_mfa(body: dict):
    """Verify TOTP code after login when MFA is enabled."""
    temp_token = body.get("temp_token", "")
    code       = body.get("code", "")
    try:
        payload = jwt.decode(temp_token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("mfa_pending"):
            raise HTTPException(400, "Invalid temp token")
        email = payload.get("sub")
    except JWTError:
        raise HTTPException(401, "Expired or invalid token")

    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(404, "User not found")

    totp = pyotp.TOTP(user["mfa_secret"])
    if not totp.verify(code, valid_window=1):
        await audit(user["_id"], "MFA_FAILED", "auth", "Wrong TOTP code")
        raise HTTPException(401, "Invalid authentication code")

    await audit(user["_id"], "MFA_SUCCESS", "auth", "MFA verified")
    return make_token_response(user)

@api_router.post("/auth/setup-mfa")
async def setup_mfa(cu=Depends(get_current_user)):
    """Generate a TOTP secret + QR code for the user to scan."""
    secret = pyotp.random_base32()
    totp   = pyotp.TOTP(secret)
    uri    = totp.provisioning_uri(cu["email"], issuer_name="MediCore AI")

    # Generate QR code as base64
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    # Store secret temporarily (not activated until confirmed)
    await db.users.update_one({"_id": cu["_id"]}, {"$set": {"mfa_secret_pending": secret}})
    return {"secret": secret, "qr_code": f"data:image/png;base64,{qr_b64}", "uri": uri}

@api_router.post("/auth/confirm-mfa")
async def confirm_mfa(body: dict, cu=Depends(get_current_user)):
    """Confirm TOTP code to activate MFA."""
    code   = body.get("code", "")
    user   = await db.users.find_one({"_id": cu["_id"]})
    secret = user.get("mfa_secret_pending")
    if not secret:
        raise HTTPException(400, "No pending MFA setup. Call /auth/setup-mfa first.")
    totp = pyotp.TOTP(secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(401, "Invalid code. Please scan the QR code again.")
    await db.users.update_one({"_id": cu["_id"]}, {
        "$set":   {"mfa_enabled": True, "mfa_secret": secret},
        "$unset": {"mfa_secret_pending": ""}
    })
    await audit(cu["_id"], "MFA_ENABLED", "users", "MFA activated")
    return {"ok": True, "message": "MFA enabled successfully"}

@api_router.post("/auth/disable-mfa")
async def disable_mfa(body: dict, cu=Depends(get_current_user)):
    """Disable MFA (requires password confirmation)."""
    if not verify_pw(body.get("password",""), cu.get("password","")):
        raise HTTPException(401, "Incorrect password")
    await db.users.update_one({"_id": cu["_id"]}, {
        "$set":   {"mfa_enabled": False},
        "$unset": {"mfa_secret": ""}
    })
    await audit(cu["_id"], "MFA_DISABLED", "users", "MFA deactivated")
    return {"ok": True}

@api_router.get("/auth/me")
async def me(cu=Depends(get_current_user)):
    return user_out(cu)

@api_router.post("/auth/change-password")
async def change_password(body: dict, cu=Depends(get_current_user)):
    if not verify_pw(body.get("current_password",""), cu.get("password","")):
        raise HTTPException(401, "Current password is incorrect")
    new_pw = body.get("new_password","")
    if len(new_pw) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")
    await db.users.update_one({"_id": cu["_id"]}, {"$set": {"password": hash_pw(new_pw)}})
    await audit(cu["_id"], "PASSWORD_CHANGED", "users", "Password changed")
    return {"ok": True}

@api_router.post("/auth/logout")
async def logout(cu=Depends(get_current_user)):
    await audit(cu["_id"], "LOGOUT", "auth", "User logged out")
    return {"ok": True}

# ── Session ping (frontend calls this every N minutes to keep alive) ──────────
@api_router.get("/auth/session-check")
async def session_check(cu=Depends(get_current_user)):
    return {"valid": True, "role": cu["role"], "timeout_minutes": SESSION_TIMEOUT_MINUTES}

# ── Roles & permissions lookup ────────────────────────────────────────────────
@api_router.get("/auth/roles")
async def get_roles():
    return [{"id": k, **v, "permissions": ROLE_PERMISSIONS[k]} for k,v in ROLES.items()]

# ══════════════════════════════════════════════════════════════════════════════
# AUDIT LOGS
# ══════════════════════════════════════════════════════════════════════════════
@api_router.get("/admin/audit-logs")
async def get_audit_logs(
    user_id: str = "", action: str = "", resource: str = "",
    limit: int = 50, skip: int = 0,
    cu=Depends(get_current_user)
):
    if cu["role"] != "admin":
        raise HTTPException(403, "Admin only")
    query = {}
    if user_id:  query["user_id"]  = user_id
    if action:   query["action"]   = {"$regex": action,   "$options": "i"}
    if resource: query["resource"] = {"$regex": resource, "$options": "i"}
    logs  = await db.audit_logs.find(query).sort("timestamp",-1).skip(skip).limit(limit).to_list(limit)
    total = await db.audit_logs.count_documents(query)
    # Enrich with user names
    enriched = []
    for log in logs:
        user = await db.users.find_one({"_id": log["user_id"]}, {"name":1,"role":1,"email":1})
        enriched.append({**fix_id(log), "user": user_out(user) if user else {"name": log["user_id"]}})
    return {"logs": enriched, "total": total}

# ══════════════════════════════════════════════════════════════════════════════
# USER MANAGEMENT (admin)
# ══════════════════════════════════════════════════════════════════════════════
@api_router.patch("/admin/users/{uid}/activate")
async def toggle_user_active(uid: str, body: dict, cu=Depends(get_current_user)):
    if cu["role"] != "admin": raise HTTPException(403, "Admin only")
    is_active = body.get("is_active", True)
    await db.users.update_one({"_id": uid}, {"$set": {"is_active": is_active}})
    await audit(cu["_id"], "USER_DEACTIVATED" if not is_active else "USER_ACTIVATED",
                "users", f"User {uid} {'deactivated' if not is_active else 'activated'}")
    return {"ok": True}

@api_router.delete("/admin/users/{uid}")
async def delete_user(uid: str, cu=Depends(get_current_user)):
    if cu["role"] != "admin": raise HTTPException(403, "Admin only")
    if uid == cu["_id"]: raise HTTPException(400, "Cannot delete your own account")
    await db.users.delete_one({"_id": uid})
    await audit(cu["_id"], "USER_DELETED", "users", f"Deleted user {uid}")
    return {"ok": True}

# ══════════════════════════════════════════════════════════════════════════════
# PATIENT PORTAL — patients accessing their own data
# ══════════════════════════════════════════════════════════════════════════════
@api_router.get("/portal/me")
async def portal_me(cu=Depends(get_current_user)):
    """Patient sees their own record."""
    if cu["role"] != "patient":
        raise HTTPException(403, "Patient portal only")
    record = await db.patients.find_one({"linked_user_id": cu["_id"]})
    if not record:
        # Auto-create patient record for this user
        record = {
            "_id": new_id(), "name": cu["name"], "email": cu["email"],
            "phone": cu.get("phone",""), "dob": cu.get("dob",""),
            "address": cu.get("address",""), "gender": "—", "blood": "—",
            "status": "active", "linked_user_id": cu["_id"],
            "conditions": [], "allergies": [], "vitals": {},
            "history": [], "prescriptions": [], "labResults": [],
            "joined": now_iso()[:10], "created_at": now_iso(),
        }
        await db.patients.insert_one(record)
    return fix_id(record)

@api_router.get("/portal/appointments")
async def portal_appointments(cu=Depends(get_current_user)):
    if cu["role"] != "patient": raise HTTPException(403, "Patient portal only")
    docs = await db.appointments.find({"patient_user_id": cu["_id"]}).sort("date",-1).limit(20).to_list(20)
    return fix_ids(docs)

@api_router.get("/portal/prescriptions")
async def portal_prescriptions(cu=Depends(get_current_user)):
    if cu["role"] != "patient": raise HTTPException(403, "Patient portal only")
    docs = await db.prescriptions.find({"patient_user_id": cu["_id"]}).sort("created_at",-1).limit(20).to_list(20)
    return fix_ids(docs)

@api_router.get("/portal/reports")
async def portal_reports(cu=Depends(get_current_user)):
    if cu["role"] != "patient": raise HTTPException(403, "Patient portal only")
    docs = await db.scans.find({"patient_user_id": cu["_id"]}).sort("created_at",-1).limit(20).to_list(20)
    return fix_ids(docs)

@api_router.post("/portal/book-appointment")
async def portal_book_appointment(data: dict, cu=Depends(get_current_user)):
    if cu["role"] != "patient": raise HTTPException(403, "Patient portal only")
    doc = {
        "_id": new_id(), "patient": cu["name"], "patient_user_id": cu["_id"],
        "doctor": data.get("doctor",""), "doctorId": data.get("doctorId",""),
        "date": data.get("date",""), "time": data.get("time",""),
        "type": data.get("type","Consultation"), "notes": data.get("notes",""),
        "status": "pending", "created_at": now_iso(),
    }
    await db.appointments.insert_one(doc)
    await audit(cu["_id"], "APPOINTMENT_BOOKED", "appointments", f"Patient booked on {doc['date']}")
    return fix_id(doc)


# ══════════════════════════════════════════════════════════════════════════════
# FORGOT / RESET PASSWORD
# ══════════════════════════════════════════════════════════════════════════════
import hashlib, secrets as _secrets

def make_reset_token(email: str) -> str:
    """Generate a secure 6-digit OTP + a signed token."""
    otp    = str(_secrets.randbelow(900000) + 100000)   # 100000–999999
    signed = hashlib.sha256(f"{email}:{otp}:{SECRET_KEY}".encode()).hexdigest()
    return otp, signed

def verify_reset_token(email: str, otp: str, signed: str) -> bool:
    expected = hashlib.sha256(f"{email}:{otp}:{SECRET_KEY}".encode()).hexdigest()
    return expected == signed

@api_router.post("/auth/forgot-password")
async def forgot_password(body: dict):
    """
    Step 1 — User submits email.
    In production this sends an email via SMTP/SendGrid.
    Here we return the OTP directly so you can test without an email server.
    In production: remove 'otp' from the response and send it by email only.
    """
    email = body.get("email", "").strip().lower()
    if not email:
        raise HTTPException(400, "Email is required")

    user = await db.users.find_one({"email": email})
    # Always return success — don't reveal whether email exists (security best practice)
    if not user:
        return {"ok": True, "message": "If that email exists, a reset code has been sent.", "dev_otp": None}

    otp, signed = make_reset_token(email)
    expires_at  = (datetime.utcnow() + timedelta(minutes=15)).isoformat()

    # Store token in DB (one per user, overwrite old ones)
    await db.password_resets.replace_one(
        {"email": email},
        {"_id": new_id(), "email": email, "otp": otp, "signed": signed,
         "expires_at": expires_at, "used": False, "created_at": now_iso()},
        upsert=True
    )

    await audit(user["_id"], "PASSWORD_RESET_REQUESTED", "auth", f"Reset requested for {email}")

    # ── In production, send email here ──────────────────────────────────────
    # Example with SendGrid:
    #   import sendgrid
    #   sg = sendgrid.SendGridAPIClient(api_key=os.getenv("SENDGRID_API_KEY"))
    #   message = Mail(from_email="noreply@medicore.ai", to_emails=email,
    #       subject="MediCore AI — Password Reset Code",
    #       html_content=f"<p>Your reset code is: <strong>{otp}</strong></p><p>Expires in 15 minutes.</p>")
    #   sg.send(message)
    # ────────────────────────────────────────────────────────────────────────

    return {
        "ok":      True,
        "message": "Reset code sent. Check your email.",
        "dev_otp": otp,      # ← REMOVE THIS IN PRODUCTION (dev/test only)
        "signed":  signed,   # used to verify step 2 without storing state on client
    }

@api_router.post("/auth/verify-reset-otp")
async def verify_reset_otp(body: dict):
    """
    Step 2 — Verify the 6-digit OTP the user entered.
    Returns a short-lived reset token if valid.
    """
    email  = body.get("email", "").strip().lower()
    otp    = body.get("otp", "").strip()
    signed = body.get("signed", "")

    if not email or not otp:
        raise HTTPException(400, "Email and OTP are required")

    record = await db.password_resets.find_one({"email": email, "used": False})
    if not record:
        raise HTTPException(400, "No pending reset request. Please request a new code.")

    # Check expiry
    try:
        expires = datetime.fromisoformat(record["expires_at"])
        if datetime.utcnow() > expires:
            raise HTTPException(400, "Reset code has expired. Please request a new one.")
    except ValueError:
        pass

    # Verify OTP matches
    if record["otp"] != otp:
        raise HTTPException(400, "Invalid code. Please check and try again.")

    # Verify signature (prevents tampering)
    if not verify_reset_token(email, otp, record["signed"]):
        raise HTTPException(400, "Invalid reset token.")

    # Issue a 10-minute password-reset JWT
    reset_token = create_token({"sub": email, "pwd_reset": True}, minutes=10)
    return {"ok": True, "reset_token": reset_token}

@api_router.post("/auth/reset-password")
async def reset_password(body: dict):
    """
    Step 3 — Set the new password using the reset token from step 2.
    """
    reset_token  = body.get("reset_token", "")
    new_password = body.get("new_password", "")
    confirm      = body.get("confirm_password", "")

    if not new_password or len(new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if new_password != confirm:
        raise HTTPException(400, "Passwords do not match")

    # Verify reset token
    try:
        payload = jwt.decode(reset_token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("pwd_reset"):
            raise HTTPException(400, "Invalid reset token")
        email = payload.get("sub")
    except JWTError:
        raise HTTPException(400, "Reset link has expired. Please start over.")

    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(404, "User not found")

    # Update password + mark reset token as used
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hash_pw(new_password), "failed_logins": 0, "updated_at": now_iso()}}
    )
    await db.password_resets.update_one(
        {"email": email},
        {"$set": {"used": True, "used_at": now_iso()}}
    )
    await audit(user["_id"], "PASSWORD_RESET_COMPLETE", "auth", f"Password successfully reset for {email}")

    return {"ok": True, "message": "Password reset successfully. You can now log in."}


# PATIENTS
# ══════════════════════════════════════════════════════════════════════════════
class PatientIn(BaseModel):
    name:               str
    dob:                str
    gender:             str = "Male"
    blood:              str = "A+"
    phone:              str = ""
    email:              str = ""
    address:            str = ""
    conditions:         list = []
    allergies:          list = []
    doctor:             str = ""
    insurance:          str = ""
    insurance_provider: str = ""
    insurance_number:   str = ""
    insurance_expiry:   str = ""
    emergency_contacts: list = []
    occupation:         str = ""
    nationality:        str = ""
    marital_status:     str = ""

@api_router.post("/patients")
async def create_patient(data: PatientIn, cu=Depends(get_current_user)):
    doc = {
        "_id":        new_id(),
        "name":       data.name,
        "dob":        data.dob,
        "gender":     data.gender,
        "blood":      data.blood,
        "phone":      data.phone,
        "email":      data.email,
        "address":    data.address,
        "conditions": data.conditions,
        "allergies":  data.allergies,
        "doctor":             data.doctor or cu["name"],
        "insurance":          data.insurance,
        "insurance_provider": getattr(data, "insurance_provider", ""),
        "insurance_number":   getattr(data, "insurance_number", ""),
        "insurance_expiry":   getattr(data, "insurance_expiry", ""),
        "emergency_contacts": getattr(data, "emergency_contacts", []),
        "occupation":         getattr(data, "occupation", ""),
        "nationality":        getattr(data, "nationality", ""),
        "marital_status":     getattr(data, "marital_status", ""),
        "status":             "active",
        "joined":     now_iso()[:10],
        "created_by": cu["_id"],
        "vitals":     {"bp":"—","hr":"—","temp":"—","weight":"—","height":"—","o2":"—"},
        "history":    [],
        "prescriptions": [],
        "labResults": [],
        "created_at": now_iso(),
    }
    await db.patients.insert_one(doc)
    return fix_id(doc)

@api_router.get("/patients")
async def list_patients(search: str = "", status: str = "", cu=Depends(get_current_user)):
    query = {}
    if search:
        query["$or"] = [
            {"name":       {"$regex": search, "$options": "i"}},
            {"doctor":     {"$regex": search, "$options": "i"}},
            {"conditions": {"$regex": search, "$options": "i"}},
        ]
    if status and status != "all":
        query["status"] = status
    docs = await db.patients.find(query).sort("created_at", -1).limit(100).to_list(100)
    return fix_ids(docs)

@api_router.get("/patients/{pid}")
async def get_patient(pid: str, cu=Depends(get_current_user)):
    doc = await db.patients.find_one({"_id": pid})
    if not doc: raise HTTPException(404, "Patient not found")
    return fix_id(doc)

@api_router.put("/patients/{pid}")
async def update_patient(pid: str, data: dict, cu=Depends(get_current_user)):
    data.pop("_id", None); data.pop("id", None)
    data["updated_at"] = now_iso()
    await db.patients.update_one({"_id": pid}, {"$set": data})
    return {"ok": True}

@api_router.post("/patients/{pid}/history")
async def add_history(pid: str, entry: dict, cu=Depends(get_current_user)):
    entry["date"]   = entry.get("date", now_iso()[:10])
    entry["doctor"] = entry.get("doctor", cu["name"])
    await db.patients.update_one({"_id": pid}, {"$push": {"history": entry}})
    return {"ok": True}

@api_router.post("/patients/{pid}/prescriptions")
async def add_prescription(pid: str, rx: dict, cu=Depends(get_current_user)):
    rx["date"]   = rx.get("date", now_iso()[:10])
    rx["status"] = rx.get("status", "active")
    await db.patients.update_one({"_id": pid}, {"$push": {"prescriptions": rx}})
    return {"ok": True}

@api_router.post("/patients/{pid}/labs")
async def add_lab(pid: str, lab: dict, cu=Depends(get_current_user)):
    lab["date"] = lab.get("date", now_iso()[:10])
    await db.patients.update_one({"_id": pid}, {"$push": {"labResults": lab}})
    return {"ok": True}

@api_router.get("/patients/stats/summary")
async def patient_stats(cu=Depends(get_current_user)):
    total    = await db.patients.count_documents({})
    active   = await db.patients.count_documents({"status": "active"})
    critical = await db.patients.count_documents({"status": "critical"})
    return {"total": total, "active": active, "critical": critical, "today": 0}

# ══════════════════════════════════════════════════════════════════════════════

@api_router.get("/patients/{pid}/emergency-contacts")
async def get_emergency_contacts(pid: str, cu=Depends(get_current_user)):
    doc = await db.patients.find_one({"_id": pid})
    if not doc: raise HTTPException(404, "Patient not found")
    return doc.get("emergency_contacts", [])

@api_router.post("/patients/{pid}/emergency-contacts")
async def add_emergency_contact(pid: str, contact: dict, cu=Depends(get_current_user)):
    contact["id"] = new_id()
    await db.patients.update_one({"_id": pid}, {"$push": {"emergency_contacts": contact}})
    await audit(cu["_id"], "UPDATE", "patients", f"Emergency contact added for {pid}")
    return {"ok": True, "contact": contact}

@api_router.delete("/patients/{pid}/emergency-contacts/{cid}")
async def delete_emergency_contact(pid: str, cid: str, cu=Depends(get_current_user)):
    await db.patients.update_one({"_id": pid}, {"$pull": {"emergency_contacts": {"id": cid}}})
    return {"ok": True}

@api_router.get("/patients/{pid}/appointments")
async def get_patient_appointments(pid: str, cu=Depends(get_current_user)):
    patient = await db.patients.find_one({"_id": pid})
    if not patient: raise HTTPException(404, "Patient not found")
    docs = await db.appointments.find(
        {"$or": [{"patient": patient["name"]}, {"patient_id": pid}]}
    ).sort("date", -1).limit(50).to_list(50)
    return fix_ids(docs)

@api_router.patch("/patients/{pid}/vitals")
async def update_vitals(pid: str, vitals: dict, cu=Depends(get_current_user)):
    vitals.pop("_id", None)
    await db.patients.update_one({"_id": pid}, {"$set": {"vitals": vitals, "vitals_updated": now_iso()}})
    await audit(cu["_id"], "UPDATE", "patients", f"Vitals updated for {pid}")
    return {"ok": True}

@api_router.patch("/patients/{pid}/status")
async def update_patient_status(pid: str, body: dict, cu=Depends(get_current_user)):
    await db.patients.update_one({"_id": pid}, {"$set": {"status": body.get("status"), "updated_at": now_iso()}})
    await audit(cu["_id"], "UPDATE", "patients", f"Status changed to {body.get('status')} for {pid}")
    return {"ok": True}

# APPOINTMENTS
# ══════════════════════════════════════════════════════════════════════════════
class AppointmentIn(BaseModel):
    patient:   str
    doctor:    str
    doctorId:  str = ""
    avatar:    str = ""
    color:     str = "#4CAF82"
    date:      str
    time:      str
    type:      str = "Consultation"
    notes:     str = ""
    status:    str = "pending"

@api_router.post("/appointments")
async def create_appointment(data: AppointmentIn, cu=Depends(get_current_user)):
    # conflict check
    conflict = await db.appointments.find_one({
        "doctorId": data.doctorId, "date": data.date,
        "time": data.time, "status": {"$ne": "cancelled"}
    })
    if conflict:
        raise HTTPException(400, f"Doctor already has an appointment at {data.time}")
    doc = {
        "_id":      new_id(),
        "patient":  data.patient,
        "doctor":   data.doctor,
        "doctorId": data.doctorId,
        "avatar":   data.avatar,
        "color":    data.color,
        "date":     data.date,
        "time":     data.time,
        "type":     data.type,
        "notes":    data.notes,
        "status":   data.status,
        "created_by": cu["_id"],
        "created_at": now_iso(),
    }
    await db.appointments.insert_one(doc)
    return fix_id(doc)

@api_router.get("/appointments")
async def list_appointments(
    status: str = "", date: str = "", search: str = "",
    cu=Depends(get_current_user)
):
    query = {}
    if status and status != "all": query["status"] = status
    if date:  query["date"]    = date
    if search:
        query["$or"] = [
            {"patient": {"$regex": search, "$options": "i"}},
            {"doctor":  {"$regex": search, "$options": "i"}},
        ]
    docs = await db.appointments.find(query).sort([("date",1),("time",1)]).limit(200).to_list(200)
    return fix_ids(docs)

@api_router.patch("/appointments/{aid}/status")
async def update_appointment_status(aid: str, body: dict, cu=Depends(get_current_user)):
    new_status = body.get("status")
    await db.appointments.update_one({"_id": aid}, {"$set": {"status": new_status, "updated_at": now_iso()}})
    return {"ok": True}

@api_router.get("/appointments/stats/summary")
async def appointment_stats(cu=Depends(get_current_user)):
    total     = await db.appointments.count_documents({})
    confirmed = await db.appointments.count_documents({"status": "confirmed"})
    pending   = await db.appointments.count_documents({"status": "pending"})
    today_str = date.today().isoformat()
    today_ct  = await db.appointments.count_documents({"date": today_str, "status": {"$ne": "cancelled"}})
    return {"total": total, "confirmed": confirmed, "pending": pending, "today": today_ct}

# ══════════════════════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════════════════════
# APPOINTMENTS — EXTENDED
# ══════════════════════════════════════════════════════════════════════════════

class ReminderIn(BaseModel):
    appointment_id: str
    patient_name:   str
    patient_email:  str = ""
    patient_phone:  str = ""
    doctor:         str
    date:           str
    time:           str
    type:           str = "Consultation"
    channel:        str = "email"  # email | sms | both

@api_router.post("/appointments/{aid}/reminder")
async def send_reminder(aid: str, data: ReminderIn, cu=Depends(get_current_user)):
    """Log a reminder send event (actual SMS/email would use Twilio/SendGrid in prod)."""
    reminder_doc = {
        "_id":            new_id(),
        "appointment_id": aid,
        "patient_name":   data.patient_name,
        "patient_email":  data.patient_email,
        "patient_phone":  data.patient_phone,
        "doctor":         data.doctor,
        "date":           data.date,
        "time":           data.time,
        "type":           data.type,
        "channel":        data.channel,
        "sent_by":        cu["name"],
        "sent_at":        now_iso(),
        "status":         "sent",
        "message":        f"Reminder: Your {data.type} appointment with {data.doctor} is on {data.date} at {data.time}.",
    }
    await db.reminders.insert_one(reminder_doc)
    await audit(cu["_id"], "REMINDER_SENT", "appointments",
                f"Reminder sent to {data.patient_name} via {data.channel} for appt {aid}")

    # Create notification for patient if they have an account
    patient_user = await db.users.find_one({"name": data.patient_name})
    if patient_user:
        await db.notifications.insert_one({
            "_id":      new_id(),
            "user_id":  patient_user["_id"],
            "title":    "Appointment Reminder",
            "message":  reminder_doc["message"],
            "type":     "reminder",
            "read":     False,
            "created_at": now_iso(),
        })

    return {"ok": True, "reminder_id": reminder_doc["_id"], "message": reminder_doc["message"]}

@api_router.get("/appointments/{aid}/reminders")
async def get_reminders(aid: str, cu=Depends(get_current_user)):
    docs = await db.reminders.find({"appointment_id": aid}).sort("sent_at", -1).to_list(20)
    return fix_ids(docs)

# ── Doctor Availability ────────────────────────────────────────────────────────
class AvailabilityIn(BaseModel):
    doctor_id:    str
    doctor_name:  str
    working_days: list = [1,2,3,4,5]   # 0=Sun, 1=Mon … 6=Sat
    start_time:   str  = "08:00"
    end_time:     str  = "17:00"
    slot_duration:int  = 30            # minutes
    days_off:     list = []            # ["2026-06-15", ...]
    max_patients: int  = 20

@api_router.post("/availability")
async def set_availability(data: AvailabilityIn, cu=Depends(get_current_user)):
    doc = {
        "_id":          data.doctor_id,
        **data.dict(),
        "updated_by":   cu["_id"],
        "updated_at":   now_iso(),
    }
    await db.availability.replace_one({"_id": data.doctor_id}, doc, upsert=True)
    await audit(cu["_id"], "UPDATE", "availability", f"Availability set for {data.doctor_name}")
    return {"ok": True}

@api_router.get("/availability")
async def list_availability(cu=Depends(get_current_user)):
    docs = await db.availability.find({}).to_list(50)
    return fix_ids(docs)

@api_router.get("/availability/{doctor_id}")
async def get_availability(doctor_id: str, cu=Depends(get_current_user)):
    doc = await db.availability.find_one({"_id": doctor_id})
    if not doc:
        # Return defaults
        return {"doctor_id": doctor_id, "working_days":[1,2,3,4,5],
                "start_time":"08:00","end_time":"17:00","slot_duration":30,
                "days_off":[],"max_patients":20}
    return fix_id(doc)

@api_router.get("/availability/{doctor_id}/slots")
async def get_available_slots(doctor_id: str, date: str, cu=Depends(get_current_user)):
    """Return available time slots for a doctor on a given date."""
    avail = await db.availability.find_one({"_id": doctor_id})
    if not avail:
        # Default 08:00-17:00, 30min slots
        slots = [f"{h:02d}:{m:02d}" for h in range(8,17) for m in [0,30]]
    else:
        if date in avail.get("days_off", []):
            return {"slots": [], "reason": "Doctor is off on this date"}
        import datetime
        try:
            day_of_week = datetime.date.fromisoformat(date).weekday() + 1  # Mon=1
            if day_of_week not in avail.get("working_days", [1,2,3,4,5]):
                return {"slots": [], "reason": "Doctor does not work on this day"}
        except:
            pass
        start_h, start_m = map(int, avail.get("start_time","08:00").split(":"))
        end_h,   end_m   = map(int, avail.get("end_time","17:00").split(":"))
        dur  = avail.get("slot_duration", 30)
        cur  = start_h*60 + start_m
        end  = end_h*60   + end_m
        slots = []
        while cur < end:
            slots.append(f"{cur//60:02d}:{cur%60:02d}")
            cur += dur

    # Remove already booked slots
    booked = await db.appointments.find(
        {"doctorId": doctor_id, "date": date, "status": {"$ne": "cancelled"}}
    ).to_list(50)
    booked_times = {b["time"] for b in booked}
    available = [s for s in slots if s not in booked_times]
    return {"slots": available, "booked": list(booked_times), "total": len(slots), "available": len(available)}

# ── Queue Management ───────────────────────────────────────────────────────────
@api_router.get("/queue")
async def get_queue(date: str = "", cu=Depends(get_current_user)):
    """Today's waiting room queue."""
    from datetime import date as dt
    target_date = date or dt.today().isoformat()
    appts = await db.appointments.find({
        "date": target_date,
        "status": {"$in": ["confirmed", "waiting", "in_progress"]}
    }).sort("time", 1).to_list(100)
    return fix_ids(appts)

@api_router.patch("/appointments/{aid}/queue-status")
async def update_queue_status(aid: str, body: dict, cu=Depends(get_current_user)):
    """Update queue status: waiting → in_progress → completed."""
    new_status = body.get("queue_status")   # waiting | in_progress | done | no_show
    wait_time  = body.get("wait_time", 0)   # minutes waited
    await db.appointments.update_one({"_id": aid}, {"$set": {
        "queue_status": new_status,
        "wait_time":    wait_time,
        "updated_at":   now_iso(),
    }})
    return {"ok": True}

# ── Appointment Statistics ─────────────────────────────────────────────────────
@api_router.get("/appointments/stats/trends")
async def appointment_trends(cu=Depends(get_current_user)):
    """Last 7 days appointment counts by status."""
    from datetime import date, timedelta
    trends = []
    for i in range(6, -1, -1):
        d     = (date.today() - timedelta(days=i)).isoformat()
        total = await db.appointments.count_documents({"date": d})
        conf  = await db.appointments.count_documents({"date": d, "status": "confirmed"})
        pend  = await db.appointments.count_documents({"date": d, "status": "pending"})
        canc  = await db.appointments.count_documents({"date": d, "status": "cancelled"})
        comp  = await db.appointments.count_documents({"date": d, "status": "completed"})
        trends.append({"date": d, "total": total, "confirmed": conf, "pending": pend, "cancelled": canc, "completed": comp})
    return trends

@api_router.get("/appointments/stats/by-doctor")
async def appointments_by_doctor(cu=Depends(get_current_user)):
    pipeline = [
        {"$group": {"_id": "$doctor", "total":{"$sum":1},
            "confirmed":{"$sum":{"$cond":[{"$eq":["$status","confirmed"]},1,0]}},
            "completed":{"$sum":{"$cond":[{"$eq":["$status","completed"]},1,0]}},
            "cancelled":{"$sum":{"$cond":[{"$eq":["$status","cancelled"]},1,0]}}}},
        {"$sort": {"total":-1}}, {"$limit": 10}
    ]
    cursor = db.appointments.aggregate(pipeline)
    return [{"doctor":d["_id"],"total":d["total"],"confirmed":d["confirmed"],
             "completed":d["completed"],"cancelled":d["cancelled"]} async for d in cursor]

# ── Recurring Appointments ─────────────────────────────────────────────────────
class RecurringIn(BaseModel):
    base_appointment: dict
    recurrence:       str   = "weekly"   # daily | weekly | biweekly | monthly
    occurrences:      int   = 4          # how many times

@api_router.post("/appointments/recurring")
async def create_recurring(data: RecurringIn, cu=Depends(get_current_user)):
    """Create a series of recurring appointments."""
    from datetime import date, timedelta
    base = data.base_appointment
    created = []
    try:
        start = date.fromisoformat(base.get("date", date.today().isoformat()))
    except:
        start = date.today()

    delta_map = {"daily": timedelta(days=1), "weekly": timedelta(weeks=1),
                 "biweekly": timedelta(weeks=2), "monthly": timedelta(days=30)}
    delta = delta_map.get(data.recurrence, timedelta(weeks=1))

    for i in range(data.occurrences):
        appt_date = (start + delta * i).isoformat()
        doc = {
            "_id":           new_id(),
            **base,
            "date":          appt_date,
            "status":        "pending",
            "recurring":     True,
            "recurrence":    data.recurrence,
            "series_id":     base.get("series_id") or new_id(),
            "occurrence":    i + 1,
            "total_in_series": data.occurrences,
            "created_by":    cu["_id"],
            "created_at":    now_iso(),
        }
        doc.pop("id", None)
        await db.appointments.insert_one(doc)
        created.append(fix_id(doc))

    await audit(cu["_id"], "CREATE", "appointments",
                f"Recurring {data.recurrence} series of {data.occurrences} created")
    return {"ok": True, "created": len(created), "appointments": created}


# DIAGNOSIS / SCANS
# ══════════════════════════════════════════════════════════════════════════════
DISEASE_MAP = {
    "xray": [("Pneumonia","abnormal"),("Normal","normal"),("Tuberculosis","critical"),("Pleural Effusion","abnormal")],
    "mri":  [("Brain Tumor","critical"),("Normal","normal"),("Stroke","critical"),("MS","abnormal")],
    "ct":   [("Lung Cancer","critical"),("Normal","normal"),("Pulmonary Embolism","critical"),("Emphysema","abnormal")],
}

@api_router.post("/diagnosis/scan")
async def upload_scan(
    patient_name: str, scan_type: str,
    file: UploadFile = File(...),
    cu=Depends(get_current_user)
):
    scan_type = scan_type.lower()
    if scan_type not in DISEASE_MAP:
        raise HTTPException(400, "scan_type must be xray, mri or ct")
    disease, scan_status = random.choice(DISEASE_MAP[scan_type])
    doc = {
        "_id": new_id(), "patient_name": patient_name, "scan_type": scan_type,
        "disease": disease, "confidence": round(random.uniform(0.82, 0.99), 3),
        "status": scan_status, "doctor": cu["name"], "doctor_id": cu["_id"],
        "source": "Backend AI", "filename": file.filename, "created_at": now_iso(),
    }
    await db.scans.insert_one(doc)
    return fix_id(doc)

@api_router.get("/diagnosis/scans")
async def get_scans(cu=Depends(get_current_user)):
    q = {} if cu["role"] in ("admin","radiologist") else {"doctor_id": cu["_id"]}
    docs = await db.scans.find(q).sort("created_at",-1).limit(50).to_list(50)
    return fix_ids(docs)

@api_router.get("/diagnosis/stats")
async def diagnosis_stats(cu=Depends(get_current_user)):
    total    = await db.scans.count_documents({})
    critical = await db.scans.count_documents({"status":"critical"})
    abnormal = await db.scans.count_documents({"status":"abnormal"})
    normal   = await db.scans.count_documents({"status":"normal"})
    return {"total":total,"critical":critical,"abnormal":abnormal,"normal":normal}

# ══════════════════════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════════════════════
# EHR — EXTENDED PATIENT RECORDS
# ══════════════════════════════════════════════════════════════════════════════

# ── Visit Notes (SOAP) ────────────────────────────────────────────────────────
class VisitNoteIn(BaseModel):
    patient_id:   str
    patient_name: str
    visit_date:   str = ""
    visit_type:   str = "Outpatient"   # Outpatient | Inpatient | Emergency | Telehealth
    subjective:   str = ""   # Patient complaints, history
    objective:    str = ""   # Exam findings, vitals
    assessment:   str = ""   # Diagnosis / clinical impression
    plan:         str = ""   # Treatment plan
    follow_up:    str = ""   # Follow-up instructions
    severity:     str = "normal"
    is_private:   bool = False

@api_router.post("/ehr/visit-notes")
async def create_visit_note(data: VisitNoteIn, cu=Depends(get_current_user)):
    doc = {
        "_id":          new_id(),
        **data.dict(),
        "doctor_id":    cu["_id"],
        "doctor_name":  cu["name"],
        "doctor_role":  cu["role"],
        "visit_date":   data.visit_date or now_iso()[:10],
        "created_at":   now_iso(),
        "updated_at":   now_iso(),
    }
    await db.visit_notes.insert_one(doc)
    # Also push to patient history
    await db.patients.update_one({"_id": data.patient_id}, {"$push": {"history": {
        "date":     doc["visit_date"],
        "type":     "Visit",
        "desc":     f"{data.visit_type} visit. {data.assessment or data.subjective or 'See visit note.'}",
        "doctor":   cu["name"],
        "severity": data.severity,
        "note_id":  doc["_id"],
    }}})
    await audit(cu["_id"], "CREATE", "ehr", f"Visit note created for {data.patient_name}")
    return fix_id(doc)

@api_router.get("/ehr/visit-notes/{patient_id}")
async def get_visit_notes(patient_id: str, cu=Depends(get_current_user)):
    query = {"patient_id": patient_id}
    if cu["role"] not in ("admin","radiologist") and not query.get("is_private"):
        pass  # doctors see all notes for their patients
    docs = await db.visit_notes.find(query).sort("visit_date",-1).limit(50).to_list(50)
    return fix_ids(docs)

@api_router.put("/ehr/visit-notes/{nid}")
async def update_visit_note(nid: str, data: dict, cu=Depends(get_current_user)):
    data.pop("_id",None); data.pop("id",None)
    data["updated_at"] = now_iso()
    await db.visit_notes.update_one({"_id": nid}, {"$set": data})
    await audit(cu["_id"], "UPDATE", "ehr", f"Visit note {nid} updated")
    return {"ok": True}

@api_router.delete("/ehr/visit-notes/{nid}")
async def delete_visit_note(nid: str, cu=Depends(get_current_user)):
    await db.visit_notes.delete_one({"_id": nid})
    await audit(cu["_id"], "DELETE", "ehr", f"Visit note {nid} deleted")
    return {"ok": True}

# ── Treatment Plans ───────────────────────────────────────────────────────────
class TreatmentPlanIn(BaseModel):
    patient_id:     str
    patient_name:   str
    title:          str
    diagnosis:      str
    start_date:     str = ""
    end_date:       str = ""
    goals:          list = []      # [{text, target_date, achieved}]
    medications:    list = []      # [{drug, dosage, duration, notes}]
    interventions:  list = []      # ["Surgery", "Physiotherapy", ...]
    follow_up_freq: str = "Monthly"
    notes:          str = ""
    status:         str = "active" # active | completed | paused | cancelled

@api_router.post("/ehr/treatment-plans")
async def create_treatment_plan(data: TreatmentPlanIn, cu=Depends(get_current_user)):
    doc = {
        "_id":           new_id(),
        **data.dict(),
        "created_by":    cu["_id"],
        "created_by_name":cu["name"],
        "start_date":    data.start_date or now_iso()[:10],
        "created_at":    now_iso(),
        "updated_at":    now_iso(),
    }
    await db.treatment_plans.insert_one(doc)
    await audit(cu["_id"], "CREATE", "ehr", f"Treatment plan created for {data.patient_name}")
    return fix_id(doc)

@api_router.get("/ehr/treatment-plans/{patient_id}")
async def get_treatment_plans(patient_id: str, cu=Depends(get_current_user)):
    docs = await db.treatment_plans.find({"patient_id": patient_id}).sort("created_at",-1).to_list(20)
    return fix_ids(docs)

@api_router.put("/ehr/treatment-plans/{pid}")
async def update_treatment_plan(pid: str, data: dict, cu=Depends(get_current_user)):
    data.pop("_id",None); data.pop("id",None)
    data["updated_at"] = now_iso()
    await db.treatment_plans.update_one({"_id": pid}, {"$set": data})
    return {"ok": True}

# ── Vitals History ────────────────────────────────────────────────────────────
class VitalsEntryIn(BaseModel):
    patient_id:   str
    patient_name: str
    bp:           str = ""
    hr:           str = ""
    temp:         str = ""
    weight:       str = ""
    height:       str = ""
    o2:           str = ""
    glucose:      str = ""
    notes:        str = ""
    recorded_at:  str = ""

@api_router.post("/ehr/vitals")
async def record_vitals(data: VitalsEntryIn, cu=Depends(get_current_user)):
    doc = {
        "_id":          new_id(),
        **data.dict(),
        "recorded_by":  cu["name"],
        "recorded_at":  data.recorded_at or now_iso(),
        "created_at":   now_iso(),
    }
    await db.vitals_history.insert_one(doc)
    # Update current vitals on patient
    vitals_update = {k:v for k,v in {"bp":data.bp,"hr":data.hr,"temp":data.temp,"weight":data.weight,"height":data.height,"o2":data.o2}.items() if v}
    if vitals_update:
        await db.patients.update_one({"_id": data.patient_id}, {"$set": {"vitals": vitals_update, "vitals_updated": now_iso()}})
    return fix_id(doc)

@api_router.get("/ehr/vitals/{patient_id}")
async def get_vitals_history(patient_id: str, limit: int = 30, cu=Depends(get_current_user)):
    docs = await db.vitals_history.find({"patient_id": patient_id}).sort("recorded_at",-1).limit(limit).to_list(limit)
    return fix_ids(docs)

# ── Lab Results (direct EHR entry) ────────────────────────────────────────────
class LabResultIn(BaseModel):
    patient_id:   str
    patient_name: str
    test:         str
    result:       str
    reference:    str = ""    # normal reference range
    unit:         str = ""
    status:       str = "normal"  # normal | abnormal | critical
    notes:        str = ""
    lab_date:     str = ""
    ordered_by:   str = ""

@api_router.post("/ehr/lab-results")
async def add_lab_result(data: LabResultIn, cu=Depends(get_current_user)):
    doc = {
        "_id":        new_id(),
        **data.dict(),
        "entered_by": cu["name"],
        "lab_date":   data.lab_date or now_iso()[:10],
        "created_at": now_iso(),
    }
    await db.lab_results.insert_one(doc)
    # Push to patient record
    await db.patients.update_one({"_id": data.patient_id}, {"$push": {"labResults": {
        "test":   data.test, "date": doc["lab_date"],
        "result": data.result, "status": data.status,
        "reference": data.reference, "notes": data.notes,
    }}})
    await audit(cu["_id"], "CREATE", "ehr", f"Lab result {data.test} added for {data.patient_name}")
    return fix_id(doc)

@api_router.get("/ehr/lab-results/{patient_id}")
async def get_lab_results(patient_id: str, cu=Depends(get_current_user)):
    docs = await db.lab_results.find({"patient_id": patient_id}).sort("lab_date",-1).limit(100).to_list(100)
    return fix_ids(docs)

# ── EHR Timeline (all events for a patient) ────────────────────────────────────
@api_router.get("/ehr/timeline/{patient_id}")
async def get_patient_timeline(patient_id: str, cu=Depends(get_current_user)):
    patient = await db.patients.find_one({"_id": patient_id})
    if not patient:
        raise HTTPException(404, "Patient not found")

    events = []

    # Visit notes
    notes = await db.visit_notes.find({"patient_id": patient_id}).to_list(100)
    for n in notes:
        events.append({"type":"visit","date":n["visit_date"],"title":f"{n['visit_type']} Visit","desc":n.get("assessment") or n.get("subjective",""),"doctor":n.get("doctor_name",""),"severity":n.get("severity","normal"),"id":n["_id"]})

    # Lab results
    labs = await db.lab_results.find({"patient_id": patient_id}).to_list(100)
    for l in labs:
        events.append({"type":"lab","date":l["lab_date"],"title":l["test"],"desc":l["result"],"doctor":l.get("entered_by",""),"severity":l["status"],"id":l["_id"]})

    # Scans
    scans = await db.scans.find({"$or":[{"patient_name":patient.get("name","")},{"patient_id":patient_id}]}).to_list(50)
    for s in scans:
        events.append({"type":"scan","date":s["created_at"][:10],"title":f"{s.get('scan_type','').upper()} Scan","desc":s.get("disease",""),"doctor":s.get("doctor",""),"severity":s.get("status","normal"),"id":s["_id"]})

    # Appointments
    appts = await db.appointments.find({"$or":[{"patient":patient.get("name","")},{"patient_id":patient_id}]}).to_list(50)
    for a in appts:
        events.append({"type":"appointment","date":a["date"],"title":f"{a.get('type','Appointment')}","desc":a.get("notes",""),"doctor":a.get("doctor",""),"severity":"normal","status":a.get("status",""),"id":a["_id"]})

    # Vitals
    vitals = await db.vitals_history.find({"patient_id": patient_id}).to_list(50)
    for v in vitals:
        events.append({"type":"vitals","date":v["recorded_at"][:10],"title":"Vitals Recorded","desc":f"BP: {v.get('bp','—')}, HR: {v.get('hr','—')}, O₂: {v.get('o2','—')}%","doctor":v.get("recorded_by",""),"severity":"normal","id":v["_id"]})

    # Treatment plans
    plans = await db.treatment_plans.find({"patient_id": patient_id}).to_list(20)
    for p in plans:
        events.append({"type":"treatment","date":p["start_date"],"title":f"Treatment Plan: {p['title']}","desc":p.get("diagnosis",""),"doctor":p.get("created_by_name",""),"severity":"normal","id":p["_id"]})

    # Sort by date descending
    events.sort(key=lambda e: e.get("date",""), reverse=True)
    return events

# ── EHR Summary (for export / print) ─────────────────────────────────────────
@api_router.get("/ehr/summary/{patient_id}")
async def ehr_summary(patient_id: str, cu=Depends(get_current_user)):
    patient  = await db.patients.find_one({"_id": patient_id})
    if not patient: raise HTTPException(404, "Patient not found")
    notes    = await db.visit_notes.find({"patient_id": patient_id}).sort("visit_date",-1).to_list(10)
    labs     = await db.lab_results.find({"patient_id": patient_id}).sort("lab_date",-1).to_list(10)
    plans    = await db.treatment_plans.find({"patient_id": patient_id}).to_list(5)
    vitals_h = await db.vitals_history.find({"patient_id": patient_id}).sort("recorded_at",-1).to_list(5)
    return {
        "patient":         fix_id(patient),
        "visit_notes":     fix_ids(notes),
        "lab_results":     fix_ids(labs),
        "treatment_plans": fix_ids(plans),
        "vitals_history":  fix_ids(vitals_h),
        "generated_at":    now_iso(),
    }


# REPORT GENERATION
# ══════════════════════════════════════════════════════════════════════════════
class ReportIn(BaseModel):
    scan_id:          str = ""
    patient_name:     str
    patient_dob:      str = ""
    patient_gender:   str = ""
    patient_id:       str = ""
    scan_type:        str
    scan_date:        str = ""
    referring_doctor: str = ""
    radiologist:      str = ""
    institution:      str = "MediCore AI Hospital"
    clinical_history: str = ""
    technique:        str = ""
    findings:         str = ""
    impression:       str = ""
    recommendation:   str = ""
    diagnosis:        str = ""
    severity:         str = "normal"
    confidence:       float = 0.0
    template:         str = "standard"
    status:           str = "draft"    # draft | final | signed
    ai_generated:     bool = False
    signature:        str = ""
    signature_date:   str = ""

@api_router.post("/reports")
async def create_report(data: ReportIn, cu=Depends(get_current_user)):
    doc = {
        "_id":              new_id(),
        "report_number":    f"RPT-{now_iso()[:10].replace('-','')}-{new_id()[:6].upper()}",
        **data.dict(),
        "author_id":        cu["_id"],
        "author_name":      cu["name"],
        "author_role":      cu["role"],
        "created_at":       now_iso(),
        "updated_at":       now_iso(),
        "signed_at":        None,
        "signed_by":        None,
    }
    await db.reports.insert_one(doc)
    await audit(cu["_id"], "CREATE", "reports", f"Report created for {data.patient_name}")
    return fix_id(doc)

@api_router.get("/reports")
async def list_reports(
    patient: str = "", status: str = "", scan_type: str = "",
    cu=Depends(get_current_user)
):
    query = {}
    if cu["role"] not in ("admin", "radiologist"):
        query["author_id"] = cu["_id"]
    if patient:   query["patient_name"] = {"$regex": patient, "$options": "i"}
    if status:    query["status"]       = status
    if scan_type: query["scan_type"]    = scan_type
    docs = await db.reports.find(query).sort("created_at", -1).limit(100).to_list(100)
    return fix_ids(docs)

@api_router.get("/reports/{rid}")
async def get_report(rid: str, cu=Depends(get_current_user)):
    doc = await db.reports.find_one({"_id": rid})
    if not doc: raise HTTPException(404, "Report not found")
    return fix_id(doc)

@api_router.put("/reports/{rid}")
async def update_report(rid: str, data: dict, cu=Depends(get_current_user)):
    data.pop("_id", None); data.pop("id", None)
    data["updated_at"] = now_iso()
    await db.reports.update_one({"_id": rid}, {"$set": data})
    await audit(cu["_id"], "UPDATE", "reports", f"Report {rid} updated")
    return {"ok": True}

@api_router.post("/reports/{rid}/sign")
async def sign_report(rid: str, body: dict, cu=Depends(get_current_user)):
    signature = body.get("signature", cu["name"])
    await db.reports.update_one({"_id": rid}, {"$set": {
        "status":         "signed",
        "signed_at":      now_iso(),
        "signed_by":      cu["name"],
        "signed_by_id":   cu["_id"],
        "signature":      signature,
        "signature_date": now_iso()[:10],
        "updated_at":     now_iso(),
    }})
    await audit(cu["_id"], "SIGN", "reports", f"Report {rid} digitally signed by {cu['name']}")
    return {"ok": True, "signed_at": now_iso(), "signed_by": cu["name"]}

@api_router.delete("/reports/{rid}")
async def delete_report(rid: str, cu=Depends(get_current_user)):
    doc = await db.reports.find_one({"_id": rid})
    if not doc: raise HTTPException(404, "Report not found")
    if doc.get("status") == "signed":
        raise HTTPException(400, "Cannot delete a signed report")
    await db.reports.delete_one({"_id": rid})
    await audit(cu["_id"], "DELETE", "reports", f"Report {rid} deleted")
    return {"ok": True}

@api_router.get("/reports/stats/summary")
async def report_stats(cu=Depends(get_current_user)):
    total  = await db.reports.count_documents({})
    signed = await db.reports.count_documents({"status": "signed"})
    draft  = await db.reports.count_documents({"status": "draft"})
    final  = await db.reports.count_documents({"status": "final"})
    return {"total": total, "signed": signed, "draft": draft, "final": final}

# MEDICINE — DRUGS + PRESCRIPTIONS
# ══════════════════════════════════════════════════════════════════════════════
class DrugIn(BaseModel):
    name:         str
    category:     str
    dosage:       str
    stock:        int
    unit:         str = "tablets"
    price:        float = 0.0
    manufacturer: str = ""

@api_router.post("/medicine/drugs")
async def add_drug(data: DrugIn, cu=Depends(get_current_user)):
    if cu["role"] != "admin": raise HTTPException(403, "Admin only")
    doc = {
        "_id": new_id(), **data.dict(),
        "status": "available" if data.stock > 100 else ("low" if data.stock > 0 else "out"),
        "created_at": now_iso()
    }
    await db.drugs.insert_one(doc)
    return fix_id(doc)

@api_router.get("/medicine/drugs")
async def list_drugs(search: str = "", category: str = "", cu=Depends(get_current_user)):
    query = {}
    if search:   query["name"]     = {"$regex": search, "$options": "i"}
    if category and category != "All": query["category"] = category
    docs = await db.drugs.find(query).sort("name", 1).to_list(200)
    return fix_ids(docs)

class PrescriptionIn(BaseModel):
    patient:  str
    drug:     str
    dosage:   str
    duration: str
    refills:  int = 0
    notes:    str = ""

@api_router.post("/medicine/prescriptions")
async def create_prescription(data: PrescriptionIn, cu=Depends(get_current_user)):
    doc = {
        "_id": new_id(), "patient": data.patient, "drug": data.drug,
        "dosage": data.dosage, "duration": data.duration,
        "refills": data.refills, "notes": data.notes,
        "doctor": cu["name"], "doctor_id": cu["_id"],
        "date": now_iso()[:10], "status": "pending", "created_at": now_iso(),
    }
    await db.prescriptions.insert_one(doc)
    return fix_id(doc)

@api_router.get("/medicine/prescriptions")
async def list_prescriptions(cu=Depends(get_current_user)):
    q = {} if cu["role"] in ("admin","radiologist") else {"doctor_id": cu["_id"]}
    docs = await db.prescriptions.find(q).sort("created_at",-1).limit(100).to_list(100)
    return fix_ids(docs)

@api_router.patch("/medicine/prescriptions/{pid}/status")
async def update_prescription_status(pid: str, body: dict, cu=Depends(get_current_user)):
    await db.prescriptions.update_one({"_id": pid}, {"$set": {"status": body.get("status"), "updated_at": now_iso()}})
    return {"ok": True}

# ══════════════════════════════════════════════════════════════════════════════
# RESOURCES
# ══════════════════════════════════════════════════════════════════════════════
FACILITY_NAMES = ["City General Hospital","North Medical Center","St. Luke's Hospital","Downtown Clinic"]

@api_router.get("/resources/facilities")
async def get_facilities(cu=Depends(get_current_user)):
    docs = await db.facilities.find({}).to_list(20)
    return fix_ids(docs)

@api_router.get("/resources/alerts")
async def get_alerts(cu=Depends(get_current_user)):
    docs = await db.alerts.find({}).sort("created_at",-1).limit(10).to_list(10)
    return fix_ids(docs)

@api_router.get("/resources/demand-forecast")
async def demand_forecast(cu=Depends(get_current_user)):
    return [
        {"date": (date.today() + timedelta(days=i)).isoformat(),
         "predicted_admissions": random.randint(28,62),
         "icu_demand":           random.randint(14,38),
         "ventilator_demand":    random.randint(8,24)}
        for i in range(7)
    ]

# ══════════════════════════════════════════════════════════════════════════════
# ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════
@api_router.get("/analytics/overview")
async def analytics_overview(cu=Depends(get_current_user)):
    # real counts from DB
    total_scans  = await db.scans.count_documents({})
    total_patients = await db.patients.count_documents({})
    total_appts  = await db.appointments.count_documents({})
    total_rx     = await db.prescriptions.count_documents({})
    critical_scans = await db.scans.count_documents({"status":"critical"})
    pending_appts  = await db.appointments.count_documents({"status":"pending"})

    # monthly breakdown — last 7 months
    months = []
    for i in range(6, -1, -1):
        d     = date.today().replace(day=1) - timedelta(days=i*28)
        label = d.strftime("%b")
        month_str = d.strftime("%Y-%m")
        total_m   = await db.scans.count_documents({"created_at": {"$regex": f"^{month_str}"}})
        normal_m  = await db.scans.count_documents({"created_at": {"$regex": f"^{month_str}"}, "status":"normal"})
        abnorm_m  = await db.scans.count_documents({"created_at": {"$regex": f"^{month_str}"}, "status":"abnormal"})
        crit_m    = await db.scans.count_documents({"created_at": {"$regex": f"^{month_str}"}, "status":"critical"})
        months.append({"month":label,"total":total_m,"normal":normal_m,"abnormal":abnorm_m,"critical":crit_m})

    # disease distribution
    pipeline = [{"$group": {"_id": "$disease", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}, {"$limit": 7}]
    disease_cursor = db.scans.aggregate(pipeline)
    disease_dist   = [{"name": d["_id"], "count": d["count"]} async for d in disease_cursor]

    # scan type breakdown
    type_pipeline = [{"$group": {"_id": "$scan_type", "count": {"$sum": 1}}}]
    type_cursor   = db.scans.aggregate(type_pipeline)
    scan_types    = [{"name": d["_id"].upper(), "value": d["count"]} async for d in type_cursor]

    return {
        "kpi": {
            "total_scans":    total_scans,
            "total_patients": total_patients,
            "total_appts":    total_appts,
            "total_rx":       total_rx,
            "critical_scans": critical_scans,
            "pending_appts":  pending_appts,
        },
        "monthly_scans": months,
        "disease_dist":  disease_dist,
        "scan_types":    scan_types,
    }

@api_router.get("/analytics/doctors")
async def analytics_doctors(cu=Depends(get_current_user)):
    pipeline = [
        {"$group": {
            "_id": "$doctor",
            "scans": {"$sum": 1},
            "critical": {"$sum": {"$cond": [{"$eq":["$status","critical"]},1,0]}},
            "avg_confidence": {"$avg": "$confidence"}
        }},
        {"$sort": {"scans": -1}}, {"$limit": 10}
    ]
    cursor = db.scans.aggregate(pipeline)
    return [{"name": d["_id"], "scans": d["scans"],
             "critical": d["critical"],
             "accuracy": round(d["avg_confidence"]*100, 1) if d["avg_confidence"] else 0,
             "avgTime": round(3.5 + random.random()*2, 1)}
            async for d in cursor]

# ══════════════════════════════════════════════════════════════════════════════
# MESSAGES / CHAT
# ══════════════════════════════════════════════════════════════════════════════
class MessageIn(BaseModel):
    contact_id: str
    text:       str

@api_router.get("/messages/contacts")
async def get_contacts(cu=Depends(get_current_user)):
    users = await db.users.find({"_id": {"$ne": cu["_id"]}}, {"password":0}).to_list(50)
    contacts = []
    for u in users:
        last = await db.messages.find_one(
            {"$or": [{"from_id": cu["_id"], "to_id": u["_id"]},
                     {"from_id": u["_id"],  "to_id": cu["_id"]}]},
            sort=[("created_at",-1)]
        )
        unread = await db.messages.count_documents(
            {"from_id": u["_id"], "to_id": cu["_id"], "read": False})
        contacts.append({
            "id": u["_id"], "name": u["name"], "role": u["role"],
            "status": "online",
            "lastMsg": last["text"] if last else "",
            "time":    last["created_at"][:16].replace("T"," ") if last else "",
            "unread":  unread,
        })
    return contacts

@api_router.get("/messages/thread/{contact_id}")
async def get_thread(contact_id: str, cu=Depends(get_current_user)):
    msgs = await db.messages.find({
        "$or": [{"from_id": cu["_id"], "to_id": contact_id},
                {"from_id": contact_id, "to_id": cu["_id"]}]
    }).sort("created_at", 1).to_list(200)
    await db.messages.update_many(
        {"from_id": contact_id, "to_id": cu["_id"], "read": False},
        {"$set": {"read": True}}
    )
    return [{"from": "me" if m["from_id"]==cu["_id"] else "other",
             "text": m["text"],
             "time": m["created_at"][11:16]} for m in msgs]

@api_router.post("/messages/send")
async def send_message(data: MessageIn, cu=Depends(get_current_user)):
    doc = {"_id": new_id(), "from_id": cu["_id"], "to_id": data.contact_id,
           "text": data.text, "read": False, "created_at": now_iso()}
    await db.messages.insert_one(doc)
    return {"ok": True}

# ══════════════════════════════════════════════════════════════════════════════
# ADMIN
# ══════════════════════════════════════════════════════════════════════════════
@api_router.get("/admin/users")
async def list_users(cu=Depends(get_current_user)):
    if cu["role"] != "admin": raise HTTPException(403, "Admin only")
    users = await db.users.find({}, {"password":0}).to_list(200)
    return fix_ids(users)

@api_router.patch("/admin/users/{uid}/role")
async def change_role(uid: str, body: dict, cu=Depends(get_current_user)):
    if cu["role"] != "admin": raise HTTPException(403, "Admin only")
    await db.users.update_one({"_id": uid}, {"$set": {"role": body.get("role")}})
    return {"ok": True}

@api_router.get("/admin/stats")
async def admin_stats(cu=Depends(get_current_user)):
    if cu["role"] != "admin": raise HTTPException(403, "Admin only")
    return {
        "users":    await db.users.count_documents({}),
        "patients": await db.patients.count_documents({}),
        "scans":    await db.scans.count_documents({}),
        "appts":    await db.appointments.count_documents({}),
    }

# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════
@api_router.get("/notifications")
async def list_notifications(cu=Depends(get_current_user)):
    docs = await db.notifications.find({"user_id": cu["_id"]}).sort("created_at",-1).limit(20).to_list(20)
    return fix_ids(docs)

@api_router.patch("/notifications/{nid}/read")
async def mark_read(nid: str, cu=Depends(get_current_user)):
    await db.notifications.update_one({"_id": nid}, {"$set": {"read": True}})
    return {"ok": True}

@api_router.get("/notifications/unread-count")
async def unread_count(cu=Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": cu["_id"], "read": False})
    return {"count": count}

# ══════════════════════════════════════════════════════════════════════════════
# HEALTH
# ══════════════════════════════════════════════════════════════════════════════
@api_router.get("/health")
async def health():
    try:
        await db.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {"status":"ok","db":db_status,"version":"3.0.0"}


# (Older duplicate /reports endpoints removed — the canonical ones live earlier
#  in this file. Kept only the by-scan helper because it is unique.)
@api_router.get("/reports/by-scan/{scan_id}")
async def get_report_by_scan(scan_id: str, cu=Depends(get_current_user)):
    doc = await db.reports.find_one({"scan_id": scan_id})
    if not doc: raise HTTPException(404, "No report for this scan")
    return fix_id(doc)

# Audit log endpoint
@api_router.post("/admin/audit-logs")
async def add_audit_log(entry: dict, cu=Depends(get_current_user)):
    entry["_id"]        = new_id()
    entry["user"]       = cu["name"]
    entry["user_id"]    = cu["_id"]
    entry["role"]       = cu["role"]
    entry["created_at"] = now_iso()
    await db.audit_logs.insert_one(entry)
    return {"ok": True}

# ══════════════════════════════════════════════════════════════════════════════
# TOPIC 7 — DOCTOR COLLABORATION
# ══════════════════════════════════════════════════════════════════════════════

# ── Case Discussions ──────────────────────────────────────────────────────────
class CaseIn(BaseModel):
    title:          str
    patient_name:   str
    patient_id:     str = ""
    scan_id:        str = ""
    scan_type:      str = ""
    diagnosis:      str = ""
    description:    str
    urgency:        str = "routine"   # routine | urgent | emergency
    specialties:    list = []         # invited specialties
    attachments:    list = []         # scan IDs or report IDs

@api_router.post("/collaboration/cases")
async def create_case(data: CaseIn, cu=Depends(get_current_user)):
    doc = {
        "_id":          new_id(),
        **data.dict(),
        "created_by":   cu["_id"],
        "created_by_name": cu["name"],
        "created_at":   now_iso(),
        "status":       "open",
        "comments":     [],
        "second_opinions": [],
        "viewers":      [cu["_id"]],
    }
    await db.cases.insert_one(doc)
    await audit(cu["_id"], "CREATE", "cases", f"Case discussion created: {data.title}")
    return fix_id(doc)

@api_router.get("/collaboration/cases")
async def list_cases(status: str = "", cu=Depends(get_current_user)):
    query = {}
    if status: query["status"] = status
    docs = await db.cases.find(query).sort("created_at", -1).limit(50).to_list(50)
    return fix_ids(docs)

@api_router.get("/collaboration/cases/{cid}")
async def get_case(cid: str, cu=Depends(get_current_user)):
    doc = await db.cases.find_one({"_id": cid})
    if not doc: raise HTTPException(404, "Case not found")
    # Mark as viewed
    await db.cases.update_one({"_id": cid}, {"$addToSet": {"viewers": cu["_id"]}})
    return fix_id(doc)

@api_router.post("/collaboration/cases/{cid}/comment")
async def add_comment(cid: str, body: dict, cu=Depends(get_current_user)):
    comment = {
        "id":       new_id(),
        "text":     body.get("text", ""),
        "author":   cu["name"],
        "role":     cu["role"],
        "author_id":cu["_id"],
        "created_at":now_iso(),
        "attachments": body.get("attachments", []),
    }
    await db.cases.update_one({"_id": cid}, {"$push": {"comments": comment}})
    return {"ok": True, "comment": comment}

@api_router.post("/collaboration/cases/{cid}/second-opinion")
async def request_second_opinion(cid: str, body: dict, cu=Depends(get_current_user)):
    opinion = {
        "id":           new_id(),
        "requested_by": cu["name"],
        "requested_from":body.get("doctor_name", ""),
        "specialty":    body.get("specialty", ""),
        "message":      body.get("message", ""),
        "status":       "pending",  # pending | accepted | declined | completed
        "response":     "",
        "created_at":   now_iso(),
    }
    await db.cases.update_one({"_id": cid}, {"$push": {"second_opinions": opinion}})
    await audit(cu["_id"], "CREATE", "cases", f"Second opinion requested on case {cid}")
    return {"ok": True, "opinion": opinion}

@api_router.post("/collaboration/cases/{cid}/second-opinion/{oid}/respond")
async def respond_second_opinion(cid: str, oid: str, body: dict, cu=Depends(get_current_user)):
    await db.cases.update_one(
        {"_id": cid, "second_opinions.id": oid},
        {"$set": {
            "second_opinions.$.status":   body.get("status", "completed"),
            "second_opinions.$.response": body.get("response", ""),
            "second_opinions.$.responded_by": cu["name"],
            "second_opinions.$.responded_at": now_iso(),
        }}
    )
    return {"ok": True}

@api_router.patch("/collaboration/cases/{cid}/status")
async def update_case_status(cid: str, body: dict, cu=Depends(get_current_user)):
    await db.cases.update_one({"_id": cid}, {"$set": {"status": body.get("status"), "updated_at": now_iso()}})
    return {"ok": True}

# ── Scan Sharing ──────────────────────────────────────────────────────────────
@api_router.post("/collaboration/share-scan")
async def share_scan(body: dict, cu=Depends(get_current_user)):
    doc = {
        "_id":          new_id(),
        "scan_id":      body.get("scan_id", ""),
        "patient_name": body.get("patient_name", ""),
        "shared_by":    cu["name"],
        "shared_by_id": cu["_id"],
        "shared_with":  body.get("shared_with", []),   # list of user IDs
        "message":      body.get("message", ""),
        "expires_at":   body.get("expires_at", ""),
        "created_at":   now_iso(),
        "views":        [],
    }
    await db.shared_scans.insert_one(doc)
    await audit(cu["_id"], "SHARE", "scans", f"Scan shared with {len(body.get('shared_with',[]))} users")
    return fix_id(doc)

@api_router.get("/collaboration/shared-scans")
async def get_shared_scans(cu=Depends(get_current_user)):
    docs = await db.shared_scans.find({
        "$or": [{"shared_by_id": cu["_id"]}, {"shared_with": cu["_id"]}]
    }).sort("created_at", -1).limit(20).to_list(20)
    return fix_ids(docs)

# ══════════════════════════════════════════════════════════════════════════════
# TOPIC 8 — PATIENT PORTAL (EXTENDED)
# ══════════════════════════════════════════════════════════════════════════════

# ── Telemedicine Sessions ─────────────────────────────────────────────────────
class TelemedicineIn(BaseModel):
    patient_name:  str
    doctor_name:   str
    doctor_id:     str = ""
    scheduled_at:  str
    duration_mins: int = 30
    type:          str = "video"   # video | audio | chat
    notes:         str = ""

@api_router.post("/portal/telemedicine")
async def book_telemedicine(data: TelemedicineIn, cu=Depends(get_current_user)):
    doc = {
        "_id":           new_id(),
        **data.dict(),
        "patient_id":    cu["_id"],
        "status":        "scheduled",
        "room_id":       f"room_{new_id()[:8]}",
        "join_url":      f"https://meet.medicore.ai/room_{new_id()[:8]}",
        "created_at":    now_iso(),
    }
    await db.telemedicine.insert_one(doc)
    await audit(cu["_id"], "CREATE", "telemedicine", f"Telemedicine booked with {data.doctor_name}")
    return fix_id(doc)

@api_router.get("/portal/telemedicine")
async def get_telemedicine(cu=Depends(get_current_user)):
    docs = await db.telemedicine.find({"patient_id": cu["_id"]}).sort("scheduled_at", -1).limit(20).to_list(20)
    return fix_ids(docs)

# ── Billing / Payments ────────────────────────────────────────────────────────
class InvoiceIn(BaseModel):
    patient_id:    str
    patient_name:  str
    items:         list   # [{desc, qty, unit_price}]
    discount:      float = 0.0
    tax_rate:      float = 0.0
    insurance_claim: bool = False
    insurance_provider: str = ""
    notes:         str = ""

@api_router.post("/billing/invoices")
async def create_invoice(data: InvoiceIn, cu=Depends(get_current_user)):
    subtotal = sum(i.get("qty",1)*i.get("unit_price",0) for i in data.items)
    discount_amt = subtotal * (data.discount/100)
    taxable  = subtotal - discount_amt
    tax_amt  = taxable  * (data.tax_rate/100)
    total    = taxable  + tax_amt
    doc = {
        "_id":               new_id(),
        "invoice_number":    f"INV-{now_iso()[:10].replace('-','')}-{new_id()[:6].upper()}",
        **data.dict(),
        "subtotal":          round(subtotal, 2),
        "discount_amount":   round(discount_amt, 2),
        "tax_amount":        round(tax_amt, 2),
        "total":             round(total, 2),
        "status":            "unpaid",
        "created_by":        cu["_id"],
        "created_by_name":   cu["name"],
        "created_at":        now_iso(),
        "due_date":          (datetime.utcnow() + timedelta(days=30)).isoformat()[:10],
        "paid_at":           None,
        "payment_method":    None,
    }
    await db.invoices.insert_one(doc)
    await audit(cu["_id"], "CREATE", "billing", f"Invoice {doc['invoice_number']} created for {data.patient_name}")
    return fix_id(doc)

@api_router.get("/billing/invoices")
async def list_invoices(patient_id: str = "", status: str = "", cu=Depends(get_current_user)):
    query = {}
    if cu["role"] == "patient": query["patient_id"] = cu["_id"]
    elif patient_id: query["patient_id"] = patient_id
    if status: query["status"] = status
    docs = await db.invoices.find(query).sort("created_at", -1).limit(100).to_list(100)
    return fix_ids(docs)

@api_router.patch("/billing/invoices/{iid}/pay")
async def mark_paid(iid: str, body: dict, cu=Depends(get_current_user)):
    await db.invoices.update_one({"_id": iid}, {"$set": {
        "status": "paid", "paid_at": now_iso(),
        "payment_method": body.get("method", "card"),
        "transaction_id": body.get("transaction_id", new_id()[:12].upper()),
    }})
    await audit(cu["_id"], "UPDATE", "billing", f"Invoice {iid} marked as paid")
    return {"ok": True}

@api_router.get("/billing/stats")
async def billing_stats(cu=Depends(get_current_user)):
    total_inv   = await db.invoices.count_documents({})
    paid        = await db.invoices.count_documents({"status": "paid"})
    unpaid      = await db.invoices.count_documents({"status": "unpaid"})
    overdue     = await db.invoices.count_documents({"status": "overdue"})
    pipeline = [{"$group": {"_id": None,
        "total_revenue": {"$sum": {"$cond":[{"$eq":["$status","paid"]},"$total",0]}},
        "total_outstanding": {"$sum": {"$cond":[{"$ne":["$status","paid"]},"$total",0]}},
    }}]
    cursor = db.invoices.aggregate(pipeline)
    agg = None
    async for doc in cursor:
        agg = doc
    return {
        "total": total_inv, "paid": paid, "unpaid": unpaid, "overdue": overdue,
        "total_revenue": round(agg["total_revenue"],2) if agg else 0,
        "total_outstanding": round(agg["total_outstanding"],2) if agg else 0,
    }

# ══════════════════════════════════════════════════════════════════════════════
# TOPIC 9 — AI & ADVANCED ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

@api_router.get("/analytics/risk-prediction")
async def risk_prediction(cu=Depends(get_current_user)):
    """Risk score per patient based on vitals history, scan severity, conditions."""
    patients = await db.patients.find({}).limit(20).to_list(20)
    results  = []
    for p in patients:
        # Simple rule-based risk scoring
        score = 0
        factors = []
        conditions = p.get("conditions", [])
        vitals     = p.get("vitals", {})

        # Condition risk
        high_risk = ["Brain Tumor","Tuberculosis","Lung Cancer","COPD","Glioblastoma"]
        med_risk  = ["Hypertension","Diabetes","Asthma","Emphysema"]
        for c in conditions:
            if any(h in c for h in high_risk): score += 40; factors.append(f"High-risk condition: {c}")
            elif any(m in c for m in med_risk): score += 20; factors.append(f"Chronic condition: {c}")

        # Vitals risk
        try:
            bp_sys = int(str(vitals.get("bp","120/80")).split("/")[0])
            if bp_sys > 140: score += 15; factors.append(f"Elevated BP: {vitals.get('bp')}")
        except: pass
        try:
            o2 = float(str(vitals.get("o2","98")))
            if o2 < 95: score += 20; factors.append(f"Low O₂: {o2}%")
        except: pass

        # Scan history severity
        scans = await db.scans.find({"patient_name": p.get("name","")}).to_list(10)
        crit_scans = [s for s in scans if s.get("status") == "critical"]
        if crit_scans: score += 25; factors.append(f"{len(crit_scans)} critical scan(s)")

        score = min(score, 100)
        level = "critical" if score>=70 else "high" if score>=40 else "moderate" if score>=20 else "low"

        results.append({
            "patient_id":   str(p.get("_id","")),
            "patient_name": p.get("name",""),
            "risk_score":   score,
            "risk_level":   level,
            "factors":      factors,
            "conditions":   conditions,
            "status":       p.get("status","active"),
        })

    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results

@api_router.get("/analytics/revenue")
async def revenue_analytics(cu=Depends(get_current_user)):
    """Monthly revenue from invoices."""
    months = []
    for i in range(6, -1, -1):
        d         = (datetime.utcnow().replace(day=1) - timedelta(days=i*28))
        month_str = d.strftime("%Y-%m")
        label     = d.strftime("%b")
        pipeline  = [
            {"$match": {"created_at": {"$regex": f"^{month_str}"}}},
            {"$group": {"_id": "$status",
                "total": {"$sum": "$total"},
                "count": {"$sum": 1}}}
        ]
        cur = db.invoices.aggregate(pipeline)
        paid_total = 0; unpaid_total = 0; paid_count = 0
        async for doc in cur:
            if doc["_id"] == "paid":   paid_total = doc["total"];   paid_count = doc["count"]
            else:                      unpaid_total += doc["total"]
        months.append({"month": label, "revenue": round(paid_total,2),
                        "outstanding": round(unpaid_total,2), "invoices": paid_count})
    return months

@api_router.get("/analytics/disease-trends")
async def disease_trends(cu=Depends(get_current_user)):
    """Disease frequency trend over last 6 months."""
    pipeline = [
        {"$group": {
            "_id": {"disease":"$disease", "month":{"$substr":["$created_at",0,7]}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.month": 1}},
        {"$limit": 100}
    ]
    cursor = db.scans.aggregate(pipeline)
    rows = [{"disease":d["_id"]["disease"],"month":d["_id"]["month"],"count":d["count"]} async for d in cursor]
    return rows

@api_router.get("/analytics/severity-scoring")
async def severity_scoring(cu=Depends(get_current_user)):
    """Average confidence score by scan type + severity distribution."""
    pipeline = [
        {"$group": {
            "_id": "$scan_type",
            "avg_confidence": {"$avg": "$confidence"},
            "total": {"$sum": 1},
            "critical": {"$sum": {"$cond":[{"$eq":["$status","critical"]},1,0]}},
            "abnormal": {"$sum": {"$cond":[{"$eq":["$status","abnormal"]},1,0]}},
            "normal":   {"$sum": {"$cond":[{"$eq":["$status","normal"]},1,0]}},
        }},
        {"$sort": {"total": -1}}
    ]
    cursor = db.scans.aggregate(pipeline)
    return [{"scan_type":d["_id"],"avg_confidence":round((d["avg_confidence"] or 0)*100,1),
             "total":d["total"],"critical":d["critical"],"abnormal":d["abnormal"],"normal":d["normal"]}
            async for d in cursor]

@api_router.get("/analytics/auto-report-suggestions")
async def auto_report_suggestions(scan_id: str = "", cu=Depends(get_current_user)):
    """AI-generated report text suggestions based on scan disease."""
    SUGGESTIONS = {
        "Pneumonia":    {"findings":"Right/left lower lobe consolidation. Air bronchograms present. No pleural effusion.",
                         "impression":"Findings consistent with bacterial pneumonia.","recommendation":"Antibiotic therapy. Follow-up CXR in 4-6 weeks."},
        "Normal":       {"findings":"No acute cardiopulmonary abnormality. Lungs clear bilaterally.",
                         "impression":"Normal study.","recommendation":"No further imaging required."},
        "Brain Tumor":  {"findings":"Heterogeneous mass with ring enhancement and surrounding oedema.",
                         "impression":"Intracranial neoplasm — high-grade glioma suspected.",
                         "recommendation":"Urgent neurosurgical referral. Tissue biopsy recommended."},
        "Tuberculosis": {"findings":"Bilateral upper lobe cavitation. Hilar lymphadenopathy.",
                         "impression":"Active pulmonary tuberculosis.","recommendation":"Isolation. RIPE regimen. Contact tracing."},
        "Lung Cancer":  {"findings":"Spiculated mass in right upper lobe. Ipsilateral hilar adenopathy.",
                         "impression":"Primary lung malignancy — further staging required.",
                         "recommendation":"PET-CT for staging. MDT referral. Bronchoscopy/biopsy."},
    }
    if scan_id:
        scan = await db.scans.find_one({"_id": scan_id})
        if scan:
            disease = scan.get("disease","")
            return {"disease": disease, "suggestions": SUGGESTIONS.get(disease, {}), "scan": fix_id(scan)}
    return {"suggestions": SUGGESTIONS}


# ══════════════════════════════════════════════════════════════════════════════
# DOCTORS DIRECTORY (used by DoctorPage, Appointment scheduling, etc.)
# ══════════════════════════════════════════════════════════════════════════════
@api_router.get("/doctors")
async def list_doctors(search: str = "", specialty: str = "", cu=Depends(get_current_user)):
    """Returns all users with role=doctor, with profile details."""
    q = {"role": "doctor"}
    if search:
        q["$or"] = [
            {"name":      {"$regex": search, "$options": "i"}},
            {"specialty": {"$regex": search, "$options": "i"}},
            {"location":  {"$regex": search, "$options": "i"}},
        ]
    if specialty and specialty != "All":
        q["specialty"] = specialty
    docs = await db.users.find(q, {"password": 0, "mfa_secret": 0}).to_list(100)
    out = []
    for d in docs:
        nm = d.get("name", "D D")
        out.append({
            "id":         d["_id"],
            "name":       nm,
            "email":      d.get("email", ""),
            "specialty":  d.get("specialty", "General Physician"),
            "location":   d.get("location", ""),
            "available":  d.get("available", True),
            "avatar":     "".join([w[0] for w in nm.split(" ")[:2]]).upper(),
            "color":      d.get("color", "#5B8DEF"),
            "bio":        d.get("bio", ""),
            "phone":      d.get("phone", ""),
        })
    return out


@api_router.get("/auth/admin-exists")
async def admin_exists_check():
    """Public endpoint — does any admin account exist?"""
    count = await db.users.count_documents({"role": "admin"})
    return {"exists": count > 0}


# Mount API router
app.include_router(api_router)
