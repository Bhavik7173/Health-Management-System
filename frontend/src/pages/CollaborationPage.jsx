import { useState, useEffect, useRef } from "react";
import { C } from "../constants";
import { Card, Btn, Badge, Avatar, Input, PageHeader, StatCard, TabBar } from "../components/UI";
import { useAuth } from "../context/AuthContext";

const URGENCY_COL = { routine:C.blue, urgent:C.amber, emergency:C.coral };
const STATUS_COL  = { open:C.accent, resolved:"#8b5cf6", closed:C.textLight, pending:C.amber };
const ROLE_COL    = { doctor:C.blue, radiologist:C.accent, admin:C.coral, lab_tech:C.amber };

const SEED_CASES = [
  {
    id:"c1", title:"Unusual chest opacity — second opinion needed",
    patient_name:"Sarah Johnson", scan_type:"xray", diagnosis:"Pneumonia vs. Malignancy",
    description:"PA chest film shows right upper lobe opacity — not typical pneumonia distribution. Requesting radiologist and oncologist second opinion before starting treatment.",
    urgency:"urgent", specialties:["Radiology","Oncology"],
    created_by_name:"Dr. Lida Gutierrez", created_at:"2026-05-23T09:00:00", status:"open",
    comments:[
      {id:"cm1",author:"Dr. Mayme Gomez",role:"radiologist",text:"Reviewed the scan. The opacity has irregular margins — I'd recommend CT chest for further characterisation. Malignancy cannot be excluded.",created_at:"2026-05-23T09:30:00"},
      {id:"cm2",author:"Dr. Alma Reed",role:"doctor",text:"Agree with radiology. CT + PET scan recommended. Will arrange bronchoscopy if CT confirms suspicious mass.",created_at:"2026-05-23T10:00:00"},
    ],
    second_opinions:[
      {id:"so1",requested_by:"Dr. Lida Gutierrez",requested_from:"Dr. Alma Reed",specialty:"Oncology",message:"Please review imaging and advise on malignancy risk.",status:"completed",response:"High suspicion of primary lung malignancy. Recommend urgent staging workup."},
    ],
    viewers:["d1","d2"],
  },
  {
    id:"c2", title:"Paediatric brain MRI — Grade 2 Glioma confirmed",
    patient_name:"James Lee", scan_type:"mri", diagnosis:"Grade 2 Glioma",
    description:"72-year-old male with 6 weeks of headaches. MRI shows 4.2cm left temporal mass with ring enhancement. Urgent neurosurgical and oncology input required.",
    urgency:"emergency", specialties:["Neurosurgery","Oncology","Radiology"],
    created_by_name:"Dr. Christina Frazier", created_at:"2026-05-22T14:00:00", status:"open",
    comments:[
      {id:"cm3",author:"Dr. Mayme Gomez",role:"radiologist",text:"MRI reviewed in detail. Ring-enhancing lesion with mass effect — Grade 3-4 glioma most likely. Spectroscopy shows elevated choline.",created_at:"2026-05-22T15:00:00"},
    ],
    second_opinions:[],
    viewers:["d3"],
  },
  {
    id:"c3", title:"TB contact tracing — ward exposure",
    patient_name:"Tom Chen", scan_type:"xray", diagnosis:"Active Pulmonary TB",
    description:"Patient admitted with confirmed active TB. Requesting infection control guidance and contact tracing for ward staff exposed over past 2 weeks.",
    urgency:"emergency", specialties:["Infectious Disease","Infection Control"],
    created_by_name:"Dr. Mayme Gomez", created_at:"2026-05-21T08:00:00", status:"resolved",
    comments:[
      {id:"cm4",author:"Dr. Lida Gutierrez",role:"doctor",text:"Isolation protocol initiated. All direct-contact staff have been notified and screened.",created_at:"2026-05-21T09:00:00"},
    ],
    second_opinions:[],
    viewers:["d1","d2","d3"],
  },
];

