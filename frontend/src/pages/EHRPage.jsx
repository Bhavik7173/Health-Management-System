import { useState, useEffect } from "react";
import { C, statusColor } from "../constants";
import { Card, Btn, Badge, Avatar, Input, PageHeader, StatCard, TabBar } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { patientService } from "../services/api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine
} from "recharts";

// ── Constants ─────────────────────────────────────────────────────────────────
const SEV_COL   = { normal:C.accent, abnormal:C.amber, critical:C.coral };
const TYPE_ICON = { visit:"🏥", lab:"🧪", scan:"🔬", appointment:"📅", vitals:"❤️", treatment:"📋", surgery:"⚕️", vaccination:"💉" };
const TYPE_COL  = { visit:C.blue, lab:C.amber, scan:C.accent, appointment:"#8b5cf6", vitals:C.coral, treatment:C.textLight };
const VISIT_TYPES = ["Outpatient","Inpatient","Emergency","Telehealth","Follow-up","Specialist"];
const LAB_TESTS   = ["CBC","Blood Glucose","HbA1c","Lipid Panel","LFT","RFT","Thyroid","ECG","Chest X-Ray","MRI","CT Scan","Urinalysis","Cultures","Blood Culture","Coagulation","Electrolytes","Arterial Blood Gas"];
const FOLLOW_UPS  = ["1 week","2 weeks","1 month","3 months","6 months","1 year","PRN","As needed"];

// ── Mock patient list ──────────────────────────────────────────────────────────
const PATIENTS = [
  { id:"p1", name:"Sarah Johnson",  avatar:"SJ", color:C.coral,  doctor:"Dr. Lida Gutierrez",   status:"active",   blood:"A+", dob:"1985-03-12" },
  { id:"p2", name:"James Lee",      avatar:"JL", color:C.blue,   doctor:"Dr. Christina Frazier", status:"critical", blood:"O+", dob:"1972-07-25" },
  { id:"p3", name:"Maria Garcia",   avatar:"MG", color:C.accent, doctor:"Dr. Mayme Gomez",       status:"active",   blood:"B+", dob:"1990-11-03" },
  { id:"p4", name:"Tom Chen",       avatar:"TC", color:C.amber,  doctor:"Dr. Mayme Gomez",       status:"critical", blood:"AB-",dob:"1965-05-18" },
];

// ── Seed EHR data ──────────────────────────────────────────────────────────────
const SEED_VISIT_NOTES = {
  p1: [
    { id:"vn1", patient_id:"p1", visit_date:"2026-05-20", visit_type:"Outpatient", doctor_name:"Dr. Lida Gutierrez", severity:"abnormal",
      subjective:"Patient presents with productive cough, fever 38.5°C for 3 days. No haemoptysis.",
      objective:"RR 22/min, O₂ 96%, right lower lobe crackles on auscultation. CXR: RLL consolidation.",
      assessment:"Community-acquired pneumonia, right lower lobe.",
      plan:"Amoxicillin 500mg TDS × 7 days. Paracetamol PRN. Rest, fluids.",
      follow_up:"Review in 1 week or sooner if worsening." },
    { id:"vn2", patient_id:"p1", visit_date:"2026-02-28", visit_type:"Outpatient", doctor_name:"Dr. Lida Gutierrez", severity:"normal",
      subjective:"Annual check-up. Feeling well. Occasional mild headaches.",
      objective:"BP 128/82, HR 74, BMI 24.9. All systems NAD.",
      assessment:"Mild hypertension, well-controlled on current medication.",
      plan:"Continue Lisinopril. Reduce sodium intake. Repeat BP in 3 months.",
      follow_up:"3 months" },
  ],
  p2: [
    { id:"vn3", patient_id:"p2", visit_date:"2026-05-19", visit_type:"Inpatient", doctor_name:"Dr. Christina Frazier", severity:"critical",
      subjective:"Persistent headaches x 6 weeks, visual disturbances, nausea. No prior CNS history.",
      objective:"GCS 15. Left visual field defect. MRI: 4.2cm mass left temporal lobe with ring enhancement.",
      assessment:"Grade 2 Glioma, left temporal lobe. Biopsy confirmed.",
      plan:"Refer neurosurgery urgent. Dexamethasone 4mg BD. Seizure prophylaxis. MDT meeting scheduled.",
      follow_up:"Neurosurgery review within 48 hours." },
  ],
  p3: [],
  p4: [
    { id:"vn4", patient_id:"p4", visit_date:"2026-05-17", visit_type:"Emergency", doctor_name:"Dr. Mayme Gomez", severity:"critical",
      subjective:"Productive cough 3 months, night sweats, 8kg weight loss, haemoptysis.",
      objective:"Temp 38.1, O₂ 94%. CXR: bilateral upper lobe cavitation, hilar lymphadenopathy.",
      assessment:"Active pulmonary tuberculosis. Notifiable disease. Isolation initiated.",
      plan:"RIPE regimen commenced. Sputum AFB × 3. Contact tracing. Infection control notified.",
      follow_up:"Daily review until stable." },
  ],
};

const SEED_TREATMENT_PLANS = {
  p1: [
    { id:"tp1", patient_id:"p1", title:"Hypertension Management", diagnosis:"Essential Hypertension", status:"active",
      start_date:"2025-09-01", end_date:"2026-09-01", follow_up_freq:"3 months",
      goals:[{text:"Maintain BP <130/80",target_date:"2026-06-01",achieved:false},{text:"Reduce sodium <2g/day",target_date:"2026-03-01",achieved:true}],
      medications:[{drug:"Lisinopril 10mg",dosage:"1×/day",duration:"ongoing",notes:"Monitor renal function"}],
      interventions:["Dietary modification","Exercise programme"],
      notes:"Patient motivated. Consider adding amlodipine if BP not controlled." },
  ],
  p2: [
    { id:"tp2", patient_id:"p2", title:"Glioma Treatment Protocol", diagnosis:"Grade 2 Glioma", status:"active",
      start_date:"2026-05-20", end_date:"2026-11-20", follow_up_freq:"Weekly",
      goals:[{text:"Complete surgical resection",target_date:"2026-06-01",achieved:false},{text:"6 cycles chemotherapy",target_date:"2026-11-01",achieved:false}],
      medications:[{drug:"Dexamethasone 4mg",dosage:"2×/day",duration:"ongoing",notes:"Taper post-surgery"},{drug:"Temozolomide",dosage:"Per protocol",duration:"6 months",notes:"Monitor CBC"}],
      interventions:["Craniotomy","Radiotherapy","Chemotherapy","Physiotherapy"],
      notes:"MDT approach. Neurosurgery + oncology collaboration required." },
  ],
  p3: [], p4: [],
};

