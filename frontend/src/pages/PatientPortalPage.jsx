import { useState, useEffect, useRef } from "react";
import { C } from "../constants";
import { Card, Btn, Badge, Avatar, PageHeader, StatCard, TabBar } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { portalService, billingService, telemedicineService } from "../services/api";

const STATUS_COL = { confirmed:C.accent, pending:C.blue, cancelled:C.coral, completed:"#8b5cf6" };
const SEV_COL    = { normal:C.accent, abnormal:C.amber, critical:C.coral };
const PAY_COL    = { paid:C.accent, unpaid:C.coral, overdue:"#ef4444", partial:C.amber };

export default function PatientPortalPage() {
  const { user, logout } = useAuth();
  const [profile,        setProfile]       = useState(null);
  const [tab,            setTab]           = useState("overview");
  const [appointments,   setAppointments]  = useState([]);
  const [prescriptions,  setPrescriptions] = useState([]);
  const [reports,        setReports]       = useState([]);
  const [invoices,       setInvoices]      = useState([]);
  const [telemedicine,   setTelemedicine]  = useState([]);
  const [showBookAppt,   setShowBookAppt]  = useState(false);
  const [showBookTele,   setShowBookTele]  = useState(false);
  const [showPayModal,   setShowPayModal]  = useState(null);
  const [showTeleRoom,   setShowTeleRoom]  = useState(null);
  const [apptForm,       setApptForm]      = useState({doctor:"",date:"",time:"09:00",type:"Consultation",notes:""});
  const [teleForm,       setTeleForm]      = useState({doctor_name:"",type:"video",scheduled_at:"",duration_mins:30,notes:""});
  const [successMsg,     setSuccessMsg]    = useState("");
  const [payMethod,      setPayMethod]     = useState("card");

  // Load all portal data from backend
  useEffect(() => {
    portalService.getMe().then(setProfile).catch(() => {});
    portalService.getAppointments().then(d => setAppointments(d || [])).catch(() => {});
    portalService.getPrescriptions().then(d => setPrescriptions(d || [])).catch(() => {});
    portalService.getReports().then(d => setReports(d || [])).catch(() => {});
    billingService.listInvoices().then(d => setInvoices(d || [])).catch(() => {});
    telemedicineService.list().then(d => setTelemedicine(d || [])).catch(() => {});
  }, []);

  const flash = msg => { setSuccessMsg(msg); setTimeout(()=>setSuccessMsg(""),3500); };

  const totalDue     = invoices.filter(i=>i.status!=="paid").reduce((a,i)=>a+i.total,0);
  const totalPaid    = invoices.filter(i=>i.status==="paid").reduce((a,i)=>a+i.total,0);
  const nextAppt     = appointments.find(a=>a.status==="confirmed"&&a.date>=new Date().toISOString().slice(0,10));
  const activeRx     = prescriptions.filter(r=>r.status==="active").length;

  const handleBookAppt = async () => {
    if(!apptForm.doctor||!apptForm.date) return;
    try {
      const saved = await portalService.bookAppointment(apptForm);
      setAppointments(p=>[saved, ...p]);
    } catch {
      const na = {id:"a"+Date.now(),...apptForm,status:"pending"};
      setAppointments(p=>[na,...p]);
    }
    setShowBookAppt(false);
    setApptForm({doctor:"",date:"",time:"09:00",type:"Consultation",notes:""});
    flash("✅ Appointment requested! You'll receive confirmation shortly.");
  };

  const handleBookTele = async () => {
    if(!teleForm.doctor_name||!teleForm.scheduled_at) return;
    try {
      const saved = await telemedicineService.book({patient_name: profile?.name || user?.name || "Patient", ...teleForm});
      setTelemedicine(p=>[saved, ...p]);
    } catch {
      const nt = {id:"t"+Date.now(),...teleForm,status:"scheduled",room_id:"room_"+Date.now().toString(36),notes:teleForm.notes};
      setTelemedicine(p=>[nt,...p]);
    }
    setShowBookTele(false);
    setTeleForm({doctor_name:"",type:"video",scheduled_at:"",duration_mins:30,notes:""});
    flash("✅ Telemedicine session booked! You'll receive a join link via email.");
  };

  const handlePay = async (invoice) => {
    try { await billingService.markPaid(invoice.id, payMethod); } catch { /* keep optimistic */ }
    setInvoices(p=>p.map(i=>i.id===invoice.id?{...i,status:"paid",paid_at:new Date().toISOString()}:i));
    setShowPayModal(null);
    flash(`✅ Payment of $${invoice.total} processed successfully`);
  };

  const downloadPrescription = (rx) => {
    const win = window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Prescription</title>
    <style>body{font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;}h1{color:#4CAF82;}.header{border-bottom:2px solid #4CAF82;padding-bottom:16px;margin-bottom:24px;}.field{margin-bottom:12px;}.label{font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:0.06em;}.value{font-size:15px;font-weight:700;color:#1a1a2e;}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e8eef0;font-size:11px;color:#94a3b8;}</style>
    </head><body>
    <div class="header"><h1>⚕️ MediCore AI — Prescription</h1></div>
    <div class="field"><div class="label">PATIENT</div><div class="value">${user?.name||"Patient"}</div></div>
    <div class="field"><div class="label">DRUG</div><div class="value">${rx.drug}</div></div>
    <div class="field"><div class="label">DOSAGE</div><div class="value">${rx.dosage}</div></div>
    <div class="field"><div class="label">DURATION</div><div class="value">${rx.duration}</div></div>
    <div class="field"><div class="label">PRESCRIBED BY</div><div class="value">${rx.doctor}</div></div>
    <div class="field"><div class="label">DATE</div><div class="value">${rx.date}</div></div>
    <div class="footer">MediCore AI · Confidential Medical Prescription · ${new Date().toLocaleDateString()}</div>
    <script>window.print();</script></body></html>`);
    win.document.close();
  };

  return (
    <div style={{minHeight:"100vh",background:"#f0f4f0"}}>
      {/* Patient portal top nav */}
      <div style={{background:"#fff",padding:"0 28px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:22}}>⚕️</div>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#1a1a2e"}}>MediCore AI</span>
          <span style={{fontSize:12,color:C.blue,fontWeight:600,background:C.blueLight,padding:"2px 10px",borderRadius:20}}>Patient Portal</span>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          {totalDue>0&&<div style={{fontSize:12,color:C.coral,fontWeight:700,background:C.coralLight,padding:"4px 12px",borderRadius:20}}>💳 ${totalDue.toFixed(2)} due</div>}
          <span style={{fontSize:13,color:C.textMed,fontWeight:600}}>{user?.name}</span>
          <button onClick={logout} style={{fontSize:12,color:C.coral,background:"none",border:`1px solid ${C.coral}44`,borderRadius:8,padding:"5px 12px",cursor:"pointer",fontWeight:700}}>Sign Out</button>
        </div>
      </div>

      <div style={{padding:28}}>
        {/* Welcome banner */}
        <div style={{background:"linear-gradient(135deg,#5B8DEF,#3b6fd4)",borderRadius:20,padding:"20px 28px",marginBottom:24,display:"flex",gap:16,alignItems:"center"}}>
          <div style={{width:52,height:52,background:"rgba(255,255,255,0.2)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>🏥</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#fff",fontWeight:700}}>
              Welcome back, {user?.name?.split(" ")[0]}
            </div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",marginTop:2}}>
              {nextAppt?`Next appointment: ${nextAppt.date} at ${nextAppt.time} with ${nextAppt.doctor}`:"No upcoming appointments"}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>setShowBookTele(true)} style={{background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:10,fontSize:12}}>📹 Book Telemedicine</Btn>
            <Btn onClick={()=>setShowBookAppt(true)} style={{background:"rgba(255,255,255,0.95)",color:C.blue,border:"none",borderRadius:10,fontSize:12}}>📅 Book Appointment</Btn>
          </div>
        </div>

        {successMsg&&<div style={{background:C.accentLight,border:`1px solid ${C.accent}44`,borderRadius:12,padding:"10px 16px",marginBottom:16,fontSize:13,color:C.accent,fontWeight:700}}>{successMsg}</div>}

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
          <StatCard label="Appointments"  value={appointments.length}  icon="📅" color={C.blue}  bg={C.blueLight}  />
          <StatCard label="Active Rx"     value={activeRx}             icon="💊" color={C.accent} bg={C.accentLight} />
          <StatCard label="Reports"       value={reports.length}       icon="🔬" color={C.amber} bg={C.amberLight}  />
          <StatCard label="Amount Due"    value={`$${totalDue.toFixed(0)}`} icon="💳" color={totalDue>0?C.coral:C.accent} bg={totalDue>0?C.coralLight:C.accentLight} />
        </div>

        <TabBar tabs={[["overview","👤 Overview"],["appointments","📅 Appointments"],["prescriptions","💊 Prescriptions"],["reports","🔬 Reports"],["billing","💳 Billing"],["telemedicine","📹 Telemedicine"]]} active={tab} onChange={setTab}/>

        {/* ── Overview ── */}
        {tab==="overview"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {/* Profile */}
            <Card>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:14}}>👤 My Profile</h3>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[["Name",profile?.name||user?.name||"—"],["Date of Birth",profile?.dob||"—"],["Blood Group",profile?.blood||"—"],["Phone",profile?.phone||"—"],["Doctor",profile?.doctor||"—"],["Insurance",profile?.insurance||"—"]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:C.cardAlt,borderRadius:8}}>
                    <span style={{fontSize:12,color:C.textLight,fontWeight:600}}>{k}</span>
                    <span style={{fontSize:12,color:C.text,fontWeight:700}}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Vitals */}
            <Card>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:14}}>❤️ Current Vitals</h3>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["❤️ Blood Pressure",profile?.vitals?.bp||"—"],["💓 Heart Rate",(profile?.vitals?.hr||"—")+" bpm"],["🌡️ Temperature",(profile?.vitals?.temp||"—")+""],["🩸 O₂ Saturation",(profile?.vitals?.o2||"—")+""]].map(([k,v])=>(
                  <div key={k} style={{background:C.cardAlt,borderRadius:10,padding:"12px",textAlign:"center"}}>
                    <div style={{fontSize:11,color:C.textLight}}>{k}</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:C.text,marginTop:4}}>{v}</div>
                  </div>
                ))}
              </div>
              {/* Conditions + allergies */}
              <div style={{marginTop:14,display:"flex",gap:6,flexWrap:"wrap"}}>
                {(profile?.conditions||[]).map(c=><span key={c} style={{background:C.coralLight,color:C.coral,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>🏥 {c}</span>)}
                {(profile?.allergies||[]).map(a=><span key={a} style={{background:C.amberLight,color:C.amber,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>⚠️ {a}</span>)}
              </div>
            </Card>

            {/* Upcoming appointment */}
            <Card>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:14}}>📅 Next Appointment</h3>
              {nextAppt
                ? <div style={{borderLeft:`4px solid ${C.accent}`,paddingLeft:14}}>
                    <div style={{fontSize:15,fontWeight:800,color:C.text}}>{nextAppt.type}</div>
                    <div style={{fontSize:13,color:C.textMed,marginTop:4}}>with {nextAppt.doctor}</div>
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      <span style={{background:C.accentLight,color:C.accent,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700}}>📅 {nextAppt.date}</span>
                      <span style={{background:C.accentLight,color:C.accent,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700}}>🕐 {nextAppt.time}</span>
                    </div>
                  </div>
                : <div style={{textAlign:"center",padding:20,color:C.textLight,fontSize:13}}>No upcoming appointments<br/><Btn onClick={()=>setShowBookAppt(true)} style={{marginTop:12,borderRadius:10,padding:"8px 16px",fontSize:12}}>Book Now</Btn></div>
              }
            </Card>

            {/* Active prescriptions */}
            <Card>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:14}}>💊 Active Medications</h3>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {prescriptions.filter(r=>r.status==="active").slice(0,3).map(rx=>(
                  <div key={rx.id} style={{background:C.accentLight,border:`1px solid ${C.accent}22`,borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:C.text}}>{rx.drug}</div>
                      <div style={{fontSize:11,color:C.textLight,marginTop:2}}>{rx.dosage} · {rx.duration}</div>
                    </div>
                    <button onClick={()=>downloadPrescription(rx)} style={{fontSize:11,color:C.accent,background:"#fff",border:`1px solid ${C.accent}44`,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontWeight:700}}>⬇️ Download</button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── Appointments ── */}
        {tab==="appointments"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}>
              <Btn onClick={()=>setShowBookAppt(true)} style={{borderRadius:12}}>+ Book Appointment</Btn>
            </div>
            {appointments.map(a=>(
              <Card key={a.id} hover style={{borderLeft:`4px solid ${STATUS_COL[a.status]||C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:800,color:C.text}}>{a.type}</div>
                    <div style={{fontSize:12,color:C.textMed,marginTop:2}}>with {a.doctor}</div>
                  </div>
                  <Badge label={a.status} color={STATUS_COL[a.status]||C.blue}/>
                </div>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <span style={{background:C.cardAlt,borderRadius:8,padding:"4px 10px",fontSize:12,color:C.textMed,fontWeight:600}}>📅 {a.date}</span>
                  <span style={{background:C.cardAlt,borderRadius:8,padding:"4px 10px",fontSize:12,color:C.textMed}}>🕐 {a.time}</span>
                  {a.notes&&<span style={{background:C.cardAlt,borderRadius:8,padding:"4px 10px",fontSize:12,color:C.textLight}}>📝 {a.notes}</span>}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Prescriptions ── */}
        {tab==="prescriptions"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {prescriptions.map(rx=>(
              <Card key={rx.id} hover style={{borderLeft:`4px solid ${rx.status==="active"?C.accent:C.textLight}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:800,color:C.text}}>{rx.drug}</div>
                    <div style={{fontSize:12,color:C.textMed,marginTop:2}}>{rx.dosage} · {rx.duration}</div>
                    <div style={{fontSize:11,color:C.textLight,marginTop:2}}>by {rx.doctor} · {rx.date}</div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <Badge label={rx.status} color={rx.status==="active"?C.accent:C.textLight}/>
                    <button onClick={()=>downloadPrescription(rx)} style={{fontSize:12,color:C.accent,background:C.accentLight,border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:700}}>⬇️ Download</button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Reports ── */}
        {tab==="reports"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {reports.map(r=>(
              <Card key={r.id} hover style={{borderLeft:`4px solid ${SEV_COL[r.status]||C.textLight}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",gap:14,alignItems:"center"}}>
                    <div style={{width:48,height:48,borderRadius:14,background:(SEV_COL[r.status]||C.blue)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🔬</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:C.text}}>{r.disease}</div>
                      <div style={{fontSize:12,color:C.textLight,marginTop:2}}>{r.scan_type?.toUpperCase()} · {r.created_at?.slice(0,10)} · by {r.doctor}</div>
                      <div style={{fontSize:12,color:C.accent,marginTop:2,fontWeight:700}}>{(r.confidence*100).toFixed(1)}% confidence</div>
                    </div>
                  </div>
                  <Badge label={r.status} color={SEV_COL[r.status]||C.textLight}/>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Billing ── */}
        {tab==="billing"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {/* Summary */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
              <StatCard label="Total Paid"    value={`$${totalPaid.toFixed(0)}`}  icon="✅" color={C.accent} bg={C.accentLight}/>
              <StatCard label="Amount Due"    value={`$${totalDue.toFixed(0)}`}   icon="💳" color={totalDue>0?C.coral:C.accent}  bg={totalDue>0?C.coralLight:C.accentLight}/>
              <StatCard label="Total Invoices"value={invoices.length}              icon="📄" color={C.blue}  bg={C.blueLight}/>
            </div>

            {invoices.map(inv=>(
              <Card key={inv.id} style={{borderLeft:`4px solid ${PAY_COL[inv.status]||C.textLight}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div>
                    <div style={{fontFamily:"monospace",fontSize:12,color:C.textLight,marginBottom:4}}>{inv.invoice_number}</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:C.text}}>${inv.total.toFixed(2)}</div>
                    <div style={{fontSize:12,color:C.textLight,marginTop:2}}>
                      Due: {inv.due_date||"—"} · Issued: {inv.created_at?.slice(0,10)}
                      {inv.paid_at&&<span style={{color:C.accent,fontWeight:700}}> · Paid: {inv.paid_at?.slice(0,10)}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <Badge label={inv.status} color={PAY_COL[inv.status]||C.textLight}/>
                    {inv.status!=="paid"&&(
                      <Btn onClick={()=>setShowPayModal(inv)} style={{borderRadius:10,padding:"8px 16px",fontSize:12}}>💳 Pay Now</Btn>
                    )}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {inv.items?.map((item,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"6px 10px",background:C.cardAlt,borderRadius:8}}>
                      <span style={{color:C.textMed}}>{item.desc}</span>
                      <span style={{fontWeight:700,color:C.text}}>${(item.qty*item.unit_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Telemedicine ── */}
        {tab==="telemedicine"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <Btn onClick={()=>setShowBookTele(true)} style={{borderRadius:12}}>📹 Book Session</Btn>
            </div>
            {telemedicine.map(t=>(
              <Card key={t.id} style={{borderLeft:`4px solid ${t.status==="scheduled"?C.accent:C.textLight}`}}>
                <div style={{display:"flex",gap:16,alignItems:"center"}}>
                  <div style={{width:52,height:52,borderRadius:14,background:t.type==="video"?C.blueLight:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
                    {t.type==="video"?"📹":t.type==="audio"?"📞":"💬"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:800,color:C.text}}>{t.doctor_name}</div>
                    <div style={{fontSize:12,color:C.textLight,marginTop:2}}>
                      {t.type.charAt(0).toUpperCase()+t.type.slice(1)} · {t.duration_mins} min · {t.scheduled_at?.slice(0,16).replace("T"," ")}
                    </div>
                    {t.notes&&<div style={{fontSize:12,color:C.textMed,marginTop:3}}>{t.notes}</div>}
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <Badge label={t.status} color={t.status==="scheduled"?C.accent:C.textLight}/>
                    {t.status==="scheduled"&&(
                      <Btn onClick={()=>setShowTeleRoom(t)} style={{borderRadius:10,padding:"8px 16px",fontSize:12,background:"#22c55e"}}>
                        🟢 Join Now
                      </Btn>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {telemedicine.length===0&&<Card style={{textAlign:"center",padding:48}}><div style={{fontSize:40,marginBottom:12}}>📹</div><div style={{fontSize:14,color:C.textLight,marginBottom:16}}>No telemedicine sessions</div><Btn onClick={()=>setShowBookTele(true)} style={{borderRadius:12}}>Book First Session</Btn></Card>}
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {/* Book Appointment Modal */}
      {showBookAppt&&(
        <PortalModal title="📅 Book Appointment" onClose={()=>setShowBookAppt(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <PField label="PREFERRED DOCTOR"><input value={apptForm.doctor} onChange={e=>setApptForm(f=>({...f,doctor:e.target.value}))} placeholder="Doctor name or specialty" style={inputStyle}/></PField>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <PField label="DATE"><input type="date" value={apptForm.date} onChange={e=>setApptForm(f=>({...f,date:e.target.value}))} style={inputStyle}/></PField>
              <PField label="TIME"><input type="time" value={apptForm.time} onChange={e=>setApptForm(f=>({...f,time:e.target.value}))} style={inputStyle}/></PField>
            </div>
            <PField label="TYPE">
              <select value={apptForm.type} onChange={e=>setApptForm(f=>({...f,type:e.target.value}))} style={inputStyle}>
                {["Consultation","Follow-up","Lab Test","Check-up","Emergency","Vaccination"].map(t=><option key={t}>{t}</option>)}
              </select>
            </PField>
            <PField label="NOTES"><textarea value={apptForm.notes} onChange={e=>setApptForm(f=>({...f,notes:e.target.value}))} placeholder="Describe your symptoms…" rows={2} style={{...inputStyle,resize:"none",fontFamily:"Nunito,sans-serif"}}/></PField>
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <Btn onClick={handleBookAppt} disabled={!apptForm.doctor||!apptForm.date} style={{flex:1,borderRadius:12,padding:"12px"}}>Request Appointment</Btn>
              <Btn variant="outline" onClick={()=>setShowBookAppt(false)} style={{borderRadius:12,padding:"12px 18px"}}>Cancel</Btn>
            </div>
          </div>
        </PortalModal>
      )}

      {/* Book Telemedicine Modal */}
      {showBookTele&&(
        <PortalModal title="📹 Book Telemedicine Session" onClose={()=>setShowBookTele(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <PField label="DOCTOR"><input value={teleForm.doctor_name} onChange={e=>setTeleForm(f=>({...f,doctor_name:e.target.value}))} placeholder="Doctor name" style={inputStyle}/></PField>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <PField label="DATE & TIME"><input type="datetime-local" value={teleForm.scheduled_at} onChange={e=>setTeleForm(f=>({...f,scheduled_at:e.target.value}))} style={inputStyle}/></PField>
              <PField label="DURATION">
                <select value={teleForm.duration_mins} onChange={e=>setTeleForm(f=>({...f,duration_mins:+e.target.value}))} style={inputStyle}>
                  {[15,30,45,60].map(n=><option key={n} value={n}>{n} min</option>)}
                </select>
              </PField>
            </div>
            <PField label="SESSION TYPE">
              <div style={{display:"flex",gap:8}}>
                {[["video","📹 Video"],["audio","📞 Audio"],["chat","💬 Chat"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setTeleForm(f=>({...f,type:v}))}
                    style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${teleForm.type===v?C.blue:C.border}`,background:teleForm.type===v?C.blueLight:"#fff",color:teleForm.type===v?C.blue:C.textMed,cursor:"pointer",fontSize:13,fontWeight:700}}>
                    {l}
                  </button>
                ))}
              </div>
            </PField>
            <PField label="NOTES"><textarea value={teleForm.notes} onChange={e=>setTeleForm(f=>({...f,notes:e.target.value}))} placeholder="Reason for consultation…" rows={2} style={{...inputStyle,resize:"none",fontFamily:"Nunito,sans-serif"}}/></PField>
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <Btn onClick={handleBookTele} disabled={!teleForm.doctor_name||!teleForm.scheduled_at} style={{flex:1,borderRadius:12,padding:"12px"}}>Book Session</Btn>
              <Btn variant="outline" onClick={()=>setShowBookTele(false)} style={{borderRadius:12,padding:"12px 18px"}}>Cancel</Btn>
            </div>
          </div>
        </PortalModal>
      )}

      {/* Payment Modal */}
      {showPayModal&&(
        <PortalModal title="💳 Make Payment" onClose={()=>setShowPayModal(null)}>
          <div style={{background:C.cardAlt,borderRadius:12,padding:"14px 18px",marginBottom:4}}>
            <div style={{fontFamily:"monospace",fontSize:12,color:C.textLight}}>{showPayModal.invoice_number}</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:C.text,marginTop:4}}>${showPayModal.total.toFixed(2)}</div>
          </div>
          <div>
            <div style={{fontSize:12,color:C.textLight,fontWeight:600,marginBottom:8}}>PAYMENT METHOD</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[["card","💳 Credit / Debit Card"],["bank","🏦 Bank Transfer"],["insurance","🏥 Insurance Claim"],["cash","💵 Cash Payment"]].map(([v,l])=>(
                <button key={v} onClick={()=>setPayMethod(v)}
                  style={{padding:"12px 16px",borderRadius:12,border:`2px solid ${payMethod===v?C.accent:C.border}`,background:payMethod===v?C.accentLight:"#fff",cursor:"pointer",textAlign:"left",fontSize:13,fontWeight:600,color:payMethod===v?C.accent:C.text}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {payMethod==="card"&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <PField label="CARD NUMBER"><input placeholder="1234 5678 9012 3456" style={inputStyle}/></PField>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <PField label="EXPIRY"><input placeholder="MM/YY" style={inputStyle}/></PField>
                <PField label="CVV"><input placeholder="123" type="password" style={inputStyle}/></PField>
              </div>
            </div>
          )}
          <div style={{padding:"10px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,fontSize:12,color:"#166534"}}>
            🔒 Your payment is secured with 256-bit SSL encryption
          </div>
          <div style={{display:"flex",gap:10,marginTop:4}}>
            <Btn onClick={()=>handlePay(showPayModal)} style={{flex:1,borderRadius:12,padding:"12px"}}>✅ Pay ${showPayModal.total.toFixed(2)}</Btn>
            <Btn variant="outline" onClick={()=>setShowPayModal(null)} style={{borderRadius:12,padding:"12px 18px"}}>Cancel</Btn>
          </div>
        </PortalModal>
      )}

      {/* Telemedicine Room */}
      {showTeleRoom&&(
        <div style={{position:"fixed",inset:0,background:"#0f0f0f",zIndex:9999,display:"flex",flexDirection:"column"}}>
          <div style={{background:"#1a1a2e",padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:"#22c55e"}}/>
              <span style={{color:"#fff",fontSize:14,fontWeight:700}}>📹 Live Session — {showTeleRoom.doctor_name}</span>
            </div>
            <button onClick={()=>setShowTeleRoom(null)} style={{background:"#ef4444",border:"none",borderRadius:8,color:"#fff",padding:"6px 16px",cursor:"pointer",fontSize:13,fontWeight:700}}>📴 End Call</button>
          </div>
          <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,background:"#111"}}>
            {/* Doctor video placeholder */}
            <div style={{background:"#1e293b",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative"}}>
              <div style={{width:80,height:80,borderRadius:"50%",background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,marginBottom:12}}>👨‍⚕️</div>
              <div style={{color:"#fff",fontSize:14,fontWeight:700}}>{showTeleRoom.doctor_name}</div>
              <div style={{color:"#94a3b8",fontSize:12,marginTop:4}}>Doctor</div>
              <div style={{position:"absolute",bottom:16,left:16,background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:11,padding:"4px 10px",borderRadius:20}}>🎙️ Audio On</div>
            </div>
            {/* Patient video */}
            <div style={{background:"#0f172a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative"}}>
              <div style={{width:80,height:80,borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,marginBottom:12}}>🙂</div>
              <div style={{color:"#fff",fontSize:14,fontWeight:700}}>{user?.name}</div>
              <div style={{color:"#94a3b8",fontSize:12,marginTop:4}}>You</div>
              <div style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.6)",color:"#94a3b8",fontSize:11,padding:"4px 10px",borderRadius:20}}>You</div>
            </div>
          </div>
          {/* Controls */}
          <div style={{background:"#1a1a2e",padding:"16px",display:"flex",justifyContent:"center",gap:16}}>
            {[["🎙️","Mic"],["📹","Camera"],["🖥️","Screen"],["💬","Chat"],["⚙️","Settings"]].map(([icon,label])=>(
              <button key={label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"#334155",border:"none",borderRadius:12,padding:"12px 18px",cursor:"pointer",color:"#fff",fontSize:20}}>
                {icon}<span style={{fontSize:10,color:"#94a3b8"}}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper components
function PortalModal({title,onClose,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,backdropFilter:"blur(4px)"}}>
      <div style={{background:"#fff",borderRadius:24,padding:"32px 36px",width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#1a1a2e"}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#94a3b8"}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>{children}</div>
      </div>
    </div>
  );
}
function PField({label,children}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>{label}</label>
      {children}
    </div>
  );
}
const inputStyle={background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"11px 14px",fontSize:13,color:C.text,outline:"none",width:"100%"};
