import { useState, useEffect, useRef } from "react";
import { C, statusColor } from "../constants";
import { Card, Btn, Badge, TabBar, PageHeader, StatCard } from "../components/UI";
import { diagnosisService } from "../services/api";
import ImageViewer from "../components/ImageViewer";

// ── Hugging Face ───────────────────────────────────────────────────────────────
const HF_XRAY_MODEL = "nickmuchi/vit-finetuned-chest-xray-pneumonia";
const HF_API        = "https://api-inference.huggingface.co/models/";

function mapHFResult(rawLabel, score) {
  const label = rawLabel.toUpperCase();
  if (label.includes("PNEUMONIA")) return { disease:"Pneumonia",    status:"abnormal", confidence:score };
  if (label.includes("COVID"))     return { disease:"COVID-19",     status:"critical", confidence:score };
  if (label.includes("TUBERC"))    return { disease:"Tuberculosis", status:"critical", confidence:score };
  return                                  { disease:"Normal",       status:"normal",   confidence:score };
}

async function runHuggingFace(file, scanType) {
  if (scanType !== "xray" || !file) return null;
  const arrayBuf = await file.arrayBuffer();
  const res = await fetch(`${HF_API}${HF_XRAY_MODEL}`, {
    method:"POST", headers:{"Content-Type":"application/octet-stream"}, body:arrayBuf,
  });
  if (!res.ok) return null;
  const json = await res.json();
  const top  = Array.isArray(json) ? json[0] : null;
  return top ? mapHFResult(top.label, top.score) : null;
}

function localSimulate(scanType) {
  const tables = {
    xray:       [{disease:"Pneumonia",status:"abnormal",weight:3},{disease:"Tuberculosis",status:"critical",weight:2},{disease:"Pleural Effusion",status:"abnormal",weight:1},{disease:"Normal",status:"normal",weight:4}],
    mri:        [{disease:"Glioblastoma",status:"critical",weight:1},{disease:"Meningioma",status:"abnormal",weight:2},{disease:"Brain Tumor",status:"critical",weight:2},{disease:"Stroke",status:"critical",weight:1},{disease:"Normal",status:"normal",weight:4}],
    ct:         [{disease:"Lung Cancer",status:"critical",weight:1},{disease:"Emphysema",status:"abnormal",weight:2},{disease:"Pulmonary Embolism",status:"critical",weight:1},{disease:"Normal",status:"normal",weight:4}],
    ultrasound: [{disease:"Gallstones",status:"abnormal",weight:2},{disease:"Liver Cyst",status:"abnormal",weight:1},{disease:"Normal",status:"normal",weight:5}],
  };
  const pool = [];
  (tables[scanType]||tables.xray).forEach(r => { for(let i=0;i<r.weight;i++) pool.push(r); });
  const pick = pool[Math.floor(Math.random()*pool.length)];
  const ranges = { critical:[0.85,0.97], abnormal:[0.79,0.93], normal:[0.88,0.99] };
  const [lo,hi] = ranges[pick.status];
  return { ...pick, confidence:+(lo+Math.random()*(hi-lo)).toFixed(3) };
}

// ── DICOM-style metadata extraction from file ──────────────────────────────────
function extractMetadata(file) {
  if (!file) return null;
  const isDicom = file.name.toLowerCase().endsWith(".dcm");
  return {
    filename:    file.name,
    size:        (file.size / 1024).toFixed(1) + " KB",
    type:        isDicom ? "DICOM" : file.type.split("/")[1]?.toUpperCase() || "Unknown",
    modality:    isDicom ? "CR/DR" : "JPG/PNG",
    lastModified:new Date(file.lastModified).toLocaleString(),
    isDicom,
  };
}

