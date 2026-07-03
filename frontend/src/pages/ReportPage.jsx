import { useState, useEffect, useRef } from "react";
import { C, statusColor } from "../constants";
import { Card, Btn, Badge, Avatar, Input, PageHeader, StatCard, TabBar } from "../components/UI";
import { useAuth } from "../context/AuthContext";

// ── Template definitions ───────────────────────────────────────────────────────
const TEMPLATES = {
  standard: {
    label: "Standard Radiology",
    icon: "📋",
    fields: ["clinical_history","technique","findings","impression","recommendation"],
    defaultTechnique: "Standard protocol. No contrast unless indicated.",
  },
  chest_xray: {
    label: "Chest X-Ray",
    icon: "☢️",
    fields: ["clinical_history","technique","findings","impression","recommendation"],
    defaultTechnique: "PA and lateral chest radiographs obtained. Exposure adequate.",
    findingsPrompt: "Heart size, mediastinum, lung fields, costophrenic angles, bony thorax:",
  },
  mri_brain: {
    label: "MRI Brain",
    icon: "🧠",
    fields: ["clinical_history","technique","findings","impression","recommendation"],
    defaultTechnique: "MRI brain performed with standard sequences: T1, T2, FLAIR, DWI, T1 with gadolinium.",
    findingsPrompt: "Parenchyma, ventricles, sulci, basal ganglia, posterior fossa, extra-axial spaces:",
  },
  ct_abdomen: {
    label: "CT Abdomen",
    icon: "💿",
    fields: ["clinical_history","technique","findings","impression","recommendation"],
    defaultTechnique: "CT abdomen and pelvis with IV contrast, portal venous phase.",
    findingsPrompt: "Liver, gallbladder, pancreas, spleen, kidneys, adrenals, bowel, lymph nodes:",
  },
  ultrasound: {
    label: "Ultrasound",
    icon: "🔊",
    fields: ["clinical_history","technique","findings","impression","recommendation"],
    defaultTechnique: "Grey-scale and colour Doppler ultrasound performed.",
  },
};

const SEVERITY_OPTIONS = [
  { value:"normal",   label:"Normal",   color:C.accent },
  { value:"abnormal", label:"Abnormal", color:C.amber  },
  { value:"critical", label:"Critical", color:C.coral  },
];

// ── Status colors ──────────────────────────────────────────────────────────────
const STATUS_COL = {
  draft:  C.amber,
  final:  C.blue,
  signed: C.accent,
};

// ── Mock data ──────────────────────────────────────────────────────────────────
const MOCK_REPORTS = [
  {
    id:"r1", report_number:"RPT-20260520-A1B2C3",
    patient_name:"Sarah Johnson", patient_dob:"1985-03-12", patient_gender:"Female", patient_id:"P-001",
    scan_type:"xray", scan_date:"2026-05-20", referring_doctor:"Dr. Lida Gutierrez",
    radiologist:"Dr. Mayme Gomez", institution:"MediCore AI Hospital",
    clinical_history:"Cough, fever for 3 days. Rule out pneumonia.",
    technique:"PA and lateral chest radiographs obtained.",
    findings:"Right lower lobe consolidation present. No pleural effusion. Heart size normal. Mediastinum not widened.",
    impression:"Right lower lobe pneumonia.",
    recommendation:"Clinical correlation recommended. Follow up CXR in 4-6 weeks after treatment.",
    diagnosis:"Pneumonia", severity:"abnormal", confidence:0.94,
    template:"chest_xray", status:"signed", ai_generated:true,
    author_name:"Dr. Mayme Gomez", author_role:"radiologist",
    signed_by:"Dr. Mayme Gomez", signed_at:"2026-05-20T14:30:00",
    signature_date:"2026-05-20", created_at:"2026-05-20T10:00:00",
  },
  {
    id:"r2", report_number:"RPT-20260519-D4E5F6",
    patient_name:"James Lee", patient_dob:"1972-07-25", patient_gender:"Male", patient_id:"P-002",
    scan_type:"mri", scan_date:"2026-05-19", referring_doctor:"Dr. Christina Frazier",
    radiologist:"Dr. Mayme Gomez", institution:"MediCore AI Hospital",
    clinical_history:"Persistent headaches, visual disturbances x 3 weeks.",
    technique:"MRI brain with and without gadolinium contrast.",
    findings:"4.2cm heterogeneous mass in left temporal lobe with surrounding oedema. Enhancement post-contrast. Mass effect on adjacent structures.",
    impression:"Large enhancing mass in left temporal lobe. Differential includes high-grade glioma.",
    recommendation:"Urgent neurosurgical referral. Tissue biopsy for histological confirmation.",
    diagnosis:"Brain Tumor", severity:"critical", confidence:0.97,
    template:"mri_brain", status:"signed", ai_generated:true,
    author_name:"Dr. Mayme Gomez", author_role:"radiologist",
    signed_by:"Dr. Mayme Gomez", signed_at:"2026-05-19T16:00:00",
    signature_date:"2026-05-19", created_at:"2026-05-19T11:00:00",
  },
  {
    id:"r3", report_number:"RPT-20260518-G7H8I9",
    patient_name:"Maria Garcia", scan_type:"ct", scan_date:"2026-05-18",
    referring_doctor:"Dr. Mayme Gomez", radiologist:"Dr. Mayme Gomez",
    institution:"MediCore AI Hospital",
    clinical_history:"Routine follow-up. Known mild asthma.",
    technique:"CT chest without contrast.", findings:"Lungs clear bilaterally. No consolidation, effusion, or pneumothorax.",
    impression:"Normal CT chest.", recommendation:"No further imaging required at this time.",
    diagnosis:"Normal", severity:"normal", confidence:0.91,
    template:"standard", status:"draft", ai_generated:false,
    author_name:"Dr. Mayme Gomez", author_role:"radiologist",
    created_at:"2026-05-18T09:00:00",
  },
];

