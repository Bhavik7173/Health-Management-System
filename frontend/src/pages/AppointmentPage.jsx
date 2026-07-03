import { useState, useEffect } from "react";
import { C } from "../constants";
import { Card, Btn, Badge, Avatar, Input, PageHeader, StatCard, TabBar } from "../components/UI";
import { appointmentService } from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

// ── Constants ─────────────────────────────────────────────────────────────────

const APPT_TYPES   = ["Consultation","Follow-up","Surgery Consult","MRI Review","Lab Results","Emergency","Vaccination","Check-up"];
const STATUS_COL   = { confirmed:C.accent, pending:C.blue, cancelled:C.coral, completed:"#8b5cf6", waiting:C.amber, in_progress:"#06b6d4" };
const MONTH_NAMES  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_NAMES_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const RECURRENCE   = ["none","daily","weekly","biweekly","monthly"];
const HOURS        = Array.from({length:10},(_,i)=>`${String(i+8).padStart(2,"0")}:00`);

const today  = new Date();
const pad    = n => String(n).padStart(2,"0");
const toDateStr = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;
const todayStr  = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

function buildCalendar(year, month) {
  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month+1, 0).getDate();
  const cells = [];
  for (let i=0; i<first; i++) cells.push(null);
  for (let d=1; d<=days; d++) cells.push(d);
  return cells;
}

function getWeekDays(year, month, day) {
  const date = new Date(year, month, day);
  const dow  = date.getDay();
  return Array.from({length:7},(_,i) => {
    const d = new Date(year, month, day - dow + i);
    return { date:d, str:toDateStr(d.getFullYear(),d.getMonth(),d.getDate()), label:DAY_NAMES[i], num:d.getDate() };
  });
}


const [] = Array.from({length:7},(_,i)=>{
  const d = new Date(); d.setDate(d.getDate()-6+i);
  return { date:d.toLocaleDateString("en",{weekday:"short"}), total:Math.floor(Math.random()*12+3), confirmed:Math.floor(Math.random()*6+1), completed:Math.floor(Math.random()*4), cancelled:Math.floor(Math.random()*2) };
});

