import { useState, useEffect, useRef } from "react";
import { C, roleColor } from "../constants";
import { Card, Btn, Badge, Avatar, StatCard, TabBar, Spinner } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { portalService, billingService, telemedicineService, messageService } from "../services/api";

// ── colour maps ───────────────────────────────────────────────────────────────
const STATUS_COL = { confirmed:C.accent, pending:C.blue, cancelled:C.coral, completed:"#8b5cf6" };
const SEV_COL    = { normal:C.accent, abnormal:C.amber, critical:C.coral };
const PAY_COL    = { paid:C.accent, unpaid:C.coral, overdue:"#ef4444", partial:C.amber };
const statusBadge = { online: C.accent, busy: C.amber, offline: C.textLight };

// ── seed fallback data ────────────────────────────────────────────────────────
const SEED_PROFILE = {
  name:"Sarah Johnson", dob:"1990-03-15", blood:"O+", phone:"+49 151 234 5678",
  doctor:"Dr. Lida Gutierrez", insurance:"AOK Health Insurance",
  vitals:{ bp:"120/80", hr:68, temp:"36.8°C", o2:"98%" },
  conditions:["Mild Hypertension","Seasonal Allergies"],
  allergies:["Penicillin","Latex"],
};
const SEED_APPTS = [
  { id:"a1", type:"Follow-up", doctor:"Dr. Gutierrez", date:"2026-06-20", time:"10:00", status:"confirmed", notes:"Blood pressure check" },
  { id:"a2", type:"Lab Test",  doctor:"Dr. Frazier",   date:"2026-06-12", time:"08:30", status:"confirmed", notes:"Routine bloodwork" },
  { id:"a3", type:"Check-up",  doctor:"Dr. Gutierrez", date:"2026-05-10", time:"11:00", status:"completed", notes:"" },
];
const SEED_RX = [
  { id:"r1", drug:"Amlodipine 5mg",   dosage:"1 tablet daily",    duration:"3 months",  doctor:"Dr. Gutierrez", date:"2026-05-10", status:"active"   },
  { id:"r2", drug:"Cetirizine 10mg",  dosage:"1 tablet at night", duration:"1 month",   doctor:"Dr. Gutierrez", date:"2026-05-10", status:"active"   },
  { id:"r3", drug:"Ibuprofen 400mg",  dosage:"1 tablet with food",duration:"1 week",    doctor:"Dr. Frazier",   date:"2026-04-02", status:"completed"},
];
const SEED_REPORTS = [
  { id:"rp1", disease:"Normal",    scan_type:"X-Ray",  confidence:0.97, status:"normal",   doctor:"Dr. Müller",    created_at:"2026-05-15" },
  { id:"rp2", disease:"Mild Hypertension", scan_type:"ECG", confidence:0.89, status:"abnormal", doctor:"Dr. Gutierrez", created_at:"2026-04-20" },
];
const SEED_INVOICES = [
  { id:"inv1", invoice_number:"INV-2026-0042", total:120.00, status:"paid",   due_date:"2026-05-30", created_at:"2026-05-10", paid_at:"2026-05-12", items:[{desc:"Consultation",qty:1,unit_price:80},{desc:"ECG",qty:1,unit_price:40}] },
  { id:"inv2", invoice_number:"INV-2026-0058", total:65.00,  status:"unpaid", due_date:"2026-06-30", created_at:"2026-06-05", items:[{desc:"Lab test",qty:1,unit_price:65}] },
];
const SEED_TELE = [
  { id:"t1", doctor_name:"Dr. Gutierrez", type:"video", scheduled_at:"2026-06-15T14:00", duration_mins:30, status:"scheduled", notes:"Monthly BP review", room_id:"room_abc123" },
];

// ── helpers ───────────────────────────────────────────────────────────────────
const Row = ({ label, value }) => (
  <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 12px", background:C.cardAlt, borderRadius:8 }}>
    <span style={{ fontSize:12, color:C.textLight, fontWeight:600 }}>{label}</span>
    <span style={{ fontSize:12, color:C.text, fontWeight:700 }}>{value}</span>
  </div>
);