const SEED_VITALS_HISTORY = {
  p1: [
    { date:"2026-05-20", bp:"138/88", hr:88, o2:96, temp:38.5, weight:68, glucose:"6.1" },
    { date:"2026-04-10", bp:"132/84", hr:76, o2:98, temp:36.8, weight:68, glucose:"5.8" },
    { date:"2026-02-28", bp:"128/82", hr:74, o2:98, temp:36.7, weight:67, glucose:"5.4" },
    { date:"2025-11-15", bp:"130/85", hr:80, o2:97, temp:36.9, weight:69, glucose:"5.5" },
    { date:"2025-09-01", bp:"142/90", hr:82, o2:97, temp:36.6, weight:70, glucose:"5.6" },
  ],
  p2: [
    { date:"2026-05-19", bp:"145/92", hr:88, o2:96, temp:37.2, weight:80, glucose:"9.2" },
    { date:"2026-04-30", bp:"148/94", hr:90, o2:95, temp:37.0, weight:81, glucose:"8.9" },
  ],
  p3: [{ date:"2026-05-18", bp:"118/76", hr:68, o2:99, temp:36.6, weight:62, glucose:"5.2" }],
  p4: [
    { date:"2026-05-17", bp:"138/88", hr:92, o2:94, temp:38.1, weight:72, glucose:"—" },
    { date:"2026-04-22", bp:"135/86", hr:88, o2:95, temp:37.8, weight:74, glucose:"—" },
  ],
};

