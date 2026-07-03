import { useState, useEffect } from "react";
import { C } from "../constants";
import { Card, Btn, Badge, Avatar, Input, PageHeader, StatCard, TabBar } from "../components/UI";
import { patientService, appointmentService } from "../services/api";

const BLOOD_GROUPS  = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const GENDERS       = ["Male","Female","Other","Prefer not to say"];
const MARITAL       = ["Single","Married","Divorced","Widowed","Other"];
const RELATIONSHIPS = ["Spouse","Parent","Child","Sibling","Friend","Guardian","Other"];
const STATUS_COL    = { active:C.accent, critical:C.coral, inactive:C.textLight, recovered:"#8b5cf6" };
const SEV_COL       = { normal:C.accent, abnormal:C.amber, critical:C.coral };
const APPT_COL      = { confirmed:C.accent, pending:C.blue, cancelled:C.coral, completed:"#8b5cf6" };
const HIST_ICON     = { Diagnosis:"🔬", Lab:"🧪", Visit:"🏥", Surgery:"⚕️", Emergency:"🚨", Vaccination:"💉" };
const COLORS        = [C.coral, C.blue, C.accent, C.amber, "#8b5cf6"];

const PATIENTS = [
  {
    id:"p1", name:"Sarah Johnson", dob:"1985-03-12", gender:"Female", blood:"A+",
    phone:"+44 7700 900123", email:"sarah.j@email.com", address:"14 Baker St, London",
    occupation:"Teacher", nationality:"British", marital_status:"Married",
    avatar:"SJ", color:C.coral, doctor:"Dr. Lida Gutierrez", status:"active",
    allergies:["Penicillin","Shellfish"], conditions:["Hypertension","Asthma"],
    insurance:"BlueCross", insurance_number:"BC-48291", insurance_expiry:"2027-12-31",
    joined:"2024-01-15",
    emergency_contacts:[
      { id:"ec1", name:"Michael Johnson", relationship:"Spouse",  phone:"+44 7700 911001", email:"m.johnson@email.com", address:"14 Baker St, London", is_primary:true },
      { id:"ec2", name:"Helen Johnson",   relationship:"Parent",  phone:"+44 7700 922002", email:"",                    address:"22 Park Ave, London", is_primary:false },
    ],
    vitals:{ bp:"128/82", hr:74, temp:36.8, weight:68, height:165, o2:98 },
    history:[
      { date:"2026-05-20", type:"Diagnosis", desc:"Pneumonia confirmed via X-ray. Prescribed Amoxicillin 500mg.", doctor:"Dr. Lida Gutierrez", severity:"abnormal" },
      { date:"2026-04-10", type:"Lab",       desc:"CBC: WBC slightly elevated at 11.2 k/μL. Monitor for 4 weeks.", doctor:"Dr. Lida Gutierrez", severity:"normal" },
      { date:"2026-02-28", type:"Visit",     desc:"Routine check-up. BP slightly elevated, lifestyle changes recommended.", doctor:"Dr. Lida Gutierrez", severity:"normal" },
      { date:"2025-11-15", type:"Surgery",   desc:"Appendectomy — successful, no complications.", doctor:"Dr. Alma Reed", severity:"critical" },
    ],
    prescriptions:[
      { drug:"Amoxicillin 500mg",  dosage:"3×/day", duration:"7 days",  status:"active",  date:"2026-05-20" },
      { drug:"Salbutamol inhaler", dosage:"PRN",     duration:"ongoing", status:"active",  date:"2026-02-28" },
      { drug:"Lisinopril 10mg",    dosage:"1×/day",  duration:"ongoing", status:"active",  date:"2025-09-01" },
    ],
    labResults:[
      { test:"CBC",           date:"2026-04-10", result:"WBC: 11.2 k/μL (↑)", status:"abnormal" },
      { test:"Blood Glucose", date:"2026-03-15", result:"5.4 mmol/L",          status:"normal"   },
      { test:"Chest X-Ray",   date:"2026-05-20", result:"Pneumonia detected",  status:"abnormal" },
      { test:"ECG",           date:"2025-12-01", result:"Normal sinus rhythm", status:"normal"   },
    ],
  },
  {
    id:"p2", name:"James Lee", dob:"1972-07-25", gender:"Male", blood:"O+",
    phone:"+44 7700 900456", email:"james.lee@email.com", address:"82 Oxford Rd, Manchester",
    occupation:"Engineer", nationality:"British", marital_status:"Married",
    avatar:"JL", color:C.blue, doctor:"Dr. Christina Frazier", status:"critical",
    allergies:["Latex"], conditions:["Brain Tumor","Hypertension","Type 2 Diabetes"],
    insurance:"AXA Health", insurance_number:"AX-99123", insurance_expiry:"2026-06-30",
    joined:"2025-06-20",
    emergency_contacts:[
      { id:"ec3", name:"Linda Lee", relationship:"Spouse", phone:"+44 7700 933003", email:"l.lee@email.com", address:"82 Oxford Rd, Manchester", is_primary:true },
    ],
    vitals:{ bp:"145/92", hr:88, temp:37.2, weight:80, height:178, o2:96 },
    history:[
      { date:"2026-05-19", type:"Diagnosis", desc:"MRI confirms Grade 2 Glioma — treatment plan initiated.", doctor:"Dr. Christina Frazier", severity:"critical" },
      { date:"2026-04-30", type:"Lab",       desc:"MRI scan showed suspicious mass in left temporal lobe.", doctor:"Dr. Christina Frazier", severity:"critical" },
      { date:"2026-03-12", type:"Visit",     desc:"Headaches and vision disturbances. Referred for MRI.", doctor:"Dr. Christina Frazier", severity:"abnormal" },
    ],
    prescriptions:[
      { drug:"Dexamethasone 4mg", dosage:"2×/day", duration:"ongoing", status:"active", date:"2026-05-19" },
      { drug:"Metformin 850mg",   dosage:"2×/day", duration:"ongoing", status:"active", date:"2025-07-01" },
    ],
    labResults:[
      { test:"MRI Brain",     date:"2026-05-19", result:"Grade 2 Glioma confirmed", status:"critical" },
      { test:"Blood Glucose", date:"2026-05-01", result:"8.9 mmol/L (↑)",           status:"abnormal" },
      { test:"CBC",           date:"2026-04-15", result:"Within normal range",       status:"normal"   },
    ],
  },
  {
    id:"p3", name:"Maria Garcia", dob:"1990-11-03", gender:"Female", blood:"B+",
    phone:"+49 151 23456789", email:"m.garcia@email.de", address:"Hauptstr. 7, Berlin",
    occupation:"Designer", nationality:"German", marital_status:"Single",
    avatar:"MG", color:C.accent, doctor:"Dr. Mayme Gomez", status:"active",
    allergies:[], conditions:["Mild Asthma"],
    insurance:"AOK", insurance_number:"AOK-33421", insurance_expiry:"2027-01-01",
    joined:"2025-03-10", emergency_contacts:[],
    vitals:{ bp:"118/76", hr:68, temp:36.6, weight:62, height:162, o2:99 },
    history:[
      { date:"2026-05-18", type:"Diagnosis", desc:"CT scan normal. Asthma well-controlled.", doctor:"Dr. Mayme Gomez", severity:"normal" },
    ],
    prescriptions:[{ drug:"Salbutamol inhaler", dosage:"PRN", duration:"ongoing", status:"active", date:"2025-03-15" }],
    labResults:[
      { test:"CT Chest",   date:"2026-05-18", result:"No abnormality detected", status:"normal" },
      { test:"Spirometry", date:"2026-01-20", result:"FEV1 88% predicted",      status:"normal" },
    ],
  },
  {
    id:"p4", name:"Tom Chen", dob:"1965-05-18", gender:"Male", blood:"AB-",
    phone:"+1 212 555 7890", email:"tom.chen@email.com", address:"305 5th Ave, New York",
    occupation:"Accountant", nationality:"American", marital_status:"Divorced",
    avatar:"TC", color:C.amber, doctor:"Dr. Mayme Gomez", status:"critical",
    allergies:["Sulfa drugs","Aspirin"], conditions:["Tuberculosis","COPD"],
    insurance:"UnitedHealth", insurance_number:"UH-77812", insurance_expiry:"2026-12-31",
    joined:"2024-09-05",
    emergency_contacts:[
      { id:"ec4", name:"Amy Chen",  relationship:"Child",   phone:"+1 212 555 8901", email:"amy.chen@email.com", address:"305 5th Ave, NY", is_primary:true },
      { id:"ec5", name:"Bob Chen",  relationship:"Sibling", phone:"+1 212 555 8902", email:"",                   address:"100 Main St, NJ",  is_primary:false },
    ],
    vitals:{ bp:"138/88", hr:92, temp:38.1, weight:72, height:172, o2:94 },
    history:[
      { date:"2026-05-17", type:"Diagnosis", desc:"X-ray confirms pulmonary tuberculosis. Isolation initiated.", doctor:"Dr. Mayme Gomez", severity:"critical" },
      { date:"2026-04-22", type:"Visit",     desc:"Persistent cough with night sweats. Referred for X-ray.",    doctor:"Dr. Mayme Gomez", severity:"abnormal" },
    ],
    prescriptions:[
      { drug:"Isoniazid 300mg",  dosage:"1×/day", duration:"6 months", status:"active", date:"2026-05-17" },
      { drug:"Rifampicin 600mg", dosage:"1×/day", duration:"6 months", status:"active", date:"2026-05-17" },
    ],
    labResults:[
      { test:"Chest X-Ray", date:"2026-05-17", result:"Pulmonary TB confirmed",    status:"critical" },
      { test:"Sputum AFB",  date:"2026-05-17", result:"Mycobacterium TB positive", status:"critical" },
    ],
  },
];