// ── PDF Generator ─────────────────────────────────────────────────────────────
function printReport(report) {
  const win = window.open("","_blank","width=900,height=700");
  const sevColor = { normal:"#4CAF82", abnormal:"#F5A623", critical:"#F47B7B" };
  const col = sevColor[report.severity] || "#4CAF82";

  win.document.write(`<!DOCTYPE html><html><head>
  <title>Radiology Report — ${report.report_number}</title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Nunito',sans-serif;background:#fff;color:#1a1a2e;padding:40px;font-size:13px;line-height:1.6;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #4CAF82;margin-bottom:28px;}
    .logo{display:flex;align-items:center;gap:12px;}
    .logo-icon{width:48px;height:48px;background:#e8f5ee;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;}
    h1{font-family:'Playfair Display',serif;font-size:22px;color:#1a1a2e;}
    h2{font-family:'Playfair Display',serif;font-size:16px;color:#1a1a2e;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid #e8eef0;}
    .meta{font-size:12px;color:#94a3b8;text-align:right;}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;}
    .field{background:#f7f9f7;border-radius:10px;padding:10px 14px;}
    .field-label{font-size:10px;color:#94a3b8;font-weight:700;letter-spacing:0.06em;margin-bottom:4px;}
    .field-val{font-size:13px;font-weight:700;color:#1a1a2e;}
    .section{margin-bottom:18px;}
    .section-label{font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.06em;margin-bottom:6px;}
    .section-content{font-size:13px;color:#1a1a2e;background:#f7f9f7;border-radius:10px;padding:12px 16px;line-height:1.7;}
    .impression-box{background:${col}12;border:2px solid ${col}44;border-radius:14px;padding:16px 20px;margin:20px 0;}
    .severity-badge{display:inline-block;background:${col}18;color:${col};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;}
    .confidence{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:${col};margin:4px 0;}
    .signature-box{border:2px dashed #e8eef0;border-radius:14px;padding:20px;margin-top:24px;display:flex;justify-content:space-between;align-items:flex-end;}
    .sig-line{border-top:1px solid #1a1a2e;padding-top:6px;min-width:200px;text-align:center;font-size:12px;color:#4a5568;}
    .badge-ai{display:inline-block;background:#fff3cd;color:#92600a;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;}
    .footer{margin-top:32px;padding-top:14px;border-top:1px solid #e8eef0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;}
    @media print{body{padding:24px;}@page{margin:1.5cm;}}
  </style></head><body>

  <div class="header">
    <div class="logo">
      <div class="logo-icon">⚕️</div>
      <div>
        <h1>MediCore AI</h1>
        <div style="font-size:12px;color:#94a3b8">${report.institution || "MediCore AI Hospital"}</div>
      </div>
    </div>
    <div class="meta">
      <div style="font-size:15px;font-weight:800;color:#1a1a2e">${report.report_number}</div>
      <div>Report Date: ${report.scan_date || report.created_at?.slice(0,10)}</div>
      <div>Generated: ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div>
      <div>${report.ai_generated?'<span class="badge-ai">🤗 AI-Assisted</span>':''}</div>
    </div>
  </div>

  <h2>👤 Patient Information</h2>
  <div class="grid2">
    <div class="field"><div class="field-label">PATIENT NAME</div><div class="field-val">${report.patient_name}</div></div>
    <div class="field"><div class="field-label">PATIENT ID</div><div class="field-val">${report.patient_id || "—"}</div></div>
    <div class="field"><div class="field-label">DATE OF BIRTH</div><div class="field-val">${report.patient_dob || "—"}</div></div>
    <div class="field"><div class="field-label">GENDER</div><div class="field-val">${report.patient_gender || "—"}</div></div>
    <div class="field"><div class="field-label">REFERRING DOCTOR</div><div class="field-val">${report.referring_doctor}</div></div>
    <div class="field"><div class="field-label">RADIOLOGIST</div><div class="field-val">${report.radiologist}</div></div>
  </div>

  <h2>🔬 Examination</h2>
  <div class="grid2">
    <div class="field"><div class="field-label">MODALITY</div><div class="field-val">${report.scan_type?.toUpperCase()}</div></div>
    <div class="field"><div class="field-label">EXAM DATE</div><div class="field-val">${report.scan_date}</div></div>
  </div>

  ${report.clinical_history?`
  <div class="section">
    <div class="section-label">CLINICAL HISTORY</div>
    <div class="section-content">${report.clinical_history}</div>
  </div>`:""}

  ${report.technique?`
  <div class="section">
    <div class="section-label">TECHNIQUE</div>
    <div class="section-content">${report.technique}</div>
  </div>`:""}

  ${report.findings?`
  <div class="section">
    <div class="section-label">FINDINGS</div>
    <div class="section-content">${report.findings}</div>
  </div>`:""}

  <div class="impression-box">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
      <div>
        <div style="font-size:11px;color:${col};font-weight:700;letter-spacing:0.06em;margin-bottom:4px">IMPRESSION</div>
        <div style="font-size:14px;font-weight:700;color:#1a1a2e">${report.diagnosis}</div>
        <span class="severity-badge">${report.severity}</span>
      </div>
      <div style="text-align:right">
        <div class="confidence">${report.confidence?(report.confidence*100).toFixed(1)+"%":"—"}</div>
        <div style="font-size:11px;color:#94a3b8">AI Confidence</div>
      </div>
    </div>
    <div style="font-size:13px;color:#1a1a2e;line-height:1.7">${report.impression}</div>
  </div>

  ${report.recommendation?`
  <div class="section">
    <div class="section-label">RECOMMENDATION</div>
    <div class="section-content">${report.recommendation}</div>
  </div>`:""}

  <div class="signature-box">
    <div>
      <div class="sig-line">${report.signed_by || report.radiologist || report.author_name || "_______________"}</div>
      <div style="font-size:11px;color:#94a3b8;text-align:center;margin-top:4px">Radiologist / Reporting Doctor</div>
    </div>
    <div style="text-align:right">
      ${report.status==="signed"?`
        <div style="color:#4CAF82;font-weight:700;font-size:13px">✅ DIGITALLY SIGNED</div>
        <div style="font-size:11px;color:#94a3b8">Signed by ${report.signed_by}</div>
        <div style="font-size:11px;color:#94a3b8">${report.signature_date}</div>
      `:`<div style="color:#F5A623;font-weight:700;font-size:12px">⏳ PENDING SIGNATURE</div>`}
    </div>
  </div>

  <div class="footer">
    <span>MediCore AI — Confidential Medical Report · ${report.report_number}</span>
    <span>Generated ${new Date().toISOString()} · Do not distribute without authorisation</span>
  </div>

  <script>window.onload=()=>{window.print();}</script>
  </body></html>`);
  win.document.close();
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function ReportPage() {
  const { user } = useAuth();
  const [tab,        setTab]        = useState("list");
  const [reports,    setReports]    = useState([]);
  const [selected,   setSelected]   = useState(null);  // viewing a report
  const [editing,    setEditing]    = useState(null);   // editing/creating
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType,   setFilterType]   = useState("all");
  const [searchQ,      setSearchQ]      = useState("");
  const [successMsg,   setSuccessMsg]   = useState("");
  const [showSignModal,setShowSignModal]= useState(false);
  const [signName,     setSignName]     = useState(user?.name || "");

  // Load real reports
  useEffect(() => {
    import("../services/api").then(({ reportService }) => {
      reportService?.list?.()
        .then(data => setReports(data || []))
        .catch(() => setReports([]));
    });
  }, []);

  const flash = msg => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3500); };

  const stats = {
    total:  reports.length,
    signed: reports.filter(r=>r.status==="signed").length,
    draft:  reports.filter(r=>r.status==="draft").length,
    final:  reports.filter(r=>r.status==="final").length,
  };

  const filtered = reports.filter(r =>
    (filterStatus==="all" || r.status===filterStatus) &&
    (filterType==="all"   || r.scan_type===filterType) &&
    (!searchQ || r.patient_name?.toLowerCase().includes(searchQ.toLowerCase()) ||
      r.diagnosis?.toLowerCase().includes(searchQ.toLowerCase()) ||
      r.report_number?.toLowerCase().includes(searchQ.toLowerCase()))
  );

  const handleCreate = (template="standard") => {
    const tmpl = TEMPLATES[template];
    setEditing({
      id: null,
      patient_name:"", patient_dob:"", patient_gender:"", patient_id:"",
      scan_type:"xray", scan_date: new Date().toISOString().slice(0,10),
      referring_doctor:"", radiologist: user?.name||"",
      institution:"MediCore AI Hospital",
      clinical_history:"", technique: tmpl.defaultTechnique||"",
      findings:"", impression:"", recommendation:"",
      diagnosis:"", severity:"normal", confidence:0,
      template, status:"draft", ai_generated:false,
    });
    setTab("editor");
  };

  const handleSave = async (report) => {
    import("../services/api").then(async ({ reportService }) => {
      try {
        if (report.id) {
          await reportService?.update?.(report.id, report);
          setReports(r => r.map(x => x.id===report.id ? {...x,...report} : x));
          flash("✅ Report updated");
        } else {
          const saved = await reportService?.create?.(report);
          const newRep = saved || { ...report, id:"r"+Date.now(), report_number:`RPT-${Date.now()}`, created_at:new Date().toISOString() };
          setReports(r => [newRep, ...r]);
          flash("✅ Report created");
          setEditing(newRep);
        }
      } catch {
        const newRep = { ...report, id:"r"+Date.now(), report_number:`RPT-${Date.now()}`, created_at:new Date().toISOString() };
        setReports(r => report.id ? r.map(x=>x.id===report.id?{...x,...report}:x) : [newRep,...r]);
        flash("✅ Report saved (offline mode)");
        if (!report.id) setEditing(newRep);
      }
    });
  };

  const handleSign = async () => {
    if (!editing?.id) return;
    import("../services/api").then(async ({ reportService }) => {
      try { await reportService?.sign?.(editing.id, signName); } catch {}
      const signed = { ...editing, status:"signed", signed_by:signName, signature_date:new Date().toISOString().slice(0,10), signed_at:new Date().toISOString() };
      setReports(r => r.map(x => x.id===editing.id ? signed : x));
      setEditing(signed);
      setShowSignModal(false);
      flash("✅ Report digitally signed");
    });
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    import("../services/api").then(({ reportService }) => {
      reportService?.delete?.(id).catch(()=>{});
    });
    setReports(r => r.filter(x => x.id!==id));
    flash("🗑️ Report deleted");
  };

  // ── Report detail view ──
  if (selected && tab==="view") {
    return <ReportViewer report={selected} onBack={()=>{setSelected(null);setTab("list");}} onEdit={()=>{setEditing(selected);setTab("editor");}} onPrint={()=>printReport(selected)} />;
  }

  // ── Editor ──
  if (editing && tab==="editor") {
    return (
      <ReportEditor
        report={editing}
        user={user}
        onSave={handleSave}
        onSign={()=>setShowSignModal(true)}
        onPrint={()=>printReport(editing)}
        onBack={()=>{setEditing(null);setTab("list");}}
        showSignModal={showSignModal}
        setShowSignModal={setShowSignModal}
        signName={signName}
        setSignName={setSignName}
        handleSign={handleSign}
        successMsg={successMsg}
      />
    );
  }

  // ── List view ──
  return (
    <div className="page-enter">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <PageHeader title="📄 Radiology Reports" subtitle="Create, manage and digitally sign medical reports" />
        <div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" onClick={()=>setTab(tab==="templates"?"list":"templates")} style={{borderRadius:12}}>📋 Templates</Btn>
          <Btn onClick={()=>handleCreate("standard")} style={{borderRadius:12}}>+ New Report</Btn>
        </div>
      </div>

      {successMsg && <div style={{background:C.accentLight,border:`1px solid ${C.accent}44`,borderRadius:12,padding:"12px 18px",marginBottom:16,fontSize:13,color:C.accent,fontWeight:700}}>{successMsg}</div>}

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        <StatCard label="Total Reports" value={stats.total}  icon="📄" color={C.blue}  bg={C.blueLight}  />
        <StatCard label="Signed"        value={stats.signed} icon="✅" color={C.accent} bg={C.accentLight} />
        <StatCard label="Draft"         value={stats.draft}  icon="✏️" color={C.amber} bg={C.amberLight}  />
        <StatCard label="Final"         value={stats.final}  icon="📋" color={C.blue}  bg={C.blueLight}   />
      </div>

      {/* Template picker */}
      {tab==="templates" && (
        <div style={{marginBottom:24}}>
          <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text,marginBottom:16}}>Choose a Report Template</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
            {Object.entries(TEMPLATES).map(([key,tmpl])=>(
              <Card key={key} hover onClick={()=>handleCreate(key)} style={{cursor:"pointer",textAlign:"center",padding:"24px 16px"}}>
                <div style={{fontSize:36,marginBottom:10}}>{tmpl.icon}</div>
                <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:6}}>{tmpl.label}</div>
                <div style={{fontSize:12,color:C.textLight,marginBottom:14}}>
                  {tmpl.fields.length} sections · {tmpl.defaultTechnique?"Pre-filled technique":"Custom"}
                </div>
                <Btn style={{borderRadius:10,padding:"8px 20px",fontSize:12}}>Use Template</Btn>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",flex:1,minWidth:220}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}>🔍</span>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search patient, diagnosis, report #…"
            style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:14,padding:"10px 14px 10px 36px",fontSize:13,outline:"none"}} />
        </div>
        {["all","draft","final","signed"].map(s=>(
          <button key={s} onClick={()=>setFilterStatus(s)}
            style={{padding:"9px 16px",borderRadius:20,border:`1.5px solid ${filterStatus===s?(STATUS_COL[s]||C.blue):C.border}`,background:filterStatus===s?(STATUS_COL[s]||C.blue):"#fff",color:filterStatus===s?"#fff":C.textMed,fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
        <select value={filterType} onChange={e=>setFilterType(e.target.value)}
          style={{padding:"10px 14px",borderRadius:20,border:`1.5px solid ${C.border}`,background:"#fff",fontSize:12,fontWeight:600,color:C.textMed,outline:"none",cursor:"pointer"}}>
          <option value="all">All Types</option>
          {["xray","mri","ct","ultrasound"].map(t=><option key={t} value={t}>{t.toUpperCase()}</option>)}
        </select>
        <div style={{fontSize:12,color:C.textLight,fontWeight:600}}>{filtered.length} report{filtered.length!==1?"s":""}</div>
      </div>

      {/* Reports list */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {filtered.map(r=>(
          <Card key={r.id} hover style={{borderLeft:`4px solid ${STATUS_COL[r.status]||C.border}`}}>
            <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
              <div style={{width:48,height:48,borderRadius:14,background:(statusColor[r.severity]||C.blue)+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {r.severity==="critical"?"🚨":r.severity==="abnormal"?"⚠️":"✅"}
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:800,color:C.text}}>{r.patient_name}</div>
                    <div style={{fontSize:11,color:C.textLight,marginTop:2,fontFamily:"monospace"}}>{r.report_number}</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <Badge label={r.status} color={STATUS_COL[r.status]||C.textLight} />
                    <Badge label={(r.scan_type||"").toUpperCase()} color={C.blue} />
                    {r.ai_generated && <span style={{fontSize:10,background:"#fff3cd",color:"#92600a",padding:"2px 7px",borderRadius:20,fontWeight:700}}>🤗 AI</span>}
                  </div>
                </div>
                <div style={{fontSize:13,color:C.textMed,marginBottom:8}}>{r.diagnosis} · {r.impression?.slice(0,80)}{r.impression?.length>80?"…":""}</div>
                <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:11,color:C.textLight}}>
                  <span>📅 {r.scan_date}</span>
                  <span>👨‍⚕️ {r.radiologist}</span>
                  <span>👤 {r.referring_doctor}</span>
                  {r.signed_by && <span style={{color:C.accent,fontWeight:700}}>✅ Signed by {r.signed_by}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>{setSelected(r);setTab("view");}} style={actionBtn(C.blue)}>👁️</button>
                {r.status!=="signed" && <button onClick={()=>{setEditing(r);setTab("editor");}} style={actionBtn(C.amber)}>✏️</button>}
                <button onClick={()=>printReport(r)} style={actionBtn(C.accent)}>🖨️</button>
                {r.status!=="signed" && <button onClick={()=>handleDelete(r.id)} style={actionBtn(C.coral)}>🗑️</button>}
              </div>
            </div>
          </Card>
        ))}
        {filtered.length===0 && (
          <Card style={{textAlign:"center",padding:56}}>
            <div style={{fontSize:44,marginBottom:14}}>📄</div>
            <div style={{fontSize:14,color:C.textLight,marginBottom:18}}>No reports found</div>
            <Btn onClick={()=>handleCreate("standard")} style={{borderRadius:12}}>Create First Report</Btn>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Action button style ────────────────────────────────────────────────────────
const actionBtn = (col) => ({
  width:34, height:34, borderRadius:10, border:`1px solid ${col}33`,
  background:`${col}10`, cursor:"pointer", fontSize:14,
  display:"flex", alignItems:"center", justifyContent:"center",
});

// ══════════════════════════════════════════════════════════════════════════════
// REPORT EDITOR
// ══════════════════════════════════════════════════════════════════════════════
function ReportEditor({ report, user, onSave, onSign, onPrint, onBack, showSignModal, setShowSignModal, signName, setSignName, handleSign, successMsg }) {
  const [form, setForm] = useState({ ...report });
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceField,  setVoiceField]  = useState(null);
  const [voiceSupported] = useState(typeof window !== "undefined" && "webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  const recognitionRef = useRef(null);
  const tmpl = TEMPLATES[form.template] || TEMPLATES.standard;

  const set = k => v => setForm(f => ({...f, [k]:v}));

  const startVoice = (field) => {
    if (!voiceSupported) { alert("Voice recognition not supported in this browser. Use Chrome for best results."); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = e => {
      const transcript = Array.from(e.results).map(r=>r[0].transcript).join(" ");
      setForm(f => ({...f, [field]: (f[field]+" "+transcript).trim()}));
    };
    recognition.onerror = () => setVoiceActive(false);
    recognition.onend   = () => setVoiceActive(false);
    recognitionRef.current = recognition;
    recognition.start();
    setVoiceActive(true);
    setVoiceField(field);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setVoiceActive(false);
    setVoiceField(null);
  };

  const autoFillFromAI = () => {
    if (!form.diagnosis) return;
    const templates = {
      "Pneumonia": {
        findings: "Right lower lobe consolidation present. Air bronchograms visible. No pleural effusion. Heart size normal. Mediastinum not widened.",
        impression: `${form.diagnosis} — right lower lobe consolidation consistent with pneumonia.`,
        recommendation: "Clinical correlation recommended. Follow-up chest radiograph after 4-6 weeks of antibiotic therapy. Consider CT chest if no improvement.",
        technique: "PA and lateral chest radiographs obtained in full inspiration.",
      },
      "Normal": {
        findings: "No acute cardiopulmonary abnormality. Lung fields clear bilaterally. No consolidation, effusion, or pneumothorax identified.",
        impression: "Normal study. No acute pathology identified.",
        recommendation: "No further imaging required at this time. Clinical correlation as appropriate.",
      },
      "Brain Tumor": {
        findings: "Heterogeneous mass identified with surrounding vasogenic oedema. Post-contrast enhancement noted. Mass effect on adjacent structures.",
        impression: `${form.diagnosis} — intracranial mass with features suggestive of high-grade neoplasm.`,
        recommendation: "Urgent neurosurgical referral recommended. Tissue biopsy for histological confirmation. Repeat MRI with spectroscopy.",
      },
      "Tuberculosis": {
        findings: "Bilateral upper lobe consolidation with cavitation. Hilar lymphadenopathy present. Pleural effusion on right side.",
        impression: "Findings consistent with active pulmonary tuberculosis.",
        recommendation: "Immediate isolation protocol. Refer to infectious disease. Sputum AFB smear and culture. HRCT chest for better characterisation.",
      },
    };
    const autoTmpl = templates[form.diagnosis] || {};
    setForm(f => ({...f, ...autoTmpl}));
  };

  const SCAN_TYPE_LABELS = { xray:"X-Ray", mri:"MRI", ct:"CT Scan", ultrasound:"Ultrasound" };

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
        <button onClick={onBack} style={{width:40,height:40,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:18,color:C.textMed}}>←</button>
        <div style={{flex:1}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.text}}>
            {form.id?"Edit Report":"New Report"} — {TEMPLATES[form.template]?.label}
          </h2>
          {form.report_number && <p style={{fontSize:12,color:C.textLight,marginTop:2,fontFamily:"monospace"}}>{form.report_number}</p>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <Badge label={form.status} color={STATUS_COL[form.status]||C.textLight} />
          <Btn variant="ghost"   onClick={()=>onSave(form)}                       style={{borderRadius:12}}>💾 Save Draft</Btn>
          {form.status!=="signed" && <Btn variant="outline"  onClick={()=>{setForm(f=>({...f,status:"final"}));onSave({...form,status:"final"});}} style={{borderRadius:12}}>📋 Finalise</Btn>}
          {form.status==="final"  && <Btn                    onClick={onSign}                                  style={{borderRadius:12}}>✍️ Sign</Btn>}
          <Btn variant="blue"    onClick={onPrint}                                style={{borderRadius:12}}>🖨️ Print PDF</Btn>
        </div>
      </div>

      {successMsg && <div style={{background:C.accentLight,border:`1px solid ${C.accent}44`,borderRadius:12,padding:"12px 18px",marginBottom:16,fontSize:13,color:C.accent,fontWeight:700}}>{successMsg}</div>}

      {voiceActive && (
        <div style={{background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:12,padding:"12px 18px",marginBottom:16,display:"flex",gap:12,alignItems:"center"}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:"#ef4444",animation:"pulse 1s infinite"}}/>
          <span style={{fontSize:13,color:"#991b1b",fontWeight:700}}>🎙️ Recording — speaking into: <strong>{voiceField}</strong></span>
          <Btn variant="danger" onClick={stopVoice} style={{marginLeft:"auto",borderRadius:10,padding:"6px 14px",fontSize:12}}>Stop</Btn>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20}}>
        {/* ── Main form ── */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* Patient & Exam info */}
          <Card>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:16}}>👤 Patient & Examination</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <Input label="PATIENT NAME"    value={form.patient_name}    onChange={set("patient_name")}    placeholder="Full name" icon="👤"/>
              <Input label="PATIENT ID"      value={form.patient_id||""}  onChange={set("patient_id")}      placeholder="P-001"     icon="🪪"/>
              <Input label="DATE OF BIRTH"   value={form.patient_dob||""} onChange={set("patient_dob")}     placeholder="YYYY-MM-DD"icon="🎂"/>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>GENDER</label>
                <select value={form.patient_gender||""} onChange={e=>set("patient_gender")(e.target.value)}
                  style={{background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"12px 14px",fontSize:14,color:C.text,outline:"none"}}>
                  <option value="">—</option>{["Male","Female","Other"].map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
              <Input label="EXAM DATE"       value={form.scan_date}       onChange={set("scan_date")}       placeholder="YYYY-MM-DD"icon="📅"/>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>MODALITY</label>
                <select value={form.scan_type} onChange={e=>set("scan_type")(e.target.value)}
                  style={{background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"12px 14px",fontSize:14,color:C.text,outline:"none"}}>
                  {Object.entries(SCAN_TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <Input label="REFERRING DOCTOR" value={form.referring_doctor||""} onChange={set("referring_doctor")} placeholder="Dr. Name" icon="👨‍⚕️"/>
              <Input label="RADIOLOGIST"       value={form.radiologist||""}     onChange={set("radiologist")}      placeholder="Dr. Name" icon="🔬"/>
            </div>
          </Card>

          {/* AI auto-fill banner */}
          {form.diagnosis && (
            <div style={{background:C.blueLight,border:`1px solid ${C.blue}33`,borderRadius:12,padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.blue}}>🤖 AI found: <strong>{form.diagnosis}</strong></div>
                <div style={{fontSize:12,color:C.textLight,marginTop:2}}>Auto-fill findings and impression from diagnostic templates?</div>
              </div>
              <Btn variant="blue" onClick={autoFillFromAI} style={{borderRadius:10,padding:"8px 18px",fontSize:12}}>Auto-fill Report</Btn>
            </div>
          )}

          {/* Clinical History */}
          <VoiceTextArea label="CLINICAL HISTORY" field="clinical_history" value={form.clinical_history}
            onChange={set("clinical_history")} placeholder="Patient symptoms, relevant history, reason for referral…"
            voiceActive={voiceActive} voiceField={voiceField} onVoiceStart={startVoice} onVoiceStop={stopVoice} supported={voiceSupported} />

          {/* Technique */}
          <VoiceTextArea label="TECHNIQUE" field="technique" value={form.technique}
            onChange={set("technique")} placeholder="Imaging technique, protocol, contrast used…"
            voiceActive={voiceActive} voiceField={voiceField} onVoiceStart={startVoice} onVoiceStop={stopVoice} supported={voiceSupported} />

          {/* Findings */}
          <VoiceTextArea label="FINDINGS" field="findings" value={form.findings}
            onChange={set("findings")} placeholder={tmpl.findingsPrompt || "Describe all findings systematically…"}
            rows={6} voiceActive={voiceActive} voiceField={voiceField} onVoiceStart={startVoice} onVoiceStop={stopVoice} supported={voiceSupported} />

          {/* Impression */}
          <VoiceTextArea label="IMPRESSION" field="impression" value={form.impression}
            onChange={set("impression")} placeholder="Summary conclusion and diagnosis…"
            rows={4} voiceActive={voiceActive} voiceField={voiceField} onVoiceStart={startVoice} onVoiceStop={stopVoice} supported={voiceSupported} highlight />

          {/* Recommendation */}
          <VoiceTextArea label="RECOMMENDATION" field="recommendation" value={form.recommendation}
            onChange={set("recommendation")} placeholder="Follow-up, treatment, further imaging…"
            voiceActive={voiceActive} voiceField={voiceField} onVoiceStart={startVoice} onVoiceStop={stopVoice} supported={voiceSupported} />
        </div>

        {/* ── Right sidebar ── */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* Diagnosis summary */}
          <Card>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:16}}>🎯 Diagnosis Summary</h3>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Input label="PRIMARY DIAGNOSIS" value={form.diagnosis||""} onChange={set("diagnosis")} placeholder="e.g. Pneumonia" icon="🔬"/>

              <div>
                <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em",display:"block",marginBottom:8}}>SEVERITY</label>
                <div style={{display:"flex",gap:6}}>
                  {SEVERITY_OPTIONS.map(s=>(
                    <button key={s.value} onClick={()=>set("severity")(s.value)}
                      style={{flex:1,padding:"9px 6px",borderRadius:10,border:`2px solid ${form.severity===s.value?s.color:C.border}`,background:form.severity===s.value?s.color+"15":"#fff",color:form.severity===s.value?s.color:C.textMed,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em",display:"block",marginBottom:6}}>
                  AI CONFIDENCE — {Math.round((form.confidence||0)*100)}%
                </label>
                <input type="range" min={0} max={100} value={Math.round((form.confidence||0)*100)}
                  onChange={e=>set("confidence")(e.target.value/100)}
                  style={{width:"100%",accentColor:C.accent}} />
              </div>

              <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13,color:C.text,fontWeight:600}}>
                <input type="checkbox" checked={form.ai_generated||false} onChange={e=>set("ai_generated")(e.target.checked)} style={{accentColor:C.accent}}/>
                AI-assisted report
              </label>
            </div>
          </Card>

          {/* Status & Signature */}
          <Card>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:14}}>📋 Status</h3>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[["draft","✏️ Draft","Work in progress"],["final","📋 Final","Ready for signature"],["signed","✅ Signed","Legally signed"]].map(([s,label,desc])=>(
                <button key={s} onClick={()=>s!=="signed" && set("status")(s)}
                  style={{padding:"10px 14px",borderRadius:12,border:`2px solid ${form.status===s?(STATUS_COL[s]||C.blue):C.border}`,background:form.status===s?(STATUS_COL[s]||C.blue)+"12":"#fff",cursor:s==="signed"?"not-allowed":"pointer",textAlign:"left"}}>
                  <div style={{fontSize:12,fontWeight:700,color:form.status===s?(STATUS_COL[s]||C.blue):C.text}}>{label}</div>
                  <div style={{fontSize:11,color:C.textLight,marginTop:1}}>{desc}</div>
                </button>
              ))}

              {form.status==="signed" && (
                <div style={{background:C.accentLight,borderRadius:12,padding:"12px 14px"}}>
                  <div style={{fontSize:12,color:C.accent,fontWeight:700}}>✅ Signed by {form.signed_by}</div>
                  <div style={{fontSize:11,color:C.textLight,marginTop:2}}>{form.signature_date}</div>
                </div>
              )}
            </div>
          </Card>

          {/* Institution */}
          <Card>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:C.text,marginBottom:12}}>🏥 Institution</h3>
            <Input label="INSTITUTION" value={form.institution||""} onChange={set("institution")} placeholder="Hospital name" icon="🏥"/>
          </Card>

          {/* Quick actions */}
          <Card>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:C.text,marginBottom:12}}>⚡ Quick Actions</h3>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <Btn onClick={()=>onSave(form)}                         style={{borderRadius:10,padding:"10px"}}>💾 Save Draft</Btn>
              {form.status!=="signed" && <Btn variant="outline" onClick={()=>{const f={...form,status:"final"};setForm(f);onSave(f);}} style={{borderRadius:10,padding:"10px"}}>📋 Mark Final</Btn>}
              {form.status==="final"  && <Btn onClick={()=>setShowSignModal(true)} style={{borderRadius:10,padding:"10px",background:"#8b5cf6"}}>✍️ Digital Sign</Btn>}
              <Btn variant="blue" onClick={onPrint}                  style={{borderRadius:10,padding:"10px"}}>🖨️ Print / PDF</Btn>
            </div>
          </Card>
        </div>
      </div>

      {/* Digital Signature Modal */}
      {showSignModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,backdropFilter:"blur(4px)"}}>
          <Card style={{width:"100%",maxWidth:460}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text}}>✍️ Digital Signature</h3>
              <button onClick={()=>setShowSignModal(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.textLight}}>✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{padding:"14px",background:C.accentLight,borderRadius:12,fontSize:13,color:C.accent,fontWeight:600,lineHeight:1.6}}>
                By signing this report, you confirm that you have reviewed the imaging and findings, and take clinical responsibility for this report.
              </div>
              <Input label="FULL NAME (as it will appear on the report)" value={signName} onChange={setSignName} placeholder="Dr. Full Name" icon="👤"/>
              <div style={{padding:"16px",background:C.cardAlt,borderRadius:12,textAlign:"center"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.text,fontStyle:"italic",marginBottom:6}}>{signName||"Your Name"}</div>
                <div style={{height:1,background:C.border,marginBottom:6}}/>
                <div style={{fontSize:11,color:C.textLight}}>{new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div>
              </div>
              <div style={{display:"flex",gap:10}}>
                <Btn onClick={handleSign} disabled={!signName} style={{flex:1,borderRadius:12,padding:"12px",background:"#8b5cf6"}}>✅ Sign Report</Btn>
                <Btn variant="outline" onClick={()=>setShowSignModal(false)} style={{borderRadius:12,padding:"12px 18px"}}>Cancel</Btn>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Voice text area component ─────────────────────────────────────────────────
function VoiceTextArea({ label, field, value, onChange, placeholder, rows=3, voiceActive, voiceField, onVoiceStart, onVoiceStop, supported, highlight }) {
  const isRecording = voiceActive && voiceField === field;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>{label}</label>
        {supported && (
          <button onClick={()=>isRecording?onVoiceStop():onVoiceStart(field)}
            style={{display:"flex",gap:6,alignItems:"center",fontSize:11,padding:"4px 10px",borderRadius:8,border:`1px solid ${isRecording?C.coral:C.border}`,background:isRecording?C.coralLight:"#fff",color:isRecording?C.coral:C.textLight,cursor:"pointer",fontWeight:600}}>
            {isRecording?<><span style={{width:8,height:8,borderRadius:"50%",background:C.coral,display:"inline-block"}}/>Stop</>:"🎙️ Voice"}
          </button>
        )}
      </div>
      <textarea
        value={value||""} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{
          background: highlight?C.accentLight+"88":isRecording?"#fee2e2":C.cardAlt,
          border:`1.5px solid ${isRecording?C.coral:highlight?C.accent:C.border}`,
          borderRadius:14, padding:"12px 16px", fontSize:14, color:C.text,
          outline:"none", resize:"vertical", fontFamily:"Nunito,sans-serif", lineHeight:1.6,
          transition:"all 0.2s",
        }}
      />
    </div>
  );
}

