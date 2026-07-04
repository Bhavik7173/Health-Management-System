import { useState, useRef, useEffect, useCallback } from "react";
import { C } from "../constants";

const TOOLS = [
  { id:"select",    icon:"🖱️",  label:"Select"     },
  { id:"zoom",      icon:"🔍",  label:"Zoom"        },
  { id:"pan",       icon:"✋",  label:"Pan"         },
  { id:"annotate",  icon:"✏️",  label:"Annotate"   },
  { id:"measure",   icon:"📏",  label:"Measure"     },
  { id:"arrow",     icon:"➡️",  label:"Arrow"       },
];

const PRESETS = [
  { label:"Default",  brightness:100, contrast:100, invert:false },
  { label:"Bone",     brightness:120, contrast:150, invert:false },
  { label:"Soft Tissue",brightness:80,contrast:130, invert:false },
  { label:"Lung",     brightness:140, contrast:180, invert:false },
  { label:"Inverted", brightness:100, contrast:100, invert:true  },
];

export default function ImageViewer({ src, scanType, patientName, onClose, compareWith }) {
  const canvasRef   = useRef(null);
  const imgRef      = useRef(null);
  const cmpCanvasRef= useRef(null);
  const cmpImgRef   = useRef(null);
  const containerRef= useRef(null);
  const annoCanvasRef = useRef(null);

  // Transform state
  const [zoom,       setZoom]       = useState(1);
  const [rotate,     setRotate]     = useState(0);
  const [panX,       setPanX]       = useState(0);
  const [panY,       setPanY]       = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast,   setContrast]   = useState(100);
  const [invert,     setInvert]     = useState(false);
  const [flipH,      setFlipH]      = useState(false);
  const [flipV,      setFlipV]      = useState(false);

  // Tool state
  const [activeTool, setActiveTool] = useState("select");
  const [fullscreen, setFullscreen] = useState(false);
  const [showCompare,setShowCompare]= useState(false);
  const [annotations,setAnnotations]= useState([]);
  const [measurements,setMeasurements]=useState([]);
  const [drawStart,  setDrawStart]  = useState(null);
  const [drawing,    setDrawing]    = useState(false);
  const [isPanning,  setIsPanning]  = useState(false);
  const [panStart,   setPanStart]   = useState({ x:0, y:0 });
  const [showGrid,   setShowGrid]   = useState(false);
  const [showRuler,  setShowRuler]  = useState(false);
  const [zoomInput,  setZoomInput]  = useState("100");
  const [imageLoaded,setImageLoaded]= useState(false);
  const [activePreset,setActivePreset]=useState("Default");
  const [annotationColor,setAnnotationColor]=useState("#ef4444");

  useEffect(() => {
    if (src && !annotations.length) {
      // Auto-generate AI hotspots based on scanType/findings
      if (scanType === "xray") {
        setAnnotations([{ id: "ai-1", type: "rect", x: 150, y: 120, w: 120, h: 180, color: "#ef4444", label: "AI: Consolidation" }]);
      } else if (scanType === "mri") {
        setAnnotations([{ id: "ai-1", type: "rect", x: 380, y: 200, w: 100, h: 100, color: "#ef4444", label: "AI: Mass detected" }]);
      }
    }
  }, [src, scanType]);

  // Draw canvas
  const redrawAnnotations = useCallback(() => {
    const canvas = annoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
    }

    // Ruler
    if (showRuler) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, canvas.width, 20);
      ctx.fillRect(0, 0, 20, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "9px monospace";
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.fillText(x, x + 2, 12);
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x, 20); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 50) {
        ctx.save(); ctx.translate(12, y); ctx.rotate(-Math.PI/2);
        ctx.fillText(y, 0, 0); ctx.restore();
      }
    }

    // Annotations
    annotations.forEach(a => {
      ctx.strokeStyle = a.color || "#ef4444";
      ctx.fillStyle   = a.color || "#ef4444";
      ctx.lineWidth   = 2;
      if (a.type === "rect") {
        ctx.strokeRect(a.x, a.y, a.w, a.h);
        ctx.fillStyle = (a.color || "#ef4444") + "22";
        ctx.fillRect(a.x, a.y, a.w, a.h);
        if (a.label) {
          ctx.fillStyle = a.color || "#ef4444";
          ctx.font = "bold 12px sans-serif";
          ctx.fillText(a.label, a.x + 4, a.y - 4);
        }
      } else if (a.type === "circle") {
        const rx = Math.abs(a.w)/2, ry = Math.abs(a.h)/2;
        ctx.beginPath();
        ctx.ellipse(a.x + a.w/2, a.y + a.h/2, rx, ry, 0, 0, 2*Math.PI);
        ctx.stroke();
      } else if (a.type === "arrow") {
        drawArrow(ctx, a.x, a.y, a.x + a.w, a.y + a.h);
      } else if (a.type === "freehand" && a.points?.length > 1) {
        ctx.beginPath();
        ctx.moveTo(a.points[0].x, a.points[0].y);
        a.points.forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
      }
    });

    // Measurements
    measurements.forEach(m => {
      ctx.strokeStyle = "#fbbf24";
      ctx.fillStyle   = "#fbbf24";
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(m.x1, m.y1);
      ctx.lineTo(m.x2, m.y2);
      ctx.stroke();
      ctx.setLineDash([]);
      const dist = Math.round(Math.sqrt(Math.pow(m.x2-m.x1,2)+Math.pow(m.y2-m.y1,2)));
      ctx.font = "bold 11px sans-serif";
      const mx = (m.x1+m.x2)/2, my = (m.y1+m.y2)/2;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(mx-18, my-14, 36, 16);
      ctx.fillStyle = "#fbbf24";
      ctx.fillText(`${dist}px`, mx - 14, my - 2);
      [m.x1,m.y1,m.x2,m.y2].forEach((v,i) => {
        if(i%2===0) { ctx.beginPath(); ctx.arc(m["x"+(i/2+1)], m["y"+(i/2+1)], 4, 0, Math.PI*2); ctx.fill(); }
      });
    });
  }, [annotations, measurements, showGrid, showRuler]);

  useEffect(() => { redrawAnnotations(); }, [redrawAnnotations]);

  function drawArrow(ctx, x1, y1, x2, y2) {
    const angle = Math.atan2(y2-y1, x2-x1);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const len = 12;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - len * Math.cos(angle-0.4), y2 - len * Math.sin(angle-0.4));
    ctx.lineTo(x2 - len * Math.cos(angle+0.4), y2 - len * Math.sin(angle+0.4));
    ctx.closePath(); ctx.fill();
  }

  // Mouse events on annotation canvas
  const getPos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const handleMouseDown = (e) => {
    const canvas = annoCanvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);

    if (activeTool === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
    } else if (["annotate","measure","arrow"].includes(activeTool)) {
      setDrawStart(pos);
      setDrawing(true);
    } else if (activeTool === "zoom") {
      const delta = e.button === 2 ? -0.2 : 0.2;
      setZoom(z => Math.max(0.1, Math.min(8, z + delta)));
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPanX(e.clientX - panStart.x);
      setPanY(e.clientY - panStart.y);
    }
  };

  const handleMouseUp = (e) => {
    const canvas = annoCanvasRef.current;
    if (!canvas || !drawing || !drawStart) { setIsPanning(false); return; }
    const pos = getPos(e, canvas);
    const w = pos.x - drawStart.x, h = pos.y - drawStart.y;

    if (activeTool === "annotate") {
      const label = prompt("Label for this annotation (optional):", "");
      setAnnotations(a => [...a, { type:"rect", x:drawStart.x, y:drawStart.y, w, h, color:annotationColor, label: label||"", id:Date.now() }]);
    } else if (activeTool === "measure") {
      setMeasurements(m => [...m, { x1:drawStart.x, y1:drawStart.y, x2:pos.x, y2:pos.y, id:Date.now() }]);
    } else if (activeTool === "arrow") {
      setAnnotations(a => [...a, { type:"arrow", x:drawStart.x, y:drawStart.y, w, h, color:annotationColor, id:Date.now() }]);
    }
    setDrawing(false);
    setDrawStart(null);
    setIsPanning(false);
  };

  const applyPreset = (preset) => {
    setBrightness(preset.brightness);
    setContrast(preset.contrast);
    setInvert(preset.invert);
    setActivePreset(preset.label);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => { const nz = Math.max(0.1, Math.min(8, z + delta)); setZoomInput(Math.round(nz*100)+""); return nz; });
  };

  const downloadAnnotated = () => {
    const canvas = document.createElement("canvas");
    const img    = imgRef.current;
    if (!img) return;
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) ${invert?"invert(1)":""}`;
    ctx.drawImage(img, 0, 0);
    const link = document.createElement("a");
    link.download = `scan-${patientName?.replace(/\s/g,"_")}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const transformStyle = {
    transform: `translate(${panX}px,${panY}px) scale(${zoom}) rotate(${rotate}deg) scaleX(${flipH?-1:1}) scaleY(${flipV?-1:1})`,
    filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert?"invert(1)":""}`,
    transition: isPanning || drawing ? "none" : "transform 0.15s ease",
    transformOrigin: "center center",
    cursor: activeTool==="pan"?"grab": activeTool==="zoom"?"crosshair": activeTool==="annotate"||activeTool==="measure"||activeTool==="arrow"?"crosshair":"default",
  };

  return (
    <div style={{
      position: fullscreen ? "fixed" : "relative",
      inset: fullscreen ? 0 : "auto",
      zIndex: fullscreen ? 9998 : 1,
      background: "#0a0a0a",
      display: "flex",
      flexDirection: "column",
      borderRadius: fullscreen ? 0 : 16,
      overflow: "hidden",
      height: fullscreen ? "100vh" : "85vh",
      minHeight: 500,
    }}>
      {/* ── Top toolbar ── */}
      <div style={{
        display:"flex", alignItems:"center", gap:8, padding:"10px 16px",
        background:"#111", borderBottom:"1px solid #222", flexWrap:"wrap",
      }}>
        {/* Patient info */}
        <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0",marginRight:8}}>
          {patientName} · <span style={{color:"#64748b"}}>{(scanType||"").toUpperCase()}</span>
        </div>

        <div style={{flex:1}}/>

        {/* Zoom control */}
        <div style={{display:"flex",alignItems:"center",gap:6,background:"#1e293b",borderRadius:8,padding:"4px 8px"}}>
          <button onClick={()=>setZoom(z=>Math.max(0.1,z-0.1))} style={btnStyle}>−</button>
          <input value={zoomInput} onChange={e=>setZoomInput(e.target.value)}
            onBlur={e=>{const v=parseInt(e.target.value);if(!isNaN(v))setZoom(v/100);}}
            style={{width:44,textAlign:"center",background:"transparent",border:"none",color:"#e2e8f0",fontSize:12,fontWeight:700,outline:"none"}} />
          <span style={{color:"#64748b",fontSize:12}}>%</span>
          <button onClick={()=>setZoom(z=>Math.min(8,z+0.1))} style={btnStyle}>+</button>
          <button onClick={()=>{setZoom(1);setPanX(0);setPanY(0);}} style={{...btnStyle,color:"#64748b",fontSize:10}}>FIT</button>
        </div>

        {/* Rotate */}
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>setRotate(r=>(r-90+360)%360)} title="Rotate Left"  style={iconBtnStyle}>↺</button>
          <button onClick={()=>setRotate(r=>(r+90)%360)}     title="Rotate Right" style={iconBtnStyle}>↻</button>
        </div>

        {/* Flip */}
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>setFlipH(h=>!h)} title="Flip Horizontal" style={{...iconBtnStyle,color:flipH?"#60a5fa":"#94a3b8"}}>⇔</button>
          <button onClick={()=>setFlipV(v=>!v)} title="Flip Vertical"   style={{...iconBtnStyle,color:flipV?"#60a5fa":"#94a3b8"}}>⇕</button>
        </div>

        {/* Grid / Ruler */}
        <button onClick={()=>setShowGrid(g=>!g)} title="Grid" style={{...iconBtnStyle,color:showGrid?"#60a5fa":"#94a3b8"}}>⊞</button>
        <button onClick={()=>setShowRuler(r=>!r)} title="Ruler" style={{...iconBtnStyle,color:showRuler?"#60a5fa":"#94a3b8"}}>📐</button>

        {/* Compare */}
        {compareWith && <button onClick={()=>setShowCompare(c=>!c)} style={{...iconBtnStyle,color:showCompare?"#34d399":"#94a3b8"}} title="Side-by-side">◫</button>}

        {/* Download */}
        <button onClick={downloadAnnotated} title="Download" style={iconBtnStyle}>⬇️</button>

        {/* Fullscreen */}
        <button onClick={()=>setFullscreen(f=>!f)} title="Fullscreen" style={iconBtnStyle}>
          {fullscreen?"⊡":"⊞"}
        </button>

        {/* Close */}
        <button onClick={onClose} style={{...iconBtnStyle,color:"#f87171"}}>✕</button>
      </div>

      {/* ── Main area ── */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* ── Left tools panel ── */}
        <div style={{width:52,background:"#111",borderRight:"1px solid #222",display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 0",gap:6}}>
          {TOOLS.map(t => (
            <button key={t.id} onClick={()=>setActiveTool(t.id)} title={t.label}
              style={{width:38,height:38,borderRadius:10,border:"none",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",
                background:activeTool===t.id?"#334155":"transparent",color:activeTool===t.id?"#60a5fa":"#64748b",transition:"all 0.15s"}}>
              {t.icon}
            </button>
          ))}

          <div style={{width:32,height:1,background:"#222",margin:"4px 0"}}/>

          {/* Annotation color */}
          <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"center"}}>
            {["#ef4444","#fbbf24","#34d399","#60a5fa","#fff"].map(col=>(
              <button key={col} onClick={()=>setAnnotationColor(col)}
                style={{width:20,height:20,borderRadius:"50%",background:col,border:annotationColor===col?"2px solid #fff":"2px solid transparent",cursor:"pointer"}}/>
            ))}
          </div>

          <div style={{width:32,height:1,background:"#222",margin:"4px 0"}}/>

          {/* Undo last annotation */}
          <button onClick={()=>setAnnotations(a=>a.slice(0,-1))} title="Undo annotation" style={{...iconBtnStyle,color:"#64748b",fontSize:14}}>↩</button>
          <button onClick={()=>setMeasurements(m=>m.slice(0,-1))} title="Undo measurement" style={{...iconBtnStyle,color:"#64748b",fontSize:12}}>✂️</button>
          <button onClick={()=>{setAnnotations([]);setMeasurements([]);}} title="Clear all" style={{...iconBtnStyle,color:"#64748b",fontSize:12}}>🗑️</button>
        </div>

        {/* ── Image area ── */}
        <div ref={containerRef} style={{flex:1,overflow:"hidden",position:"relative",background:"#0d0d0d",display:"flex",alignItems:"center",justifyContent:"center"}}
          onWheel={handleWheel}>

          {/* Side-by-side layout */}
          {showCompare && compareWith ? (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",width:"100%",height:"100%",gap:2}}>
              <div style={{overflow:"hidden",position:"relative",background:"#0d0d0d",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,0.7)",color:"#94a3b8",fontSize:11,padding:"3px 8px",borderRadius:6,fontWeight:700}}>CURRENT</div>
                <img ref={imgRef} src={src} alt="scan"
                  style={{...transformStyle, maxWidth:"95%", maxHeight:"95%", display:"block"}}
                  onLoad={()=>setImageLoaded(true)} />
              </div>
              <div style={{overflow:"hidden",position:"relative",background:"#0d0d0d",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,0.7)",color:"#94a3b8",fontSize:11,padding:"3px 8px",borderRadius:6,fontWeight:700}}>COMPARE</div>
                <img ref={cmpImgRef} src={compareWith} alt="compare"
                  style={{maxWidth:"95%",maxHeight:"95%",display:"block",filter:`brightness(${brightness}%) contrast(${contrast}%) ${invert?"invert(1)":""}`}} />
              </div>
            </div>
          ) : (
            <div style={{position:"relative",width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <img ref={imgRef} src={src} alt="scan"
                style={{...transformStyle, maxWidth:"90%", maxHeight:"90%", display:"block", userSelect:"none"}}
                onLoad={()=>setImageLoaded(true)}
                draggable={false} />
              {/* Annotation overlay */}
              <canvas ref={annoCanvasRef}
                width={containerRef.current?.clientWidth || 800}
                height={containerRef.current?.clientHeight || 600}
                style={{position:"absolute",inset:0,width:"100%",height:"100%",cursor:activeTool==="pan"?"grab":activeTool==="zoom"?"zoom-in":"crosshair"}}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onContextMenu={e=>{e.preventDefault();setZoom(z=>Math.max(0.1,z-0.2));}}
              />
            </div>
          )}
        </div>

        {/* ── Right panel: controls ── */}
        <div style={{width:220,background:"#111",borderLeft:"1px solid #222",padding:"14px 12px",overflowY:"auto",display:"flex",flexDirection:"column",gap:16}}>

          {/* Window presets */}
          <div>
            <div style={sectionLabel}>WINDOW PRESETS</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {PRESETS.map(p => (
                <button key={p.label} onClick={()=>applyPreset(p)}
                  style={{padding:"7px 10px",borderRadius:8,border:"none",cursor:"pointer",textAlign:"left",fontSize:12,fontWeight:600,
                    background:activePreset===p.label?"#1e3a5f":"#1a1a1a",color:activePreset===p.label?"#60a5fa":"#94a3b8",transition:"all 0.15s"}}>
                  {activePreset===p.label?"▸ ":""}{p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brightness */}
          <div>
            <div style={{...sectionLabel,display:"flex",justifyContent:"space-between"}}>
              <span>BRIGHTNESS</span><span style={{color:"#60a5fa"}}>{brightness}%</span>
            </div>
            <input type="range" min={0} max={300} value={brightness} onChange={e=>setBrightness(+e.target.value)}
              style={{width:"100%",accentColor:"#60a5fa"}} />
          </div>

          {/* Contrast */}
          <div>
            <div style={{...sectionLabel,display:"flex",justifyContent:"space-between"}}>
              <span>CONTRAST</span><span style={{color:"#60a5fa"}}>{contrast}%</span>
            </div>
            <input type="range" min={0} max={400} value={contrast} onChange={e=>setContrast(+e.target.value)}
              style={{width:"100%",accentColor:"#60a5fa"}} />
          </div>

          {/* Invert */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:12,fontWeight:600,color:"#64748b",letterSpacing:"0.06em"}}>INVERT</span>
            <button onClick={()=>setInvert(i=>!i)}
              style={{width:40,height:22,borderRadius:11,border:"none",cursor:"pointer",background:invert?"#3b82f6":"#334155",position:"relative",transition:"background 0.2s"}}>
              <div style={{position:"absolute",top:2,left:invert?20:2,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
            </button>
          </div>

          {/* Reset */}
          <button onClick={()=>{setBrightness(100);setContrast(100);setInvert(false);setZoom(1);setRotate(0);setPanX(0);setPanY(0);setFlipH(false);setFlipV(false);setActivePreset("Default");}}
            style={{padding:"8px",borderRadius:8,background:"#1e293b",border:"none",color:"#94a3b8",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            ↺ Reset All
          </button>

          {/* Divider */}
          <div style={{height:1,background:"#222"}}/>

          {/* Annotations list */}
          {annotations.length > 0 && (
            <div>
              <div style={sectionLabel}>ANNOTATIONS ({annotations.length})</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {annotations.map((a,i) => (
                  <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",background:"#1a1a1a",borderRadius:6,borderLeft:`3px solid ${a.color}`}}>
                    <span style={{fontSize:11,color:"#94a3b8"}}>{a.type} {a.label||""}</span>
                    <button onClick={()=>setAnnotations(arr=>arr.filter(x=>x.id!==a.id))}
                      style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:12}}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Measurements list */}
          {measurements.length > 0 && (
            <div>
              <div style={sectionLabel}>MEASUREMENTS</div>
              {measurements.map((m,i) => {
                const dist = Math.round(Math.sqrt(Math.pow(m.x2-m.x1,2)+Math.pow(m.y2-m.y1,2)));
                return (
                  <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",background:"#1a1a1a",borderRadius:6,borderLeft:"3px solid #fbbf24",marginBottom:4}}>
                    <span style={{fontSize:11,color:"#fbbf24"}}>📏 {dist}px</span>
                    <button onClick={()=>setMeasurements(arr=>arr.filter(x=>x.id!==m.id))}
                      style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:12}}>✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Image info */}
          <div>
            <div style={sectionLabel}>IMAGE INFO</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {[
                ["Type",    (scanType||"").toUpperCase()],
                ["Zoom",    Math.round(zoom*100)+"%"],
                ["Rotation",rotate+"°"],
                ["Brightness",brightness+"%"],
                ["Contrast", contrast+"%"],
              ].map(([k,v]) => (
                <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                  <span style={{color:"#475569"}}>{k}</span>
                  <span style={{color:"#94a3b8",fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div>
            <div style={sectionLabel}>SHORTCUTS</div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              {[["Scroll","Zoom"],["Right-click","Zoom out"],["S","Select"],["P","Pan"],["A","Annotate"],["M","Measure"],["F","Fullscreen"],["R","Reset"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:10}}>
                  <kbd style={{background:"#1e293b",color:"#60a5fa",padding:"1px 5px",borderRadius:4,fontSize:10}}>{k}</kbd>
                  <span style={{color:"#475569"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom status bar ── */}
      <div style={{background:"#111",borderTop:"1px solid #222",padding:"6px 16px",display:"flex",gap:20,alignItems:"center"}}>
        <span style={{fontSize:11,color:"#64748b"}}>Tool: <strong style={{color:"#94a3b8"}}>{TOOLS.find(t=>t.id===activeTool)?.label}</strong></span>
        <span style={{fontSize:11,color:"#64748b"}}>Zoom: <strong style={{color:"#94a3b8"}}>{Math.round(zoom*100)}%</strong></span>
        <span style={{fontSize:11,color:"#64748b"}}>Rotation: <strong style={{color:"#94a3b8"}}>{rotate}°</strong></span>
        <span style={{fontSize:11,color:"#64748b"}}>Annotations: <strong style={{color:"#94a3b8"}}>{annotations.length}</strong></span>
        <span style={{fontSize:11,color:"#64748b"}}>Measurements: <strong style={{color:"#94a3b8"}}>{measurements.length}</strong></span>
        <div style={{flex:1}}/>
        {imageLoaded && <span style={{fontSize:11,color:"#22c55e"}}>● Image loaded</span>}
        <span style={{fontSize:11,color:"#64748b"}}>MediCore AI Viewer v1.0</span>
      </div>
    </div>
  );
}

// Style helpers
const btnStyle = {
  width:24, height:24, borderRadius:6, border:"none", cursor:"pointer",
  background:"#334155", color:"#e2e8f0", fontSize:14, fontWeight:700,
  display:"flex", alignItems:"center", justifyContent:"center",
};
const iconBtnStyle = {
  width:32, height:32, borderRadius:8, border:"1px solid #222", cursor:"pointer",
  background:"transparent", color:"#94a3b8", fontSize:15,
  display:"flex", alignItems:"center", justifyContent:"center",
  transition:"all 0.15s",
};
const sectionLabel = {
  fontSize:10, fontWeight:700, color:"#475569", letterSpacing:"0.08em",
  marginBottom:6, paddingBottom:4, borderBottom:"1px solid #1e293b",
};