// ── Seed appointments keyed by patient name ────────────────────────────────
const SEED_APPTS = {
  "Sarah Johnson": [
    { id:"sa1", date:"2026-05-20", time:"10:00", doctor:"Dr. Lida Gutierrez", type:"Surgery Consult", status:"confirmed", notes:"Pre-op assessment" },
    { id:"sa2", date:"2026-04-10", time:"14:00", doctor:"Dr. Lida Gutierrez", type:"Lab Review",      status:"completed", notes:"CBC results discussion" },
    { id:"sa3", date:"2026-02-28", time:"09:00", doctor:"Dr. Lida Gutierrez", type:"Check-up",        status:"completed", notes:"Routine annual check" },
  ],
  "James Lee": [
    { id:"jl1", date:"2026-05-19", time:"11:00", doctor:"Dr. Christina Frazier", type:"MRI Review",   status:"confirmed", notes:"Glioma treatment plan" },
    { id:"jl2", date:"2026-04-30", time:"09:30", doctor:"Dr. Christina Frazier", type:"Consultation", status:"completed", notes:"Discuss MRI findings" },
  ],
  "Tom Chen": [
    { id:"tc1", date:"2026-05-17", time:"08:00", doctor:"Dr. Mayme Gomez", type:"Emergency",    status:"confirmed", notes:"TB isolation protocol" },
    { id:"tc2", date:"2026-04-22", time:"10:00", doctor:"Dr. Mayme Gomez", type:"Consultation", status:"completed", notes:"Cough evaluation" },
  ],
  "Maria Garcia": [
    { id:"mg1", date:"2026-05-18", time:"15:00", doctor:"Dr. Mayme Gomez", type:"Diagnosis", status:"completed", notes:"CT scan review" },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// PATIENT LIST PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function PatientPage() {
  const [patients,      setPatients]      = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [tab,           setTab]           = useState("overview");
  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState("all");
  const [filterGender,  setFilterGender]  = useState("all");
  const [sortBy,        setSortBy]        = useState("name");
  const [showAdd,       setShowAdd]       = useState(false);
  const [newPat,        setNewPat]        = useState({
    name:"", dob:"", gender:"Male", blood:"A+", phone:"", email:"", address:"",
    conditions:"", allergies:"", occupation:"", nationality:"", marital_status:"Single",
    insurance:"", insurance_number:"", insurance_expiry:"",
  });
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    patientService.list().then(data => setPatients(data || [])).catch(() => {});
  }, []);

  const filtered = patients
    .filter(p =>
      (filterStatus === "all" || p.status === filterStatus) &&
      (filterGender === "all" || p.gender === filterGender) &&
      (!search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.doctor?.toLowerCase().includes(search.toLowerCase()) ||
        p.conditions?.some(c => c.toLowerCase().includes(search.toLowerCase())) ||
        p.phone?.includes(search) ||
        p.email?.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "name")   return a.name.localeCompare(b.name);
      if (sortBy === "joined") return (b.joined||"").localeCompare(a.joined||"");
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return 0;
    });

  const stats = {
    total:    patients.length,
    active:   patients.filter(p => p.status === "active").length,
    critical: patients.filter(p => p.status === "critical").length,
    today:    patients.filter(p => p.joined === new Date().toISOString().slice(0,10)).length,
  };

  const handleAdd = () => {
    if (!newPat.name) return;
    const initials = newPat.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const p = {
      id: "p" + Date.now(),
      ...newPat,
      avatar: initials,
      color: COLORS[patients.length % COLORS.length],
      status: "active",
      allergies:  newPat.allergies  ? newPat.allergies.split(",").map(s => s.trim()).filter(Boolean)  : [],
      conditions: newPat.conditions ? newPat.conditions.split(",").map(s => s.trim()).filter(Boolean) : [],
      joined: new Date().toISOString().slice(0, 10),
      emergency_contacts: [],
      vitals: { bp:"—", hr:"—", temp:"—", weight:"—", height:"—", o2:"—" },
      history: [], prescriptions: [], labResults: [],
    };

    patientService.create({
      ...p,
      allergies:  p.allergies,
      conditions: p.conditions,
    }).then(saved => {
      setPatients(prev => [saved || p, ...prev]);
      setSuccessMsg(`Patient ${p.name} registered successfully`);
      setTimeout(() => setSuccessMsg(""), 3500);
    }).catch(() => {
      setPatients(prev => [p, ...prev]);
    });

    setShowAdd(false);
    setNewPat({ name:"", dob:"", gender:"Male", blood:"A+", phone:"", email:"", address:"", conditions:"", allergies:"", occupation:"", nationality:"", marital_status:"Single", insurance:"", insurance_number:"", insurance_expiry:"" });
    setSelected(p);
    setTab("overview");
  };

  if (selected) return (
    <PatientDetail
      patient={selected}
      tab={tab} setTab={setTab}
      onBack={() => { setSelected(null); setTab("overview"); }}
      onUpdate={(updated) => {
        setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
        setSelected(updated);
      }}
    />
  );

  return (
    <div className="page-enter">
      <PageHeader title="👥 Patient Records" subtitle="Comprehensive patient profiles, history & emergency contacts" />

      {successMsg && (
        <div style={{background:C.accentLight,border:`1px solid ${C.accent}44`,borderRadius:14,padding:"12px 18px",marginBottom:16,fontSize:13,color:C.accent,fontWeight:700}}>
          ✅ {successMsg}
        </div>
      )}

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        <StatCard label="Total Patients" value={stats.total}    icon="👥" color={C.blue}  bg={C.blueLight}  />
        <StatCard label="Active"         value={stats.active}   icon="✅" color={C.accent} bg={C.accentLight} />
        <StatCard label="Critical"       value={stats.critical} icon="🚨" color={C.coral} bg={C.coralLight}  />
        <StatCard label="New Today"      value={stats.today}    icon="🆕" color={C.amber} bg={C.amberLight}  />
      </div>

      {/* Search + filters */}
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",flex:1,minWidth:240}}>
          <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)"}}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, doctor, condition, phone…"
            style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:14,padding:"11px 14px 11px 38px",fontSize:13,outline:"none",boxShadow:C.shadow}} />
        </div>

        {/* Status filter */}
        {["all","active","critical","inactive"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{padding:"9px 16px",borderRadius:20,border:`1.5px solid ${filterStatus===s?(STATUS_COL[s]||C.blue):C.border}`,background:filterStatus===s?(STATUS_COL[s]||C.blue):"#fff",color:filterStatus===s?"#fff":C.textMed,fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}

        {/* Gender filter */}
        <select value={filterGender} onChange={e => setFilterGender(e.target.value)}
          style={{padding:"10px 14px",borderRadius:20,border:`1.5px solid ${C.border}`,background:"#fff",fontSize:12,fontWeight:600,color:C.textMed,outline:"none",cursor:"pointer"}}>
          <option value="all">All Genders</option>
          {GENDERS.map(g => <option key={g}>{g}</option>)}
        </select>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{padding:"10px 14px",borderRadius:20,border:`1.5px solid ${C.border}`,background:"#fff",fontSize:12,fontWeight:600,color:C.textMed,outline:"none",cursor:"pointer"}}>
          <option value="name">Sort: Name</option>
          <option value="joined">Sort: Newest</option>
          <option value="status">Sort: Status</option>
        </select>

        <Btn onClick={() => setShowAdd(true)} style={{borderRadius:12}}>+ Add Patient</Btn>
      </div>

      <div style={{fontSize:12,color:C.textLight,marginBottom:14,fontWeight:600}}>{filtered.length} patient{filtered.length!==1?"s":""}</div>

      {/* Patient grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
        {filtered.map(p => {
          const age = p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : "—";
          return (
            <Card key={p.id} hover onClick={() => { setSelected(p); setTab("overview"); }}
              style={{cursor:"pointer",borderLeft:`4px solid ${STATUS_COL[p.status]||C.border}`}}>
              <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:14}}>
                <Avatar initials={p.avatar||p.name?.slice(0,2).toUpperCase()} color={p.color||C.blue} size={52} />
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:800,color:C.text}}>{p.name}</div>
                      <div style={{fontSize:12,color:C.textLight,marginTop:2}}>
                        {age} yrs · {p.gender} · Blood {p.blood}
                      </div>
                    </div>
                    <Badge label={p.status} color={STATUS_COL[p.status]||C.textLight} />
                  </div>
                  <div style={{fontSize:12,color:C.textMed,marginTop:5}}>👨‍⚕️ {p.doctor}</div>
                  {p.emergency_contacts?.length > 0 && (
                    <div style={{fontSize:11,color:C.accent,marginTop:3}}>
                      🆘 {p.emergency_contacts.length} emergency contact{p.emergency_contacts.length!==1?"s":""}
                    </div>
                  )}
                </div>
              </div>

              {p.conditions?.length > 0 && (
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
                  {p.conditions.slice(0,3).map(c => (
                    <span key={c} style={{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:20,padding:"3px 9px",fontSize:11,color:C.textMed,fontWeight:600}}>{c}</span>
                  ))}
                  {p.conditions.length > 3 && <span style={{fontSize:11,color:C.textLight}}>+{p.conditions.length-3} more</span>}
                </div>
              )}

              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {[["❤️ BP",p.vitals?.bp||"—"],["💓 HR",(p.vitals?.hr||"—")+" bpm"],["🩸 O₂",(p.vitals?.o2||"—")+"%"]].map(([k,v]) => (
                  <div key={k} style={{background:C.cardAlt,borderRadius:10,padding:"7px 10px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.textLight}}>{k}</div>
                    <div style={{fontSize:12,fontWeight:700,color:C.text,marginTop:2}}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{fontSize:11,color:C.textLight,marginTop:10,display:"flex",justifyContent:"space-between"}}>
                <span>Since {p.joined}</span>
                <span>{p.history?.length||0} records · {p.prescriptions?.filter(r=>r.status==="active").length||0} active Rx</span>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div style={{gridColumn:"1/-1"}}>
            <Card style={{textAlign:"center",padding:48}}>
              <div style={{fontSize:40,marginBottom:12}}>🔍</div>
              <div style={{fontSize:14,color:C.textLight}}>No patients match your search</div>
            </Card>
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {showAdd && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,backdropFilter:"blur(4px)"}}>
          <Card style={{width:"100%",maxWidth:600,maxHeight:"92vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text}}>👥 Register New Patient</h3>
              <button onClick={() => setShowAdd(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.textLight}}>✕</button>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {/* Personal */}
              <SectionLabel>Personal Information</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Input label="FULL NAME" value={newPat.name} onChange={v=>setNewPat(f=>({...f,name:v}))} placeholder="Patient full name" icon="👤" />
                <Input label="DATE OF BIRTH" value={newPat.dob} onChange={v=>setNewPat(f=>({...f,dob:v}))} placeholder="YYYY-MM-DD" icon="🎂" />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <SelectField label="GENDER" value={newPat.gender} onChange={v=>setNewPat(f=>({...f,gender:v}))} options={GENDERS} />
                <SelectField label="BLOOD GROUP" value={newPat.blood} onChange={v=>setNewPat(f=>({...f,blood:v}))} options={BLOOD_GROUPS} />
                <SelectField label="MARITAL STATUS" value={newPat.marital_status} onChange={v=>setNewPat(f=>({...f,marital_status:v}))} options={MARITAL} />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Input label="OCCUPATION" value={newPat.occupation} onChange={v=>setNewPat(f=>({...f,occupation:v}))} placeholder="e.g. Teacher" icon="💼" />
                <Input label="NATIONALITY" value={newPat.nationality} onChange={v=>setNewPat(f=>({...f,nationality:v}))} placeholder="e.g. British" icon="🌍" />
              </div>

              {/* Contact */}
              <SectionLabel>Contact Details</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Input label="PHONE" value={newPat.phone} onChange={v=>setNewPat(f=>({...f,phone:v}))} placeholder="+44 7700 900000" icon="📞" />
                <Input label="EMAIL" value={newPat.email} onChange={v=>setNewPat(f=>({...f,email:v}))} placeholder="patient@email.com" icon="✉️" />
              </div>
              <Input label="ADDRESS" value={newPat.address} onChange={v=>setNewPat(f=>({...f,address:v}))} placeholder="Street, City, Postcode" icon="📍" />

              {/* Insurance */}
              <SectionLabel>Insurance Details</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <Input label="PROVIDER" value={newPat.insurance} onChange={v=>setNewPat(f=>({...f,insurance:v}))} placeholder="e.g. BlueCross" icon="🏦" />
                <Input label="POLICY NUMBER" value={newPat.insurance_number} onChange={v=>setNewPat(f=>({...f,insurance_number:v}))} placeholder="BC-00000" icon="🪪" />
                <Input label="EXPIRY DATE" value={newPat.insurance_expiry} onChange={v=>setNewPat(f=>({...f,insurance_expiry:v}))} placeholder="YYYY-MM-DD" icon="📅" />
              </div>

              {/* Medical */}
              <SectionLabel>Medical Information</SectionLabel>
              <Input label="CONDITIONS (comma-separated)" value={newPat.conditions} onChange={v=>setNewPat(f=>({...f,conditions:v}))} placeholder="e.g. Hypertension, Asthma" icon="🏥" />
              <Input label="ALLERGIES (comma-separated)"  value={newPat.allergies}  onChange={v=>setNewPat(f=>({...f,allergies:v}))}  placeholder="e.g. Penicillin, Latex" icon="⚠️" />

              <div style={{display:"flex",gap:10,marginTop:6}}>
                <Btn onClick={handleAdd} disabled={!newPat.name} style={{flex:1,borderRadius:12,padding:"12px"}}>Register Patient</Btn>
                <Btn variant="outline" onClick={() => setShowAdd(false)} style={{borderRadius:12,padding:"12px 20px"}}>Cancel</Btn>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PATIENT DETAIL
// ══════════════════════════════════════════════════════════════════════════════
function PatientDetail({ patient: p, tab, setTab, onBack, onUpdate }) {
  const age    = p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : "—";
  const RX_COL = { active:C.accent, expired:C.textLight, discontinued:C.coral };

  const [appointments,    setAppointments]    = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState(p.emergency_contacts || []);
  const [showAddEC,       setShowAddEC]       = useState(false);
  const [showEditVitals,  setShowEditVitals]  = useState(false);
  const [showStatusChange,setShowStatusChange]= useState(false);
  const [ecForm, setEcForm] = useState({ name:"", relationship:"Spouse", phone:"", email:"", address:"", is_primary:false });
  const [vitalsForm, setVitalsForm] = useState({ ...p.vitals });
  const [successMsg, setSuccessMsg] = useState("");

  // Load real appointments from backend
  useEffect(() => {
    if (p.id) {
      patientService.getAppointments?.(p.id)
        .then(data => setAppointments(data || []))
        .catch(() => {});
    }
  }, [p.id]);

  const flash = msg => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000); };

  const handleAddEC = () => {
    if (!ecForm.name || !ecForm.phone) return;
    const contact = { ...ecForm, id: "ec" + Date.now() };
    setEmergencyContacts(prev => [...prev, contact]);
    patientService.addEmergencyContact?.(p.id, contact).catch(() => {});
    onUpdate({ ...p, emergency_contacts: [...emergencyContacts, contact] });
    setShowAddEC(false);
    setEcForm({ name:"", relationship:"Spouse", phone:"", email:"", address:"", is_primary:false });
    flash("Emergency contact added");
  };

  const handleDeleteEC = (id) => {
    const updated = emergencyContacts.filter(ec => ec.id !== id);
    setEmergencyContacts(updated);
    patientService.deleteEmergencyContact?.(p.id, id).catch(() => {});
    onUpdate({ ...p, emergency_contacts: updated });
    flash("Contact removed");
  };

  const handleSaveVitals = () => {
    patientService.updateVitals?.(p.id, vitalsForm).catch(() => {});
    onUpdate({ ...p, vitals: vitalsForm });
    setShowEditVitals(false);
    flash("Vitals updated");
  };

  const handleStatusChange = (newStatus) => {
    patientService.updateStatus?.(p.id, newStatus).catch(() => {});
    onUpdate({ ...p, status: newStatus });
    setShowStatusChange(false);
    flash(`Status changed to ${newStatus}`);
  };

  const primaryEC   = emergencyContacts.find(ec => ec.is_primary) || emergencyContacts[0];
  const hasInsurance = p.insurance || p.insurance_provider || p.insurance_number;

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
        <button onClick={onBack} style={{width:40,height:40,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:18,color:C.textMed}}>←</button>
        <div style={{flex:1}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:C.text}}>{p.name}</h2>
          <p style={{fontSize:13,color:C.textLight,marginTop:2}}>ID: {(p.id||"").toUpperCase()} · Joined {p.joined}</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <Badge label={p.status} color={STATUS_COL[p.status]||C.textLight} />
          <button onClick={() => setShowStatusChange(true)}
            style={{fontSize:11,color:C.textLight,background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>
            Change
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{background:C.accentLight,border:`1px solid ${C.accent}44`,borderRadius:12,padding:"10px 16px",marginBottom:14,fontSize:13,color:C.accent,fontWeight:700}}>
          ✅ {successMsg}
        </div>
      )}

      {/* Banner */}
      <Card style={{marginBottom:20,background:`linear-gradient(135deg,${p.color||C.blue}12 0%,#fff 55%)`}}>
        <div style={{display:"flex",gap:20,alignItems:"flex-start",flexWrap:"wrap"}}>
          <Avatar initials={p.avatar||p.name?.slice(0,2).toUpperCase()} color={p.color||C.blue} size={72} />
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:800,color:C.text}}>{p.name}</div>
            <div style={{fontSize:13,color:C.textMed,marginTop:4}}>
              {age} years · {p.gender} · {p.blood} · {p.nationality||"—"} · {p.marital_status||"—"}
            </div>
            {p.occupation && <div style={{fontSize:12,color:C.textLight,marginTop:2}}>💼 {p.occupation}</div>}
            <div style={{display:"flex",gap:14,marginTop:8,flexWrap:"wrap"}}>
              {p.phone   && <span style={{fontSize:12,color:C.textLight}}>📞 {p.phone}</span>}
              {p.email   && <span style={{fontSize:12,color:C.textLight}}>✉️ {p.email}</span>}
              {p.address && <span style={{fontSize:12,color:C.textLight}}>📍 {p.address}</span>}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:C.textLight}}>Primary Doctor</div>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginTop:2}}>{p.doctor}</div>
            {hasInsurance && (
              <>
                <div style={{fontSize:11,color:C.textLight,marginTop:8}}>Insurance</div>
                <div style={{fontSize:12,fontWeight:700,color:C.accent,marginTop:2}}>{p.insurance||p.insurance_provider}</div>
                {p.insurance_number && <div style={{fontSize:11,color:C.textLight}}>{p.insurance_number}</div>}
                {p.insurance_expiry && <div style={{fontSize:11,color:p.insurance_expiry<new Date().toISOString().slice(0,10)?C.coral:C.textLight}}>Exp: {p.insurance_expiry}</div>}
              </>
            )}
            {/* Primary emergency contact quick view */}
            {primaryEC && (
              <div style={{marginTop:10,padding:"8px 12px",background:C.coralLight,borderRadius:10,textAlign:"right"}}>
                <div style={{fontSize:10,color:C.coral,fontWeight:700}}>🆘 EMERGENCY</div>
                <div style={{fontSize:12,fontWeight:700,color:C.text,marginTop:2}}>{primaryEC.name}</div>
                <div style={{fontSize:11,color:C.textLight}}>{primaryEC.relationship} · {primaryEC.phone}</div>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div style={{display:"flex",gap:6,marginTop:14,flexWrap:"wrap"}}>
          {p.conditions?.map(c => <span key={c} style={{background:C.coralLight,border:`1px solid ${C.coral}33`,borderRadius:20,padding:"4px 12px",fontSize:12,color:C.coral,fontWeight:700}}>🏥 {c}</span>)}
          {p.allergies?.map(a  => <span key={a} style={{background:C.amberLight,border:`1px solid ${C.amber}33`,borderRadius:20,padding:"4px 12px",fontSize:12,color:C.amber,fontWeight:700}}>⚠️ {a}</span>)}
        </div>
      </Card>

      {/* Tabs — now includes Emergency & Appointments */}
      <TabBar
        tabs={[
          ["overview",     "📊 Overview"],
          ["emergency",    "🆘 Emergency"],
          ["appointments", "📅 Appointments"],
          ["history",      "📋 History"],
          ["prescriptions","💊 Prescriptions"],
          ["labs",         "🧪 Lab Results"],
        ]}
        active={tab} onChange={setTab}
      />

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text}}>📊 Vitals</h3>
              <button onClick={() => setShowEditVitals(true)}
                style={{fontSize:12,color:C.blue,background:C.blueLight,border:"none",borderRadius:8,padding:"4px 12px",cursor:"pointer",fontWeight:700}}>
                ✏️ Update
              </button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                ["❤️ Blood Pressure", p.vitals?.bp||"—"],
                ["💓 Heart Rate",     (p.vitals?.hr||"—")+" bpm"],
                ["🌡️ Temperature",   (p.vitals?.temp||"—")+" °C"],
                ["⚖️ Weight",         (p.vitals?.weight||"—")+" kg"],
                ["📏 Height",         (p.vitals?.height||"—")+" cm"],
                ["🩸 O₂ Saturation",  (p.vitals?.o2||"—")+"%"],
              ].map(([label, val]) => (
                <div key={label} style={{background:C.cardAlt,borderRadius:12,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:C.textLight,marginBottom:4}}>{label}</div>
                  <div style={{fontSize:15,fontWeight:800,color:C.text}}>{val}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:16}}>🕐 Recent Activity</h3>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {(p.history||[]).slice(0,4).map((h,i) => (
                <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",paddingBottom:i<3?10:0,borderBottom:i<3?`1px solid ${C.border}`:"none"}}>
                  <div style={{width:32,height:32,borderRadius:10,background:(SEV_COL[h.severity]||C.blue)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
                    {HIST_ICON[h.type]||"📋"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.text}}>{h.type}</div>
                    <div style={{fontSize:11,color:C.textLight,marginTop:2,lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.desc}</div>
                    <div style={{fontSize:10,color:C.textLight,marginTop:2}}>{h.date}</div>
                  </div>
                  <Badge label={h.severity} color={SEV_COL[h.severity]||C.blue} />
                </div>
              ))}
              {!p.history?.length && <div style={{fontSize:13,color:C.textLight,textAlign:"center",padding:20}}>No history yet</div>}
            </div>
          </Card>

          <Card style={{gridColumn:"1/-1"}}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:16}}>💊 Active Medications</h3>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              {(p.prescriptions||[]).filter(rx=>rx.status==="active").map((rx,i) => (
                <div key={i} style={{background:C.accentLight,border:`1px solid ${C.accent}33`,borderRadius:14,padding:"12px 16px",minWidth:180}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.text}}>{rx.drug}</div>
                  <div style={{fontSize:12,color:C.textMed,marginTop:2}}>{rx.dosage}</div>
                  <div style={{fontSize:11,color:C.textLight,marginTop:4}}>{rx.duration} · since {rx.date}</div>
                </div>
              ))}
              {!(p.prescriptions||[]).filter(rx=>rx.status==="active").length && (
                <div style={{fontSize:13,color:C.textLight}}>No active medications</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── Emergency Contacts ── */}
      {tab === "emergency" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>Emergency Contacts</div>
              <div style={{fontSize:12,color:C.textLight,marginTop:2}}>People to contact in case of emergency</div>
            </div>
            <Btn onClick={() => setShowAddEC(true)} style={{borderRadius:12,padding:"9px 18px"}}>+ Add Contact</Btn>
          </div>

          {emergencyContacts.length === 0 ? (
            <Card style={{textAlign:"center",padding:48}}>
              <div style={{fontSize:40,marginBottom:12}}>🆘</div>
              <div style={{fontSize:14,color:C.textLight,marginBottom:16}}>No emergency contacts on file</div>
              <Btn onClick={() => setShowAddEC(true)} style={{borderRadius:12}}>Add Emergency Contact</Btn>
            </Card>
          ) : (
            emergencyContacts.map((ec, i) => (
              <Card key={ec.id||i} hover style={{borderLeft:`4px solid ${ec.is_primary?C.coral:C.border}`}}>
                <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                  <div style={{width:52,height:52,borderRadius:16,background:ec.is_primary?C.coralLight:C.cardAlt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                    {ec.is_primary?"🆘":"👤"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:6}}>
                      <span style={{fontSize:15,fontWeight:800,color:C.text}}>{ec.name}</span>
                      <Badge label={ec.relationship} color={ec.is_primary?C.coral:C.blue} />
                      {ec.is_primary && <Badge label="PRIMARY" color={C.coral} />}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
                      {ec.phone   && <div style={{display:"flex",gap:6,alignItems:"center",fontSize:13,color:C.text}}><span>📞</span>{ec.phone}</div>}
                      {ec.email   && <div style={{display:"flex",gap:6,alignItems:"center",fontSize:13,color:C.text}}><span>✉️</span>{ec.email}</div>}
                      {ec.address && <div style={{display:"flex",gap:6,alignItems:"center",fontSize:13,color:C.textLight}}><span>📍</span>{ec.address}</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <a href={`tel:${ec.phone}`}
                      style={{width:36,height:36,borderRadius:10,background:C.accentLight,border:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,textDecoration:"none",cursor:"pointer"}}>
                      📞
                    </a>
                    <button onClick={() => handleDeleteEC(ec.id)}
                      style={{width:36,height:36,borderRadius:10,background:C.coralLight,border:"none",cursor:"pointer",fontSize:16}}>
                      🗑️
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}

          {/* Add EC Modal */}
          {showAddEC && (
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,backdropFilter:"blur(4px)"}}>
              <Card style={{width:"100%",maxWidth:480}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
                  <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text}}>🆘 Add Emergency Contact</h3>
                  <button onClick={() => setShowAddEC(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.textLight}}>✕</button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <Input label="FULL NAME" value={ecForm.name} onChange={v=>setEcForm(f=>({...f,name:v}))} placeholder="Contact full name" icon="👤" />
                  <SelectField label="RELATIONSHIP" value={ecForm.relationship} onChange={v=>setEcForm(f=>({...f,relationship:v}))} options={RELATIONSHIPS} />
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <Input label="PHONE" value={ecForm.phone} onChange={v=>setEcForm(f=>({...f,phone:v}))} placeholder="+1 234 567 8900" icon="📞" />
                    <Input label="EMAIL" value={ecForm.email} onChange={v=>setEcForm(f=>({...f,email:v}))} placeholder="contact@email.com" icon="✉️" />
                  </div>
                  <Input label="ADDRESS" value={ecForm.address} onChange={v=>setEcForm(f=>({...f,address:v}))} placeholder="Street, City" icon="📍" />
                  <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13,color:C.text,fontWeight:600}}>
                    <input type="checkbox" checked={ecForm.is_primary} onChange={e=>setEcForm(f=>({...f,is_primary:e.target.checked}))}
                      style={{width:16,height:16,accentColor:C.coral}} />
                    Set as primary emergency contact
                  </label>
                  <div style={{display:"flex",gap:10,marginTop:4}}>
                    <Btn onClick={handleAddEC} disabled={!ecForm.name||!ecForm.phone} style={{flex:1,borderRadius:12,padding:"12px"}}>Add Contact</Btn>
                    <Btn variant="outline" onClick={() => setShowAddEC(false)} style={{borderRadius:12,padding:"12px 18px"}}>Cancel</Btn>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── Appointment History ── */}
      {tab === "appointments" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {appointments.length === 0 ? (
            <Card style={{textAlign:"center",padding:48}}>
              <div style={{fontSize:40,marginBottom:12}}>📅</div>
              <div style={{fontSize:14,color:C.textLight}}>No appointment history for this patient</div>
            </Card>
          ) : (
            <>
              {/* Summary row */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:8}}>
                {[
                  ["Total",    appointments.length,                                          C.blue,  C.blueLight],
                  ["Confirmed",appointments.filter(a=>a.status==="confirmed").length,        C.accent,C.accentLight],
                  ["Completed",appointments.filter(a=>a.status==="completed").length,        "#8b5cf6","#f3f0ff"],
                  ["Cancelled",appointments.filter(a=>a.status==="cancelled").length,        C.coral, C.coralLight],
                ].map(([label,val,col,bg]) => (
                  <div key={label} style={{background:bg,borderRadius:14,padding:"12px 16px",border:`1px solid ${col}22`}}>
                    <div style={{fontSize:10,color:col,fontWeight:700,letterSpacing:"0.05em"}}>{label.toUpperCase()}</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:col,marginTop:4}}>{val}</div>
                  </div>
                ))}
              </div>

              {appointments.map((a, i) => (
                <Card key={a.id||i} hover style={{borderLeft:`4px solid ${APPT_COL[a.status]||C.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:C.text}}>{a.type}</div>
                      <div style={{fontSize:12,color:C.textMed,marginTop:2}}>👨‍⚕️ {a.doctor}</div>
                    </div>
                    <Badge label={a.status} color={APPT_COL[a.status]||C.blue} />
                  </div>
                  <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                    <span style={{background:C.cardAlt,borderRadius:8,padding:"4px 10px",fontSize:12,color:C.textMed,fontWeight:600}}>📅 {a.date}</span>
                    <span style={{background:C.cardAlt,borderRadius:8,padding:"4px 10px",fontSize:12,color:C.textMed}}>🕐 {a.time}</span>
                    {a.notes && <span style={{background:C.cardAlt,borderRadius:8,padding:"4px 10px",fontSize:12,color:C.textLight}}>📝 {a.notes}</span>}
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Medical History ── */}
      {tab === "history" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {(p.history||[]).length === 0 ? (
            <Card style={{textAlign:"center",padding:48}}><div style={{fontSize:40,marginBottom:12}}>📋</div><div style={{fontSize:14,color:C.textLight}}>No history records</div></Card>
          ) : (p.history||[]).map((h,i) => (
            <Card key={i} hover style={{borderLeft:`4px solid ${SEV_COL[h.severity]||C.textLight}`}}>
              <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                <div style={{width:44,height:44,borderRadius:14,background:(SEV_COL[h.severity]||C.blue)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                  {HIST_ICON[h.type]||"📋"}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div>
                      <span style={{fontSize:14,fontWeight:800,color:C.text}}>{h.type}</span>
                      <span style={{fontSize:12,color:C.textLight,marginLeft:10}}>by {h.doctor}</span>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <Badge label={h.severity} color={SEV_COL[h.severity]||C.textLight} />
                      <span style={{fontSize:12,color:C.textLight}}>{h.date}</span>
                    </div>
                  </div>
                  <div style={{fontSize:13,color:C.textMed,lineHeight:1.6}}>{h.desc}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Prescriptions ── */}
      {tab === "prescriptions" && (
        <Card style={{padding:0,overflow:"hidden"}}>
          {!(p.prescriptions||[]).length ? (
            <div style={{textAlign:"center",padding:48}}>
              <div style={{fontSize:40,marginBottom:12}}>💊</div>
              <div style={{fontSize:14,color:C.textLight}}>No prescriptions on record</div>
            </div>
          ) : (
            <div style={{overflowX:"auto"}}>
              <table>
                <thead>
                  <tr style={{background:C.cardAlt}}>
                    {["Drug","Dosage","Duration","Prescribed","Status"].map(h => (
                      <th key={h} style={{padding:"12px 18px",fontSize:11,color:C.textLight,fontWeight:700,textAlign:"left",letterSpacing:"0.05em"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(p.prescriptions||[]).map((rx, i) => (
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"#fff":C.cardAlt}}>
                      <td style={{padding:"14px 18px",fontSize:13,fontWeight:700,color:C.text}}>{rx.drug}</td>
                      <td style={{padding:"14px 18px",fontSize:13,color:C.textMed}}>{rx.dosage}</td>
                      <td style={{padding:"14px 18px",fontSize:12,color:C.textMed}}>{rx.duration}</td>
                      <td style={{padding:"14px 18px",fontSize:12,color:C.textLight}}>{rx.date}</td>
                      <td style={{padding:"14px 18px"}}><Badge label={rx.status} color={RX_COL[rx.status]||C.blue} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Lab Results ── */}
      {tab === "labs" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {!(p.labResults||[]).length ? (
            <Card style={{textAlign:"center",padding:48}}><div style={{fontSize:40,marginBottom:12}}>🧪</div><div style={{fontSize:14,color:C.textLight}}>No lab results on record</div></Card>
          ) : (p.labResults||[]).map((lab, i) => (
            <Card key={i} hover style={{borderLeft:`4px solid ${SEV_COL[lab.status]||C.textLight}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:14,alignItems:"center"}}>
                  <div style={{width:44,height:44,borderRadius:14,background:(SEV_COL[lab.status]||C.blue)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🧪</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:800,color:C.text}}>{lab.test}</div>
                    <div style={{fontSize:13,color:C.textMed,marginTop:4}}>{lab.result}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <Badge label={lab.status} color={SEV_COL[lab.status]||C.textLight} />
                  <span style={{fontSize:12,color:C.textLight}}>{lab.date}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Vitals Edit Modal */}
      {showEditVitals && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,backdropFilter:"blur(4px)"}}>
          <Card style={{width:"100%",maxWidth:480}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text}}>📊 Update Vitals</h3>
              <button onClick={() => setShowEditVitals(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.textLight}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              {[["bp","❤️ Blood Pressure","e.g. 120/80"],["hr","💓 Heart Rate (bpm)","e.g. 72"],["temp","🌡️ Temperature (°C)","e.g. 36.6"],["weight","⚖️ Weight (kg)","e.g. 70"],["height","📏 Height (cm)","e.g. 175"],["o2","🩸 O₂ Saturation (%)","e.g. 98"]].map(([key,label,ph])=>(
                <Input key={key} label={label} value={vitalsForm[key]||""} onChange={v=>setVitalsForm(f=>({...f,[key]:v}))} placeholder={ph} />
              ))}
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn onClick={handleSaveVitals} style={{flex:1,borderRadius:12,padding:"12px"}}>Save Vitals</Btn>
              <Btn variant="outline" onClick={() => setShowEditVitals(false)} style={{borderRadius:12,padding:"12px 18px"}}>Cancel</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusChange && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,backdropFilter:"blur(4px)"}}>
          <Card style={{width:"100%",maxWidth:380}}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text,marginBottom:20}}>Change Patient Status</h3>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[["active","Active — under regular care",C.accent],["critical","Critical — requires urgent attention",C.coral],["recovered","Recovered — treatment complete","#8b5cf6"],["inactive","Inactive — not currently active",C.textLight]].map(([s,desc,col])=>(
                <button key={s} onClick={() => handleStatusChange(s)}
                  style={{padding:"14px 18px",borderRadius:14,border:`2px solid ${p.status===s?col:C.border}`,background:p.status===s?col+"15":"#fff",cursor:"pointer",textAlign:"left"}}>
                  <div style={{fontSize:13,fontWeight:700,color:p.status===s?col:C.text}}>{s.charAt(0).toUpperCase()+s.slice(1)}</div>
                  <div style={{fontSize:11,color:C.textLight,marginTop:2}}>{desc}</div>
                </button>
              ))}
            </div>
            <Btn variant="outline" onClick={() => setShowStatusChange(false)} style={{borderRadius:12,padding:"11px",width:"100%",marginTop:16}}>Cancel</Btn>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{fontSize:11,fontWeight:700,color:C.textLight,letterSpacing:"0.08em",paddingBottom:4,borderBottom:`1px solid ${C.border}`,marginTop:4}}>
      {children.toUpperCase()}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"12px 14px",fontSize:14,color:C.text,outline:"none",cursor:"pointer"}}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