// ── EHR PDF Export ─────────────────────────────────────────────────────────────
function printEHR(patient, visitNotes, treatmentPlans, vitalsHistory, labResults) {
  const win = window.open("","_blank","width=900,height=700");
  const age = patient.dob ? new Date().getFullYear()-new Date(patient.dob).getFullYear() : "—";
  win.document.write(`<!DOCTYPE html><html><head>
  <title>EHR — ${patient.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Nunito',sans-serif;background:#fff;color:#1a1a2e;padding:36px;font-size:12px;line-height:1.6;}
    h1{font-family:'Playfair Display',serif;font-size:22px;}h2{font-family:'Playfair Display',serif;font-size:16px;margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid #4CAF82;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid #4CAF82;margin-bottom:24px;}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;}
    .field{background:#f7f9f7;border-radius:8px;padding:8px 12px;}
    .field-label{font-size:9px;color:#94a3b8;font-weight:700;letter-spacing:0.06em;margin-bottom:2px;}
    .field-val{font-size:12px;font-weight:700;color:#1a1a2e;}
    .note{margin-bottom:16px;padding:12px 16px;background:#f7f9f7;border-radius:10px;border-left:4px solid #5B8DEF;page-break-inside:avoid;}
    .note-head{display:flex;justify-content:space-between;margin-bottom:8px;}
    .soap-label{font-size:9px;font-weight:700;color:#94a3b8;letter-spacing:0.06em;margin-bottom:2px;}
    .soap-val{font-size:12px;color:#1a1a2e;margin-bottom:8px;}
    .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:700;}
    table{border-collapse:collapse;width:100%;margin-bottom:16px;}th{padding:8px 12px;font-size:9px;color:#94a3b8;font-weight:700;background:#f7f9f7;text-align:left;}td{padding:8px 12px;font-size:11px;border-bottom:1px solid #e8eef0;}
    .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e8eef0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;}
    @media print{body{padding:20px;}@page{margin:1.5cm;size:A4;}}
  </style></head><body>
  <div class="header">
    <div><div style="display:flex;align-items:center;gap:10px;margin-bottom:4px"><span style="font-size:24px">⚕️</span><h1>MediCore AI — EHR</h1></div>
    <div style="font-size:12px;color:#94a3b8">Electronic Health Record · Confidential</div></div>
    <div style="text-align:right;font-size:11px;color:#94a3b8"><div>Generated: ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div><div>Patient ID: ${patient.id}</div></div>
  </div>
  <h2>👤 Patient Information</h2>
  <div class="grid2">
    ${[["Name",patient.name],["Age / DOB",`${age} yrs · ${patient.dob||"—"}`],["Gender",patient.gender||"—"],["Blood Group",patient.blood||"—"],["Primary Doctor",patient.doctor||"—"],["Status",patient.status||"—"]].map(([k,v])=>`<div class="field"><div class="field-label">${k}</div><div class="field-val">${v}</div></div>`).join("")}
  </div>
  ${visitNotes.length?`<h2>🏥 Visit Notes (${visitNotes.length})</h2>
  ${visitNotes.map(n=>`<div class="note">
    <div class="note-head"><strong>${n.visit_type} Visit — ${n.visit_date}</strong><span>${n.doctor_name}</span></div>
    <div class="soap-label">SUBJECTIVE</div><div class="soap-val">${n.subjective||"—"}</div>
    <div class="soap-label">OBJECTIVE</div><div class="soap-val">${n.objective||"—"}</div>
    <div class="soap-label">ASSESSMENT</div><div class="soap-val">${n.assessment||"—"}</div>
    <div class="soap-label">PLAN</div><div class="soap-val">${n.plan||"—"}</div>
    ${n.follow_up?`<div class="soap-label">FOLLOW-UP</div><div class="soap-val">${n.follow_up}</div>`:""}
  </div>`).join("")}`:""}
  ${treatmentPlans.length?`<h2>📋 Treatment Plans (${treatmentPlans.length})</h2>
  ${treatmentPlans.map(p=>`<div class="note" style="border-left-color:#4CAF82">
    <div class="note-head"><strong>${p.title}</strong><span class="badge" style="background:#e8f5ee;color:#4CAF82">${p.status}</span></div>
    <div><strong>Diagnosis:</strong> ${p.diagnosis} · <strong>Period:</strong> ${p.start_date} → ${p.end_date||"ongoing"}</div>
    ${p.goals?.length?`<div style="margin-top:6px"><strong>Goals:</strong> ${p.goals.map(g=>`${g.achieved?"✅":"◻️"} ${g.text}`).join("; ")}</div>`:""}
    ${p.medications?.length?`<div style="margin-top:4px"><strong>Medications:</strong> ${p.medications.map(m=>`${m.drug} ${m.dosage}`).join(", ")}</div>`:""}
    ${p.interventions?.length?`<div style="margin-top:4px"><strong>Interventions:</strong> ${p.interventions.join(", ")}</div>`:""}
  </div>`).join("")}`:""}
  ${vitalsHistory.length?`<h2>❤️ Vitals History</h2>
  <table><thead><tr><th>Date</th><th>BP</th><th>HR</th><th>O₂ %</th><th>Temp °C</th><th>Weight kg</th><th>Glucose</th></tr></thead><tbody>
  ${vitalsHistory.map(v=>`<tr><td>${v.date}</td><td>${v.bp||"—"}</td><td>${v.hr||"—"}</td><td>${v.o2||"—"}</td><td>${v.temp||"—"}</td><td>${v.weight||"—"}</td><td>${v.glucose||"—"}</td></tr>`).join("")}
  </tbody></table>`:""}
  ${labResults.length?`<h2>🧪 Lab Results</h2>
  <table><thead><tr><th>Test</th><th>Result</th><th>Reference</th><th>Status</th><th>Date</th></tr></thead><tbody>
  ${labResults.map(l=>`<tr><td><strong>${l.test}</strong></td><td>${l.result}</td><td>${l.reference||"—"}</td><td>${l.status}</td><td>${l.lab_date||l.date||"—"}</td></tr>`).join("")}
  </tbody></table>`:""}
  <div class="footer"><span>MediCore AI · EHR · ${patient.name} · ${patient.id}</span><span>Generated ${new Date().toISOString()}</span></div>
  <script>window.onload=()=>{window.print();}</script>
  </body></html>`);
  win.document.close();
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EHR COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function EHRPage() {
  const { user } = useAuth();
  const [selPatient,    setSelPatient]    = useState(null);
  const [tab,           setTab]           = useState("timeline");
  const [visitNotes,    setVisitNotes]    = useState([]);
  const [treatmentPlans,setTreatmentPlans]= useState([]);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [labResults,    setLabResults]    = useState([]);
  const [timeline,      setTimeline]      = useState([]);
  const [searchQ,       setSearchQ]       = useState("");
  const [showVisitModal,setShowVisitModal]= useState(false);
  const [showLabModal,  setShowLabModal]  = useState(false);
  const [showVitalsModal,setShowVitalsModal]=useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editNote,      setEditNote]      = useState(null);
  const [successMsg,    setSuccessMsg]    = useState("");

  // Forms
  const [visitForm, setVisitForm] = useState({ visit_type:"Outpatient", visit_date:"", subjective:"", objective:"", assessment:"", plan:"", follow_up:"", severity:"normal" });
  const [labForm,   setLabForm]   = useState({ test:"", result:"", reference:"", unit:"", status:"normal", notes:"", lab_date:"", ordered_by:"" });
  const [vitalsForm,setVitalsForm]= useState({ bp:"", hr:"", temp:"", weight:"", height:"", o2:"", glucose:"", notes:"" });
  const [planForm,  setPlanForm]  = useState({ title:"", diagnosis:"", start_date:"", end_date:"", follow_up_freq:"Monthly", goals:"", medications:"", interventions:"", notes:"" });

  const flash = msg => { setSuccessMsg(msg); setTimeout(()=>setSuccessMsg(""),3500); };

  // Load patient EHR data
  useEffect(() => {
    if (!selPatient) return;
    setVisitNotes([]);
    setTreatmentPlans([]);
    setVitalsHistory([]);
    setLabResults([]);
    setTimeline([]);

    // Load from real API
    import("../services/api").then(({ ehrService }) => {
      ehrService?.getVisitNotes?.(selPatient.id).then(d => setVisitNotes(d || [])).catch(()=>{});
      ehrService?.getTreatmentPlans?.(selPatient.id).then(d => setTreatmentPlans(d || [])).catch(()=>{});
      ehrService?.getVitalsHistory?.(selPatient.id).then(d => setVitalsHistory(d || [])).catch(()=>{});
      ehrService?.getLabResults?.(selPatient.id).then(d => setLabResults(d || [])).catch(()=>{});
      ehrService?.getTimeline?.(selPatient.id).then(d => setTimeline(d || [])).catch(()=>{});
    });
  }, [selPatient]);

  const buildTimeline = () => {};  // Timeline is now loaded from backend

  const handleAddVisitNote = () => {
    const note = {
      id:"vn"+Date.now(), patient_id:selPatient.id, patient_name:selPatient.name,
      ...visitForm, visit_date:visitForm.visit_date||new Date().toISOString().slice(0,10),
      doctor_name:user?.name||"Dr. Unknown", doctor_role:user?.role,
    };
    setVisitNotes(p=>[note,...p]);
    setTimeline(p=>[{type:"visit",date:note.visit_date,title:`${note.visit_type} Visit`,desc:note.assessment||note.subjective,doctor:note.doctor_name,severity:note.severity},...p]);
    import("../services/api").then(({ehrService})=>ehrService?.createVisitNote?.(note).catch(()=>{}));
    setShowVisitModal(false);
    setVisitForm({visit_type:"Outpatient",visit_date:"",subjective:"",objective:"",assessment:"",plan:"",follow_up:"",severity:"normal"});
    flash("✅ Visit note saved");
  };

  const handleAddLab = () => {
    const lab = {
      id:"lb"+Date.now(), patient_id:selPatient.id, patient_name:selPatient.name,
      ...labForm, lab_date:labForm.lab_date||new Date().toISOString().slice(0,10),
      entered_by:user?.name,
    };
    setLabResults(p=>[lab,...p]);
    setTimeline(p=>[{type:"lab",date:lab.lab_date,title:lab.test,desc:lab.result,doctor:user?.name,severity:lab.status},...p]);
    import("../services/api").then(({ehrService})=>ehrService?.addLabResult?.(lab).catch(()=>{}));
    setShowLabModal(false);
    setLabForm({test:"",result:"",reference:"",unit:"",status:"normal",notes:"",lab_date:"",ordered_by:""});
    flash("✅ Lab result added");
  };

  const handleAddVitals = () => {
    const vitals = {
      ...vitalsForm, date:new Date().toISOString().slice(0,10),
      recorded_by:user?.name, patient_id:selPatient.id,
    };
    setVitalsHistory(p=>[vitals,...p]);
    import("../services/api").then(({ehrService})=>ehrService?.recordVitals?.({...vitals,patient_name:selPatient.name}).catch(()=>{}));
    setShowVitalsModal(false);
    setVitalsForm({bp:"",hr:"",temp:"",weight:"",height:"",o2:"",glucose:"",notes:""});
    flash("✅ Vitals recorded");
  };

  const handleAddPlan = () => {
    const plan = {
      id:"tp"+Date.now(), patient_id:selPatient.id, patient_name:selPatient.name,
      ...planForm, start_date:planForm.start_date||new Date().toISOString().slice(0,10),
      created_by_name:user?.name, status:"active",
      goals:planForm.goals?planForm.goals.split("\n").filter(Boolean).map(g=>({text:g,achieved:false})):[],
      medications:planForm.medications?planForm.medications.split("\n").filter(Boolean).map(m=>({drug:m,dosage:"",duration:""})):[],
      interventions:planForm.interventions?planForm.interventions.split(",").map(s=>s.trim()).filter(Boolean):[],
    };
    setTreatmentPlans(p=>[plan,...p]);
    import("../services/api").then(({ehrService})=>ehrService?.createTreatmentPlan?.(plan).catch(()=>{}));
    setShowPlanModal(false);
    setPlanForm({title:"",diagnosis:"",start_date:"",end_date:"",follow_up_freq:"Monthly",goals:"",medications:"",interventions:"",notes:""});
    flash("✅ Treatment plan created");
  };

  const [allPatients, setAllPatients] = useState([]);

  useEffect(() => {
    patientService.list().then(d => setAllPatients(d || [])).catch(() => {});
  }, []);

  const filteredPatients = allPatients.filter(p =>
    !searchQ || p.name.toLowerCase().includes(searchQ.toLowerCase()) || (p.doctor||"").toLowerCase().includes(searchQ.toLowerCase())
  );

  // ── If no patient selected, show list ─────────────────────────────────────
  if (!selPatient) {
    return (
      <div className="page-enter">
        <PageHeader title="📋 Electronic Health Records" subtitle="SOAP notes · Treatment plans · Vitals history · Lab results · Timeline" />
        <div style={{position:"relative",marginBottom:20}}>
          <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)"}}>🔍</span>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search patient…"
            style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:14,padding:"12px 14px 12px 38px",fontSize:14,outline:"none",boxShadow:C.shadow}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
          {filteredPatients.map(p=>{
            const initials = p.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "?";
            return (
              <Card key={p.id} hover onClick={()=>{setSelPatient({...p, avatar: initials, color: p.status==="critical"?C.coral:C.accent});setTab("timeline");}} style={{cursor:"pointer",borderLeft:`4px solid ${p.status==="critical"?C.coral:C.accent}`}}>
                <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:14}}>
                  <Avatar initials={initials} color={p.status==="critical"?C.coral:C.accent} size={52}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:800,color:C.text}}>{p.name}</div>
                    <div style={{fontSize:12,color:C.textLight,marginTop:2}}>👨‍⚕️ {p.doctor || "Unassigned"}</div>
                    <Badge label={p.status} color={p.status==="critical"?C.coral:C.accent}/>
                  </div>
                </div>
                <div style={{fontSize:11,color:C.textLight}}>Click to view full EHR</div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Patient EHR detail ────────────────────────────────────────────────────
  const vitalsChartData = [...vitalsHistory].reverse().map(v=>({
    date:v.date?.slice(5), bp_sys:parseInt((v.bp||"0/0").split("/")[0])||null,
    hr:parseInt(v.hr)||null, o2:parseFloat(v.o2)||null,
  }));

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
        <button onClick={()=>{setSelPatient(null);setTimeline([]);}} style={{width:40,height:40,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:18,color:C.textMed}}>←</button>
        <div style={{flex:1}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.text}}>{selPatient.name}</h2>
          <p style={{fontSize:12,color:C.textLight,marginTop:2}}>EHR · {selPatient.doctor} · Blood {selPatient.blood}</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="ghost"    onClick={()=>setShowVisitModal(true)}  style={{borderRadius:10,fontSize:12}}>🏥 Visit Note</Btn>
          <Btn variant="ghost"    onClick={()=>setShowLabModal(true)}    style={{borderRadius:10,fontSize:12}}>🧪 Lab Result</Btn>
          <Btn variant="ghost"    onClick={()=>setShowVitalsModal(true)} style={{borderRadius:10,fontSize:12}}>❤️ Vitals</Btn>
          <Btn variant="ghost"    onClick={()=>setShowPlanModal(true)}   style={{borderRadius:10,fontSize:12}}>📋 Tx Plan</Btn>
          <Btn variant="blue"     onClick={()=>printEHR(selPatient,visitNotes,treatmentPlans,vitalsHistory,labResults)} style={{borderRadius:10,fontSize:12}}>🖨️ Print EHR</Btn>
        </div>
      </div>

      {successMsg && <div style={{background:C.accentLight,border:`1px solid ${C.accent}44`,borderRadius:12,padding:"10px 16px",marginBottom:14,fontSize:13,color:C.accent,fontWeight:700}}>{successMsg}</div>}

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        <StatCard label="Visit Notes"      value={visitNotes.length}     icon="🏥" color={C.blue}  bg={C.blueLight}  />
        <StatCard label="Treatment Plans"  value={treatmentPlans.length} icon="📋" color={C.accent} bg={C.accentLight} />
        <StatCard label="Lab Results"      value={labResults.length}     icon="🧪" color={C.amber} bg={C.amberLight}  />
        <StatCard label="Vitals Entries"   value={vitalsHistory.length}  icon="❤️" color={C.coral} bg={C.coralLight}  />
      </div>

      <TabBar tabs={[["timeline","⏱️ Timeline"],["visit_notes","🏥 Visit Notes"],["treatment","📋 Treatment Plans"],["vitals","❤️ Vitals"],["labs","🧪 Lab Results"]]} active={tab} onChange={setTab}/>

      {/* ── TIMELINE ── */}
      {tab==="timeline" && (
        <div style={{display:"flex",flexDirection:"column",gap:0,position:"relative"}}>
          <div style={{position:"absolute",left:27,top:0,bottom:0,width:2,background:C.border,zIndex:0}}/>
          {timeline.map((e,i)=>{
            const col=TYPE_COL[e.type]||C.textLight;
            const sev=SEV_COL[e.severity]||C.textLight;
            return (
              <div key={i} style={{display:"flex",gap:16,alignItems:"flex-start",marginBottom:16,position:"relative",zIndex:1}}>
                {/* Timeline dot */}
                <div style={{width:56,display:"flex",justifyContent:"center",flexShrink:0,paddingTop:4}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:col+"20",border:`2px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,background:"#fff",boxShadow:`0 0 0 4px #fff`}}>
                    {TYPE_ICON[e.type]||"📋"}
                  </div>
                </div>
                <Card style={{flex:1,borderLeft:`3px solid ${e.severity==="critical"?C.coral:e.severity==="abnormal"?C.amber:col}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:e.desc?8:0}}>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:12,fontWeight:800,color:C.text}}>{e.title}</span>
                      <span style={{fontSize:10,background:col+"18",color:col,padding:"2px 8px",borderRadius:20,fontWeight:700}}>{e.type}</span>
                      {e.severity&&e.severity!=="normal"&&<Badge label={e.severity} color={sev}/>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.textMed}}>{e.date}</div>
                      {e.doctor&&<div style={{fontSize:10,color:C.textLight}}>by {e.doctor}</div>}
                    </div>
                  </div>
                  {e.desc&&<div style={{fontSize:12,color:C.textMed,lineHeight:1.6}}>{e.desc}</div>}
                  {e.status&&<div style={{marginTop:6}}><Badge label={e.status} color={STATUS_COL[e.status]||C.textLight}/></div>}
                </Card>
              </div>
            );
          })}
          {timeline.length===0&&<Card style={{textAlign:"center",padding:48}}><div style={{fontSize:36,marginBottom:10}}>⏱️</div><div style={{fontSize:14,color:C.textLight}}>No EHR events yet — add a visit note to get started</div></Card>}
        </div>
      )}

      {/* ── VISIT NOTES ── */}
      {tab==="visit_notes" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <Btn onClick={()=>setShowVisitModal(true)} style={{borderRadius:12}}>+ New Visit Note</Btn>
          </div>
          {visitNotes.length===0
            ? <Card style={{textAlign:"center",padding:48}}><div style={{fontSize:36,marginBottom:10}}>🏥</div><div style={{fontSize:14,color:C.textLight}}>No visit notes yet</div><Btn onClick={()=>setShowVisitModal(true)} style={{marginTop:14,borderRadius:10}}>Add First Note</Btn></Card>
            : visitNotes.map(n=>(
              <Card key={n.id} style={{borderLeft:`4px solid ${SEV_COL[n.severity]||C.blue}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:14,fontWeight:800,color:C.text}}>{n.visit_type} Visit</span>
                      <Badge label={n.severity} color={SEV_COL[n.severity]||C.blue}/>
                    </div>
                    <div style={{fontSize:12,color:C.textLight}}>👨‍⚕️ {n.doctor_name} · 📅 {n.visit_date}</div>
                  </div>
                  <button onClick={()=>setEditNote(n)} style={{background:C.blueLight,border:"none",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:12,color:C.blue,fontWeight:700}}>✏️ Edit</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {[["S — Subjective",n.subjective],["O — Objective",n.objective],["A — Assessment",n.assessment],["P — Plan",n.plan]].map(([label,val])=>
                    val ? (
                      <div key={label} style={{background:C.cardAlt,borderRadius:10,padding:"10px 14px"}}>
                        <div style={{fontSize:10,color:C.textLight,fontWeight:700,letterSpacing:"0.05em",marginBottom:4}}>{label}</div>
                        <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>{val}</div>
                      </div>
                    ) : null
                  )}
                </div>
                {n.follow_up&&(
                  <div style={{marginTop:10,padding:"8px 12px",background:"#fffbeb",borderRadius:8,fontSize:12,color:"#92600a"}}>
                    📅 Follow-up: {n.follow_up}
                  </div>
                )}
              </Card>
            ))
          }
        </div>
      )}

      {/* ── TREATMENT PLANS ── */}
      {tab==="treatment" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <Btn onClick={()=>setShowPlanModal(true)} style={{borderRadius:12}}>+ New Treatment Plan</Btn>
          </div>
          {treatmentPlans.length===0
            ? <Card style={{textAlign:"center",padding:48}}><div style={{fontSize:36,marginBottom:10}}>📋</div><div style={{fontSize:14,color:C.textLight}}>No treatment plans yet</div><Btn onClick={()=>setShowPlanModal(true)} style={{marginTop:14,borderRadius:10}}>Create Plan</Btn></Card>
            : treatmentPlans.map(p=>(
              <Card key={p.id} style={{borderLeft:`4px solid ${p.status==="active"?C.accent:p.status==="completed"?"#8b5cf6":C.textLight}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:4}}>{p.title}</div>
                    <div style={{fontSize:13,color:C.textMed}}>🔬 {p.diagnosis}</div>
                    <div style={{fontSize:12,color:C.textLight,marginTop:2}}>📅 {p.start_date} → {p.end_date||"Ongoing"} · 🔄 {p.follow_up_freq}</div>
                  </div>
                  <Badge label={p.status} color={p.status==="active"?C.accent:p.status==="completed"?"#8b5cf6":C.textLight}/>
                </div>

                {p.goals?.length>0&&(
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:11,color:C.textLight,fontWeight:700,letterSpacing:"0.05em",marginBottom:6}}>GOALS</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {p.goals.map((g,i)=>(
                        <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 12px",background:g.achieved?C.accentLight:C.cardAlt,borderRadius:8}}>
                          <span style={{fontSize:16}}>{g.achieved?"✅":"◻️"}</span>
                          <span style={{fontSize:13,color:g.achieved?C.accent:C.text,textDecoration:g.achieved?"line-through":"none"}}>{g.text}</span>
                          {g.target_date&&<span style={{fontSize:11,color:C.textLight,marginLeft:"auto"}}>by {g.target_date}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {p.medications?.length>0&&(
                    <div style={{background:C.cardAlt,borderRadius:10,padding:"10px 14px"}}>
                      <div style={{fontSize:10,color:C.textLight,fontWeight:700,letterSpacing:"0.05em",marginBottom:6}}>💊 MEDICATIONS</div>
                      {p.medications.map((m,i)=>(
                        <div key={i} style={{fontSize:12,color:C.text,marginBottom:3}}>{m.drug} — {m.dosage}</div>
                      ))}
                    </div>
                  )}
                  {p.interventions?.length>0&&(
                    <div style={{background:C.cardAlt,borderRadius:10,padding:"10px 14px"}}>
                      <div style={{fontSize:10,color:C.textLight,fontWeight:700,letterSpacing:"0.05em",marginBottom:6}}>⚕️ INTERVENTIONS</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        {p.interventions.map((iv,i)=>(
                          <span key={i} style={{background:C.blueLight,color:C.blue,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{iv}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {p.notes&&<div style={{marginTop:10,padding:"8px 12px",background:C.amberLight,borderRadius:8,fontSize:12,color:"#92600a"}}>📝 {p.notes}</div>}
              </Card>
            ))
          }
        </div>
      )}

      {/* ── VITALS HISTORY ── */}
      {tab==="vitals" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <Btn onClick={()=>setShowVitalsModal(true)} style={{borderRadius:12}}>+ Record Vitals</Btn>
          </div>

          {vitalsChartData.length>1&&(
            <Card>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:20}}>Vitals Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={vitalsChartData} margin={{top:5,right:10,left:-10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="date" tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/>
                  <ReferenceLine y={120} stroke={C.coral} strokeDasharray="3 3" label={{value:"120",fill:C.coral,fontSize:10}}/>
                  <Line type="monotone" dataKey="bp_sys" name="BP Systolic" stroke={C.coral}  strokeWidth={2} dot={{r:4}} connectNulls/>
                  <Line type="monotone" dataKey="hr"     name="Heart Rate"  stroke={C.blue}   strokeWidth={2} dot={{r:4}} connectNulls/>
                  <Line type="monotone" dataKey="o2"     name="O₂ Sat %"   stroke={C.accent} strokeWidth={2} dot={{r:4}} connectNulls/>
                </LineChart>
              </ResponsiveContainer>
              <div style={{display:"flex",gap:20,justifyContent:"center",marginTop:10}}>
                {[[C.coral,"BP Systolic"],[C.blue,"Heart Rate"],[C.accent,"O₂ Sat %"]].map(([c,l])=>(
                  <div key={l} style={{display:"flex",gap:6,alignItems:"center",fontSize:11,color:C.textMed}}>
                    <div style={{width:20,height:3,background:c,borderRadius:2}}/>{l}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table>
                <thead>
                  <tr style={{background:C.cardAlt}}>
                    {["Date","Blood Pressure","Heart Rate","O₂ Sat","Temperature","Weight","Glucose","Recorded By"].map(h=>(
                      <th key={h} style={{padding:"12px 14px",fontSize:11,color:C.textLight,fontWeight:700,textAlign:"left",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vitalsHistory.map((v,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"#fff":C.cardAlt}}>
                      <td style={{padding:"12px 14px",fontSize:12,fontWeight:700,color:C.text,whiteSpace:"nowrap"}}>{v.date||v.recorded_at?.slice(0,10)}</td>
                      <td style={{padding:"12px 14px",fontSize:13,fontWeight:700,color:parseInt(v.bp)>130?C.coral:C.accent}}>{v.bp||"—"}</td>
                      <td style={{padding:"12px 14px",fontSize:13,color:C.text}}>{v.hr||"—"} <span style={{fontSize:10,color:C.textLight}}>bpm</span></td>
                      <td style={{padding:"12px 14px",fontSize:13,fontWeight:700,color:parseFloat(v.o2)<95?C.coral:C.accent}}>{v.o2||"—"}<span style={{fontSize:10,color:C.textLight}}>%</span></td>
                      <td style={{padding:"12px 14px",fontSize:13,color:C.text}}>{v.temp||"—"} <span style={{fontSize:10,color:C.textLight}}>°C</span></td>
                      <td style={{padding:"12px 14px",fontSize:13,color:C.text}}>{v.weight||"—"} <span style={{fontSize:10,color:C.textLight}}>kg</span></td>
                      <td style={{padding:"12px 14px",fontSize:13,color:C.text}}>{v.glucose||"—"}</td>
                      <td style={{padding:"12px 14px",fontSize:11,color:C.textLight}}>{v.recorded_by||"—"}</td>
                    </tr>
                  ))}
                  {vitalsHistory.length===0&&<tr><td colSpan={8} style={{padding:"40px",textAlign:"center",color:C.textLight}}>No vitals recorded yet</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── LAB RESULTS ── */}
      {tab==="labs" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <Btn onClick={()=>setShowLabModal(true)} style={{borderRadius:12}}>+ Add Lab Result</Btn>
          </div>
          {labResults.length===0
            ? <Card style={{textAlign:"center",padding:48}}><div style={{fontSize:36,marginBottom:10}}>🧪</div><div style={{fontSize:14,color:C.textLight}}>No lab results yet</div><Btn onClick={()=>setShowLabModal(true)} style={{marginTop:14,borderRadius:10}}>Add Result</Btn></Card>
            : labResults.map((l,i)=>(
              <Card key={i} hover style={{borderLeft:`4px solid ${SEV_COL[l.status]||C.textLight}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",gap:14,alignItems:"center"}}>
                    <div style={{width:44,height:44,borderRadius:14,background:(SEV_COL[l.status]||C.blue)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🧪</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:C.text}}>{l.test}</div>
                      <div style={{fontSize:13,color:C.textMed,marginTop:3}}>{l.result} {l.unit&&<span style={{fontSize:11,color:C.textLight}}>{l.unit}</span>}</div>
                      {l.reference&&<div style={{fontSize:11,color:C.textLight,marginTop:2}}>Ref: {l.reference}</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <Badge label={l.status} color={SEV_COL[l.status]||C.textLight}/>
                    <span style={{fontSize:12,color:C.textLight,whiteSpace:"nowrap"}}>{l.lab_date||l.date}</span>
                  </div>
                </div>
                {l.notes&&<div style={{marginTop:8,fontSize:12,color:C.textLight,padding:"6px 10px",background:C.cardAlt,borderRadius:8}}>📝 {l.notes}</div>}
              </Card>
            ))
          }
        </div>
      )}

      {/* ══ MODALS ══ */}

      {/* Visit Note Modal */}
      {showVisitModal&&(
        <Modal title="🏥 New Visit Note (SOAP)" onClose={()=>setShowVisitModal(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <SelectF label="VISIT TYPE" value={visitForm.visit_type} onChange={v=>setVisitForm(f=>({...f,visit_type:v}))} options={VISIT_TYPES}/>
            <Input label="VISIT DATE" value={visitForm.visit_date} onChange={v=>setVisitForm(f=>({...f,visit_date:v}))} placeholder="YYYY-MM-DD" icon="📅"/>
          </div>
          <TextArea label="S — SUBJECTIVE (Patient complaints)" value={visitForm.subjective} onChange={v=>setVisitForm(f=>({...f,subjective:v}))} placeholder="Chief complaint, history of present illness, ROS…" rows={3}/>
          <TextArea label="O — OBJECTIVE (Examination findings)" value={visitForm.objective} onChange={v=>setVisitForm(f=>({...f,objective:v}))} placeholder="Vitals, physical exam, investigations…" rows={3}/>
          <TextArea label="A — ASSESSMENT (Diagnosis)" value={visitForm.assessment} onChange={v=>setVisitForm(f=>({...f,assessment:v}))} placeholder="Clinical impression, differential diagnoses…" rows={2} highlight/>
          <TextArea label="P — PLAN (Treatment)" value={visitForm.plan} onChange={v=>setVisitForm(f=>({...f,plan:v}))} placeholder="Medications, referrals, investigations ordered…" rows={3}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <SelectF label="FOLLOW-UP" value={visitForm.follow_up} onChange={v=>setVisitForm(f=>({...f,follow_up:v}))} options={["","1 week","2 weeks","1 month","3 months","6 months","PRN"]}/>
            <SelectF label="SEVERITY" value={visitForm.severity} onChange={v=>setVisitForm(f=>({...f,severity:v}))} options={["normal","abnormal","critical"]}/>
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <Btn onClick={handleAddVisitNote} style={{flex:1,borderRadius:12,padding:"12px"}}>Save Visit Note</Btn>
            <Btn variant="outline" onClick={()=>setShowVisitModal(false)} style={{borderRadius:12,padding:"12px 18px"}}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* Lab Result Modal */}
      {showLabModal&&(
        <Modal title="🧪 Add Lab Result" onClose={()=>setShowLabModal(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>TEST NAME</label>
              <select value={labForm.test} onChange={e=>setLabForm(f=>({...f,test:e.target.value}))}
                style={{background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"11px 14px",fontSize:14,outline:"none"}}>
                <option value="">Select test…</option>
                {LAB_TESTS.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <Input label="RESULT" value={labForm.result} onChange={v=>setLabForm(f=>({...f,result:v}))} placeholder="e.g. 11.2 k/μL" icon="📊"/>
            <Input label="REFERENCE RANGE" value={labForm.reference} onChange={v=>setLabForm(f=>({...f,reference:v}))} placeholder="e.g. 4.5–11.0" icon="📏"/>
            <Input label="UNIT" value={labForm.unit} onChange={v=>setLabForm(f=>({...f,unit:v}))} placeholder="e.g. k/μL" icon="📐"/>
            <SelectF label="STATUS" value={labForm.status} onChange={v=>setLabForm(f=>({...f,status:v}))} options={["normal","abnormal","critical"]}/>
            <Input label="DATE" value={labForm.lab_date} onChange={v=>setLabForm(f=>({...f,lab_date:v}))} placeholder="YYYY-MM-DD" icon="📅"/>
          </div>
          <TextArea label="NOTES" value={labForm.notes} onChange={v=>setLabForm(f=>({...f,notes:v}))} placeholder="Clinical context, actions taken…" rows={2}/>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <Btn onClick={handleAddLab} disabled={!labForm.test||!labForm.result} style={{flex:1,borderRadius:12,padding:"12px"}}>Add Lab Result</Btn>
            <Btn variant="outline" onClick={()=>setShowLabModal(false)} style={{borderRadius:12,padding:"12px 18px"}}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* Vitals Modal */}
      {showVitalsModal&&(
        <Modal title="❤️ Record Vitals" onClose={()=>setShowVitalsModal(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Input label="BLOOD PRESSURE (mmHg)" value={vitalsForm.bp}     onChange={v=>setVitalsForm(f=>({...f,bp:v}))}     placeholder="e.g. 120/80" icon="❤️"/>
            <Input label="HEART RATE (bpm)"       value={vitalsForm.hr}     onChange={v=>setVitalsForm(f=>({...f,hr:v}))}     placeholder="e.g. 72"     icon="💓"/>
            <Input label="TEMPERATURE (°C)"        value={vitalsForm.temp}   onChange={v=>setVitalsForm(f=>({...f,temp:v}))}   placeholder="e.g. 36.6"   icon="🌡️"/>
            <Input label="O₂ SATURATION (%)"       value={vitalsForm.o2}     onChange={v=>setVitalsForm(f=>({...f,o2:v}))}     placeholder="e.g. 98"     icon="🩸"/>
            <Input label="WEIGHT (kg)"             value={vitalsForm.weight} onChange={v=>setVitalsForm(f=>({...f,weight:v}))} placeholder="e.g. 70"     icon="⚖️"/>
            <Input label="HEIGHT (cm)"             value={vitalsForm.height} onChange={v=>setVitalsForm(f=>({...f,height:v}))} placeholder="e.g. 175"    icon="📏"/>
            <Input label="BLOOD GLUCOSE (mmol/L)"  value={vitalsForm.glucose}onChange={v=>setVitalsForm(f=>({...f,glucose:v}))}placeholder="e.g. 5.4"    icon="🩺"/>
          </div>
          <TextArea label="NOTES" value={vitalsForm.notes} onChange={v=>setVitalsForm(f=>({...f,notes:v}))} placeholder="Clinical context…" rows={2}/>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <Btn onClick={handleAddVitals} style={{flex:1,borderRadius:12,padding:"12px"}}>Record Vitals</Btn>
            <Btn variant="outline" onClick={()=>setShowVitalsModal(false)} style={{borderRadius:12,padding:"12px 18px"}}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* Treatment Plan Modal */}
      {showPlanModal&&(
        <Modal title="📋 New Treatment Plan" onClose={()=>setShowPlanModal(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Input label="PLAN TITLE"  value={planForm.title}     onChange={v=>setPlanForm(f=>({...f,title:v}))}     placeholder="e.g. Hypertension Management" icon="📋"/>
            <Input label="DIAGNOSIS"   value={planForm.diagnosis} onChange={v=>setPlanForm(f=>({...f,diagnosis:v}))} placeholder="Primary diagnosis" icon="🔬"/>
            <Input label="START DATE"  value={planForm.start_date}onChange={v=>setPlanForm(f=>({...f,start_date:v}))}placeholder="YYYY-MM-DD" icon="📅"/>
            <Input label="END DATE"    value={planForm.end_date}  onChange={v=>setPlanForm(f=>({...f,end_date:v}))}  placeholder="YYYY-MM-DD (optional)" icon="📅"/>
            <SelectF label="FOLLOW-UP FREQUENCY" value={planForm.follow_up_freq} onChange={v=>setPlanForm(f=>({...f,follow_up_freq:v}))} options={FOLLOW_UPS}/>
          </div>
          <TextArea label="GOALS (one per line)" value={planForm.goals} onChange={v=>setPlanForm(f=>({...f,goals:v}))} placeholder={"Maintain BP <130/80\nReduce sodium intake\nExercise 30min daily"} rows={3}/>
          <TextArea label="MEDICATIONS (one per line)" value={planForm.medications} onChange={v=>setPlanForm(f=>({...f,medications:v}))} placeholder={"Lisinopril 10mg 1×/day\nAmlodipine 5mg 1×/day"} rows={3}/>
          <Input label="INTERVENTIONS (comma-separated)" value={planForm.interventions} onChange={v=>setPlanForm(f=>({...f,interventions:v}))} placeholder="Physiotherapy, Dietary counselling" icon="⚕️"/>
          <TextArea label="NOTES" value={planForm.notes} onChange={v=>setPlanForm(f=>({...f,notes:v}))} placeholder="Additional clinical notes…" rows={2}/>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <Btn onClick={handleAddPlan} disabled={!planForm.title||!planForm.diagnosis} style={{flex:1,borderRadius:12,padding:"12px"}}>Create Treatment Plan</Btn>
            <Btn variant="outline" onClick={()=>setShowPlanModal(false)} style={{borderRadius:12,padding:"12px 18px"}}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Shared modal wrapper ───────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,backdropFilter:"blur(4px)"}}>
      <Card style={{width:"100%",maxWidth:600,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.textLight}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>{children}</div>
      </Card>
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows=3, highlight }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>{label}</label>
      <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{background:highlight?C.accentLight+"66":C.cardAlt,border:`1.5px solid ${highlight?C.accent:C.border}`,borderRadius:12,padding:"12px 14px",fontSize:13,color:C.text,outline:"none",resize:"vertical",fontFamily:"Nunito,sans-serif",lineHeight:1.6}}/>
    </div>
  );
}

function SelectF({ label, value, onChange, options }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"11px 14px",fontSize:13,color:C.text,outline:"none",cursor:"pointer"}}>
        {options.map(o=><option key={o} value={o}>{o||"—"}</option>)}
      </select>
    </div>
  );
}

const STATUS_COL={confirmed:C.accent,pending:C.blue,cancelled:C.coral,completed:"#8b5cf6"};
