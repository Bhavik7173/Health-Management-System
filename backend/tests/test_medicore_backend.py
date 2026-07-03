"""
MediCore AI Backend Tests
Tests all critical endpoints across the 6 roles per the review request.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://permission-mapper-4.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEFAULT_PW = "Password123!"
USERS = {
    "admin":        "admin@medicore.ai",
    "doctor":       "lida@medicore.ai",
    "radiologist":  "sofia@medicore.ai",
    "lab_tech":     "lab@medicore.ai",
    "receptionist": "reception@medicore.ai",
    "patient":      "sarah@example.com",
}


# ---- Shared session ---------------------------------------------------------
@pytest.fixture(scope="session")
def s():
    return requests.Session()


def _login(s, email, password=DEFAULT_PW):
    # OAuth2PasswordRequestForm => form-encoded with username + password
    r = s.post(f"{API}/auth/login",
               data={"username": email, "password": password},
               headers={"Content-Type": "application/x-www-form-urlencoded"})
    return r


@pytest.fixture(scope="session")
def tokens(s):
    out = {}
    for role, email in USERS.items():
        r = _login(s, email)
        assert r.status_code == 200, f"Login failed for {role} ({email}): {r.status_code} {r.text[:200]}"
        body = r.json()
        assert "access_token" in body, f"No access_token for {role}: {body}"
        out[role] = body["access_token"]
    return out


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---- Health / admin-exists --------------------------------------------------
class TestHealth:
    def test_health(self, s):
        r = s.get(f"{API}/health")
        assert r.status_code == 200
        data = r.json()
        # health endpoint should report ok and db info
        assert ("ok" in str(data).lower()) or ("status" in data)

    def test_admin_exists(self, s):
        r = s.get(f"{API}/auth/admin-exists")
        assert r.status_code == 200
        data = r.json()
        assert data.get("exists") is True


# ---- Auth -------------------------------------------------------------------
class TestAuth:
    def test_admin_login(self, s):
        r = _login(s, USERS["admin"])
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["role"] == "admin"
        assert body["user"]["email"] == USERS["admin"]
        assert body["token_type"] == "bearer"

    @pytest.mark.parametrize("role", list(USERS.keys()))
    def test_login_all_roles(self, s, role):
        r = _login(s, USERS[role])
        assert r.status_code == 200, f"{role} login failed: {r.text[:200]}"
        body = r.json()
        assert body["user"]["role"] == role

    def test_login_invalid(self, s):
        r = _login(s, USERS["admin"], "wrong-password")
        assert r.status_code == 401

    def test_me_admin(self, s, tokens):
        r = s.get(f"{API}/auth/me", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == USERS["admin"]
        assert body["role"] == "admin"


# ---- Doctors / Patients / Medicine / Appointments ---------------------------
class TestCoreData:
    def test_doctors_list(self, s, tokens):
        r = s.get(f"{API}/doctors", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        data = r.json()
        # endpoint may return list or {doctors: [...]}
        lst = data if isinstance(data, list) else data.get("doctors", [])
        assert len(lst) >= 5, f"Expected >=5 doctors, got {len(lst)}"

    def test_patients_list(self, s, tokens):
        r = s.get(f"{API}/patients", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 5, f"Expected >=5 patients, got {len(data)}"

    def test_drugs(self, s, tokens):
        r = s.get(f"{API}/medicine/drugs", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 8, f"Expected >=8 drugs, got {len(data)}"

    def test_prescriptions(self, s, tokens):
        r = s.get(f"{API}/medicine/prescriptions", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # admin sees all
        assert len(data) >= 1

    def test_appointments(self, s, tokens):
        r = s.get(f"{API}/appointments", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 5, f"Expected >=5 appointments, got {len(data)}"


# ---- Diagnosis --------------------------------------------------------------
class TestDiagnosis:
    def test_scans_list(self, s, tokens):
        r = s.get(f"{API}/diagnosis/scans", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_diagnosis_stats(self, s, tokens):
        r = s.get(f"{API}/diagnosis/stats", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        data = r.json()
        for k in ("total", "critical", "abnormal", "normal"):
            assert k in data


# ---- Resources --------------------------------------------------------------
class TestResources:
    def test_facilities(self, s, tokens):
        r = s.get(f"{API}/resources/facilities", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        data = r.json()
        lst = data if isinstance(data, list) else data.get("facilities", [])
        assert len(lst) >= 1, f"Expected facilities, got {len(lst)}"

    def test_alerts(self, s, tokens):
        r = s.get(f"{API}/resources/alerts", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        data = r.json()
        lst = data if isinstance(data, list) else data.get("alerts", [])
        assert len(lst) >= 1, f"Expected alerts, got {len(lst)}"


# ---- Reports ---------------------------------------------------------------
class TestReports:
    def test_reports_list(self, s, tokens):
        r = s.get(f"{API}/reports", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---- Admin -----------------------------------------------------------------
class TestAdminEndpoints:
    def test_admin_users_with_admin(self, s, tokens):
        r = s.get(f"{API}/admin/users", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        data = r.json()
        lst = data if isinstance(data, list) else data.get("users", [])
        assert len(lst) >= 6, f"Expected >=6 users, got {len(lst)}"

    def test_admin_users_forbidden_for_doctor(self, s, tokens):
        r = s.get(f"{API}/admin/users", headers=auth(tokens["doctor"]))
        assert r.status_code in (401, 403), f"Doctor accessing /admin/users should be forbidden, got {r.status_code}"

    def test_admin_users_forbidden_for_patient(self, s, tokens):
        r = s.get(f"{API}/admin/users", headers=auth(tokens["patient"]))
        assert r.status_code in (401, 403)

    def test_audit_logs_admin(self, s, tokens):
        r = s.get(f"{API}/admin/audit-logs", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        data = r.json()
        # Endpoint returns {logs:[...], total:N}
        assert "logs" in data or isinstance(data, list)

    def test_audit_logs_forbidden_for_doctor(self, s, tokens):
        r = s.get(f"{API}/admin/audit-logs", headers=auth(tokens["doctor"]))
        assert r.status_code in (401, 403)


# ---- Patient Portal --------------------------------------------------------
class TestPortal:
    def test_portal_me_for_patient(self, s, tokens):
        # Endpoint defined as GET in server, but spec mentions POST - try GET first
        r = s.get(f"{API}/portal/me", headers=auth(tokens["patient"]))
        if r.status_code == 405:
            r = s.post(f"{API}/portal/me", headers=auth(tokens["patient"]))
        assert r.status_code == 200, f"portal/me failed for patient: {r.status_code} {r.text[:200]}"
        data = r.json()
        assert "name" in data or "email" in data

    def test_portal_me_forbidden_for_doctor(self, s, tokens):
        r = s.get(f"{API}/portal/me", headers=auth(tokens["doctor"]))
        if r.status_code == 405:
            r = s.post(f"{API}/portal/me", headers=auth(tokens["doctor"]))
        assert r.status_code in (401, 403)


# ---- Messages / Analytics --------------------------------------------------
class TestMessagesAnalytics:
    def test_messages_contacts(self, s, tokens):
        r = s.get(f"{API}/messages/contacts", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        data = r.json()
        lst = data if isinstance(data, list) else data.get("contacts", [])
        assert len(lst) >= 1

    def test_analytics_overview(self, s, tokens):
        r = s.get(f"{API}/analytics/overview", headers=auth(tokens["admin"]))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)


# ---- Unauthorized access ---------------------------------------------------
class TestAuthEnforcement:
    def test_patients_requires_auth(self, s):
        r = s.get(f"{API}/patients")
        assert r.status_code in (401, 403)

    def test_invalid_token(self, s):
        r = s.get(f"{API}/auth/me", headers={"Authorization": "Bearer invalidtoken"})
        assert r.status_code == 401
