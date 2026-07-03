import { useState, useEffect } from "react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { diagnosisService, appointmentService, patientService, analyticsService, reportService, doctorService } from "../services/api";

// ── design tokens matching HavenMed reference ─────────────────────────────────
const T = {
  lavender:   "#E8E6F8",  lavendDark: "#A09BD4",
  sage:       "#E4EFE8",  sageDark:   "#6BAE88",
  lime:       "#EDF2D8",  limeDark:   "#B5C96A",
  sky:        "#E4EFF8",  skyDark:    "#7FB3D6",
  white:      "#FFFFFF",
  bg:         "#F4F6FA",
  text:       "#1C1C2E",
  textMed:    "#6B7280",
  textLight:  "#9CA3AF",
  border:     "#E5E7EB",
  accent:     "#7C6FD4",
  green:      "#4CAF82",
  red:        "#F47B7B",
  amber:      "#F5A623",
};





// ── tiny components ───────────────────────────────────────────────────────────
const KpiCard = ({ label, value, change, positive, bg, iconBg, icon, onClick }) => (
  <div onClick={onClick} style={{
    background: bg, borderRadius:20, padding:"22px 24px",
    cursor: onClick?"pointer":"default", transition:"transform 0.15s, box-shadow 0.15s",
    boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
  }}
  onMouseEnter={e=>{ if(onClick){ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.09)"; }}}
  onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)"; }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
      <div style={{ width:40, height:40, borderRadius:12, background:iconBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{icon}</div>
      <button style={{ background:"none", border:"none", fontSize:18, color:T.textLight, cursor:"pointer", lineHeight:1 }}>⋯</button>
    </div>
    <div style={{ fontSize:20, fontWeight:700, color:T.text, marginBottom:4 }}>{label}</div>
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <span style={{ fontSize:12, padding:"2px 8px", borderRadius:20, background: positive?"#E8F5E9":"#FFEBEE", color: positive?"#2E7D32":"#C62828", fontWeight:700 }}>
        {positive?"↑":"↓"} {change}
      </span>
      <span style={{ fontSize:12, color:T.textMed }}>{value} more than Yesterday</span>
    </div>
  </div>
);

const SectionHeader = ({ title, sub, action }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
    <div>
      <div style={{ fontSize:15, fontWeight:700, color:T.text }}>{title}</div>
      {sub && <div style={{ fontSize:12, color:T.textMed, marginTop:2 }}>{sub}</div>}
    </div>
    {action}
  </div>
);

const CustomRevTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px", fontSize:12 }}>
      <div style={{ fontWeight:700, marginBottom:4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:2 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:p.color }}/>
          <span style={{ color:T.textMed }}>{p.name}:</span>
          <span style={{ fontWeight:700 }}>${(p.value/1000).toFixed(0)}k</span>
        </div>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
export default function Dashboard({ setPage }) {
  const { user } = useAuth();
  const [stats, setStats]       = useState({ patients:0, appointments:0, beds:86, invoices:0 });
  const [revenueData, setRevenueData]     = useState([]);
  const [doctorSchedule, setDoctorSchedule] = useState([]);
  const [recentReports, setRecentReports]   = useState([]);
  const [liveVitals, setLiveVitals]         = useState(null);
  const [appts, setAppts]     = useState([]);
  const [revenueRange, setRevenueRange] = useState("Monthly");
  const [activePatient, setActivePatient] = useState(null);
  const [donutAnim, setDonutAnim] = useState(0);

  const firstName = user?.name?.split(" ").find(w => !w.startsWith("Dr")) || user?.name?.split(" ")[0] || "Doctor";

  useEffect(() => {
    Promise.allSettled([
      diagnosisService.getStats(),
      appointmentService.stats(),
      patientService.stats(),
      appointmentService.list({ status:"", search:"" }),
    ]).then(([scanRes, apptRes, patRes, apptListRes]) => {
      const s = scanRes.status === "fulfilled" ? scanRes.value : {};
      const a = apptRes.status === "fulfilled"  ? apptRes.value  : {};
      const p = patRes.status === "fulfilled"   ? patRes.value   : {};
      setStats({
        patients:     p.total        || 1450,
        appointments: a.total        || 280,
        beds:         s.normal       || 86,
        invoices:     s.total        || 1050,
      });
      if (apptListRes.status === "fulfilled") setAppts((apptListRes.value || []).slice(0, 3));
    });
    // fetch revenue data
    analyticsService.getRevenue?.().then(d => { if (d?.length) setRevenueData(d); }).catch(() => {});
    // fetch doctors for schedule panel
    doctorService.list?.().then(d => { if (d?.length) setDoctorSchedule(d.slice(0, 3)); }).catch(() => {});
    // fetch recent reports
    reportService.list?.({ limit:4 }).then(d => { if (d?.length) setRecentReports(d.slice(0, 4)); }).catch(() => {});
    // animate donut
    let v = 0;
    const id = setInterval(() => { v += 2; setDonutAnim(v); if (v >= 60) clearInterval(id); }, 16);
    return () => clearInterval(id);
  }, []);

  const totalRevenue   = 712_3264;
  const totalExpense   = 14_965_5476;

  return (
    <div style={{ fontFamily:"'DM Sans', 'Nunito', system-ui, sans-serif" }}>

      {/* ── Top search / action bar ── */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28, background:"#fff", borderRadius:16, padding:"10px 16px", border:`1px solid ${T.border}` }}>
        <span style={{ fontSize:16, color:T.textLight }}>🔍</span>
        <input placeholder="Search patients, doctors, reports…"
          style={{ flex:1, border:"none", outline:"none", fontSize:13, color:T.text, background:"transparent" }}/>
        <div style={{ display:"flex", gap:8 }}>
          <button style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:10, padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6, color:T.text }}>
            + Add <span style={{ color:T.textLight }}>▾</span>
          </button>
          <button style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:10, width:36, height:36, cursor:"pointer", fontSize:16 }}>✉️</button>
          <button style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:10, width:36, height:36, cursor:"pointer", fontSize:16 }}>🔔</button>
          <button style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:10, width:36, height:36, cursor:"pointer", fontSize:16 }}>⚙️</button>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:20 }}>
        <KpiCard label="Total Patients"  value={stats.patients}     change="+2.1%" positive bg={T.lavender} iconBg="rgba(160,155,212,0.3)" icon="👥" onClick={() => setPage("patients")}/>
        <KpiCard label="Appointments"    value={stats.appointments} change="-1.5%" positive={false} bg={T.sage}     iconBg="rgba(107,174,136,0.3)" icon="📅" onClick={() => setPage("appointments")}/>
        <KpiCard label="Bed Room"        value={stats.beds}         change="+2.1%" positive bg={T.lime}     iconBg="rgba(181,201,106,0.3)" icon="🛏️" onClick={() => setPage("resources")}/>
        <KpiCard label="Total Invoice"   value={stats.invoices}     change="+2.1%" positive bg={T.sky}      iconBg="rgba(127,179,214,0.3)" icon="🧾" onClick={() => setPage("analytics")}/>
      </div>

      {/* ── Middle row: Patient Health + Revenue ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1.15fr 1fr", gap:16, marginBottom:16 }}>

        {/* Patient Health card with 3D anatomy illustration */}
        <div style={{ background:"#fff", borderRadius:20, padding:"22px 24px", border:`1px solid ${T.border}`, position:"relative", overflow:"hidden", minHeight:320 }}>
          <SectionHeader
            title="Patient Health"
            sub="From Patient"
            action={
              <div style={{ display:"flex", gap:8 }}>
                <button style={{ background:T.bg, border:"none", borderRadius:9, width:30, height:30, cursor:"pointer", fontSize:13 }}>↗</button>
                <button style={{ background:T.bg, border:"none", borderRadius:9, width:30, height:30, cursor:"pointer", fontSize:16, color:T.textLight }}>⋯</button>
              </div>
            }
          />

          {/* Anatomy illustration placeholder — gradient orb */}
          <div style={{ position:"relative", height:220, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {/* Glowing background blob */}
            <div style={{ position:"absolute", width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle, #EDE9FB 0%, #F0F5FF 40%, transparent 70%)", top:"50%", left:"50%", transform:"translate(-50%,-50%)" }}/>

            {/* Lung-like 3D art substitute — layered circles */}
            <div style={{ position:"relative", zIndex:1 }}>
              <div style={{ width:140, height:180, position:"relative" }}>
                {/* Left lobe */}
                <div style={{ position:"absolute", left:0, top:20, width:62, height:140, borderRadius:"50% 50% 50% 50% / 60% 60% 40% 40%", background:"linear-gradient(135deg,#c084fc,#818cf8,#60a5fa)", opacity:0.85 }}/>
                {/* Right lobe */}
                <div style={{ position:"absolute", right:0, top:20, width:62, height:140, borderRadius:"50% 50% 50% 50% / 60% 60% 40% 40%", background:"linear-gradient(135deg,#f472b6,#c084fc,#818cf8)", opacity:0.85 }}/>
                {/* Trachea */}
                <div style={{ position:"absolute", left:"50%", top:0, transform:"translateX(-50%)", width:12, height:30, borderRadius:6, background:"#818cf8" }}/>
                {/* Bronchi */}
                <div style={{ position:"absolute", left:"50%", top:28, width:62, height:8, background:"#818cf8", borderRadius:"0 0 20px 0", transform:"translateX(-50%)" }}/>
                {/* Bpm floating badge */}
                <div style={{ position:"absolute", right:-70, top:60, background:"#fff", borderRadius:12, padding:"7px 12px", boxShadow:"0 4px 16px rgba(0,0,0,0.12)", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}>
                  <span style={{ fontSize:14 }}>💓</span>
                  <span style={{ fontSize:13, fontWeight:700, color:T.text }}>108 bpm</span>
                </div>
              </div>
            </div>

            {/* Doctor card (floating bottom-left) */}
            <div style={{ position:"absolute", bottom:0, left:0, background:"#fff", borderRadius:16, padding:"12px 16px", boxShadow:"0 4px 20px rgba(0,0,0,0.12)", minWidth:160 }}>
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                <div style={{ width:30, height:30, borderRadius:"50%", background:T.lavender, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>👩‍⚕️</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:T.text }}>Dr. Ishita Datta</div>
                  <div style={{ fontSize:10, color:T.textMed }}>Pulmonary</div>
                </div>
              </div>
              <div style={{ fontSize:18, fontWeight:800, color:T.text }}>Today</div>
              <div style={{ fontSize:11, color:T.textMed }}>01:15 PM – 02:00 PM</div>
            </div>

            {/* Patient vitals card (floating bottom-right) */}
            {(
              <div style={{ position:"absolute", bottom:0, right:-8, background:"#fff", borderRadius:16, padding:"12px 16px", boxShadow:"0 4px 20px rgba(0,0,0,0.12)", minWidth:130 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <div style={{ width:22, height:22, borderRadius:"50%", background:T.lavender, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>👤</div>
                    <span style={{ fontSize:11, fontWeight:700, color:T.text }}>Jeffrey Hessel</span>
                  </div>
                  <button style={{ background:"none", border:"none", fontSize:12, cursor:"pointer", color:T.textLight }}>✕</button>
                </div>
                <div style={{ fontSize:10, color:T.textLight, marginBottom:1 }}>Temperature</div>
                <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:6 }}>{liveVitals?.temp || "36.8°C"}</div>
                <div style={{ fontSize:10, color:T.textLight, marginBottom:1 }}>Heart Rate</div>
                <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:6 }}>{liveVitals?.hr   || "108 bpm"}</div>
                <div style={{ fontSize:10, color:T.textLight, marginBottom:1 }}>Blood O₂</div>
                <div style={{ fontSize:16, fontWeight:700, color:T.text }}>{liveVitals?.o2   || "98%"}</div>
              </div>
            )}
          </div>
        </div>

        {/* Total Revenue */}
        <div style={{ background:"#fff", borderRadius:20, padding:"22px 24px", border:`1px solid ${T.border}` }}>
          <SectionHeader
            title="Total Revenue"
            sub={new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"2-digit", year:"numeric" })}
            action={
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <select value={revenueRange} onChange={e => setRevenueRange(e.target.value)}
                  style={{ border:`1px solid ${T.border}`, borderRadius:9, padding:"5px 10px", fontSize:12, color:T.text, background:"#fff", cursor:"pointer" }}>
                  {["Monthly","Weekly","Yearly"].map(r => <option key={r}>{r}</option>)}
                </select>
                <button style={{ background:T.bg, border:"none", borderRadius:9, width:30, height:30, cursor:"pointer", fontSize:16, color:T.textLight }}>⋯</button>
              </div>
            }
          />

          {/* Legend */}
          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
            {[["Expense","#E5E7EB","#6B7280"],["Income","#E8E6F8",T.accent]].map(([l,bg,col]) => (
              <span key={l} style={{ padding:"4px 14px", borderRadius:20, background:bg, fontSize:12, fontWeight:700, color:col }}>{l}</span>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={revenueData.length ? revenueData.map(r => ({ m:r.month, expense:r.outstanding*8, income:r.revenue })) : []} margin={{ top:5, right:5, left:-20, bottom:0 }}>
              <XAxis dataKey="m" tick={{ fill:T.textLight, fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip content={<CustomRevTip/>}/>
              <Line type="monotone" dataKey="expense" name="Expense" stroke="#D1D5DB" strokeWidth={2.5} dot={false} strokeDasharray="4 3"/>
              <Line type="monotone" dataKey="income"  name="Income"  stroke={T.accent}  strokeWidth={2.5} dot={{ r:5, fill:"#fff", strokeWidth:2, stroke:T.accent }} activeDot={{ r:7 }}/>
            </LineChart>
          </ResponsiveContainer>

          {/* Revenue totals */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:16, paddingTop:14, borderTop:`1px solid ${T.border}` }}>
            {[
              { label:"Hospital total Income",  value:`$ ${(totalRevenue/100).toLocaleString()}`, color:T.text },
              { label:"Hospital total Expense", value:`$ ${(totalExpense/100).toLocaleString()}`, color:T.text },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize:10, color:T.textMed, marginBottom:2 }}>{item.label}</div>
                <div style={{ fontSize:14, fontWeight:800, color:item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row: Patient Overview + Doctor Schedule + Reports ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>

        {/* Patient Overview — donut */}
        <div style={{ background:"#fff", borderRadius:20, padding:"22px 24px", border:`1px solid ${T.border}` }}>
          <SectionHeader
            title="Patient Overview"
            sub="By Departments"
            action={<button style={{ background:T.bg, border:"none", borderRadius:9, width:30, height:30, cursor:"pointer", fontSize:16, color:T.textLight }}>⋯</button>}
          />
          <div style={{ position:"relative", display:"flex", justifyContent:"center", alignItems:"center", height:160 }}>
            {/* SVG donut */}
            <svg width={160} height={160} viewBox="0 0 160 160">
              <circle cx={80} cy={80} r={60} fill="none" stroke="#E5E7EB" strokeWidth={18}/>
              {/* Lime segment ~60% */}
              <circle cx={80} cy={80} r={60} fill="none" stroke={T.limeDark} strokeWidth={18}
                strokeDasharray={`${2*Math.PI*60 * donutAnim/100} ${2*Math.PI*60}`}
                strokeLinecap="round" transform="rotate(-90 80 80)" style={{ transition:"stroke-dasharray 0.05s" }}/>
              {/* Lavender segment ~25% */}
              <circle cx={80} cy={80} r={60} fill="none" stroke={T.accent} strokeWidth={18}
                strokeDasharray={`${2*Math.PI*60 * Math.min(donutAnim,25)/100} ${2*Math.PI*60}`}
                strokeDashoffset={-2*Math.PI*60*0.60}
                strokeLinecap="round" transform="rotate(-90 80 80)"/>
            </svg>
            {/* Center label */}
            <div style={{ position:"absolute", textAlign:"center" }}>
              <div style={{ fontWeight:800, fontSize:24, color:T.text }}>{stats.patients.toLocaleString()}</div>
              <div style={{ fontSize:10, color:T.textMed }}>Total Patients</div>
            </div>
          </div>
          {/* Legend */}
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:8 }}>
            {[
              { label:"General",     pct:"60%", color:T.limeDark  },
              { label:"Specialists", pct:"25%", color:T.accent    },
              { label:"Emergency",   pct:"15%", color:T.red       },
            ].map(item => (
              <div key={item.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:10, height:10, borderRadius:3, background:item.color, flexShrink:0 }}/>
                <span style={{ fontSize:12, color:T.textMed, flex:1 }}>{item.label}</span>
                <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{item.pct}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Doctor Schedule */}
        <div style={{ background:"#fff", borderRadius:20, padding:"22px 24px", border:`1px solid ${T.border}` }}>
          <SectionHeader
            title="Doctor Schedule"
            action={
              <div style={{ display:"flex", gap:8 }}>
                <button style={{ background:T.bg, border:"none", borderRadius:9, width:30, height:30, cursor:"pointer", fontSize:13 }}>↗</button>
                <button style={{ background:T.bg, border:"none", borderRadius:9, width:30, height:30, cursor:"pointer", fontSize:16, color:T.textLight }}>⋯</button>
              </div>
            }
          />
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {(doctorSchedule.length > 0 ? doctorSchedule.map((d, i) => ({
              name:      d.name     || "Dr. —",
              specialty: d.specialty|| "General",
              time:      appts[i] ? `${appts[i].time} – ${appts[i].time}` : "—",
              status:    appts[i]?.status === "confirmed" ? "available" : "busy",
              initials:  (d.name || "Dr").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase(),
              color:     [T.accent, T.green, "#ec4899"][i % 3],
            })) : appts.length > 0 ? appts.map((a, i) => ({
              name:      a.doctor || "Dr. —",
              specialty: a.type   || "General",
              time:      `${a.time || "—"}`,
              status:    a.status === "confirmed" ? "available" : "busy",
              initials:  (a.doctor || "Dr").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase(),
              color:     [T.accent, T.green, T.red][i % 3],
            })) : []).map((doc, i) => (
              <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"10px 12px", borderRadius:12, background:T.bg, border:`1px solid ${T.border}` }}>
                <div style={{ width:40, height:40, borderRadius:12, background:doc.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:doc.color, flexShrink:0 }}>
                  {doc.initials}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:T.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{doc.name}</div>
                  <div style={{ fontSize:10, color:T.textMed }}>{doc.specialty}</div>
                  <div style={{ fontSize:10, color:T.textLight, marginTop:2 }}>{doc.time}</div>
                </div>
                <span style={{ fontSize:10, padding:"3px 9px", borderRadius:20, background: doc.status==="available"?T.sage:T.lavender, color: doc.status==="available"?T.green:T.red, fontWeight:700, flexShrink:0, whiteSpace:"nowrap" }}>
                  {doc.status==="available"?"Available":"Busy"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Report */}
        <div style={{ background:T.sky, borderRadius:20, padding:"22px 24px", border:`1px solid #C7DCF0` }}>
          <SectionHeader
            title="Report"
            action={<button style={{ background:"rgba(255,255,255,0.6)", border:"none", borderRadius:9, width:30, height:30, cursor:"pointer", fontSize:16, color:T.textLight }}>⋯</button>}
          />
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {(recentReports.length > 0 ? recentReports.map(r => ({ title:r.disease||r.title||"Report", time:r.created_at?.slice(0,10)||"Recent", icon:r.status==="critical"?"🚨":r.status==="abnormal"?"⚠️":"🔬" })) : [{title:"No reports yet",time:"—",icon:"📋"}]).map((r, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"rgba(255,255,255,0.7)", borderRadius:12, cursor:"pointer", transition:"background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.95)"}
                onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.7)"}>
                <div style={{ width:34, height:34, borderRadius:10, background:"rgba(255,255,255,0.8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                  {r.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:T.text }}>{r.title}</div>
                  <div style={{ fontSize:10, color:T.textMed, marginTop:1 }}>{r.time}</div>
                </div>
                <span style={{ fontSize:14, color:T.textLight }}>›</span>
              </div>
            ))}
          </div>
          <button onClick={() => setPage("reports")} style={{ width:"100%", marginTop:12, background:"rgba(255,255,255,0.8)", border:`1px solid ${T.border}`, borderRadius:10, padding:"9px", fontSize:12, fontWeight:700, color:T.accent, cursor:"pointer" }}>
            View All Reports →
          </button>
        </div>
      </div>
    </div>
  );
}