const MOCK_SCANS = [
  { id:"1", patient_name:"Sarah Johnson",  scan_type:"xray",      disease:"Pneumonia",    confidence:0.94, status:"abnormal", source:"HuggingFace AI", doctor:"Dr. Lida Gutierrez",   created_at:"2026-05-20", preview:null },
  { id:"2", patient_name:"James Lee",      scan_type:"mri",       disease:"Brain Tumor",  confidence:0.97, status:"critical", source:"AI Model",       doctor:"Dr. Christina Frazier", created_at:"2026-05-19", preview:null },
  { id:"3", patient_name:"Maria Garcia",   scan_type:"ct",        disease:"Normal",       confidence:0.91, status:"normal",   source:"AI Model",       doctor:"Dr. Lida Gutierrez",   created_at:"2026-05-18", preview:null },
  { id:"4", patient_name:"Tom Chen",       scan_type:"xray",      disease:"Tuberculosis", confidence:0.88, status:"critical", source:"HuggingFace AI", doctor:"Dr. Mayme Gomez",       created_at:"2026-05-17", preview:null },
];

const SCAN_TYPES = [
  { id:"xray",      icon:"☢️",  label:"X-Ray",      hf:true,  desc:"Chest, Bone, Dental" },
  { id:"mri",       icon:"🧲",  label:"MRI",        hf:false, desc:"Brain, Spine, Joints" },
  { id:"ct",        icon:"💿",  label:"CT Scan",    hf:false, desc:"Abdomen, Chest, Head" },
  { id:"ultrasound",icon:"🔊",  label:"Ultrasound", hf:false, desc:"Organs, Obstetrics" },
];