// ── Report Viewer ─────────────────────────────────────────────────────────────
function ReportViewer({ report: r, onBack, onEdit, onPrint }) {
  const col = statusColor[r.severity] || C.textLight;
  const STATUS_COL = { draft:C.amber, final:C.blue, signed:C.accent };

  return (
    <div className="page-enter">
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
        <button onClick={onBack} style={{width:40,height:40,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:18,color:C.textMed}}>←</button>
        <div style={{flex:1}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.text}}>{r.patient_name}</h2>
          <p style={{fontSize:12,color:C.textLight,marginTop:2,fontFamily:"monospace"}}>{r.report_number}</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Badge label={r.status} color={STATUS_COL[r.status]||C.textLight}/>
          {r.status!=="signed" && <Btn variant="ghost" onClick={onEdit} style={{borderRadius:12}}>✏️ Edit</Btn>}
          <Btn variant="blue" onClick={onPrint} style={{borderRadius:12}}>🖨️ Print PDF</Btn>
        </div>
      </div>

      {/* Report preview card */}
      <Card>
        {/* Institution header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",paddingBottom:16,borderBottom:`2px solid ${C.accent}`,marginBottom:20}}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <div style={{width:48,height:48,background:C.accentLight,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>⚕️</div>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:C.text}}>MediCore AI</div>
              <div style={{fontSize:12,color:C.textLight}}>{r.institution}</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:C.text}}>{r.report_number}</div>
            <div style={{fontSize:12,color:C.textLight}}>Report Date: {r.scan_date}</div>
            {r.ai_generated && <div style={{fontSize:11,background:"#fff3cd",color:"#92600a",padding:"2px 8px",borderRadius:20,display:"inline-block",marginTop:4,fontWeight:700}}>🤗 AI-Assisted</div>}
          </div>
        </div>

        {/* Patient info grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
          {[["Patient",r.patient_name],["DOB",r.patient_dob||"—"],["Gender",r.patient_gender||"—"],["Modality",(r.scan_type||"").toUpperCase()],["Referring",r.referring_doctor],["Radiologist",r.radiologist]].map(([k,v])=>(
            <div key={k} style={{background:C.cardAlt,borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:C.textLight,fontWeight:700,letterSpacing:"0.05em"}}>{k.toUpperCase()}</div>
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginTop:3}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Report sections */}
        {[["Clinical History",r.clinical_history],["Technique",r.technique],["Findings",r.findings],["Recommendation",r.recommendation]].map(([label,content])=>
          content ? (
            <div key={label} style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textLight,letterSpacing:"0.06em",marginBottom:6}}>{label.toUpperCase()}</div>
              <div style={{fontSize:13,color:C.textMed,lineHeight:1.7,background:C.cardAlt,borderRadius:10,padding:"12px 16px"}}>{content}</div>
            </div>
          ) : null
        )}

        {/* Impression box */}
        <div style={{background:col+"10",border:`2px solid ${col}33`,borderRadius:16,padding:"20px 24px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:col,letterSpacing:"0.06em",marginBottom:4}}>IMPRESSION</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:C.text}}>{r.diagnosis}</div>
              <Badge label={r.severity} color={col}/>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:700,color:col}}>{r.confidence?(r.confidence*100).toFixed(1)+"%":"—"}</div>
              <div style={{fontSize:11,color:C.textLight}}>AI Confidence</div>
            </div>
          </div>
          <div style={{fontSize:13,color:C.textMed,lineHeight:1.7}}>{r.impression}</div>
        </div>

        {/* Signature */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",paddingTop:16,borderTop:`1px solid ${C.border}`}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontStyle:"italic",color:C.text,marginBottom:4}}>{r.signed_by||r.radiologist||r.author_name}</div>
            <div style={{height:1,background:C.text,width:200,marginBottom:4}}/>
            <div style={{fontSize:11,color:C.textLight}}>Reporting Radiologist</div>
          </div>
          <div style={{textAlign:"right"}}>
            {r.status==="signed"
              ? <div style={{padding:"10px 16px",background:C.accentLight,borderRadius:12}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.accent}}>✅ DIGITALLY SIGNED</div>
                  <div style={{fontSize:11,color:C.textLight}}>{r.signed_by} · {r.signature_date}</div>
                </div>
              : <div style={{padding:"10px 16px",background:C.amberLight,borderRadius:12}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.amber}}>⏳ PENDING SIGNATURE</div>
                </div>
            }
          </div>
        </div>
      </Card>
    </div>
  );
}
