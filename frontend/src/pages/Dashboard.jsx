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
  const [appts, setAppts]     = useState([]);
  const [donutAnim, setDonutAnim] = useState(0);

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
        patients: p.total || 1450,
        appointments: a.total || 280,
        beds: s.normal || 86,
        invoices: s.total || 1050,
      });
      if (apptListRes.status === "fulfilled") setAppts((apptListRes.value || []).slice(0, 4));
    });
    analyticsService.getRevenue?.().then(d => { if (d?.length) setRevenueData(d); }).catch(() => {});
    doctorService.list?.().then(d => { if (d?.length) setDoctorSchedule(d.slice(0, 4)); }).catch(() => {});
    reportService.list?.({ limit:4 }).then(d => { if (d?.length) setRecentReports(d.slice(0, 4)); }).catch(() => {});
    let v = 0;
    const id = setInterval(() => { v += 2; setDonutAnim(v); if (v >= 60) clearInterval(id); }, 16);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── Welcome Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 800, color: "var(--text)" }}>
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-light)", marginTop: 6 }}>
            Here is what's happening in your hospital today.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
           <button style={{ padding: "12px 20px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", fontWeight: 700, cursor: "pointer", boxShadow: "var(--shadow)" }}>📅 Calendar</button>
           <button style={{ padding: "12px 20px", borderRadius: 14, background: "var(--accent)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.3)" }}>+ New Admission</button>
        </div>
      </div>

      {/* ── KPI Bento Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        {[
          { label: "Active Patients", value: stats.patients, icon: "👥", col: "var(--accent)", bg: "var(--accent-light)", change: "+12%" },
          { label: "Upcoming Appts", value: stats.appointments, icon: "📅", col: "var(--blue)", bg: "var(--blue-light)", change: "+5%" },
          { label: "Available Beds", value: stats.beds, icon: "🛌", col: "var(--amber)", bg: "var(--amber-light)", change: "-2%" },
          { label: "Lab Requests", value: stats.invoices, icon: "🧪", col: "var(--coral)", bg: "var(--coral-light)", change: "+8%" },
        ].map((k, i) => (
          <div key={i} className="card-hover" style={{ background: "var(--card)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{k.icon}</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: k.change.startsWith("+") ? "var(--accent)" : "var(--coral)" }}>{k.change}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-light)" }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", marginTop: 4 }}>{k.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* ── Main Content Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        {/* Revenue Analytics */}
        <div style={{ background: "var(--card)", borderRadius: 24, padding: 28, boxShadow: "var(--shadow)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
             <h3 style={{ fontSize: 18, fontWeight: 800 }}>Hospital Revenue</h3>
             <select style={{ background: "var(--bg)", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
             </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData.length ? revenueData.map(r => ({ m:r.month, income:r.revenue })) : []}>
              <defs>
                <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{fill:'var(--text-light)', fontSize:12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill:'var(--text-light)', fontSize:12}} />
              <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: 'var(--shadow)' }} />
              <Area type="monotone" dataKey="income" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions / Schedule */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
           <div style={{ background: "var(--accent)", borderRadius: 24, padding: 24, color: "#fff", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "relative", zIndex: 1 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>System Health</h3>
                <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>All clinical servers are operational.</p>
                <div style={{ marginTop: 24, display: "flex", gap: 8, alignItems: "center" }}>
                   <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} />
                   <span style={{ fontSize: 12, fontWeight: 700 }}>99.9% Uptime</span>
                </div>
              </div>
              <div style={{ position: "absolute", right: -20, bottom: -20, fontSize: 120, opacity: 0.1 }}>🛡️</div>
           </div>

           <div style={{ background: "var(--card)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", border: "1px solid var(--border)", flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Pending Actions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { t: "Sign 3 Reports", sub: "Radiology Dept", icon: "✍️", col: "var(--blue)" },
                  { t: "Verify Billing", sub: "Insurance AOK", icon: "🧾", col: "var(--amber)" },
                  { t: "Staff Briefing", sub: "09:00 AM", icon: "📢", col: "var(--accent)" },
                ].map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px", background: "var(--bg)", borderRadius: 16 }}>
                    <div style={{ fontSize: 18 }}>{a.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{a.t}</div>
                      <div style={{ fontSize: 11, color: "var(--text-light)" }}>{a.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
         <div style={{ background: "var(--card)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Recent Reports</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
               {recentReports.map((r, i) => (
                 <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>🔬</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{r.patient_name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-light)" }}>{r.disease}</div>
                      </div>
                   </div>
                   <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)" }}>VIEW</span>
                 </div>
               ))}
            </div>
         </div>

         <div style={{ background: "var(--card)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Doctor Roster</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
               {doctorSchedule.map((d, i) => (
                 <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                       <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>{d.name?.slice(0,2).toUpperCase()}</div>
                       <div>
                         <div style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</div>
                         <div style={{ fontSize: 11, color: "var(--text-light)" }}>{d.specialty}</div>
                       </div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} />
                 </div>
               ))}
            </div>
         </div>

         <div style={{ background: "var(--card)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Bed Capacity</h3>
            <div style={{ position: "relative", height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
               <svg width={120} height={120} viewBox="0 0 160 160">
                 <circle cx={80} cy={80} r={60} fill="none" stroke="var(--border)" strokeWidth={16}/>
                 <circle cx={80} cy={80} r={60} fill="none" stroke="var(--accent)" strokeWidth={16}
                   strokeDasharray={`${2*Math.PI*60 * 0.75} ${2*Math.PI*60}`}
                   strokeLinecap="round" transform="rotate(-90 80 80)" />
               </svg>
               <div style={{ position: "absolute", textAlign: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: 24 }}>75%</div>
                  <div style={{ fontSize: 10, color: "var(--text-light)" }}>Occupied</div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