export default function DiagnosisPage({ token }) {
  const [tab,         setTab]         = useState("list");
  const [scans,       setScans]       = useState([]);
  const [result,      setResult]      = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [aiStatus,    setAiStatus]    = useState("idle");
  const [aiLog,       setAiLog]       = useState([]);
  const [form,        setForm]        = useState({ patient_name:"", scan_type:"xray", notes:"", priority:"routine" });
  const [file,        setFile]        = useState(null);
  const [previewUrl,  setPreviewUrl]  = useState(null);
  const [metadata,    setMetadata]    = useState(null);
  const [viewerScan,  setViewerScan]  = useState(null);  // scan being viewed
  const [compareMode, setCompareMode] = useState(false);
  const [compareScan, setCompareScan] = useState(null);
  const [filterStatus,setFilterStatus]= useState("all");
  const [filterType,  setFilterType]  = useState("all");
  const [searchQ,     setSearchQ]     = useState("");

  useEffect(() => {
    diagnosisService.getScans()
      .then(data => { if (data?.length) setScans(data); else setScans(MOCK_SCANS); })
      .catch(() => setScans(MOCK_SCANS));
  }, []);

  const stats = {
    total:    scans.length,
    critical: scans.filter(s=>s.status==="critical").length,
    abnormal: scans.filter(s=>s.status==="abnormal").length,
    normal:   scans.filter(s=>s.status==="normal").length,
  };

  const log = msg => setAiLog(l => [...l, { msg, time:new Date().toLocaleTimeString() }]);

  const runAnalysis = async () => {
    if (!form.patient_name) return;
    setUploading(true); setAiLog([]); setAiStatus("connecting"); setTab("result");

    log("📡 Initialising AI pipeline…");
    await new Promise(r => setTimeout(r, 350));

    let aiResult = null;

    try {
      log("🔗 Connecting to MediCore backend…");
      const data = await diagnosisService.uploadScan(form.patient_name, form.scan_type, file);
      aiResult = { ...data, source:"Backend AI" };
      log("✅ Backend returned result.");
    } catch {
      log("⚠️ Backend offline — switching to Hugging Face API…");
    }

    if (!aiResult && form.scan_type === "xray" && file) {
      try {
        setAiStatus("running");
        log(`🤗 Sending to HF model: ${HF_XRAY_MODEL}`);
        log("⏳ Model may take ~20s on cold start…");
        const hfRes = await runHuggingFace(file, form.scan_type);
        if (hfRes) {
          aiResult = { ...hfRes, source:"HuggingFace AI" };
          log(`✅ HuggingFace: ${hfRes.disease} (${(hfRes.confidence*100).toFixed(1)}%)`);
        } else log("⚠️ HF returned no data — using local simulation.");
      } catch { log("⚠️ HuggingFace unreachable — using local simulation."); }
    } else if (!aiResult && form.scan_type !== "xray") {
      log(`ℹ️ ${form.scan_type.toUpperCase()} — using local diagnostic simulation.`);
      await new Promise(r => setTimeout(r, 900));
    }

    if (!aiResult) {
      log("🔬 Running local diagnostic simulation…");
      await new Promise(r => setTimeout(r, 800));
      const sim = localSimulate(form.scan_type);
      aiResult = { ...sim, source:"Local AI Simulation" };
      log(`✅ Result: ${sim.disease} (${(sim.confidence*100).toFixed(1)}%)`);
    }

    if (form.priority === "urgent" || form.priority === "emergency") {
      log("🚨 Priority flag set — result escalated for urgent review.");
    }

    const final = {
      id: Date.now().toString(),
      patient_name: form.patient_name,
      scan_type:    form.scan_type,
      doctor:       "Dr. Lida Gutierrez",
      notes:        form.notes,
      priority:     form.priority,
      created_at:   new Date().toISOString().slice(0,10),
      preview:      previewUrl,
      metadata,
      ...aiResult,
    };

    log(`🏁 Analysis complete — ${final.status.toUpperCase()} | Priority: ${final.priority}`);
    setAiStatus("done");
    setResult(final);
    setScans(s => [final, ...s]);
    setUploading(false);
  };

  const handleFile = f => {
    setFile(f);
    setMetadata(f ? extractMetadata(f) : null);
    if (f && f.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(f));
    } else setPreviewUrl(null);
  };

  const filteredScans = scans.filter(s =>
    (filterStatus === "all" || s.status === filterStatus) &&
    (filterType   === "all" || s.scan_type === filterType) &&
    (!searchQ || s.patient_name?.toLowerCase().includes(searchQ.toLowerCase()) || s.disease?.toLowerCase().includes(searchQ.toLowerCase()))
  );

  // ── Image Viewer overlay ──
  if (viewerScan) return (
    <div style={{position:"fixed",inset:0,zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.9)",padding:16}}>
      <div style={{width:"100%",maxWidth:1400,height:"90vh"}}>
        <ImageViewer
          src={viewerScan.preview || `https://via.placeholder.com/800x600/1a1a2e/4CAF82?text=${viewerScan.scan_type.toUpperCase()}+SCAN`}
          scanType={viewerScan.scan_type}
          patientName={viewerScan.patient_name}
          compareWith={compareScan?.preview}
          onClose={() => { setViewerScan(null); setCompareScan(null); setCompareMode(false); }}
        />
      </div>
    </div>
  );

  return (
    <div className="page-enter">
      <PageHeader title="🧠 AI Medical Imaging" subtitle="X-Ray · MRI · CT · Ultrasound · Powered by Hugging Face" />

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        <StatCard label="Total Scans" value={stats.total}    icon="🔬" color={C.blue}  bg={C.blueLight}  />
        <StatCard label="Critical"    value={stats.critical} icon="🚨" color={C.coral} bg={C.coralLight} />
        <StatCard label="Abnormal"    value={stats.abnormal} icon="⚠️" color={C.amber} bg={C.amberLight}  />
        <StatCard label="Normal"      value={stats.normal}   icon="✅" color={C.accent} bg={C.accentLight} />
      </div>

      {/* HF badge */}
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:20,padding:"10px 16px",background:"#fff3cd",border:"1px solid #f5a62344",borderRadius:12}}>
        <span style={{fontSize:18}}>🤗</span>
        <div>
          <span style={{fontSize:12,fontWeight:700,color:"#92600a"}}>Hugging Face Active</span>
          <span style={{fontSize:12,color:"#92600a",marginLeft:8}}>X-Ray → <code style={{background:"#fff",padding:"1px 6px",borderRadius:4,fontSize:11}}>nickmuchi/vit-finetuned-chest-xray-pneumonia</code></span>
        </div>
      </div>

      <TabBar tabs={[["list","📋 Scan History"],["upload","⬆️ Upload Scan"],["result","🎯 AI Result"]]} active={tab} onChange={setTab} />

      {/* ── Upload Tab ── */}
      {tab === "upload" && <UploadTab form={form} setForm={setForm} file={file} handleFile={handleFile} previewUrl={previewUrl} metadata={metadata} uploading={uploading} onRun={runAnalysis} />}

      {/* ── Result Tab ── */}
      {tab === "result" && <ResultTab result={result} aiLog={aiLog} aiStatus={aiStatus} onUpload={()=>setTab("upload")} onView={()=>result && setViewerScan(result)} />}

      {/* ── List Tab ── */}
      {tab === "list" && (
        <>
          {/* Filters */}
          <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{position:"relative",flex:1,minWidth:200}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}>🔍</span>
              <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search patient or finding…"
                style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:14,padding:"10px 14px 10px 36px",fontSize:13,outline:"none"}} />
            </div>
            {["all","normal","abnormal","critical"].map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)}
                style={{padding:"9px 16px",borderRadius:20,border:`1.5px solid ${filterStatus===s?(statusColor[s]||C.blue):C.border}`,background:filterStatus===s?(statusColor[s]||C.blue):"#fff",color:filterStatus===s?"#fff":C.textMed,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
            <select value={filterType} onChange={e=>setFilterType(e.target.value)}
              style={{padding:"10px 14px",borderRadius:20,border:`1.5px solid ${C.border}`,background:"#fff",fontSize:12,fontWeight:600,color:C.textMed,outline:"none",cursor:"pointer"}}>
              <option value="all">All Types</option>
              {SCAN_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <Btn onClick={()=>setTab("upload")} style={{borderRadius:12}}>+ New Scan</Btn>
          </div>

          {/* Compare mode toggle */}
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16}}>
            <button onClick={()=>{setCompareMode(m=>!m);setCompareScan(null);}}
              style={{padding:"8px 16px",borderRadius:20,border:`1.5px solid ${compareMode?C.blue:C.border}`,background:compareMode?C.blueLight:"#fff",color:compareMode?C.blue:C.textMed,fontSize:12,fontWeight:700,cursor:"pointer"}}>
              ◫ {compareMode?"Exit Compare Mode":"Side-by-Side Compare"}
            </button>
            {compareMode && <span style={{fontSize:12,color:C.textLight}}>Select 2 scans to compare them side-by-side in the viewer</span>}
          </div>

          {/* Scan cards grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
            {filteredScans.map((s,i) => {
              const col     = statusColor[s.status] || C.textLight;
              const isSelected = compareMode && (compareScan?.id === s.id || viewerScan?.id === s.id);
              return (
                <Card key={s.id} hover style={{borderLeft:`4px solid ${col}`,cursor:"pointer",border:isSelected?`2px solid ${C.blue}`:undefined}}
                  onClick={() => {
                    if (compareMode) {
                      if (!viewerScan)       { setViewerScan(s); }
                      else if (!compareScan) { setCompareScan(s); setTimeout(() => setViewerScan(prev=>({...prev})), 100); }
                    } else {
                      setViewerScan(s);
                    }
                  }}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:C.text}}>{s.patient_name}</div>
                      <div style={{fontSize:12,color:C.textLight,marginTop:2}}>👨‍⚕️ {s.doctor}</div>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <Badge label={s.status} color={col} />
                      <Badge label={(s.scan_type||"").toUpperCase()} color={C.blue} />
                    </div>
                  </div>

                  {/* Scan thumbnail or placeholder */}
                  <div style={{height:90,borderRadius:10,overflow:"hidden",background:"#0d0d0d",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                    {s.preview
                      ? <img src={s.preview} alt="scan" style={{width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.9) contrast(1.1)"}} />
                      : <div style={{textAlign:"center"}}>
                          <div style={{fontSize:28,marginBottom:4}}>{SCAN_TYPES.find(t=>t.id===s.scan_type)?.icon||"🔬"}</div>
                          <div style={{fontSize:10,color:"#94a3b8"}}>{(s.scan_type||"").toUpperCase()}</div>
                        </div>
                    }
                    <div style={{position:"absolute",bottom:4,right:4,background:"rgba(0,0,0,0.8)",color:"#94a3b8",fontSize:10,padding:"2px 6px",borderRadius:6}}>
                      Click to open viewer
                    </div>
                    {compareMode && isSelected && (
                      <div style={{position:"absolute",top:4,left:4,background:C.blue,color:"#fff",fontSize:10,padding:"2px 8px",borderRadius:6,fontWeight:700}}>
                        {viewerScan?.id===s.id?"A":"B"}
                      </div>
                    )}
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    <div style={{background:C.cardAlt,borderRadius:8,padding:"6px 10px"}}>
                      <div style={{fontSize:10,color:C.textLight}}>Finding</div>
                      <div style={{fontSize:11,fontWeight:700,color:C.text,marginTop:2}}>{s.disease}</div>
                    </div>
                    <div style={{background:C.cardAlt,borderRadius:8,padding:"6px 10px"}}>
                      <div style={{fontSize:10,color:C.textLight}}>Confidence</div>
                      <div style={{fontSize:11,fontWeight:700,color:C.accent,marginTop:2}}>{s.confidence?(s.confidence*100).toFixed(1)+"%":"—"}</div>
                    </div>
                    <div style={{background:C.cardAlt,borderRadius:8,padding:"6px 10px"}}>
                      <div style={{fontSize:10,color:C.textLight}}>Date</div>
                      <div style={{fontSize:11,fontWeight:700,color:C.text,marginTop:2}}>{s.created_at?.slice(0,10)}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
            {filteredScans.length === 0 && (
              <div style={{gridColumn:"1/-1"}}>
                <Card style={{textAlign:"center",padding:48}}>
                  <div style={{fontSize:40,marginBottom:12}}>🔍</div>
                  <div style={{fontSize:14,color:C.textLight}}>No scans match your filters</div>
                </Card>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Upload Tab ─────────────────────────────────────────────────────────────────
function UploadTab({ form, setForm, file, handleFile, previewUrl, metadata, uploading, onRun }) {
  const [dragging, setDragging] = useState(false);

  const onDrop = e => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <Card>
      <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text,marginBottom:20}}>Upload Medical Scan</h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>

        {/* Left */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Patient */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>PATIENT NAME</label>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16}}>👤</span>
              <input value={form.patient_name} onChange={e=>setForm(f=>({...f,patient_name:e.target.value}))}
                placeholder="Full patient name"
                style={{width:"100%",background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"12px 14px 12px 42px",fontSize:14,color:C.text,outline:"none"}} />
            </div>
          </div>

          {/* Scan type */}
          <div>
            <div style={{fontSize:12,color:C.textLight,fontWeight:600,marginBottom:8}}>SCAN TYPE</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {SCAN_TYPES.map(t => (
                <button key={t.id} onClick={()=>setForm(f=>({...f,scan_type:t.id}))}
                  style={{padding:"10px 8px",borderRadius:12,textAlign:"left",border:`1.5px solid ${form.scan_type===t.id?C.accent:C.border}`,background:form.scan_type===t.id?C.accentLight:"#fff",cursor:"pointer",transition:"all 0.18s"}}>
                  <div style={{fontSize:18,marginBottom:3}}>{t.icon}</div>
                  <div style={{fontSize:12,fontWeight:700,color:form.scan_type===t.id?C.accent:C.text}}>{t.label}</div>
                  <div style={{fontSize:10,color:C.textLight,marginTop:2}}>{t.desc}</div>
                  {t.hf && <div style={{fontSize:10,color:"#92600a",marginTop:3,fontWeight:700}}>🤗 HF model</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>PRIORITY</label>
            <div style={{display:"flex",gap:8}}>
              {[["routine","🟢","Routine"],["urgent","🟡","Urgent"],["emergency","🔴","Emergency"]].map(([v,icon,label])=>(
                <button key={v} onClick={()=>setForm(f=>({...f,priority:v}))}
                  style={{flex:1,padding:"8px",borderRadius:10,border:`1.5px solid ${form.priority===v?(v==="emergency"?C.coral:v==="urgent"?C.amber:C.accent):C.border}`,background:form.priority===v?(v==="emergency"?C.coralLight:v==="urgent"?C.amberLight:C.accentLight):"#fff",cursor:"pointer",fontSize:12,fontWeight:700,color:form.priority===v?(v==="emergency"?C.coral:v==="urgent"?C.amber:C.accent):C.textMed}}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>CLINICAL NOTES</label>
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
              placeholder="Symptoms, relevant history, reason for scan…" rows={3}
              style={{background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"12px 14px",fontSize:14,color:C.text,outline:"none",resize:"none",fontFamily:"Nunito,sans-serif"}} />
          </div>

          <Btn onClick={onRun} disabled={uploading||!form.patient_name}
            style={{padding:"13px 24px",borderRadius:14,fontSize:14}}>
            {uploading?"⏳ Analysing…":"🔬 Run AI Analysis"}
          </Btn>
        </div>

        {/* Right: drop zone + preview + metadata */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontSize:12,color:C.textLight,fontWeight:600}}>UPLOAD FILE</div>
          <div
            onDragOver={e=>{e.preventDefault();setDragging(true);}}
            onDragLeave={()=>setDragging(false)}
            onDrop={onDrop}
            onClick={()=>document.getElementById("scan-file").click()}
            style={{border:`2px dashed ${dragging?C.blue:file?C.accent:C.border}`,borderRadius:16,padding:"24px 16px",textAlign:"center",cursor:"pointer",background:dragging?C.blueLight:file?C.accentLight:C.cardAlt,transition:"all 0.2s"}}>
            <div style={{fontSize:32,marginBottom:8}}>{file?"📄":"📁"}</div>
            <div style={{fontSize:13,color:file?C.accent:C.textLight,fontWeight:file?700:400}}>
              {file ? file.name : "Drag & drop or click to upload"}
            </div>
            <div style={{fontSize:11,color:C.textLight,marginTop:4}}>DICOM · JPG · PNG · PDF · up to 50 MB</div>
            <input id="scan-file" type="file" accept=".dcm,.jpg,.png,.jpeg,.pdf" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])} />
          </div>

          {previewUrl && (
            <div style={{borderRadius:14,overflow:"hidden",border:`2px solid ${C.accent}44`}}>
              <img src={previewUrl} alt="Scan preview" style={{width:"100%",maxHeight:180,objectFit:"cover",display:"block",filter:"brightness(0.95) contrast(1.05)"}} />
              <div style={{padding:"6px 12px",background:C.accentLight,fontSize:11,color:C.accent,fontWeight:700}}>
                ✅ Image ready for AI analysis
              </div>
            </div>
          )}

          {/* DICOM Metadata */}
          {metadata && (
            <div style={{background:"#0f172a",borderRadius:12,padding:"12px 16px"}}>
              <div style={{fontSize:11,color:"#64748b",fontWeight:700,letterSpacing:"0.06em",marginBottom:8}}>FILE METADATA</div>
              {[["Filename",metadata.filename],["Size",metadata.size],["Format",metadata.type],["Modality",metadata.modality],["Modified",metadata.lastModified]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                  <span style={{color:"#475569"}}>{k}</span>
                  <span style={{color:"#94a3b8",fontWeight:600,maxWidth:140,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</span>
                </div>
              ))}
              {metadata.isDicom && <div style={{marginTop:6,padding:"4px 8px",background:"#1e3a5f",borderRadius:6,fontSize:11,color:"#60a5fa",fontWeight:700}}>✅ DICOM format detected</div>}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Result Tab ─────────────────────────────────────────────────────────────────
function ResultTab({ result, aiLog, aiStatus, onUpload, onView }) {
  if (!result && aiStatus==="idle") return (
    <Card style={{textAlign:"center",padding:56}}>
      <div style={{fontSize:52,marginBottom:14}}>🔬</div>
      <div style={{fontSize:16,color:C.textLight}}>No result yet — upload and analyse a scan first.</div>
      <Btn onClick={onUpload} style={{marginTop:18,borderRadius:12}}>Upload Scan</Btn>
    </Card>
  );

  const col = result ? (statusColor[result.status]||C.textLight) : C.textLight;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* AI terminal log */}
      {aiLog.length > 0 && (
        <Card style={{background:"#0f172a",padding:"16px 20px"}}>
          <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginBottom:10,letterSpacing:"0.08em"}}>AI INFERENCE LOG</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {aiLog.map((l,i)=>(
              <div key={i} style={{display:"flex",gap:10,fontSize:12,fontFamily:"monospace"}}>
                <span style={{color:"#475569",flexShrink:0}}>{l.time}</span>
                <span style={{color:l.msg.includes("✅")?"#4ade80":l.msg.includes("⚠️")?"#fbbf24":l.msg.includes("🚨")?"#f87171":"#94a3b8"}}>{l.msg}</span>
              </div>
            ))}
            {aiStatus==="running" && (
              <div style={{display:"flex",gap:8,alignItems:"center",marginTop:4}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#4ade80"}}/>
                <span style={{fontSize:12,color:"#4ade80",fontFamily:"monospace"}}>Processing…</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {result && (
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text}}>Analysis Result</h3>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{background:result.source?.includes("HuggingFace")?"#fff3cd":C.blueLight,color:result.source?.includes("HuggingFace")?"#92600a":C.blue,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>
                {result.source?.includes("HuggingFace")?"🤗 "+result.source:result.source||"AI"}
              </span>
              {result.priority && result.priority !== "routine" && (
                <span style={{background:result.priority==="emergency"?C.coralLight:C.amberLight,color:result.priority==="emergency"?C.coral:C.amber,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>
                  {result.priority==="emergency"?"🔴":"🟡"} {result.priority.charAt(0).toUpperCase()+result.priority.slice(1)}
                </span>
              )}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {result.preview && (
                <div style={{borderRadius:14,overflow:"hidden",border:`2px solid ${col}44`,marginBottom:4,position:"relative"}}>
                  <img src={result.preview} alt="Scan" style={{width:"100%",maxHeight:160,objectFit:"cover",display:"block"}} />
                  <button onClick={onView}
                    style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,0.8)",color:"#fff",border:"none",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                    🔍 Open Viewer
                  </button>
                </div>
              )}
              {!result.preview && (
                <Btn onClick={onView} variant="ghost" style={{borderRadius:12,marginBottom:4}}>🔍 Open Image Viewer</Btn>
              )}
              {[["Patient",result.patient_name],["Scan Type",(result.scan_type||"").toUpperCase()],["Analysed by",result.doctor],["Date",result.created_at]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",background:C.cardAlt,borderRadius:12}}>
                  <span style={{fontSize:12,color:C.textLight,fontWeight:600}}>{k}</span>
                  <span style={{fontSize:13,color:C.text,fontWeight:700}}>{v}</span>
                </div>
              ))}
              {result.notes && (
                <div style={{padding:"12px 14px",background:C.cardAlt,borderRadius:12}}>
                  <div style={{fontSize:12,color:C.textLight,fontWeight:600,marginBottom:4}}>Clinical Notes</div>
                  <div style={{fontSize:13,color:C.textMed,lineHeight:1.5}}>{result.notes}</div>
                </div>
              )}
            </div>

            <div style={{background:col+"10",borderRadius:20,padding:28,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",border:`2px solid ${col}33`}}>
              <div style={{fontSize:52,marginBottom:12}}>
                {result.status==="critical"?"🚨":result.status==="abnormal"?"⚠️":"✅"}
              </div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:col,marginBottom:10}}>
                {result.disease}
              </div>
              <Badge label={result.status} color={col} />
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:42,fontWeight:700,color:C.text,marginTop:20}}>
                {result.confidence?(result.confidence*100).toFixed(1)+"%":"—"}
              </div>
              <div style={{fontSize:12,color:C.textLight,marginTop:4}}>AI Confidence Score</div>
              <div style={{width:"100%",height:10,background:C.border,borderRadius:5,marginTop:14,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(result.confidence||0)*100}%`,background:`linear-gradient(90deg,${col}88,${col})`,borderRadius:5,transition:"width 1.4s ease"}} />
              </div>
              {result.status==="critical" && (
                <div style={{marginTop:16,padding:"10px 14px",background:C.coralLight,border:`1px solid ${C.coral}44`,borderRadius:12,fontSize:12,color:C.coral,fontWeight:700,width:"100%"}}>
                  🚨 Immediate clinical attention required
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