const SEED_SHARED = [
  {id:"s1",patient_name:"Sarah Johnson",scan_type:"XRAY",shared_by:"Dr. Lida Gutierrez",message:"Please review this X-ray urgently.",created_at:"2026-05-23T09:00:00"},
  {id:"s2",patient_name:"James Lee",scan_type:"MRI",shared_by:"Dr. Christina Frazier",message:"Glioma MRI — requesting second read.",created_at:"2026-05-22T14:00:00"},
];

const DOCTORS = [
  {name:"Dr. Lida Gutierrez",  specialty:"Heart Surgery",  avatar:"LG", color:C.coral},
  {name:"Dr. Mayme Gomez",     specialty:"Radiology",      avatar:"MG", color:C.blue},
  {name:"Dr. Christina Frazier",specialty:"Neurology",     avatar:"CF", color:C.accent},
  {name:"Dr. Alma Reed",       specialty:"Oncology",       avatar:"AR", color:C.amber},
];

export default function CollaborationPage() {
  const { user } = useAuth();
  const [tab,         setTab]         = useState("cases");
  const [cases,       setCases]       = useState([]);
  const [sharedScans, setSharedScans] = useState([]);
  const [doctors,     setDoctors]     = useState([]);
  const [selCase,     setSelCase]     = useState(null);
  const [showNewCase, setShowNewCase] = useState(false);
  const [showShare,   setShowShare]   = useState(false);
  const [showOpinion, setShowOpinion] = useState(null);
  const [comment,     setComment]     = useState("");
  const [filterUrgency,setFilterUrgency]=useState("all");
  const [filterStatus, setFilterStatus]=useState("all");
  const [searchQ,     setSearchQ]     = useState("");
  const [successMsg,  setSuccessMsg]  = useState("");
  const commentRef = useRef(null);

  useEffect(() => {
    import("../services/api").then(({ doctorService, collaborationService }) => {
      doctorService?.list?.().then(d => setDoctors(d || [])).catch(() => {});
      collaborationService?.listCases?.().then(d => setCases(d || [])).catch(() => {});
      collaborationService?.getSharedScans?.().then(d => setSharedScans(d || [])).catch(() => {});
    });
  }, []);

  // New case form
  const [caseForm, setCaseForm] = useState({
    title:"", patient_name:"", scan_type:"xray", diagnosis:"",
    description:"", urgency:"routine", specialties:"",
  });
  // Share scan form
  const [shareForm, setShareForm] = useState({ patient_name:"", scan_type:"XRAY", message:"" });
  // Second opinion form
  const [opinionForm, setOpinionForm] = useState({ doctor_name:"", specialty:"", message:"" });

  const flash = msg => { setSuccessMsg(msg); setTimeout(()=>setSuccessMsg(""),3500); };

  const filteredCases = cases.filter(c=>
    (filterUrgency==="all"||c.urgency===filterUrgency) &&
    (filterStatus==="all"||c.status===filterStatus) &&
    (!searchQ||c.title.toLowerCase().includes(searchQ.toLowerCase())||c.patient_name.toLowerCase().includes(searchQ.toLowerCase()))
  );

  const stats = {
    total:    cases.length,
    open:     cases.filter(c=>c.status==="open").length,
    urgent:   cases.filter(c=>c.urgency==="urgent"||c.urgency==="emergency").length,
    resolved: cases.filter(c=>c.status==="resolved").length,
  };

  const handleNewCase = () => {
    const nc = {
      id:"c"+Date.now(), ...caseForm,
      specialties: caseForm.specialties.split(",").map(s=>s.trim()).filter(Boolean),
      created_by_name: user?.name||"Dr. Unknown",
      created_at: new Date().toISOString(),
      status:"open", comments:[], second_opinions:[], viewers:[],
    };
    setCases(p=>[nc,...p]);
    setShowNewCase(false);
    setCaseForm({title:"",patient_name:"",scan_type:"xray",diagnosis:"",description:"",urgency:"routine",specialties:""});
    setSelCase(nc); setTab("cases");
    flash("✅ Case discussion created");
    import("../services/api").then(({collaborationService})=>collaborationService?.createCase?.(nc).catch(()=>{}));
  };

  const handleComment = () => {
    if (!comment.trim()||!selCase) return;
    const cm = {id:"cm"+Date.now(),author:user?.name||"Doctor",role:user?.role||"doctor",text:comment.trim(),created_at:new Date().toISOString()};
    const updated = {...selCase, comments:[...selCase.comments,cm]};
    setCases(p=>p.map(c=>c.id===selCase.id?updated:c));
    setSelCase(updated);
    setComment("");
    import("../services/api").then(({collaborationService})=>collaborationService?.addComment?.(selCase.id,{text:cm.text}).catch(()=>{}));
  };

  const handleOpinion = () => {
    if(!opinionForm.doctor_name||!selCase) return;
    const op = {id:"so"+Date.now(),requested_by:user?.name,status:"pending",...opinionForm};
    const updated = {...selCase,second_opinions:[...selCase.second_opinions,op]};
    setCases(p=>p.map(c=>c.id===selCase.id?updated:c));
    setSelCase(updated);
    setShowOpinion(null);
    setOpinionForm({doctor_name:"",specialty:"",message:""});
    flash("✅ Second opinion requested");
  };

  const handleShare = () => {
    const ns = {id:"s"+Date.now(),...shareForm,shared_by:user?.name,created_at:new Date().toISOString()};
    setSharedScans(p=>[ns,...p]);
    setShowShare(false);
    setShareForm({patient_name:"",scan_type:"XRAY",message:""});
    flash("✅ Scan shared with team");
    import("../services/api").then(({collaborationService})=>collaborationService?.shareScan?.(ns).catch(()=>{}));
  };

  const updateCaseStatus = (id,status) => {
    setCases(p=>p.map(c=>c.id===id?{...c,status}:c));
    if(selCase?.id===id) setSelCase(s=>({...s,status}));
    import("../services/api").then(({collaborationService})=>collaborationService?.updateCaseStatus?.(id,status).catch(()=>{}));
  };

  // ── Case detail view ──
  if (selCase) return (
    <div className="page-enter">
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
        <button onClick={()=>setSelCase(null)} style={{width:40,height:40,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:18}}>←</button>
        <div style={{flex:1}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text}}>{selCase.title}</h2>
          <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
            <Badge label={selCase.urgency} color={URGENCY_COL[selCase.urgency]||C.blue}/>
            <Badge label={selCase.status}  color={STATUS_COL[selCase.status]||C.textLight}/>
            <span style={{fontSize:12,color:C.textLight}}>by {selCase.created_by_name}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {selCase.status==="open" && <Btn variant="ghost" onClick={()=>updateCaseStatus(selCase.id,"resolved")} style={{borderRadius:10,fontSize:12}}>✅ Resolve</Btn>}
          <Btn onClick={()=>setShowOpinion(true)} style={{borderRadius:10,fontSize:12}}>🔎 Request Opinion</Btn>
        </div>
      </div>

      {successMsg && <div style={{background:C.accentLight,border:`1px solid ${C.accent}44`,borderRadius:12,padding:"10px 16px",marginBottom:14,fontSize:13,color:C.accent,fontWeight:700}}>{successMsg}</div>}

      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20}}>
        {/* Main discussion */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Case info */}
          <Card style={{borderLeft:`4px solid ${URGENCY_COL[selCase.urgency]||C.blue}`}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              {[["👤 Patient",selCase.patient_name],["🔬 Scan Type",(selCase.scan_type||"").toUpperCase()],["🏥 Diagnosis",selCase.diagnosis||"—"],["📅 Created",selCase.created_at?.slice(0,10)]].map(([k,v])=>(
                <div key={k} style={{background:C.cardAlt,borderRadius:10,padding:"10px 14px"}}>
                  <div style={{fontSize:10,color:C.textLight,fontWeight:700,marginBottom:3}}>{k}</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{v}</div>
                </div>
              ))}
            </div>
            {selCase.specialties?.length>0 && (
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                <span style={{fontSize:11,color:C.textLight,fontWeight:600}}>Invited:</span>
                {selCase.specialties.map(s=><span key={s} style={{background:C.blueLight,color:C.blue,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{s}</span>)}
              </div>
            )}
            <div style={{fontSize:13,color:C.textMed,lineHeight:1.7,background:C.cardAlt,borderRadius:10,padding:"12px 16px"}}>{selCase.description}</div>
          </Card>

          {/* Comments thread */}
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:14}}>
              💬 Discussion ({selCase.comments.length})
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
              {selCase.comments.length===0
                ? <div style={{textAlign:"center",padding:24,color:C.textLight,fontSize:13}}>No comments yet — be the first to contribute</div>
                : selCase.comments.map(cm=>(
                  <div key={cm.id} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <Avatar initials={cm.author.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()} color={ROLE_COL[cm.role]||C.blue} size={38}/>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:5}}>
                        <span style={{fontSize:13,fontWeight:700,color:C.text}}>{cm.author}</span>
                        <Badge label={cm.role} color={ROLE_COL[cm.role]||C.blue}/>
                        <span style={{fontSize:11,color:C.textLight}}>{cm.created_at?.slice(0,16).replace("T"," ")}</span>
                      </div>
                      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"0 14px 14px 14px",padding:"12px 16px",fontSize:13,color:C.text,lineHeight:1.6,boxShadow:C.shadow}}>
                        {cm.text}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* Comment composer */}
            <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
              <Avatar initials={user?.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()||"Me"} color={C.accent} size={38}/>
              <div style={{flex:1,position:"relative"}}>
                <textarea ref={commentRef} value={comment} onChange={e=>setComment(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleComment();}}}
                  placeholder="Add your clinical comment… (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  style={{width:"100%",background:"#fff",border:`1.5px solid ${comment?C.accent:C.border}`,borderRadius:14,padding:"12px 50px 12px 16px",fontSize:13,color:C.text,outline:"none",resize:"none",fontFamily:"Nunito,sans-serif",lineHeight:1.5}}
                />
                <button onClick={handleComment} disabled={!comment.trim()}
                  style={{position:"absolute",right:8,bottom:8,width:36,height:36,borderRadius:10,background:comment.trim()?C.accent:C.border,border:"none",cursor:comment.trim()?"pointer":"default",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  ➤
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: second opinions + participants */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Second opinions */}
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:C.text}}>🔎 Second Opinions</h3>
              <button onClick={()=>setShowOpinion(true)} style={{fontSize:11,color:C.accent,background:C.accentLight,border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontWeight:700}}>+ Request</button>
            </div>
            {selCase.second_opinions.length===0
              ? <div style={{fontSize:12,color:C.textLight,textAlign:"center",padding:16}}>No second opinions yet</div>
              : selCase.second_opinions.map(op=>(
                <div key={op.id} style={{padding:"12px",background:C.cardAlt,borderRadius:12,marginBottom:8,borderLeft:`3px solid ${op.status==="completed"?C.accent:C.amber}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:700,color:C.text}}>{op.requested_from||op.doctor_name}</span>
                    <Badge label={op.status} color={op.status==="completed"?C.accent:C.amber}/>
                  </div>
                  <div style={{fontSize:11,color:C.textLight,marginBottom:op.response?6:0}}>{op.specialty}</div>
                  {op.response && <div style={{fontSize:12,color:C.textMed,background:"#fff",borderRadius:8,padding:"8px 10px",lineHeight:1.5}}>{op.response}</div>}
                  {!op.response && <div style={{fontSize:11,color:C.amber,fontStyle:"italic"}}>{op.message}</div>}
                </div>
              ))
            }
          </Card>

          {/* Participants */}
          <Card>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:C.text,marginBottom:12}}>👥 Participants</h3>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[...new Set(selCase.comments.map(c=>c.author))].concat([selCase.created_by_name]).filter((v,i,a)=>a.indexOf(v)===i).map(name=>{
                const cm = selCase.comments.find(c=>c.author===name);
                const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
                return (
                  <div key={name} style={{display:"flex",gap:10,alignItems:"center"}}>
                    <Avatar initials={initials} color={ROLE_COL[cm?.role]||C.blue} size={32}/>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:C.text}}>{name}</div>
                      <div style={{fontSize:10,color:C.textLight}}>{cm?.role||"author"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Second Opinion Modal */}
      {showOpinion&&(
        <Modal title="🔎 Request Second Opinion" onClose={()=>setShowOpinion(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em",display:"block",marginBottom:8}}>SELECT DOCTOR</label>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {doctors.length === 0 && (
                  <div style={{padding:"12px 14px",background:C.cardAlt,borderRadius:10,fontSize:12,color:C.textLight}}>Loading doctors…</div>
                )}
                {doctors.map(d=>(
                  <button key={d.id || d.name} onClick={()=>setOpinionForm(f=>({...f,doctor_name:d.name,specialty:d.specialty}))}
                    style={{display:"flex",gap:10,alignItems:"center",padding:"10px 14px",borderRadius:12,border:`2px solid ${opinionForm.doctor_name===d.name?d.color:C.border}`,background:opinionForm.doctor_name===d.name?d.color+"12":"#fff",cursor:"pointer",textAlign:"left"}}>
                    <Avatar initials={d.avatar} color={d.color} size={34}/>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:C.text}}>{d.name}</div>
                      <div style={{fontSize:11,color:C.textLight}}>{d.specialty}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>MESSAGE</label>
              <textarea value={opinionForm.message} onChange={e=>setOpinionForm(f=>({...f,message:e.target.value}))} rows={3}
                placeholder="Describe what you need them to review…"
                style={{background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px",fontSize:13,outline:"none",resize:"none",fontFamily:"Nunito,sans-serif"}}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn onClick={handleOpinion} disabled={!opinionForm.doctor_name} style={{flex:1,borderRadius:12,padding:"12px"}}>Send Request</Btn>
              <Btn variant="outline" onClick={()=>setShowOpinion(false)} style={{borderRadius:12,padding:"12px 18px"}}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );

  // ── Cases list ──
  return (
    <div className="page-enter">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <PageHeader title="👥 Doctor Collaboration" subtitle="Case discussions · Second opinions · Scan sharing"/>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" onClick={()=>setShowShare(true)} style={{borderRadius:12}}>📤 Share Scan</Btn>
          <Btn onClick={()=>setShowNewCase(true)} style={{borderRadius:12}}>+ New Case</Btn>
        </div>
      </div>

      {successMsg&&<div style={{background:C.accentLight,border:`1px solid ${C.accent}44`,borderRadius:12,padding:"10px 16px",marginBottom:14,fontSize:13,color:C.accent,fontWeight:700}}>{successMsg}</div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        <StatCard label="Total Cases"    value={stats.total}    icon="📋" color={C.blue}  bg={C.blueLight}  />
        <StatCard label="Open"           value={stats.open}     icon="🔓" color={C.accent} bg={C.accentLight} />
        <StatCard label="Urgent/Emergency" value={stats.urgent} icon="🚨" color={C.coral} bg={C.coralLight}  />
        <StatCard label="Resolved"       value={stats.resolved} icon="✅" color="#8b5cf6" bg="#f3f0ff"/>
      </div>

      <TabBar tabs={[["cases","📋 Case Discussions"],["shared","📤 Shared Scans"]]} active={tab} onChange={setTab}/>

      {tab==="cases"&&(
        <>
          <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{position:"relative",flex:1,minWidth:200}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}>🔍</span>
              <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search cases or patients…"
                style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:14,padding:"10px 14px 10px 36px",fontSize:13,outline:"none"}}/>
            </div>
            {["all","routine","urgent","emergency"].map(u=>(
              <button key={u} onClick={()=>setFilterUrgency(u)}
                style={{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${filterUrgency===u?(URGENCY_COL[u]||C.blue):C.border}`,background:filterUrgency===u?(URGENCY_COL[u]||C.blue):"#fff",color:filterUrgency===u?"#fff":C.textMed,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {u.charAt(0).toUpperCase()+u.slice(1)}
              </button>
            ))}
            {["all","open","resolved","closed"].map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)}
                style={{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${filterStatus===s?(STATUS_COL[s]||C.blue):C.border}`,background:filterStatus===s?(STATUS_COL[s]||C.blue):"#fff",color:filterStatus===s?"#fff":C.textMed,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {filteredCases.map(c=>(
              <Card key={c.id} hover onClick={()=>setSelCase(c)} style={{cursor:"pointer",borderLeft:`4px solid ${URGENCY_COL[c.urgency]||C.blue}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:4}}>{c.title}</div>
                    <div style={{fontSize:12,color:C.textLight}}>👤 {c.patient_name} · by {c.created_by_name} · {c.created_at?.slice(0,10)}</div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:16}}>
                    <Badge label={c.urgency}  color={URGENCY_COL[c.urgency]||C.blue}/>
                    <Badge label={c.status}   color={STATUS_COL[c.status]||C.textLight}/>
                  </div>
                </div>
                <div style={{fontSize:13,color:C.textMed,lineHeight:1.6,marginBottom:10}}>{c.description?.slice(0,120)}{c.description?.length>120?"…":""}</div>
                <div style={{display:"flex",gap:12,fontSize:12,color:C.textLight}}>
                  <span>💬 {c.comments?.length||0} comments</span>
                  <span>🔎 {c.second_opinions?.length||0} opinions</span>
                  {c.specialties?.length>0&&<span>👥 {c.specialties.join(", ")}</span>}
                </div>
              </Card>
            ))}
            {filteredCases.length===0&&(
              <Card style={{textAlign:"center",padding:48}}>
                <div style={{fontSize:40,marginBottom:12}}>📋</div>
                <div style={{fontSize:14,color:C.textLight,marginBottom:16}}>No case discussions found</div>
                <Btn onClick={()=>setShowNewCase(true)} style={{borderRadius:12}}>Start First Case</Btn>
              </Card>
            )}
          </div>
        </>
      )}

      {tab==="shared"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {sharedScans.map(s=>(
            <Card key={s.id} hover>
              <div style={{display:"flex",gap:14,alignItems:"center"}}>
                <div style={{width:52,height:52,borderRadius:14,background:C.blueLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>
                  {s.scan_type==="MRI"?"🧲":s.scan_type==="CT"?"💿":"☢️"}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:800,color:C.text}}>{s.patient_name}</div>
                  <div style={{fontSize:12,color:C.textLight,marginTop:2}}>Shared by {s.shared_by} · {s.created_at?.slice(0,10)}</div>
                  <div style={{fontSize:13,color:C.textMed,marginTop:4}}>{s.message}</div>
                </div>
                <Badge label={s.scan_type} color={C.blue}/>
              </div>
            </Card>
          ))}
          {sharedScans.length===0&&<Card style={{textAlign:"center",padding:48}}><div style={{fontSize:40,marginBottom:12}}>📤</div><div style={{fontSize:14,color:C.textLight}}>No shared scans yet</div></Card>}
        </div>
      )}

      {/* New Case Modal */}
      {showNewCase&&(
        <Modal title="📋 New Case Discussion" onClose={()=>setShowNewCase(false)}>
          <Input label="CASE TITLE" value={caseForm.title} onChange={v=>setCaseForm(f=>({...f,title:v}))} placeholder="Brief clinical question or issue" icon="📋"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Input label="PATIENT NAME" value={caseForm.patient_name} onChange={v=>setCaseForm(f=>({...f,patient_name:v}))} placeholder="Patient name" icon="👤"/>
            <Input label="DIAGNOSIS" value={caseForm.diagnosis} onChange={v=>setCaseForm(f=>({...f,diagnosis:v}))} placeholder="Working diagnosis" icon="🔬"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <SelectF label="URGENCY" value={caseForm.urgency} onChange={v=>setCaseForm(f=>({...f,urgency:v}))} options={["routine","urgent","emergency"]}/>
            <SelectF label="SCAN TYPE" value={caseForm.scan_type} onChange={v=>setCaseForm(f=>({...f,scan_type:v}))} options={["xray","mri","ct","ultrasound","none"]}/>
          </div>
          <TextAreaF label="DESCRIPTION" value={caseForm.description} onChange={v=>setCaseForm(f=>({...f,description:v}))} placeholder="Describe the case, specific concerns, what input you need…" rows={4}/>
          <Input label="INVITE SPECIALTIES (comma-separated)" value={caseForm.specialties} onChange={v=>setCaseForm(f=>({...f,specialties:v}))} placeholder="e.g. Radiology, Oncology" icon="👥"/>
          <div style={{display:"flex",gap:10,marginTop:4}}>
            <Btn onClick={handleNewCase} disabled={!caseForm.title||!caseForm.description} style={{flex:1,borderRadius:12,padding:"12px"}}>Create Case</Btn>
            <Btn variant="outline" onClick={()=>setShowNewCase(false)} style={{borderRadius:12,padding:"12px 18px"}}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* Share Scan Modal */}
      {showShare&&(
        <Modal title="📤 Share Scan" onClose={()=>setShowShare(false)}>
          <Input label="PATIENT NAME" value={shareForm.patient_name} onChange={v=>setShareForm(f=>({...f,patient_name:v}))} placeholder="Patient name" icon="👤"/>
          <SelectF label="SCAN TYPE" value={shareForm.scan_type} onChange={v=>setShareForm(f=>({...f,scan_type:v}))} options={["XRAY","MRI","CT","ULTRASOUND"]}/>
          <TextAreaF label="MESSAGE" value={shareForm.message} onChange={v=>setShareForm(f=>({...f,message:v}))} placeholder="What do you need the team to review?" rows={3}/>
          <div style={{display:"flex",gap:10,marginTop:4}}>
            <Btn onClick={handleShare} disabled={!shareForm.patient_name} style={{flex:1,borderRadius:12,padding:"12px"}}>Share with Team</Btn>
            <Btn variant="outline" onClick={()=>setShowShare(false)} style={{borderRadius:12,padding:"12px 18px"}}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({title,onClose,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,backdropFilter:"blur(4px)"}}>
      <Card style={{width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.textLight}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>{children}</div>
      </Card>
    </div>
  );
}
function SelectF({label,value,onChange,options}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"11px 14px",fontSize:13,color:C.text,outline:"none",cursor:"pointer"}}>
        {options.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
      </select>
    </div>
  );
}
function TextAreaF({label,value,onChange,placeholder,rows=3}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>{label}</label>
      <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 14px",fontSize:13,color:C.text,outline:"none",resize:"vertical",fontFamily:"Nunito,sans-serif",lineHeight:1.6}}/>
    </div>
  );
}
const STATUS_COL_LOCAL={confirmed:C.accent,pending:C.blue,cancelled:C.coral,completed:"#8b5cf6"};