// ══════════════════════════════════════════════════════════════════════════════
export default function AppointmentPage() {
  const [mainTab,     setMainTab]     = useState("calendar");  // calendar | list | queue | stats | availability
  const [calView,     setCalView]     = useState("month");     // month | week | day
  const [year,        setYear]        = useState(today.getFullYear());
  const [month,       setMonth]       = useState(today.getMonth());
  const [selDay,      setSelDay]      = useState(today.getDate());
  const [appointments,setAppts]       = useState([]);
  const [showModal,   setShowModal]   = useState(false);
  const [showDetail,  setShowDetail]  = useState(null);
  const [showReminder,setShowReminder]= useState(null);
  const [filterStatus,setFilterStatus]= useState("all");
  const [searchQ,     setSearchQ]     = useState("all");
  const [trends,      setTrends]      = useState([]);
  const [reminderSent,setReminderSent]= useState({});
  const [successMsg,  setSuccessMsg]  = useState("");
  const [form,        setForm]        = useState({
    doctorId:"d1", slot:"09:00", patient:"", type:"Consultation",
    notes:"", recurrence:"none", occurrences:1,
  });

  const [allDoctors, setAllDoctors] = useState([]);

  useEffect(() => {
    appointmentService.list({}).then(d => setAppts(d || [])).catch(()=>{});
    import("../services/api").then(({appointmentService:as, doctorService})=>{
      as.getTrends?.().then(d => setTrends(d || [])).catch(()=>{});
      doctorService?.list?.().then(d => {
        // map backend doctors to local schema with default slots
        const defSlots = ["08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00"];
        const mapped = (d || []).map(x => ({
          id: x.id, name: x.name, avatar: x.avatar,
          color: x.color, specialty: x.specialty,
          slots: defSlots, workDays: [1,2,3,4,5],
        }));
        setAllDoctors(mapped);
        if (mapped.length) setForm(f => ({ ...f, doctorId: f.doctorId === "d1" ? mapped[0].id : f.doctorId }));
      }).catch(() => {});
    });
  }, []);

  const flash = msg => { setSuccessMsg(msg); setTimeout(()=>setSuccessMsg(""),4000); };

  const navMonth = dir => {
    let m=month+dir, y=year;
    if(m<0){m=11;y--;} if(m>11){m=0;y++;}
    setMonth(m); setYear(y);
  };

  const navWeek = dir => {
    const d = new Date(year,month,selDay+dir*7);
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelDay(d.getDate());
  };

  const cells    = buildCalendar(year,month);
  const selStr   = toDateStr(year,month,selDay);
  const weekDays = getWeekDays(year,month,selDay);

  const apptsByDay = {};
  appointments.forEach(a => { apptsByDay[a.date] = apptsByDay[a.date]||[]; apptsByDay[a.date].push(a); });
  const selAppts = apptsByDay[selStr]||[];

  const stats = {
    total:     appointments.length,
    confirmed: appointments.filter(a=>a.status==="confirmed").length,
    pending:   appointments.filter(a=>a.status==="pending").length,
    today:     appointments.filter(a=>a.date===todayStr&&a.status!=="cancelled").length,
  };

  // Book appointment
  const handleBook = () => {
    const doc = allDoctors.find(d=>d.id===form.doctorId);
    if (!doc) { alert("Please select a doctor"); return; }
    const conflict = appointments.find(a=>a.date===selStr&&a.time===form.slot&&a.doctorId===form.doctorId&&a.status!=="cancelled");
    if(conflict){ alert(`⚠️ ${doc.name} is already booked at ${form.slot}`); return; }

    const newA = {
      id:"a"+Date.now(), date:selStr, time:form.slot,
      doctorId:form.doctorId, doctor:doc.name, avatar:doc.avatar, color:doc.color,
      patient:form.patient||"Walk-in", type:form.type, status:"pending", notes:form.notes,
      recurring:form.recurrence!=="none", queue_status:null,
    };

    if(form.recurrence!=="none" && form.occurrences>1) {
      import("../services/api").then(({appointmentService:as})=>{
        as.createRecurring?.({ base_appointment:newA, recurrence:form.recurrence, occurrences:parseInt(form.occurrences) })
          .then(data => { if(data?.appointments?.length) setAppts(p=>[...p,...data.appointments]); })
          .catch(()=>{});
      });
      // Local fallback
      const delta = {daily:1,weekly:7,biweekly:14,monthly:30}[form.recurrence]||7;
      const news = Array.from({length:parseInt(form.occurrences)},(_,i)=>{
        const d=new Date(selStr); d.setDate(d.getDate()+i*delta);
        return {...newA,id:"a"+Date.now()+i,date:toDateStr(d.getFullYear(),d.getMonth(),d.getDate()),occurrence:i+1};
      });
      setAppts(p=>[...p,...news]);
      flash(`✅ ${form.occurrences} recurring appointments booked`);
    } else {
      appointmentService.create(newA).then(s=>setAppts(p=>[...p,s||newA])).catch(()=>setAppts(p=>[...p,newA]));
      flash(`✅ Appointment booked for ${newA.patient} on ${selStr} at ${newA.time}`);
    }
    setShowModal(false);
    setForm({doctorId:"d1",slot:"09:00",patient:"",type:"Consultation",notes:"",recurrence:"none",occurrences:1});
  };

  const updateStatus = (id,status) => {
    setAppts(p=>p.map(a=>a.id===id?{...a,status}:a));
    appointmentService.updateStatus(id,status).catch(()=>{});
  };

  const updateQueueStatus = (id,qs) => {
    setAppts(p=>p.map(a=>a.id===id?{...a,queue_status:qs}:a));
    import("../services/api").then(({appointmentService:as})=>as.updateQueueStatus?.(id,qs).catch(()=>{}));
  };

  const sendReminder = async (appt, channel) => {
    import("../services/api").then(({appointmentService:as})=>{
      as.sendReminder?.(appt.id,{
        appointment_id:appt.id, patient_name:appt.patient,
        patient_email:`${appt.patient.toLowerCase().replace(" ",".")}@email.com`,
        patient_phone:"+1 234 567 8900",
        doctor:appt.doctor, date:appt.date, time:appt.time, type:appt.type, channel,
      }).catch(()=>{});
    });
    setReminderSent(r=>({...r,[appt.id+"_"+channel]:true}));
    flash(`✅ ${channel.toUpperCase()} reminder sent to ${appt.patient}`);
    setShowReminder(null);
  };

  const bookedSlots = appointments
    .filter(a=>a.date===selStr&&a.doctorId===form.doctorId&&a.status!=="cancelled")
    .map(a=>a.time);

  const filteredList = appointments
    .filter(a=>filterStatus==="all"||a.status===filterStatus)
    .filter(a=>searchQ==="all"||!searchQ||a.patient?.toLowerCase().includes(searchQ.toLowerCase())||a.doctor?.toLowerCase().includes(searchQ.toLowerCase()))
    .sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));

  const todayQueue = appointments.filter(a=>a.date===todayStr&&a.status!=="cancelled").sort((a,b)=>a.time.localeCompare(b.time));

  return (
    <div className="page-enter">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <PageHeader title="📅 Appointments & Scheduling" subtitle="Calendar · Queue · Reminders · Recurring · Availability" />
        <Btn onClick={()=>setShowModal(true)} style={{borderRadius:12,flexShrink:0}}>+ Book Appointment</Btn>
      </div>

      {successMsg && <div style={{background:C.accentLight,border:`1px solid ${C.accent}44`,borderRadius:12,padding:"12px 18px",marginBottom:16,fontSize:13,color:C.accent,fontWeight:700}}>{successMsg}</div>}

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        <StatCard label="Total"     value={stats.total}     icon="📅" color={C.blue}  bg={C.blueLight}  />
        <StatCard label="Confirmed" value={stats.confirmed} icon="✅" color={C.accent} bg={C.accentLight} />
        <StatCard label="Pending"   value={stats.pending}   icon="⏳" color={C.amber} bg={C.amberLight}  />
        <StatCard label="Today"     value={stats.today}     icon="🗓️" color={C.coral} bg={C.coralLight}  />
      </div>

      {/* Main tabs */}
      <TabBar tabs={[["calendar","📅 Calendar"],["list","📋 List"],["queue","🚶 Queue"],["stats","📊 Stats"],["availability","🕐 Availability"]]} active={mainTab} onChange={setMainTab} />

      {/* ══ CALENDAR TAB ══ */}
      {mainTab==="calendar" && (
        <>
          {/* Calendar view switcher */}
          <div style={{display:"flex",gap:6,marginBottom:16,alignItems:"center"}}>
            {[["month","📆 Month"],["week","📋 Week"],["day","📅 Day"]].map(([v,l])=>(
              <button key={v} onClick={()=>setCalView(v)}
                style={{padding:"8px 18px",borderRadius:20,border:`1.5px solid ${calView===v?C.accent:C.border}`,background:calView===v?C.accentLight:"#fff",color:calView===v?C.accent:C.textMed,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {l}
              </button>
            ))}
            <div style={{flex:1}}/>
            {/* Nav for week/day */}
            {calView!=="month" && (
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <button onClick={()=>calView==="week"?navWeek(-1):setSelDay(d=>d-1)} style={{width:32,height:32,borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:16}}>‹</button>
                <span style={{fontSize:13,fontWeight:700,color:C.text,minWidth:140,textAlign:"center"}}>
                  {calView==="week"
                    ? `${MONTH_NAMES[weekDays[0].date.getMonth()].slice(0,3)} ${weekDays[0].num} – ${weekDays[6].num}`
                    : `${MONTH_NAMES[month]} ${selDay}`}
                </span>
                <button onClick={()=>calView==="week"?navWeek(1):setSelDay(d=>d+1)} style={{width:32,height:32,borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:16}}>›</button>
              </div>
            )}
          </div>

          {/* ── MONTH VIEW ── */}
          {calView==="month" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:20}}>
              <Card>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                  <button onClick={()=>navMonth(-1)} style={{width:38,height:38,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:18}}>‹</button>
                  <span style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,fontWeight:700}}>{MONTH_NAMES[month]} {year}</span>
                  <button onClick={()=>navMonth(1)}  style={{width:38,height:38,borderRadius:12,border:`1px solid ${C.border}`,background:"#fff",cursor:"pointer",fontSize:18}}>›</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:6}}>
                  {DAY_NAMES.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:C.textLight,padding:"6px 0"}}>{d}</div>)}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
                  {cells.map((d,i)=>{
                    if(!d) return <div key={i}/>;
                    const ds=toDateStr(year,month,d);
                    const ap=apptsByDay[ds]||[];
                    const isT=ds===todayStr, isS=ds===selStr;
                    return (
                      <button key={i} onClick={()=>setSelDay(d)}
                        style={{height:52,borderRadius:14,border:"none",cursor:"pointer",position:"relative",fontSize:14,fontWeight:700,
                          background:isS?C.accent:isT?C.accentLight:"transparent",
                          color:isS?"#fff":isT?C.accent:C.text,transition:"all 0.15s"}}>
                        {d}
                        {ap.length>0&&(
                          <div style={{position:"absolute",bottom:5,left:"50%",transform:"translateX(-50%)",display:"flex",gap:2}}>
                            {[...Array(Math.min(ap.length,3))].map((_,j)=>(
                              <div key={j} style={{width:5,height:5,borderRadius:"50%",background:isS?"rgba(255,255,255,0.85)":ap.some(a=>a.status==="confirmed")?C.accent:C.amber}}/>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div style={{display:"flex",gap:14,marginTop:14,paddingTop:12,borderTop:`1px solid ${C.border}`,flexWrap:"wrap"}}>
                  {[["●",C.accent,"Confirmed"],["●",C.amber,"Pending"],["●","transparent","Today"]].map(([sym,col,l])=>(
                    <div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.textLight}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:col,border:`1px solid ${C.border}`}}/>{l}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Day panel */}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,fontWeight:700}}>{MONTH_NAMES[month]} {selDay}</span>
                  <span style={{fontSize:12,color:C.textLight}}>{selAppts.length} appt{selAppts.length!==1?"s":""}</span>
                </div>
                {selAppts.length===0
                  ? <Card style={{textAlign:"center",padding:36}}><div style={{fontSize:36,marginBottom:8}}>📭</div><div style={{fontSize:13,color:C.textLight,marginBottom:12}}>No appointments</div><Btn onClick={()=>setShowModal(true)} style={{borderRadius:10,padding:"8px 16px",fontSize:12}}>Book</Btn></Card>
                  : selAppts.sort((a,b)=>a.time.localeCompare(b.time)).map(a=>(
                    <ApptCard key={a.id} a={a} onClick={()=>setShowDetail(a)} onReminder={()=>setShowReminder(a)}/>
                  ))
                }
              </div>
            </div>
          )}

          {/* ── WEEK VIEW ── */}
          {calView==="week" && (
            <Card style={{padding:0,overflow:"hidden"}}>
              {/* Header row */}
              <div style={{display:"grid",gridTemplateColumns:"60px repeat(7,1fr)",borderBottom:`1px solid ${C.border}`}}>
                <div style={{padding:"12px 8px",fontSize:11,color:C.textLight,fontWeight:700,borderRight:`1px solid ${C.border}`}}>TIME</div>
                {weekDays.map(wd=>{
                  const isT=wd.str===todayStr,isS=wd.str===selStr;
                  const cnt=apptsByDay[wd.str]?.length||0;
                  return (
                    <button key={wd.str} onClick={()=>{setYear(wd.date.getFullYear());setMonth(wd.date.getMonth());setSelDay(wd.date.getDate());setCalView("day");}}
                      style={{padding:"10px 6px",textAlign:"center",border:"none",borderRight:`1px solid ${C.border}`,cursor:"pointer",background:isS?C.accentLight:isT?"#f0fdf4":"#fff",transition:"background 0.15s"}}>
                      <div style={{fontSize:11,fontWeight:700,color:isS?C.accent:C.textLight}}>{wd.label}</div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:isS?C.accent:C.text,margin:"2px 0"}}>{wd.num}</div>
                      {cnt>0&&<div style={{fontSize:10,color:C.accent,fontWeight:700}}>{cnt} appt{cnt!==1?"s":""}</div>}
                    </button>
                  );
                })}
              </div>
              {/* Time slots */}
              <div style={{overflowY:"auto",maxHeight:500}}>
                {HOURS.map(hour=>(
                  <div key={hour} style={{display:"grid",gridTemplateColumns:"60px repeat(7,1fr)",borderBottom:`1px solid ${C.border}`,minHeight:60}}>
                    <div style={{padding:"8px",fontSize:11,color:C.textLight,fontWeight:600,borderRight:`1px solid ${C.border}`,background:"#fafafa"}}>{hour}</div>
                    {weekDays.map(wd=>{
                      const ap=(apptsByDay[wd.str]||[]).filter(a=>a.time===hour||a.time.startsWith(hour.split(":")[0]));
                      return (
                        <div key={wd.str} style={{padding:4,borderRight:`1px solid ${C.border}`,background:wd.str===todayStr?"#f0fdf4":"#fff"}}>
                          {ap.map(a=>(
                            <div key={a.id} onClick={()=>setShowDetail(a)}
                              style={{background:a.color+"22",border:`1px solid ${a.color}55`,borderRadius:6,padding:"4px 6px",cursor:"pointer",marginBottom:2}}>
                              <div style={{fontSize:10,fontWeight:700,color:a.color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.patient}</div>
                              <div style={{fontSize:9,color:C.textLight}}>{a.time} · {a.type}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── DAY VIEW ── */}
          {calView==="day" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20}}>
              <Card style={{padding:0,overflow:"hidden"}}>
                <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,background:selStr===todayStr?C.accentLight:"#fff"}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text,fontWeight:700}}>
                    {DAY_NAMES_FULL[new Date(year,month,selDay).getDay()]}, {MONTH_NAMES[month]} {selDay}
                  </div>
                  <div style={{fontSize:12,color:C.textLight,marginTop:2}}>{selAppts.length} appointment{selAppts.length!==1?"s":""} scheduled</div>
                </div>
                <div style={{overflowY:"auto",maxHeight:560}}>
                  {HOURS.map(hour=>{
                    const ap=(apptsByDay[selStr]||[]).filter(a=>{
                      const [ah]=a.time.split(":").map(Number);
                      const [hh]=hour.split(":").map(Number);
                      return ah===hh;
                    });
                    const isNow = new Date().getHours()===parseInt(hour) && selStr===todayStr;
                    return (
                      <div key={hour} style={{display:"flex",minHeight:72,borderBottom:`1px solid ${C.border}`,background:isNow?"#fffbeb":"#fff"}}>
                        <div style={{width:64,padding:"10px 8px",fontSize:12,fontWeight:700,color:isNow?C.amber:C.textLight,borderRight:`1px solid ${C.border}`,background:"#fafafa",flexShrink:0}}>
                          {hour}
                          {isNow&&<div style={{fontSize:9,color:C.amber,fontWeight:700}}>NOW</div>}
                        </div>
                        <div style={{flex:1,padding:6,display:"flex",gap:6,flexWrap:"wrap",alignContent:"flex-start"}}>
                          {ap.map(a=>(
                            <div key={a.id} onClick={()=>setShowDetail(a)}
                              style={{background:a.color+"18",border:`2px solid ${a.color}44`,borderRadius:10,padding:"8px 12px",cursor:"pointer",minWidth:160,maxWidth:220,transition:"all 0.15s"}}>
                              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                                <Avatar initials={a.avatar} color={a.color} size={28}/>
                                <div>
                                  <div style={{fontSize:12,fontWeight:800,color:C.text}}>{a.patient}</div>
                                  <div style={{fontSize:10,color:C.textLight}}>{a.doctor}</div>
                                </div>
                              </div>
                              <div style={{display:"flex",gap:6}}>
                                <Badge label={a.status} color={STATUS_COL[a.status]||C.blue}/>
                                {a.recurring&&<span style={{fontSize:9,color:C.blue,background:C.blueLight,padding:"1px 6px",borderRadius:10,fontWeight:700}}>🔄</span>}
                              </div>
                            </div>
                          ))}
                          {ap.length===0&&(
                            <button onClick={()=>setShowModal(true)}
                              style={{opacity:0,width:"100%",height:"100%",background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.textLight}}
                              onMouseEnter={e=>e.currentTarget.style.opacity="1"}
                              onMouseLeave={e=>e.currentTarget.style.opacity="0"}>
                              + Book at {hour}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Day summary sidebar */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <Card>
                  <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:C.text,marginBottom:12}}>Day Summary</h3>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[["Total",selAppts.length,C.blue],["Confirmed",selAppts.filter(a=>a.status==="confirmed").length,C.accent],["Pending",selAppts.filter(a=>a.status==="pending").length,C.amber],["Done",selAppts.filter(a=>a.status==="completed").length,"#8b5cf6"]].map(([l,v,c])=>(
                      <div key={l} style={{background:c+"15",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:c}}>{v}</div>
                        <div style={{fontSize:11,color:C.textLight,marginTop:2}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </Card>
                {selAppts.sort((a,b)=>a.time.localeCompare(b.time)).map(a=>(
                  <ApptCard key={a.id} a={a} onClick={()=>setShowDetail(a)} onReminder={()=>setShowReminder(a)} compact/>
                ))}
                {selAppts.length===0&&(
                  <Card style={{textAlign:"center",padding:32}}>
                    <div style={{fontSize:32,marginBottom:8}}>📭</div>
                    <div style={{fontSize:12,color:C.textLight,marginBottom:10}}>No appointments</div>
                    <Btn onClick={()=>setShowModal(true)} style={{borderRadius:10,padding:"7px 14px",fontSize:12}}>Book</Btn>
                  </Card>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ LIST TAB ══ */}
      {mainTab==="list" && (
        <>
          <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{position:"relative",flex:1,minWidth:200}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}>🔍</span>
              <input value={searchQ==="all"?"":searchQ} onChange={e=>setSearchQ(e.target.value||"all")} placeholder="Search patient or doctor…"
                style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:14,padding:"10px 14px 10px 36px",fontSize:13,outline:"none"}}/>
            </div>
            {["all","confirmed","pending","cancelled","completed"].map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)}
                style={{padding:"9px 14px",borderRadius:20,border:`1.5px solid ${filterStatus===s?(STATUS_COL[s]||C.blue):C.border}`,background:filterStatus===s?(STATUS_COL[s]||C.blue):"#fff",color:filterStatus===s?"#fff":C.textMed,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table>
                <thead>
                  <tr style={{background:C.cardAlt}}>
                    {["Patient","Doctor","Date","Time","Type","Status","Recurring","Actions"].map(h=>(
                      <th key={h} style={{padding:"12px 14px",fontSize:11,color:C.textLight,fontWeight:700,textAlign:"left",letterSpacing:"0.05em"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((a,i)=>(
                    <tr key={a.id} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"#fff":C.cardAlt}}>
                      <td style={{padding:"12px 14px",fontSize:13,fontWeight:700,color:C.text}}>{a.patient}</td>
                      <td style={{padding:"12px 14px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <Avatar initials={a.avatar} color={a.color} size={26}/>
                          <span style={{fontSize:12,color:C.textMed}}>{a.doctor}</span>
                        </div>
                      </td>
                      <td style={{padding:"12px 14px",fontSize:12,color:C.textMed,whiteSpace:"nowrap"}}>{a.date}</td>
                      <td style={{padding:"12px 14px",fontSize:13,fontWeight:700,color:C.text}}>{a.time}</td>
                      <td style={{padding:"12px 14px",fontSize:12,color:C.textMed}}>{a.type}</td>
                      <td style={{padding:"12px 14px"}}><Badge label={a.status} color={STATUS_COL[a.status]||C.blue}/></td>
                      <td style={{padding:"12px 14px",textAlign:"center"}}>
                        {a.recurring?<span style={{fontSize:11,color:C.blue,background:C.blueLight,padding:"2px 8px",borderRadius:10,fontWeight:700}}>🔄 Yes</span>:"—"}
                      </td>
                      <td style={{padding:"12px 14px"}}>
                        <div style={{display:"flex",gap:5}}>
                          {a.status==="pending"    && <ActionBtn color={C.accent}  onClick={()=>updateStatus(a.id,"confirmed")}>✅</ActionBtn>}
                          {a.status==="confirmed"  && <ActionBtn color="#8b5cf6"   onClick={()=>updateStatus(a.id,"completed")}>✔️</ActionBtn>}
                          {a.status!=="cancelled"&&a.status!=="completed"&&<ActionBtn color={C.coral} onClick={()=>updateStatus(a.id,"cancelled")}>✕</ActionBtn>}
                          <ActionBtn color={C.blue}  onClick={()=>setShowReminder(a)}>🔔</ActionBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ══ QUEUE TAB ══ */}
      {mainTab==="queue" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:C.text}}>Today's Waiting Room</div>
              <div style={{fontSize:12,color:C.textLight,marginTop:2}}>{todayStr} · {todayQueue.length} patients</div>
            </div>
            <div style={{display:"flex",gap:10}}>
              {[["waiting",C.amber],["in_progress","#06b6d4"],["done",C.accent]].map(([s,c])=>(
                <div key={s} style={{fontSize:12,fontWeight:700,color:c,background:c+"15",padding:"6px 12px",borderRadius:20}}>
                  {s.replace("_"," ").replace(/\b\w/g,l=>l.toUpperCase())}: {todayQueue.filter(a=>a.queue_status===s).length}
                </div>
              ))}
            </div>
          </div>

          {todayQueue.length===0
            ? <Card style={{textAlign:"center",padding:56}}><div style={{fontSize:40,marginBottom:12}}>🏥</div><div style={{fontSize:14,color:C.textLight}}>No patients in queue today</div></Card>
            : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {todayQueue.map((a,i)=>{
                  const qs=a.queue_status;
                  const qColor=qs==="in_progress"?"#06b6d4":qs==="done"?C.accent:qs==="waiting"?C.amber:C.textLight;
                  return (
                    <Card key={a.id} style={{borderLeft:`4px solid ${qColor}`}}>
                      <div style={{display:"flex",gap:16,alignItems:"center"}}>
                        {/* Queue number */}
                        <div style={{width:44,height:44,borderRadius:14,background:qColor+"18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:qColor,flexShrink:0}}>
                          {i+1}
                        </div>
                        <Avatar initials={a.avatar} color={a.color} size={42}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:14,fontWeight:800,color:C.text}}>{a.patient}</div>
                          <div style={{fontSize:12,color:C.textLight}}>{a.doctor} · {a.type}</div>
                          <div style={{fontSize:11,color:C.textLight,marginTop:2}}>🕐 {a.time} · {a.notes||"No notes"}</div>
                        </div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
                          <Badge label={a.status} color={STATUS_COL[a.status]||C.blue}/>
                          {qs&&<Badge label={qs.replace("_"," ")} color={qColor}/>}
                        </div>
                        {/* Queue actions */}
                        <div style={{display:"flex",gap:6,flexShrink:0}}>
                          {(!qs||qs==="waiting")  && <QBtn color={C.amber}     onClick={()=>updateQueueStatus(a.id,"waiting")}>⏳ Wait</QBtn>}
                          {qs!=="in_progress"      && <QBtn color="#06b6d4"    onClick={()=>updateQueueStatus(a.id,"in_progress")}>▶ Start</QBtn>}
                          {qs==="in_progress"      && <QBtn color={C.accent}   onClick={()=>{updateQueueStatus(a.id,"done");updateStatus(a.id,"completed");}}>✅ Done</QBtn>}
                          {qs!=="no_show"          && <QBtn color={C.coral}    onClick={()=>updateQueueStatus(a.id,"no_show")}>🚫 No-show</QBtn>}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          }
        </div>
      )}

      {/* ══ STATS TAB ══ */}
      {mainTab==="stats" && (
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <Card>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text,marginBottom:20}}>7-Day Appointment Trends</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trends} margin={{top:5,right:10,left:-10,bottom:0}} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="date" tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,fontSize:12}}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:12}}/>
                <Bar dataKey="confirmed" name="Confirmed" fill={C.accent} radius={[4,4,0,0]}/>
                <Bar dataKey="completed" name="Completed" fill="#8b5cf6"  radius={[4,4,0,0]}/>
                <Bar dataKey="cancelled" name="Cancelled" fill={C.coral}  radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {/* Doctor workload */}
            <Card>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:16}}>Doctor Workload</h3>
              {allDoctors.map(d=>{
                const total=appointments.filter(a=>a.doctorId===d.id).length;
                const max=Math.max(...allDoctors.map(doc=>appointments.filter(a=>a.doctorId===doc.id).length),1);
                return (
                  <div key={d.id} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <Avatar initials={d.avatar} color={d.color} size={28}/>
                        <span style={{fontSize:12,fontWeight:700,color:C.text}}>{d.name}</span>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,color:d.color}}>{total} appts</span>
                    </div>
                    <div style={{height:8,background:C.border,borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${total/max*100}%`,background:d.color,borderRadius:4,transition:"width 1s"}}/>
                    </div>
                  </div>
                );
              })}
            </Card>

            {/* Type breakdown */}
            <Card>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:16}}>Appointment Types</h3>
              {[...new Set(appointments.map(a=>a.type))].map(type=>{
                const count=appointments.filter(a=>a.type===type).length;
                const pct=Math.round(count/Math.max(appointments.length,1)*100);
                return (
                  <div key={type} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:700,color:C.text}}>{type}</span>
                      <span style={{fontSize:12,color:C.textLight}}>{count} ({pct}%)</span>
                    </div>
                    <div style={{height:7,background:C.border,borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:C.blue,borderRadius:3}}/>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        </div>
      )}

      {/* ══ AVAILABILITY TAB ══ */}
      {mainTab==="availability" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{fontSize:13,color:C.textLight,marginBottom:4}}>Configure each doctor's working hours, days, and time off.</div>
          {allDoctors.map(d=>(
            <DoctorAvailabilityCard key={d.id} doctor={d} appointments={appointments} onSave={(data)=>flash(`✅ Availability saved for ${d.name}`)}/>
          ))}
        </div>
      )}

      {/* ══ BOOK MODAL ══ */}
      {showModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,backdropFilter:"blur(4px)"}}>
          <Card style={{width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text}}>📅 Book Appointment</h3>
              <button onClick={()=>setShowModal(false)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.textLight}}>✕</button>
            </div>

            <div style={{background:C.blueLight,borderRadius:12,padding:"10px 14px",fontSize:13,fontWeight:700,color:C.blue,marginBottom:16}}>
              📅 {MONTH_NAMES[month]} {selDay}, {year}
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {/* Doctor */}
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>DOCTOR</label>
                <select value={form.doctorId} onChange={e=>setForm(f=>({...f,doctorId:e.target.value,slot:(allDoctors.find(d=>d.id===e.target.value)?.slots||["09:00"])[0]}))}
                  style={{background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"12px 16px",fontSize:14,color:C.text,outline:"none"}}>
                  {allDoctors.map(d=><option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>)}
                </select>
              </div>

              {/* Time slots */}
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>TIME SLOT</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {(allDoctors.find(d=>d.id===form.doctorId)?.slots || ["08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00"]).map(s=>{
                    const isB=bookedSlots.includes(s),isS=form.slot===s;
                    return (
                      <button key={s} onClick={()=>!isB&&setForm(f=>({...f,slot:s}))} disabled={isB}
                        style={{padding:"8px 12px",borderRadius:10,border:`1.5px solid ${isS?C.accent:isB?C.border:C.border}`,background:isS?C.accentLight:isB?"#f5f5f5":"#fff",color:isS?C.accent:isB?C.textLight:C.textMed,fontSize:12,fontWeight:700,cursor:isB?"not-allowed":"pointer",opacity:isB?0.5:1}}>
                        {s}{isB?" ✗":""}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input label="PATIENT NAME" value={form.patient} onChange={v=>setForm(f=>({...f,patient:v}))} placeholder="Full patient name" icon="👤"/>

              {/* Type chips */}
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>TYPE</label>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {APPT_TYPES.map(t=>(
                    <button key={t} onClick={()=>setForm(f=>({...f,type:t}))}
                      style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${form.type===t?C.blue:C.border}`,background:form.type===t?C.blueLight:"#fff",color:form.type===t?C.blue:C.textMed,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recurrence */}
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>RECURRENCE</label>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <select value={form.recurrence} onChange={e=>setForm(f=>({...f,recurrence:e.target.value}))}
                    style={{background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"10px 14px",fontSize:13,color:C.text,outline:"none",cursor:"pointer",flex:1}}>
                    {RECURRENCE.map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                  </select>
                  {form.recurrence!=="none"&&(
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:12,color:C.textLight,whiteSpace:"nowrap"}}>×</span>
                      <input type="number" min={2} max={52} value={form.occurrences} onChange={e=>setForm(f=>({...f,occurrences:e.target.value}))}
                        style={{width:64,background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px",fontSize:13,outline:"none",textAlign:"center"}}/>
                      <span style={{fontSize:12,color:C.textLight}}>times</span>
                    </div>
                  )}
                </div>
                {form.recurrence!=="none"&&<div style={{fontSize:11,color:C.blue,padding:"6px 10px",background:C.blueLight,borderRadius:8}}>🔄 Will create {form.occurrences} appointments every {form.recurrence}</div>}
              </div>

              {/* Notes */}
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>NOTES</label>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Special instructions…" rows={2}
                  style={{background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px",fontSize:14,color:C.text,outline:"none",resize:"none",fontFamily:"Nunito,sans-serif"}}/>
              </div>

              <div style={{display:"flex",gap:10}}>
                <Btn onClick={handleBook} style={{flex:1,borderRadius:12,padding:"12px"}}>
                  {form.recurrence!=="none"?`📅 Book ${form.occurrences} Appointments`:"Confirm Booking"}
                </Btn>
                <Btn variant="outline" onClick={()=>setShowModal(false)} style={{borderRadius:12,padding:"12px 18px"}}>Cancel</Btn>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ══ DETAIL MODAL ══ */}
      {showDetail&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,backdropFilter:"blur(4px)"}}>
          <Card style={{width:"100%",maxWidth:460}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text}}>Appointment Details</h3>
              <button onClick={()=>setShowDetail(null)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.textLight}}>✕</button>
            </div>
            <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:18,padding:"14px",background:C.cardAlt,borderRadius:14}}>
              <Avatar initials={showDetail.avatar} color={showDetail.color} size={52}/>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:C.text}}>{showDetail.patient}</div>
                <div style={{fontSize:13,color:C.textLight,marginTop:2}}>{showDetail.doctor}</div>
                <div style={{display:"flex",gap:6,marginTop:4}}>
                  <Badge label={showDetail.status} color={STATUS_COL[showDetail.status]||C.blue}/>
                  {showDetail.recurring&&<span style={{fontSize:10,color:C.blue,background:C.blueLight,padding:"2px 8px",borderRadius:10,fontWeight:700}}>🔄 Recurring</span>}
                </div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {[["📅 Date",showDetail.date],["🕐 Time",showDetail.time],["🏥 Type",showDetail.type],["📝 Notes",showDetail.notes||"None"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",background:C.cardAlt,borderRadius:10}}>
                  <span style={{fontSize:12,color:C.textLight,fontWeight:600}}>{k}</span>
                  <span style={{fontSize:13,color:C.text,fontWeight:700,maxWidth:"60%",textAlign:"right"}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {showDetail.status==="pending"   &&<Btn onClick={()=>{updateStatus(showDetail.id,"confirmed");setShowDetail(null);}} style={{flex:1,borderRadius:10}}>✅ Confirm</Btn>}
              {showDetail.status==="confirmed" &&<Btn variant="ghost" onClick={()=>{updateStatus(showDetail.id,"completed");setShowDetail(null);}} style={{flex:1,borderRadius:10}}>✔ Complete</Btn>}
              {showDetail.status!=="cancelled"&&showDetail.status!=="completed"&&<Btn variant="danger" onClick={()=>{updateStatus(showDetail.id,"cancelled");setShowDetail(null);}} style={{flex:1,borderRadius:10}}>Cancel</Btn>}
              <Btn variant="blue" onClick={()=>{setShowReminder(showDetail);setShowDetail(null);}} style={{borderRadius:10}}>🔔 Remind</Btn>
              <Btn variant="outline" onClick={()=>setShowDetail(null)} style={{borderRadius:10,padding:"10px 14px"}}>Close</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* ══ REMINDER MODAL ══ */}
      {showReminder&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,backdropFilter:"blur(4px)"}}>
          <Card style={{width:"100%",maxWidth:420}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text}}>🔔 Send Reminder</h3>
              <button onClick={()=>setShowReminder(null)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.textLight}}>✕</button>
            </div>

            <div style={{padding:"14px",background:C.cardAlt,borderRadius:12,marginBottom:18}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{showReminder.patient}</div>
              <div style={{fontSize:12,color:C.textLight,marginTop:2}}>{showReminder.type} · {showReminder.date} at {showReminder.time}</div>
              <div style={{fontSize:12,color:C.textLight}}>with {showReminder.doctor}</div>
            </div>

            <div style={{padding:"12px 14px",background:"#fffbeb",borderRadius:10,marginBottom:18,fontSize:13,color:"#92600a",lineHeight:1.6}}>
              📩 Message preview:<br/>
              <em>"Reminder: Your {showReminder.type} appointment with {showReminder.doctor} is on {showReminder.date} at {showReminder.time}."</em>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[["email","📧 Email Reminder","Send via email to patient"],["sms","📱 SMS Reminder","Send via text message"],["both","📧📱 Email + SMS","Send both channels"]].map(([ch,label,desc])=>(
                <button key={ch} onClick={()=>sendReminder(showReminder,ch)}
                  disabled={reminderSent[showReminder.id+"_"+ch]}
                  style={{padding:"12px 16px",borderRadius:12,border:`1.5px solid ${reminderSent[showReminder.id+"_"+ch]?C.accent:C.border}`,background:reminderSent[showReminder.id+"_"+ch]?C.accentLight:"#fff",cursor:reminderSent[showReminder.id+"_"+ch]?"default":"pointer",textAlign:"left",transition:"all 0.15s"}}>
                  <div style={{fontSize:13,fontWeight:700,color:reminderSent[showReminder.id+"_"+ch]?C.accent:C.text}}>{reminderSent[showReminder.id+"_"+ch]?"✅ Sent — ":""}{label}</div>
                  <div style={{fontSize:11,color:C.textLight,marginTop:2}}>{desc}</div>
                </button>
              ))}
              <Btn variant="outline" onClick={()=>setShowReminder(null)} style={{borderRadius:10,padding:"10px"}}>Close</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Small shared components ────────────────────────────────────────────────────
function ApptCard({a,onClick,onReminder,compact=false}) {
  const STATUS_COL={confirmed:C.accent,pending:C.blue,cancelled:C.coral,completed:"#8b5cf6",waiting:C.amber,in_progress:"#06b6d4"};
  return (
    <Card hover onClick={onClick} style={{padding:compact?"12px 14px":"14px 16px",borderLeft:`4px solid ${STATUS_COL[a.status]||C.border}`,cursor:"pointer"}}>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:compact?0:8}}>
        <Avatar initials={a.avatar} color={a.color} size={compact?30:36}/>
        <div style={{flex:1}}>
          <div style={{fontSize:compact?12:13,fontWeight:800,color:C.text}}>{a.patient}</div>
          {!compact&&<div style={{fontSize:11,color:C.textLight}}>{a.doctor}</div>}
        </div>
        <Badge label={a.status} color={STATUS_COL[a.status]||C.blue}/>
      </div>
      {!compact&&(
        <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"space-between",marginTop:8}}>
          <div style={{display:"flex",gap:5}}>
            <span style={{background:C.cardAlt,borderRadius:6,padding:"3px 8px",fontSize:11,color:C.textMed,fontWeight:700}}>🕐 {a.time}</span>
            <span style={{background:C.cardAlt,borderRadius:6,padding:"3px 8px",fontSize:11,color:C.textMed}}>{a.type}</span>
            {a.recurring&&<span style={{fontSize:10,color:C.blue,background:C.blueLight,padding:"2px 6px",borderRadius:8,fontWeight:700}}>🔄</span>}
          </div>
          <button onClick={e=>{e.stopPropagation();onReminder();}} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",color:C.textLight}} title="Send reminder">🔔</button>
        </div>
      )}
    </Card>
  );
}

function ActionBtn({children,onClick,color}) {
  return (
    <button onClick={onClick} style={{width:30,height:30,borderRadius:8,background:color+"15",border:`1px solid ${color}33`,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>
      {children}
    </button>
  );
}

function QBtn({children,onClick,color}) {
  return (
    <button onClick={onClick} style={{padding:"6px 12px",borderRadius:10,background:color+"15",border:`1px solid ${color}33`,cursor:"pointer",fontSize:11,fontWeight:700,color,whiteSpace:"nowrap"}}>
      {children}
    </button>
  );
}

function DoctorAvailabilityCard({doctor:d, appointments, onSave}) {
  const [workDays,   setWorkDays]   = useState(d.workDays||[1,2,3,4,5]);
  const [startTime,  setStartTime]  = useState("08:00");
  const [endTime,    setEndTime]    = useState("17:00");
  const [slotDur,    setSlotDur]    = useState(30);
  const [maxPat,     setMaxPat]     = useState(20);
  const [dayOff,     setDayOff]     = useState("");
  const [daysOff,    setDaysOff]    = useState([]);
  const [saved,      setSaved]      = useState(false);
  const DAY_ABBR=["Su","Mo","Tu","We","Th","Fr","Sa"];

  const thisDocAppts = appointments.filter(a=>a.doctorId===d.id);

  const handleSave = () => {
    import("../services/api").then(({appointmentService:as})=>{
      as.setAvailability?.({doctor_id:d.id,doctor_name:d.name,working_days:workDays,start_time:startTime,end_time:endTime,slot_duration:slotDur,days_off:daysOff,max_patients:maxPat}).catch(()=>{});
    });
    setSaved(true); setTimeout(()=>setSaved(false),2500);
    onSave();
  };

  return (
    <Card>
      <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:16}}>
        <Avatar initials={d.avatar} color={d.color} size={48}/>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,color:C.text}}>{d.name}</div>
          <div style={{fontSize:12,color:C.textLight}}>{d.specialty} · {thisDocAppts.length} total appointments</div>
        </div>
        <Btn onClick={handleSave} style={{borderRadius:10,padding:"8px 18px",fontSize:12,background:saved?"#22c55e":undefined}}>
          {saved?"✅ Saved":"💾 Save"}
        </Btn>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
        {/* Working days */}
        <div>
          <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em",display:"block",marginBottom:8}}>WORKING DAYS</label>
          <div style={{display:"flex",gap:6}}>
            {DAY_ABBR.map((day,i)=>(
              <button key={i} onClick={()=>setWorkDays(prev=>prev.includes(i)?prev.filter(d=>d!==i):[...prev,i].sort())}
                style={{width:34,height:34,borderRadius:10,border:`2px solid ${workDays.includes(i)?d.color:C.border}`,background:workDays.includes(i)?d.color+"20":"#fff",color:workDays.includes(i)?d.color:C.textLight,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Hours */}
        <div>
          <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em",display:"block",marginBottom:8}}>WORKING HOURS</label>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}
              style={{background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",flex:1}}/>
            <span style={{color:C.textLight}}>→</span>
            <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}
              style={{background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",flex:1}}/>
          </div>
        </div>

        {/* Slot duration + max patients */}
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}>
            <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em",display:"block",marginBottom:8}}>SLOT (min)</label>
            <select value={slotDur} onChange={e=>setSlotDur(+e.target.value)}
              style={{width:"100%",background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,outline:"none"}}>
              {[15,20,30,45,60].map(n=><option key={n} value={n}>{n} min</option>)}
            </select>
          </div>
          <div style={{flex:1}}>
            <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em",display:"block",marginBottom:8}}>MAX / DAY</label>
            <input type="number" min={1} max={50} value={maxPat} onChange={e=>setMaxPat(+e.target.value)}
              style={{width:"100%",background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,outline:"none"}}/>
          </div>
        </div>

        {/* Days off */}
        <div>
          <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em",display:"block",marginBottom:8}}>DAYS OFF / LEAVE</label>
          <div style={{display:"flex",gap:8}}>
            <input type="date" value={dayOff} onChange={e=>setDayOff(e.target.value)}
              style={{flex:1,background:C.cardAlt,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none"}}/>
            <button onClick={()=>{if(dayOff&&!daysOff.includes(dayOff)){setDaysOff(p=>[...p,dayOff]);setDayOff("");}}}
              style={{padding:"8px 14px",borderRadius:10,background:C.accentLight,border:"none",cursor:"pointer",fontSize:13,color:C.accent,fontWeight:700}}>Add</button>
          </div>
          {daysOff.length>0&&(
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
              {daysOff.map(day=>(
                <span key={day} style={{background:C.coralLight,color:C.coral,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,display:"flex",gap:5,alignItems:"center"}}>
                  🚫 {day}
                  <button onClick={()=>setDaysOff(p=>p.filter(d=>d!==day))} style={{background:"none",border:"none",cursor:"pointer",color:C.coral,fontSize:13,lineHeight:1}}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