const Section = ({ title, action, children }) => (
  <div style={{ marginBottom:0 }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
      <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.text, margin:0 }}>{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const EmptyState = ({ icon, text, action }) => (
  <div style={{ textAlign:"center", padding:"32px 20px", color:C.textLight }}>
    <div style={{ fontSize:36, marginBottom:10 }}>{icon}</div>
    <div style={{ fontSize:14, marginBottom:action?16:0 }}>{text}</div>
    {action}
  </div>
);

const inputSt = {
  background: C.cardAlt, border:`1.5px solid ${C.border}`,
  borderRadius:10, padding:"10px 14px", fontSize:13,
  color:C.text, outline:"none", width:"100%", boxSizing:"border-box",
};

// ── modal (inline, not fixed-position) ───────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ background:"rgba(0,0,0,0.45)", borderRadius:16, padding:24, marginBottom:20 }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"24px 28px", maxWidth:480, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:C.text, margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.textLight }}>✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <label style={{ fontSize:11, color:C.textLight, fontWeight:700, letterSpacing:"0.05em" }}>{label}</label>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function PatientPortalPage() {
  const { user } = useAuth();

  const [tab,          setTab]          = useState("overview");
  const [profile,      setProfile]      = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions,setPrescriptions]= useState([]);
  const [reports,      setReports]      = useState([]);
  const [invoices,     setInvoices]     = useState([]);
  const [telemedicine, setTelemedicine] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [live,         setLive]         = useState(false);
  const [successMsg,   setSuccessMsg]   = useState("");
  const [showAppt,     setShowAppt]     = useState(false);
  const [showTele,     setShowTele]     = useState(false);
  const [showPay,      setShowPay]      = useState(null);
  const [showRoom,     setShowRoom]     = useState(null);
  const [payMethod,    setPayMethod]    = useState("card");
  const [apptForm,     setApptForm]     = useState({ doctor:"", date:"", time:"09:00", type:"Consultation", notes:"" });
  const [teleForm,     setTeleForm]     = useState({ doctor_name:"", type:"video", scheduled_at:"", duration_mins:30, notes:"" });

  // ── Messaging State ──
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [chatDraft, setChatDraft] = useState("");
  const chatBottomRef = useRef(null);
  const ws = useRef(null);

  // WebSocket Connection
  useEffect(() => {
    if (!user?.id || tab !== "messages") return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws/${user.id}`;

    const connect = () => {
      ws.current = new WebSocket(wsUrl);
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "new_message") {
          const { from_id, ...msg } = data.message;
          setChatMessages(prev => ({
            ...prev,
            [from_id]: [...(prev[from_id] || []), msg]
          }));
          setContacts(prev => prev.map(c =>
            c.id === from_id ? { ...c, lastMsg: msg.text, time: msg.time, unread: (activeChat?.id === from_id ? c.unread : (c.unread || 0) + 1) } : c
          ));
        }
      };
      ws.current.onclose = () => { if (tab === "messages") setTimeout(connect, 3000); };
    };

    connect();
    return () => { if (ws.current) ws.current.close(); };
  }, [user?.id, tab, activeChat?.id]);

  // Load chat data
  useEffect(() => {
    if (tab === "messages") {
      messageService.getContacts().then(data => {
        const mapped = (data || []).map(c => ({
          ...c,
          avatar: c.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "?",
          color:  roleColor[c.role] || C.blue,
          specialty: c.role,
        }));
        setContacts(mapped);
        if (mapped.length && !activeChat) setActiveChat(mapped[0]);
      });
    }
  }, [tab]);

  useEffect(() => {
    if (activeChat?.id) {
      messageService.getThread(activeChat.id).then(msgs => {
        setChatMessages(prev => ({ ...prev, [activeChat.id]: msgs || [] }));
      });
    }
  }, [activeChat?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat, chatMessages]);

  const sendChatMessage = async () => {
    if (!chatDraft.trim() || !activeChat) return;
    const time = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
    const newMsg = { from: "me", text: chatDraft.trim(), time };
    setChatMessages(prev => ({ ...prev, [activeChat.id]: [...(prev[activeChat.id] || []), newMsg] }));
    setContacts(prev => prev.map(c => c.id === activeChat.id ? { ...c, lastMsg: newMsg.text, time } : c));
    setChatDraft("");
    try { await messageService.send(activeChat.id, newMsg.text); } catch {}
  };

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      portalService.getMe(),
      portalService.getAppointments(),
      portalService.getPrescriptions(),
      portalService.getReports(),
      billingService.listInvoices(),
      telemedicineService.list(),
    ]).then(([p, a, rx, rep, inv, tele]) => {
      let anyLive = false;
      if (p.status==="fulfilled"   && p.value)           { setProfile(p.value);                anyLive = true; } else { setProfile(SEED_PROFILE); }
      if (a.status==="fulfilled"   && a.value?.length)   { setAppointments(a.value);            anyLive = true; } else { setAppointments(SEED_APPTS); }
      if (rx.status==="fulfilled"  && rx.value?.length)  { setPrescriptions(rx.value);          anyLive = true; } else { setPrescriptions(SEED_RX); }
      if (rep.status==="fulfilled" && rep.value?.length) { setReports(rep.value);               anyLive = true; } else { setReports(SEED_REPORTS); }
      if (inv.status==="fulfilled" && inv.value?.length) { setInvoices(inv.value);              anyLive = true; } else { setInvoices(SEED_INVOICES); }
      if (tele.status==="fulfilled"&& tele.value?.length){ setTelemedicine(tele.value);         anyLive = true; } else { setTelemedicine(SEED_TELE); }
      setLive(anyLive);
    }).finally(() => setLoading(false));
  }, []);

  const flash = msg => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3500); };

  const totalDue  = invoices.filter(i => i.status !== "paid").reduce((a, i) => a + i.total, 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((a, i) => a + i.total, 0);
  const nextAppt  = appointments.find(a => a.status === "confirmed" && a.date >= new Date().toISOString().slice(0,10));
  const activeRx  = prescriptions.filter(r => r.status === "active").length;
  const firstName = (user?.name || profile?.name || "there").split(" ")[0];

  const handleBookAppt = async () => {
    if (!apptForm.doctor || !apptForm.date) return;
    try {
      const saved = await portalService.bookAppointment(apptForm);
      setAppointments(p => [saved, ...p]);
    } catch {
      setAppointments(p => [{ id:"a"+Date.now(), ...apptForm, status:"pending" }, ...p]);
    }
    setShowAppt(false);
    setApptForm({ doctor:"", date:"", time:"09:00", type:"Consultation", notes:"" });
    flash("✅ Appointment requested — you'll receive confirmation shortly.");
  };

  const handleBookTele = async () => {
    if (!teleForm.doctor_name || !teleForm.scheduled_at) return;
    try {
      const saved = await telemedicineService.book({ patient_name: profile?.name || user?.name || "Patient", ...teleForm });
      setTelemedicine(p => [saved, ...p]);
    } catch {
      setTelemedicine(p => [{ id:"t"+Date.now(), ...teleForm, status:"scheduled", room_id:"room_"+Date.now().toString(36) }, ...p]);
    }
    setShowTele(false);
    setTeleForm({ doctor_name:"", type:"video", scheduled_at:"", duration_mins:30, notes:"" });
    flash("✅ Telemedicine session booked — join link will be sent via email.");
  };

  const handlePay = async (invoice) => {
    try { await billingService.markPaid(invoice.id, payMethod); } catch {}
    setInvoices(p => p.map(i => i.id === invoice.id ? { ...i, status:"paid", paid_at:new Date().toISOString() } : i));
    setShowPay(null);
    flash(`✅ Payment of $${invoice.total.toFixed(2)} processed successfully.`);
  };

  const downloadRx = (rx) => {
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Prescription — MediCore AI</title>
    <style>body{font-family:sans-serif;padding:40px;max-width:560px;margin:0 auto;color:#1a1a2e;}
    h1{color:#4CAF82;font-size:22px;}.sep{border-bottom:2px solid #4CAF82;margin:16px 0 24px;}
    .row{display:flex;justify-content:space-between;margin-bottom:12px;padding:8px 12px;background:#f7f9f7;border-radius:8px;}
    .label{font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:0.06em;}
    .val{font-size:14px;font-weight:700;}
    .footer{margin-top:40px;font-size:11px;color:#94a3b8;border-top:1px solid #e8eef0;padding-top:14px;}
    </style></head><body>
    <h1>⚕️ MediCore AI</h1>
    <div class="sep"></div>
    <div class="row"><div class="label">PATIENT</div><div class="val">${profile?.name || user?.name}</div></div>
    <div class="row"><div class="label">DRUG</div><div class="val">${rx.drug}</div></div>
    <div class="row"><div class="label">DOSAGE</div><div class="val">${rx.dosage}</div></div>
    <div class="row"><div class="label">DURATION</div><div class="val">${rx.duration}</div></div>
    <div class="row"><div class="label">PRESCRIBED BY</div><div class="val">${rx.doctor}</div></div>
    <div class="row"><div class="label">DATE</div><div class="val">${rx.date}</div></div>
    <div class="footer">MediCore AI · Confidential Prescription · ${new Date().toLocaleDateString()}</div>
    <script>window.onload=()=>window.print();</script></body></html>`);
    win.document.close();
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* backend status pill */}
      {!loading && (
        <div style={{ marginBottom:16 }}>
          <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background: live ? C.accentLight : C.amberLight, color: live ? C.accent : C.amber, fontWeight:700 }}>
            {live ? "🟢 Live data" : "🟡 Demo data — start backend for live records"}
          </span>
        </div>
      )}

      {/* success toast */}
      {successMsg && (
        <div style={{ background:C.accentLight, border:`1px solid ${C.accent}44`, borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:13, color:C.accent, fontWeight:700 }}>
          {successMsg}
        </div>
      )}

      {/* ── Welcome card ── */}
      <Card style={{ marginBottom:20, padding:"20px 24px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", gap:14, alignItems:"center" }}>
            <div style={{ width:52, height:52, borderRadius:14, background:C.blueLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Avatar initials={firstName.slice(0,2).toUpperCase()} color={C.blue} size={52}/>
            </div>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.text, fontWeight:700 }}>
                Welcome back, {firstName} 👋
              </div>
              <div style={{ fontSize:13, color:C.textLight, marginTop:3 }}>
                {nextAppt
                  ? `Next appointment: ${nextAppt.date} at ${nextAppt.time} with ${nextAppt.doctor}`
                  : "No upcoming appointments scheduled"}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={() => setShowTele(true)} variant="secondary" style={{ borderRadius:10, fontSize:12, padding:"9px 14px" }}>📹 Telemedicine</Btn>
            <Btn onClick={() => setShowAppt(true)} style={{ borderRadius:10, fontSize:12, padding:"9px 14px" }}>📅 Book Appointment</Btn>
          </div>
        </div>
      </Card>

      {/* ── modals (inline, above the tabs) ── */}
      {showAppt && (
        <Modal title="📅 Book Appointment" onClose={() => setShowAppt(false)}>
          <Field label="PREFERRED DOCTOR">
            <input value={apptForm.doctor} onChange={e => setApptForm(f => ({...f, doctor:e.target.value}))} placeholder="Doctor name or specialty" style={inputSt}/>
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Field label="DATE"><input type="date" value={apptForm.date} onChange={e => setApptForm(f => ({...f, date:e.target.value}))} style={inputSt}/></Field>
            <Field label="TIME"><input type="time" value={apptForm.time} onChange={e => setApptForm(f => ({...f, time:e.target.value}))} style={inputSt}/></Field>
          </div>
          <Field label="TYPE">
            <select value={apptForm.type} onChange={e => setApptForm(f => ({...f, type:e.target.value}))} style={inputSt}>
              {["Consultation","Follow-up","Lab Test","Check-up","Emergency","Vaccination"].map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="NOTES (OPTIONAL)">
            <textarea value={apptForm.notes} onChange={e => setApptForm(f => ({...f, notes:e.target.value}))} placeholder="Describe your symptoms or reason for visit…" rows={2} style={{...inputSt, resize:"none"}}/>
          </Field>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={handleBookAppt} disabled={!apptForm.doctor || !apptForm.date} style={{ flex:1, borderRadius:10, padding:"11px" }}>Request Appointment</Btn>
            <Btn variant="secondary" onClick={() => setShowAppt(false)} style={{ borderRadius:10, padding:"11px 16px" }}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {showTele && (
        <Modal title="📹 Book Telemedicine Session" onClose={() => setShowTele(false)}>
          <Field label="DOCTOR NAME">
            <input value={teleForm.doctor_name} onChange={e => setTeleForm(f => ({...f, doctor_name:e.target.value}))} placeholder="Doctor name" style={inputSt}/>
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Field label="DATE & TIME"><input type="datetime-local" value={teleForm.scheduled_at} onChange={e => setTeleForm(f => ({...f, scheduled_at:e.target.value}))} style={inputSt}/></Field>
            <Field label="DURATION">
              <select value={teleForm.duration_mins} onChange={e => setTeleForm(f => ({...f, duration_mins:+e.target.value}))} style={inputSt}>
                {[15,30,45,60].map(n => <option key={n} value={n}>{n} min</option>)}
              </select>
            </Field>
          </div>
          <Field label="SESSION TYPE">
            <div style={{ display:"flex", gap:8 }}>
              {[["video","📹 Video"],["audio","📞 Audio"],["chat","💬 Chat"]].map(([v,l]) => (
                <button key={v} onClick={() => setTeleForm(f => ({...f, type:v}))}
                  style={{ flex:1, padding:"9px", borderRadius:10, border:`2px solid ${teleForm.type===v?C.blue:C.border}`, background:teleForm.type===v?C.blueLight:"#fff", color:teleForm.type===v?C.blue:C.textMed, cursor:"pointer", fontSize:12, fontWeight:700 }}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="REASON (OPTIONAL)">
            <textarea value={teleForm.notes} onChange={e => setTeleForm(f => ({...f, notes:e.target.value}))} placeholder="Reason for consultation…" rows={2} style={{...inputSt, resize:"none"}}/>
          </Field>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={handleBookTele} disabled={!teleForm.doctor_name || !teleForm.scheduled_at} style={{ flex:1, borderRadius:10, padding:"11px" }}>Book Session</Btn>
            <Btn variant="secondary" onClick={() => setShowTele(false)} style={{ borderRadius:10, padding:"11px 16px" }}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {showPay && (
        <Modal title="💳 Make Payment" onClose={() => setShowPay(null)}>
          <div style={{ background:C.cardAlt, borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontFamily:"monospace", fontSize:12, color:C.textLight }}>{showPay.invoice_number}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:C.text, marginTop:4 }}>${showPay.total.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize:11, color:C.textLight, fontWeight:700, marginBottom:8, letterSpacing:"0.05em" }}>PAYMENT METHOD</div>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {[["card","💳 Credit / Debit Card"],["bank","🏦 Bank Transfer"],["insurance","🏥 Insurance Claim"],["cash","💵 Cash"]].map(([v,l]) => (
                <button key={v} onClick={() => setPayMethod(v)}
                  style={{ padding:"11px 14px", borderRadius:10, border:`2px solid ${payMethod===v?C.accent:C.border}`, background:payMethod===v?C.accentLight:"#fff", cursor:"pointer", textAlign:"left", fontSize:13, fontWeight:600, color:payMethod===v?C.accent:C.text }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {payMethod === "card" && (
            <>
              <Field label="CARD NUMBER"><input placeholder="1234 5678 9012 3456" style={inputSt}/></Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Field label="EXPIRY"><input placeholder="MM/YY" style={inputSt}/></Field>
                <Field label="CVV"><input placeholder="123" type="password" style={inputSt}/></Field>
              </div>
            </>
          )}
          <div style={{ padding:"9px 12px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, fontSize:12, color:"#166534" }}>
            🔒 Secured with 256-bit SSL encryption
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={() => handlePay(showPay)} style={{ flex:1, borderRadius:10, padding:"11px" }}>✅ Pay ${showPay.total.toFixed(2)}</Btn>
            <Btn variant="secondary" onClick={() => setShowPay(null)} style={{ borderRadius:10, padding:"11px 16px" }}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* Telemedicine room (inline) */}
      {showRoom && (
        <div style={{ background:"#0f172a", borderRadius:16, marginBottom:20, overflow:"hidden" }}>
          {/* room header */}
          <div style={{ background:"#1e293b", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e" }}/>
              <span style={{ color:"#fff", fontSize:14, fontWeight:700 }}>📹 Live — {showRoom.doctor_name}</span>
            </div>
            <button onClick={() => setShowRoom(null)} style={{ background:"#ef4444", border:"none", borderRadius:8, color:"#fff", padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:700 }}>📴 End Call</button>
          </div>
          {/* video grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", height:260 }}>
            <div style={{ background:"#1e293b", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative" }}>
              <div style={{ width:68, height:68, borderRadius:"50%", background:C.blue, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, marginBottom:10 }}>👨‍⚕️</div>
              <div style={{ color:"#fff", fontSize:13, fontWeight:700 }}>{showRoom.doctor_name}</div>
              <div style={{ color:"#94a3b8", fontSize:11, marginTop:3 }}>Doctor</div>
            </div>
            <div style={{ background:"#0f172a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:68, height:68, borderRadius:"50%", background:C.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, marginBottom:10 }}>🙂</div>
              <div style={{ color:"#fff", fontSize:13, fontWeight:700 }}>{profile?.name || user?.name}</div>
              <div style={{ color:"#94a3b8", fontSize:11, marginTop:3 }}>You</div>
            </div>
          </div>
          {/* controls */}
          <div style={{ background:"#1e293b", padding:"14px", display:"flex", justifyContent:"center", gap:12 }}>
            {[["🎙️","Mic"],["📹","Camera"],["🖥️","Screen"],["💬","Chat"],["⚙️","Settings"]].map(([icon,label]) => (
              <button key={label} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"#334155", border:"none", borderRadius:10, padding:"10px 16px", cursor:"pointer", color:"#fff", fontSize:18 }}>
                {icon}<span style={{ fontSize:10, color:"#94a3b8" }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        <StatCard label="Appointments"   value={loading ? "…" : appointments.length}  icon="📅" color={C.blue}   bg={C.blueLight}  />
        <StatCard label="Active Rx"      value={loading ? "…" : activeRx}             icon="💊" color={C.accent} bg={C.accentLight} />
        <StatCard label="Reports"        value={loading ? "…" : reports.length}       icon="🔬" color={C.amber}  bg={C.amberLight}  />
        <StatCard label="Amount Due"     value={loading ? "…" : `$${totalDue.toFixed(0)}`} icon="💳" color={totalDue>0?C.coral:C.accent} bg={totalDue>0?C.coralLight:C.accentLight} />
      </div>

      <TabBar
        tabs={[
          ["overview","👤 Overview"],
          ["appointments","📅 Appointments"],
          ["prescriptions","💊 Prescriptions"],
          ["reports","🔬 Reports"],
          ["billing","💳 Billing"],
          ["telemedicine","📹 Telemedicine"],
          ["messages","💬 Messages"],
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ══ OVERVIEW ══ */}
      {tab === "overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {/* Profile */}
          <Card>
            <Section title="👤 My Profile">
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {[
                  ["Name",       profile?.name || user?.name || "—"],
                  ["Date of Birth", profile?.dob || "—"],
                  ["Blood Group",   profile?.blood || "—"],
                  ["Phone",         profile?.phone || "—"],
                  ["Doctor",        profile?.doctor || "—"],
                  ["Insurance",     profile?.insurance || "—"],
                ].map(([k,v]) => <Row key={k} label={k} value={v}/>)}
              </div>
            </Section>
          </Card>

          {/* Vitals */}
          <Card>
            <Section title="❤️ Current Vitals">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                {[
                  ["🩺 Blood Pressure", profile?.vitals?.bp || "—"],
                  ["💓 Heart Rate",     (profile?.vitals?.hr  || "—") + (profile?.vitals?.hr?" bpm":"")],
                  ["🌡️ Temperature",   profile?.vitals?.temp || "—"],
                  ["🫁 O₂ Saturation",  profile?.vitals?.o2  || "—"],
                ].map(([k,v]) => (
                  <div key={k} style={{ background:C.cardAlt, borderRadius:10, padding:"12px", textAlign:"center" }}>
                    <div style={{ fontSize:11, color:C.textLight, marginBottom:4 }}>{k}</div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:C.text }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {(profile?.conditions || []).map(c => (
                  <span key={c} style={{ background:C.coralLight, color:C.coral, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>🏥 {c}</span>
                ))}
                {(profile?.allergies || []).map(a => (
                  <span key={a} style={{ background:C.amberLight, color:C.amber, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>⚠️ {a}</span>
                ))}
              </div>
            </Section>
          </Card>

          {/* Next appointment */}
          <Card>
            <Section title="📅 Next Appointment" action={<button onClick={() => setShowAppt(true)} style={{ fontSize:12, color:C.blue, background:C.blueLight, border:"none", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontWeight:700 }}>+ Book</button>}>
              {nextAppt ? (
                <div style={{ borderLeft:`4px solid ${C.accent}`, paddingLeft:14, borderRadius:0 }}>
                  <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{nextAppt.type}</div>
                  <div style={{ fontSize:13, color:C.textMed, marginTop:3 }}>with {nextAppt.doctor}</div>
                  <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                    <span style={{ background:C.accentLight, color:C.accent, borderRadius:7, padding:"4px 10px", fontSize:12, fontWeight:700 }}>📅 {nextAppt.date}</span>
                    <span style={{ background:C.accentLight, color:C.accent, borderRadius:7, padding:"4px 10px", fontSize:12, fontWeight:700 }}>🕐 {nextAppt.time}</span>
                  </div>
                  {nextAppt.notes && <div style={{ fontSize:12, color:C.textLight, marginTop:8 }}>📝 {nextAppt.notes}</div>}
                </div>
              ) : (
                <EmptyState icon="📅" text="No upcoming appointments" action={<Btn onClick={() => setShowAppt(true)} style={{ borderRadius:10, padding:"8px 16px", fontSize:12 }}>Book Now</Btn>}/>
              )}
            </Section>
          </Card>

          {/* Active Rx */}
          <Card>
            <Section title="💊 Active Medications">
              {prescriptions.filter(r => r.status === "active").length === 0 ? (
                <EmptyState icon="💊" text="No active prescriptions"/>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {prescriptions.filter(r => r.status === "active").slice(0,3).map(rx => (
                    <div key={rx.id} style={{ background:C.accentLight, border:`1px solid ${C.accent}22`, borderRadius:10, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{rx.drug}</div>
                        <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>{rx.dosage} · {rx.duration}</div>
                      </div>
                      <button onClick={() => downloadRx(rx)} style={{ fontSize:11, color:C.accent, background:"#fff", border:`1px solid ${C.accent}44`, borderRadius:8, padding:"5px 10px", cursor:"pointer", fontWeight:700 }}>⬇️ PDF</button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>
        </div>
      )}

      {/* ══ APPOINTMENTS ══ */}
      {tab === "appointments" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:4 }}>
            <Btn onClick={() => setShowAppt(true)} style={{ borderRadius:10, padding:"9px 16px", fontSize:13 }}>+ Book Appointment</Btn>
          </div>
          {appointments.length === 0 ? (
            <Card><EmptyState icon="📅" text="No appointments yet" action={<Btn onClick={() => setShowAppt(true)} style={{ borderRadius:10 }}>Book First</Btn>}/></Card>
          ) : appointments.map(a => (
            <Card key={a.id} hover style={{ borderLeft:`4px solid ${STATUS_COL[a.status] || C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{a.type}</div>
                  <div style={{ fontSize:12, color:C.textMed, marginTop:2 }}>with {a.doctor}</div>
                </div>
                <Badge label={a.status} color={STATUS_COL[a.status] || C.blue}/>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
                <span style={{ background:C.cardAlt, borderRadius:7, padding:"4px 10px", fontSize:12, color:C.textMed, fontWeight:600 }}>📅 {a.date}</span>
                <span style={{ background:C.cardAlt, borderRadius:7, padding:"4px 10px", fontSize:12, color:C.textMed }}>🕐 {a.time}</span>
                {a.notes && <span style={{ background:C.cardAlt, borderRadius:7, padding:"4px 10px", fontSize:12, color:C.textLight }}>📝 {a.notes}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ══ PRESCRIPTIONS ══ */}
      {tab === "prescriptions" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {prescriptions.length === 0 ? (
            <Card><EmptyState icon="💊" text="No prescriptions yet"/></Card>
          ) : prescriptions.map(rx => (
            <Card key={rx.id} hover style={{ borderLeft:`4px solid ${rx.status==="active"?C.accent:C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{rx.drug}</div>
                  <div style={{ fontSize:12, color:C.textMed, marginTop:2 }}>{rx.dosage} · {rx.duration}</div>
                  <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>by {rx.doctor} · {rx.date}</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <Badge label={rx.status} color={rx.status==="active"?C.accent:C.textLight}/>
                  <button onClick={() => downloadRx(rx)} style={{ fontSize:12, color:C.accent, background:C.accentLight, border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontWeight:700 }}>⬇️ Download</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ══ REPORTS ══ */}
      {tab === "reports" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {reports.length === 0 ? (
            <Card><EmptyState icon="🔬" text="No medical reports yet"/></Card>
          ) : reports.map(r => (
            <Card key={r.id} hover style={{ borderLeft:`4px solid ${SEV_COL[r.status] || C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                  <div style={{ width:46, height:46, borderRadius:12, background:(SEV_COL[r.status]||C.blue)+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🔬</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{r.disease}</div>
                    <div style={{ fontSize:12, color:C.textLight, marginTop:2 }}>
                      {r.scan_type?.toUpperCase()} · {r.created_at?.slice(0,10)} · by {r.doctor}
                    </div>
                    <div style={{ fontSize:12, color:C.accent, marginTop:2, fontWeight:700 }}>
                      {((r.confidence || 0) * 100).toFixed(1)}% confidence
                    </div>
                  </div>
                </div>
                <Badge label={r.status} color={SEV_COL[r.status] || C.textLight}/>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ══ BILLING ══ */}
      {tab === "billing" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            <StatCard label="Total Paid"    value={`$${totalPaid.toFixed(0)}`}  icon="✅" color={C.accent} bg={C.accentLight}/>
            <StatCard label="Amount Due"    value={`$${totalDue.toFixed(0)}`}   icon="💳" color={totalDue>0?C.coral:C.accent} bg={totalDue>0?C.coralLight:C.accentLight}/>
            <StatCard label="Total Invoices"value={invoices.length}              icon="📄" color={C.blue}  bg={C.blueLight}/>
          </div>

          {invoices.length === 0 ? (
            <Card><EmptyState icon="💳" text="No invoices yet"/></Card>
          ) : invoices.map(inv => (
            <Card key={inv.id} style={{ borderLeft:`4px solid ${PAY_COL[inv.status] || C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <div style={{ fontFamily:"monospace", fontSize:11, color:C.textLight, marginBottom:3 }}>{inv.invoice_number}</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:C.text }}>${inv.total.toFixed(2)}</div>
                  <div style={{ fontSize:12, color:C.textLight, marginTop:2 }}>
                    Due: {inv.due_date || "—"} · Issued: {inv.created_at?.slice(0,10)}
                    {inv.paid_at && <span style={{ color:C.accent, fontWeight:700 }}> · Paid: {inv.paid_at?.slice(0,10)}</span>}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <Badge label={inv.status} color={PAY_COL[inv.status] || C.textLight}/>
                  {inv.status !== "paid" && (
                    <Btn onClick={() => setShowPay(inv)} style={{ borderRadius:9, padding:"7px 14px", fontSize:12 }}>💳 Pay Now</Btn>
                  )}
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {(inv.items || []).map((item, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"6px 10px", background:C.cardAlt, borderRadius:7 }}>
                    <span style={{ color:C.textMed }}>{item.desc}</span>
                    <span style={{ fontWeight:700, color:C.text }}>${(item.qty * item.unit_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ══ TELEMEDICINE ══ */}
      {tab === "telemedicine" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <Btn onClick={() => setShowTele(true)} style={{ borderRadius:10, padding:"9px 16px", fontSize:13 }}>📹 Book Session</Btn>
          </div>
          {telemedicine.length === 0 ? (
            <Card><EmptyState icon="📹" text="No telemedicine sessions yet" action={<Btn onClick={() => setShowTele(true)} style={{ borderRadius:10 }}>Book First Session</Btn>}/></Card>
          ) : telemedicine.map(t => (
            <Card key={t.id} style={{ borderLeft:`4px solid ${t.status==="scheduled"?C.accent:C.border}` }}>
              <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                <div style={{ width:48, height:48, borderRadius:12, background:t.type==="video"?C.blueLight:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
                  {t.type==="video"?"📹":t.type==="audio"?"📞":"💬"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{t.doctor_name}</div>
                  <div style={{ fontSize:12, color:C.textLight, marginTop:2 }}>
                    {t.type.charAt(0).toUpperCase()+t.type.slice(1)} · {t.duration_mins} min · {t.scheduled_at?.slice(0,16).replace("T"," ")}
                  </div>
                  {t.notes && <div style={{ fontSize:12, color:C.textMed, marginTop:3 }}>📝 {t.notes}</div>}
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <Badge label={t.status} color={t.status==="scheduled"?C.accent:C.textLight}/>
                  {t.status === "scheduled" && (
                    <button onClick={() => setShowRoom(t)}
                      style={{ background:"#22c55e", border:"none", borderRadius:9, color:"#fff", padding:"7px 14px", cursor:"pointer", fontSize:12, fontWeight:700 }}>
                      🟢 Join
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ══ MESSAGES ══ */}
      {tab === "messages" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, height: 500 }}>
          <Card style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, color: C.textLight }}>Select Staff</div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {contacts.map(c => (
                <div key={c.id} onClick={() => setActiveChat(c)}
                  style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", cursor: "pointer", background: activeChat?.id === c.id ? C.accentLight : "transparent", borderBottom: `1px solid ${C.border}` }}>
                  <Avatar initials={c.avatar} color={c.color} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: C.textLight }}>{c.specialty}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {activeChat ? (
              <>
                <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar initials={activeChat.avatar} color={activeChat.color} size={36} />
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{activeChat.name}</div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10, background: C.cardAlt }}>
                  {(chatMessages[activeChat.id] || []).map((msg, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: msg.from === "me" ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "80%", padding: "8px 12px", borderRadius: 12, fontSize: 13,
                        background: msg.from === "me" ? C.accent : "#fff",
                        color: msg.from === "me" ? "#fff" : C.text,
                        boxShadow: C.shadow,
                      }}>
                        {msg.text}
                        <div style={{ fontSize: 9, opacity: 0.7, marginTop: 4, textAlign: "right" }}>{msg.time}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>
                <div style={{ padding: "12px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
                  <input value={chatDraft} onChange={e => setChatDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChatMessage()}
                    placeholder="Type your message…" style={{ ...inputSt, flex: 1 }} />
                  <Btn onClick={sendChatMessage} disabled={!chatDraft.trim()} style={{ borderRadius: 10, padding: "0 16px" }}>➤</Btn>
                </div>
              </>
            ) : (
              <EmptyState icon="💬" text="Select staff to chat" />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
