import { API_BASE } from "../constants";

const getToken = () => localStorage.getItem("mc_token");

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) { localStorage.clear(); window.location.reload(); return; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authService = {
  async login(email, password) {
    const body = new URLSearchParams({ username: email, password });
    const res  = await fetch(`${API_BASE}/auth/login`, {
      method: "POST", body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Login failed");
    return data;
  },
  register: (name, email, password, role) =>
    request("/auth/register", { method:"POST", body: JSON.stringify({name,email,password,role}) }),
  me: () => request("/auth/me"),
};

// ── Patients ──────────────────────────────────────────────────────────────────
export const patientService = {
  list:   (search="", status="") => request(`/patients?search=${encodeURIComponent(search)}&status=${status}`),
  get:    (id)      => request(`/patients/${id}`),
  create: (data)    => request("/patients", { method:"POST", body: JSON.stringify(data) }),
  update: (id,data) => request(`/patients/${id}`, { method:"PUT", body: JSON.stringify(data) }),
  stats:  ()        => request("/patients/stats/summary"),
  addHistory:      (pid,entry) => request(`/patients/${pid}/history`,       { method:"POST", body: JSON.stringify(entry) }),
  addPrescription: (pid,rx)    => request(`/patients/${pid}/prescriptions`,  { method:"POST", body: JSON.stringify(rx) }),
  addLab:          (pid,lab)   => request(`/patients/${pid}/labs`,           { method:"POST", body: JSON.stringify(lab) }),
};

// ── Appointments ──────────────────────────────────────────────────────────────
export const appointmentService = {
  list:         (params={}) => request(`/appointments?${new URLSearchParams(params)}`),
  create:       (data)      => request("/appointments", { method:"POST", body: JSON.stringify(data) }),
  updateStatus: (id,status) => request(`/appointments/${id}/status`, { method:"PATCH", body: JSON.stringify({status}) }),
  stats:        ()          => request("/appointments/stats/summary"),
};

// ── Diagnosis / Scans ─────────────────────────────────────────────────────────
export const diagnosisService = {
  getScans: () => request("/diagnosis/scans"),
  getStats: () => request("/diagnosis/stats"),
  async uploadScan(patientName, scanType, file) {
    const token = getToken();
    const fd = new FormData();
    fd.append("file", file || new Blob(["mock"], {type:"image/jpeg"}), file?.name || "scan.jpg");
    const res = await fetch(
      `${API_BASE}/diagnosis/scan?patient_name=${encodeURIComponent(patientName)}&scan_type=${scanType}`,
      { method:"POST", body:fd, headers: token ? { Authorization:`Bearer ${token}` } : {} }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Upload failed");
    return data;
  },
};

// ── Medicine ──────────────────────────────────────────────────────────────────
export const medicineService = {
  getDrugs:          (search="",category="") => request(`/medicine/drugs?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`),
  getPrescriptions:  ()     => request("/medicine/prescriptions"),
  createPrescription:(data) => request("/medicine/prescriptions", { method:"POST", body: JSON.stringify(data) }),
  updateRxStatus:    (id,status) => request(`/medicine/prescriptions/${id}/status`, { method:"PATCH", body: JSON.stringify({status}) }),
};

// ── Resources ─────────────────────────────────────────────────────────────────
export const resourceService = {
  getFacilities: () => request("/resources/facilities"),
  getAlerts:     () => request("/resources/alerts"),
  getForecast:   () => request("/resources/demand-forecast"),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsService = {
  getOverview: () => request("/analytics/overview"),
  getDoctors:  () => request("/analytics/doctors"),
};

// ── Messages ──────────────────────────────────────────────────────────────────
export const messageService = {
  getContacts: ()          => request("/messages/contacts"),
  getThread:   (contactId) => request(`/messages/thread/${contactId}`),
  send:        (contactId, text) => request("/messages/send", { method:"POST", body: JSON.stringify({contact_id:contactId,text}) }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminService = {
  getUsers:   ()             => request("/admin/users"),
  changeRole: (uid,role)     => request(`/admin/users/${uid}/role`, { method:"PATCH", body: JSON.stringify({role}) }),
  getStats:   ()             => request("/admin/stats"),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationService = {
  list:        () => request("/notifications"),
  markRead:    (id) => request(`/notifications/${id}/read`, { method:"PATCH" }),
  unreadCount: ()   => request("/notifications/unread-count"),
};

// ── Extended Auth ─────────────────────────────────────────────────────────────
Object.assign(authService, {
  verifyMfa:   (tempToken, code)   => request("/auth/verify-mfa",    { method:"POST", body: JSON.stringify({ temp_token:tempToken, code }) }),
  setupMfa:    ()                  => request("/auth/setup-mfa",     { method:"POST" }),
  confirmMfa:  (code)              => request("/auth/confirm-mfa",   { method:"POST", body: JSON.stringify({ code }) }),
  disableMfa:  (password)          => request("/auth/disable-mfa",   { method:"POST", body: JSON.stringify({ password }) }),
  changePassword: (cur, nw)        => request("/auth/change-password",{ method:"POST", body: JSON.stringify({ current_password:cur, new_password:nw }) }),
  sessionCheck:()                  => request("/auth/session-check"),
  logout:      ()                  => request("/auth/logout",        { method:"POST" }).catch(()=>{}),
  getRoles:    ()                  => request("/auth/roles"),
});

// ── Admin extended ────────────────────────────────────────────────────────────
Object.assign(adminService, {
  getAuditLogs:    (params={}) => request(`/admin/audit-logs?${new URLSearchParams(params)}`),
  toggleUserActive:(uid,active)=> request(`/admin/users/${uid}/activate`,{ method:"PATCH", body:JSON.stringify({is_active:active}) }),
  deleteUser:      (uid)       => request(`/admin/users/${uid}`,         { method:"DELETE" }),
});

// ── Patient Portal ────────────────────────────────────────────────────────────
export const portalService = {
  getMe:           () => request("/portal/me"),
  getAppointments: () => request("/portal/appointments"),
  getPrescriptions:() => request("/portal/prescriptions"),
  getReports:      () => request("/portal/reports"),
  bookAppointment: (data) => request("/portal/book-appointment", { method:"POST", body:JSON.stringify(data) }),
};

// ── Extended Patient Service ───────────────────────────────────────────────────
Object.assign(patientService, {
  getAppointments:       (pid)          => request(`/patients/${pid}/appointments`),
  getEmergencyContacts:  (pid)          => request(`/patients/${pid}/emergency-contacts`),
  addEmergencyContact:   (pid, contact) => request(`/patients/${pid}/emergency-contacts`, { method:"POST", body:JSON.stringify(contact) }),
  deleteEmergencyContact:(pid, cid)     => request(`/patients/${pid}/emergency-contacts/${cid}`, { method:"DELETE" }),
  updateVitals:          (pid, vitals)  => request(`/patients/${pid}/vitals`,  { method:"PATCH", body:JSON.stringify(vitals) }),
  updateStatus:          (pid, status)  => request(`/patients/${pid}/status`,  { method:"PATCH", body:JSON.stringify({status}) }),
});

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportService = {
  list:   (params={}) => request(`/reports?${new URLSearchParams(params)}`),
  get:    (id)        => request(`/reports/${id}`),
  create: (data)      => request("/reports",      { method:"POST",   body:JSON.stringify(data) }),
  update: (id, data)  => request(`/reports/${id}`, { method:"PUT",    body:JSON.stringify(data) }),
  sign:   (id, sig)   => request(`/reports/${id}/sign`, { method:"POST", body:JSON.stringify({signature:sig}) }),
  delete: (id)        => request(`/reports/${id}`, { method:"DELETE" }),
  stats:  ()          => request("/reports/stats/summary"),
};

// ── Extended Appointment Service ──────────────────────────────────────────────
Object.assign(appointmentService, {
  getTrends:          ()         => request("/appointments/stats/trends"),
  getByDoctor:        ()         => request("/appointments/stats/by-doctor"),
  sendReminder:       (id, data) => request(`/appointments/${id}/reminder`, { method:"POST", body:JSON.stringify(data) }),
  updateQueueStatus:  (id, qs)   => request(`/appointments/${id}/queue-status`, { method:"PATCH", body:JSON.stringify({queue_status:qs}) }),
  createRecurring:    (data)     => request("/appointments/recurring", { method:"POST", body:JSON.stringify(data) }),
  getAvailableSlots:  (doctorId, date) => request(`/availability/${doctorId}/slots?date=${date}`),
  setAvailability:    (data)     => request("/availability", { method:"POST", body:JSON.stringify(data) }),
  getAvailability:    (doctorId) => request(`/availability/${doctorId}`),
});

// ── EHR Service ───────────────────────────────────────────────────────────────
export const ehrService = {
  getVisitNotes:      (pid)  => request(`/ehr/visit-notes/${pid}`),
  createVisitNote:    (data) => request("/ehr/visit-notes",       { method:"POST", body:JSON.stringify(data) }),
  updateVisitNote:    (id,d) => request(`/ehr/visit-notes/${id}`, { method:"PUT",  body:JSON.stringify(d) }),
  deleteVisitNote:    (id)   => request(`/ehr/visit-notes/${id}`, { method:"DELETE" }),
  getTreatmentPlans:  (pid)  => request(`/ehr/treatment-plans/${pid}`),
  createTreatmentPlan:(data) => request("/ehr/treatment-plans",   { method:"POST", body:JSON.stringify(data) }),
  updateTreatmentPlan:(id,d) => request(`/ehr/treatment-plans/${id}`,{method:"PUT",body:JSON.stringify(d)}),
  getVitalsHistory:   (pid)  => request(`/ehr/vitals/${pid}`),
  recordVitals:       (data) => request("/ehr/vitals",            { method:"POST", body:JSON.stringify(data) }),
  getLabResults:      (pid)  => request(`/ehr/lab-results/${pid}`),
  addLabResult:       (data) => request("/ehr/lab-results",       { method:"POST", body:JSON.stringify(data) }),
  getTimeline:        (pid)  => request(`/ehr/timeline/${pid}`),
  getSummary:         (pid)  => request(`/ehr/summary/${pid}`),
};

// ── Forgot / Reset Password ───────────────────────────────────────────────────
Object.assign(authService, {
  forgotPassword:  (email)                      => request("/auth/forgot-password",   { method:"POST", body:JSON.stringify({email}) }),
  verifyResetOtp:  (email, otp, signed)         => request("/auth/verify-reset-otp",  { method:"POST", body:JSON.stringify({email,otp,signed}) }),
  resetPassword:   (reset_token, new_password, confirm_password) =>
                     request("/auth/reset-password", { method:"POST", body:JSON.stringify({reset_token,new_password,confirm_password}) }),
  adminExists:     () => request("/auth/admin-exists"),
});

// ── Doctors ───────────────────────────────────────────────────────────────────
export const doctorService = {
  list:      (search="", specialty="") => request(`/doctors?search=${encodeURIComponent(search)}&specialty=${encodeURIComponent(specialty)}`),
};

// ── Collaboration (Topic 7) ───────────────────────────────────────────────────
export const collaborationService = {
  listCases:         (status="")   => request(`/collaboration/cases${status?"?status="+status:""}`),
  getCase:           (id)          => request(`/collaboration/cases/${id}`),
  createCase:        (data)        => request("/collaboration/cases",         { method:"POST", body:JSON.stringify(data) }),
  addComment:        (cid, data)   => request(`/collaboration/cases/${cid}/comment`, { method:"POST", body:JSON.stringify(data) }),
  requestOpinion:    (cid, data)   => request(`/collaboration/cases/${cid}/second-opinion`, { method:"POST", body:JSON.stringify(data) }),
  respondOpinion:    (cid,oid,data)=> request(`/collaboration/cases/${cid}/second-opinion/${oid}/respond`, { method:"POST", body:JSON.stringify(data) }),
  updateCaseStatus:  (cid, status) => request(`/collaboration/cases/${cid}/status`, { method:"PATCH", body:JSON.stringify({status}) }),
  shareScan:         (data)        => request("/collaboration/share-scan", { method:"POST", body:JSON.stringify(data) }),
  getSharedScans:    ()            => request("/collaboration/shared-scans"),
};

// ── Billing (Topic 8) ─────────────────────────────────────────────────────────
export const billingService = {
  createInvoice: (data)       => request("/billing/invoices",         { method:"POST", body:JSON.stringify(data) }),
  listInvoices:  (params={})  => request(`/billing/invoices?${new URLSearchParams(params)}`),
  markPaid:      (id, method) => request(`/billing/invoices/${id}/pay`,{ method:"PATCH", body:JSON.stringify({method}) }),
  getStats:      ()           => request("/billing/stats"),
};

// ── Telemedicine (Topic 8) ────────────────────────────────────────────────────
export const telemedicineService = {
  book:     (data) => request("/portal/telemedicine",  { method:"POST", body:JSON.stringify(data) }),
  list:     ()     => request("/portal/telemedicine"),
};

// ── Extended Analytics (Topic 9) ─────────────────────────────────────────────
Object.assign(analyticsService, {
  getRiskPrediction:      ()         => request("/analytics/risk-prediction"),
  getRevenue:             ()         => request("/analytics/revenue"),
  getDiseaseTrends:       ()         => request("/analytics/disease-trends"),
  getSeverityScoring:     ()         => request("/analytics/severity-scoring"),
  getAutoReportSuggestions:(scanId="")=> request(`/analytics/auto-report-suggestions${scanId?"?scan_id="+scanId:""}`),
});
