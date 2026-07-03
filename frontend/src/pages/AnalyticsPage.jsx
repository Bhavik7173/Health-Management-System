import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { C } from "../constants";
import { useAuth } from "../context/AuthContext";
import { Card, Btn, Badge, Avatar, PageHeader, StatCard, TabBar, Spinner } from "../components/UI";

const COLORS  = [C.accent, C.blue, C.coral, C.amber, "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];
const RISK_COL = { critical: C.coral, high: C.amber, moderate: C.blue, low: C.accent };

// ── seed fallback data ────────────────────────────────────────────────────────
const SEED_MONTHLY = [
  { month:"Nov", total:98,  normal:54, abnormal:30, critical:14, revenue:9200,  invoices:12 },
  { month:"Dec", total:112, normal:60, abnormal:35, critical:17, revenue:10800, invoices:15 },
  { month:"Jan", total:134, normal:72, abnormal:42, critical:20, revenue:12400, invoices:18 },
  { month:"Feb", total:119, normal:68, abnormal:36, critical:15, revenue:11600, invoices:16 },
  { month:"Mar", total:148, normal:80, abnormal:48, critical:20, revenue:13800, invoices:20 },
  { month:"Apr", total:163, normal:90, abnormal:52, critical:21, revenue:15200, invoices:22 },
  { month:"May", total:178, normal:98, abnormal:58, critical:22, revenue:16800, invoices:25 },
];
const SEED_APT_TRENDS = [
  { date:"Mon", total:12, confirmed:8,  completed:6,  pending:3, cancelled:1 },
  { date:"Tue", total:18, confirmed:14, completed:10, pending:3, cancelled:1 },
  { date:"Wed", total:15, confirmed:11, completed:8,  pending:3, cancelled:1 },
  { date:"Thu", total:22, confirmed:17, completed:14, pending:4, cancelled:1 },
  { date:"Fri", total:20, confirmed:16, completed:12, pending:3, cancelled:1 },
  { date:"Sat", total:9,  confirmed:7,  completed:5,  pending:2, cancelled:0 },
  { date:"Sun", total:5,  confirmed:4,  completed:3,  pending:1, cancelled:0 },
];
const SEED_SCAN_TYPES = [
  { name:"X-Ray", value:642 }, { name:"MRI", value:318 }, { name:"CT", value:288 },
];
const SEED_DISEASES = [
  { name:"Normal", count:480 }, { name:"Pneumonia", count:187 },
  { name:"Brain Tumor", count:94 }, { name:"Tuberculosis", count:76 },
  { name:"Lung Cancer", count:58 }, { name:"Emphysema", count:42 },
];
const SEED_DOCTORS = [
  { name:"Dr. Gutierrez", scans:312, accuracy:96.2, critical:48, avgTime:4.2, total:312, confirmed:280, completed:260, cancelled:10 },
  { name:"Dr. Gomez",     scans:287, accuracy:94.8, critical:52, avgTime:3.8, total:287, confirmed:255, completed:240, cancelled:15 },
  { name:"Dr. Frazier",   scans:198, accuracy:97.1, critical:31, avgTime:5.1, total:198, confirmed:185, completed:175, cancelled:8  },
  { name:"Dr. Reed",      scans:251, accuracy:95.5, critical:39, avgTime:4.6, total:251, confirmed:230, completed:215, cancelled:12 },
];
const SEED_RISK = [
  { patient_name:"James Lee",    risk_score:95, risk_level:"critical", factors:["Grade 2 Glioma","Critical scan(s)","Low O₂ 96%"],      conditions:["Brain Tumor","Diabetes"] },
  { patient_name:"Tom Chen",     risk_score:80, risk_level:"critical", factors:["Active TB","COPD","Low O₂ 94%"],                        conditions:["Tuberculosis","COPD"] },
  { patient_name:"Sarah Johnson",risk_score:35, risk_level:"moderate", factors:["Hypertension","Pneumonia scan"],                        conditions:["Hypertension","Asthma"] },
  { patient_name:"Maria Garcia", risk_score:10, risk_level:"low",      factors:["Mild Asthma"],                                          conditions:["Asthma"] },
];
const SEED_REVENUE = [
  { month:"Nov", revenue:9200,  outstanding:2300, invoices:12 },
  { month:"Dec", revenue:10800, outstanding:1800, invoices:15 },
  { month:"Jan", revenue:12400, outstanding:2600, invoices:18 },
  { month:"Feb", revenue:11600, outstanding:1200, invoices:16 },
  { month:"Mar", revenue:13800, outstanding:3200, invoices:20 },
  { month:"Apr", revenue:15200, outstanding:2800, invoices:22 },
  { month:"May", revenue:16800, outstanding:4200, invoices:25 },
];
const SEED_MEDICINE_USAGE = [
  { name:"Paracetamol",   count:142 }, { name:"Ibuprofen",   count:98 },
  { name:"Amoxicillin",   count:87  }, { name:"Metformin",   count:76 },
  { name:"Omeprazole",    count:65  }, { name:"Azithromycin",count:54 },
  { name:"Cetirizine",    count:48  }, { name:"Salbutamol",  count:39 },
];
const OUTBREAK_DATA = [
  { city:"Mumbai",    disease:"Dengue",    lat:19.076, lng:72.877, cases:142, severity:"high" },
  { city:"Delhi",     disease:"Flu",       lat:28.704, lng:77.102, cases:98,  severity:"moderate" },
  { city:"Chennai",   disease:"Cholera",   lat:13.082, lng:80.270, cases:34,  severity:"critical" },
  { city:"Bangalore", disease:"COVID-19",  lat:12.972, lng:77.594, cases:87,  severity:"moderate" },
  { city:"Kolkata",   disease:"Typhoid",   lat:22.572, lng:88.364, cases:56,  severity:"high" },
  { city:"Hyderabad", disease:"Malaria",   lat:17.386, lng:78.473, cases:23,  severity:"low" },
  { city:"Pune",      disease:"Hepatitis", lat:18.521, lng:73.856, cases:18,  severity:"low" },
];
// ── fitness seed data ─────────────────────────────────────────────────────────
const SEED_FITNESS_WEEKLY = [
  { day:"Mon", steps:8200,  calories:420, activeMin:48, heartRate:74, sleep:7.2 },
  { day:"Tue", steps:11400, calories:580, activeMin:72, heartRate:71, sleep:6.8 },
  { day:"Wed", steps:6800,  calories:310, activeMin:35, heartRate:76, sleep:7.5 },
  { day:"Thu", steps:9600,  calories:490, activeMin:61, heartRate:72, sleep:8.0 },
  { day:"Fri", steps:12200, calories:640, activeMin:85, heartRate:69, sleep:7.1 },
  { day:"Sat", steps:14800, calories:720, activeMin:98, heartRate:68, sleep:7.8 },
  { day:"Sun", steps:5200,  calories:260, activeMin:22, heartRate:77, sleep:8.2 },
];
const SEED_BMI_DIST = [
  { range:"Underweight (<18.5)", count:12, color:"#06b6d4" },
  { range:"Normal (18.5-24.9)",  count:58, color:C.accent  },
  { range:"Overweight (25-29.9)",count:22, color:C.amber   },
  { range:"Obese (>=30)",        count:8,  color:C.coral   },
];
const SEED_FITNESS_PATIENTS = [
  { name:"Sarah Johnson", bmi:22.4, steps:9800,  heartRate:68, bp:"120/80", risk:"low",      goal:"Weight maintenance", score:87 },
  { name:"James Lee",     bmi:28.9, steps:4200,  heartRate:82, bp:"138/88", risk:"moderate",  goal:"Reduce BP",          score:54 },
  { name:"Tom Chen",      bmi:31.2, steps:2800,  heartRate:91, bp:"145/92", risk:"high",      goal:"Lose 10kg",          score:31 },
  { name:"Maria Garcia",  bmi:20.1, steps:12400, heartRate:62, bp:"115/75", risk:"low",       goal:"Maintain fitness",   score:94 },
  { name:"Alice Wong",    bmi:26.3, steps:7100,  heartRate:76, bp:"128/84", risk:"moderate",  goal:"Increase activity",  score:62 },
];
const SEED_VITALS_TREND = [
  { month:"Nov", avgBP:128, avgHR:74, avgBMI:24.8, avgSleep:7.1 },
  { month:"Dec", avgBP:126, avgHR:73, avgBMI:24.6, avgSleep:7.0 },
  { month:"Jan", avgBP:130, avgHR:75, avgBMI:24.9, avgSleep:6.8 },
  { month:"Feb", avgBP:125, avgHR:72, avgBMI:24.5, avgSleep:7.3 },
  { month:"Mar", avgBP:122, avgHR:71, avgBMI:24.3, avgSleep:7.4 },
  { month:"Apr", avgBP:120, avgHR:70, avgBMI:24.1, avgSleep:7.6 },
  { month:"May", avgBP:118, avgHR:69, avgBMI:23.9, avgSleep:7.8 },
];

// ── AI insights seed data ─────────────────────────────────────────────────────
const SEED_AI_ACCURACY = [
  { month:"Nov", diagnosis:88.2, risk:81.4, prescription:92.1, imaging:85.6 },
  { month:"Dec", diagnosis:89.5, risk:83.2, prescription:93.0, imaging:86.8 },
  { month:"Jan", diagnosis:90.1, risk:84.0, prescription:93.8, imaging:87.5 },
  { month:"Feb", diagnosis:91.3, risk:85.5, prescription:94.2, imaging:88.9 },
  { month:"Mar", diagnosis:92.0, risk:86.1, prescription:94.8, imaging:89.4 },
  { month:"Apr", diagnosis:93.2, risk:87.4, prescription:95.1, imaging:90.2 },
  { month:"May", diagnosis:94.1, risk:88.6, prescription:95.8, imaging:91.0 },
];
const SEED_AI_USAGE = [
  { feature:"Symptom Checker",    uses:1842, saved:"186h", accuracy:94 },
  { feature:"Risk Prediction",    uses:934,  saved:"98h",  accuracy:89 },
  { feature:"Diagnosis Assistant",uses:621,  saved:"142h", accuracy:91 },
  { feature:"Report Summariser",  uses:488,  saved:"211h", accuracy:96 },
  { feature:"Drug Interaction",   uses:374,  saved:"62h",  accuracy:98 },
  { feature:"Medicine DB Search", uses:2140, saved:"74h",  accuracy:99 },
];
const SEED_AI_INSIGHTS = [
  { type:"warning", title:"Rising Hypertension Cases",   desc:"23% increase in hypertensive patients this month vs last. Recommend proactive BP screening campaigns.", action:"Schedule Screening" },
  { type:"success", title:"Antibiotic Stewardship Win",  desc:"Unnecessary antibiotic prescriptions fell 18% after AI flag integration. Resistance risk reduced.", action:"View Report" },
  { type:"info",    title:"Peak Appointment Hours",      desc:"AI predicts 40% of cancellations happen Wednesday mornings. Consider SMS reminders Tuesday evening.", action:"Set Reminders" },
  { type:"warning", title:"Diabetes Cluster Detected",   desc:"6 new Type 2 diabetes diagnoses in the 40-50 age group this week — 2.4x above seasonal average.", action:"Alert Doctors" },
  { type:"success", title:"Imaging Accuracy Milestone",  desc:"AI imaging analysis crossed 91% accuracy this month — up from 85.6% in November. Model improving.", action:"See Details" },
];


// ── tab visibility per role ───────────────────────────────────────────────────
// Each role only sees the tabs relevant to their work.
const ROLE_TABS = {
  admin:        ["overview","appointments","medicines","risk","revenue","doctors","outbreak","fitness","ai"],
  doctor:       ["overview","appointments","medicines","risk","doctors","outbreak","fitness","ai"],
  radiologist:  ["overview","risk","outbreak","fitness","ai"],
  lab_tech:     ["overview","risk","fitness"],
  receptionist: ["appointments"],
  patient:      [],
};
// ── helpers ───────────────────────────────────────────────────────────────────
const CustomTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", fontSize:12 }}>
      <div style={{ fontWeight:700, color:C.text, marginBottom:6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:p.color }}/>
          <span style={{ color:C.textMed }}>{p.name}:</span>
          <span style={{ fontWeight:700, color:C.text }}>
            {p.name?.toLowerCase().includes("revenue") || p.name?.toLowerCase().includes("$")
              ? `$${p.value?.toLocaleString()}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom:18 }}>
    <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:C.text, margin:0 }}>{children}</h3>
    {sub && <div style={{ fontSize:12, color:C.textLight, marginTop:3 }}>{sub}</div>}
  </div>
);

// ── PDF export ────────────────────────────────────────────────────────────────
function generatePDF(data) {
  const { monthly, riskData, revenue, aptTrends, medicineUsage, patientStats, aptStats, scanStats } = data;
  const totalRevenue = revenue.reduce((a, r) => a + r.revenue, 0);
  const totalScans   = monthly.reduce((a, m) => a + m.total, 0);
  const win = window.open("", "_blank", "width=900,height=700");
  win.document.write(`<!DOCTYPE html><html><head>
  <title>MediCore AI — Analytics Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Nunito',sans-serif;background:#fff;color:#1a1a2e;padding:40px;font-size:12px;line-height:1.6;}
    h1{font-family:'Playfair Display',serif;font-size:26px;}
    h2{font-family:'Playfair Display',serif;font-size:17px;margin:24px 0 12px;padding-bottom:6px;border-bottom:2px solid #4CAF82;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;padding-bottom:18px;border-bottom:3px solid #4CAF82;}
    .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px;}
    .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:22px;}
    .card{background:#f7f9f7;border-radius:12px;padding:14px;}
    .kpi-val{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;margin:4px 0;}
    .kpi-label{font-size:10px;color:#94a3b8;font-weight:700;letter-spacing:0.05em;}
    table{border-collapse:collapse;width:100%;margin-bottom:18px;}
    th{padding:10px 14px;font-size:10px;color:#94a3b8;font-weight:700;text-align:left;background:#f7f9f7;letter-spacing:0.05em;}
    td{padding:10px 14px;font-size:11px;border-bottom:1px solid #e8eef0;}
    .bar-wrap{background:#e8eef0;border-radius:4px;height:7px;overflow:hidden;}
    .bar-fill{height:100%;border-radius:4px;}
    .footer{margin-top:32px;padding-top:14px;border-top:1px solid #e8eef0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between;}
    .pill{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;}
    @media print{body{padding:24px;}}
  </style></head><body>
  <div class="header">
    <div><h1>⚕️ MediCore AI — Analytics Report</h1>
    <div style="font-size:12px;color:#94a3b8">${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})} · Confidential</div></div>
    <div style="font-size:11px;color:#94a3b8;text-align:right">Generated ${new Date().toLocaleTimeString()}<br/>MediCore AI Platform</div>
  </div>

  <h2>📊 Key Performance Metrics</h2>
  <div class="grid4">
    <div class="card"><div class="kpi-label">TOTAL PATIENTS</div><div class="kpi-val">${patientStats?.total ?? "—"}</div><div style="font-size:10px;color:#4CAF82">Active: ${patientStats?.active ?? "—"}</div></div>
    <div class="card"><div class="kpi-label">TOTAL SCANS</div><div class="kpi-val">${totalScans}</div><div style="font-size:10px;color:#F47B7B">Critical: ${monthly.reduce((a,m)=>a+m.critical,0)}</div></div>
    <div class="card"><div class="kpi-label">APPOINTMENTS TODAY</div><div class="kpi-val">${aptStats?.today ?? "—"}</div><div style="font-size:10px;color:#5B8DEF">Confirmed: ${aptStats?.confirmed ?? "—"}</div></div>
    <div class="card"><div class="kpi-label">TOTAL REVENUE</div><div class="kpi-val" style="color:#22c55e">$${(totalRevenue/1000).toFixed(0)}k</div><div style="font-size:10px;color:#F5A623">7-month period</div></div>
  </div>

  <h2>🔬 Monthly Scan Volume</h2>
  <table><thead><tr><th>Month</th><th>Total</th><th>Normal</th><th>Abnormal</th><th>Critical</th><th>Revenue</th><th>Invoices</th></tr></thead><tbody>
  ${monthly.map(r=>`<tr><td><strong>${r.month}</strong></td><td>${r.total}</td>
    <td style="color:#4CAF82;font-weight:700">${r.normal}</td>
    <td style="color:#F5A623;font-weight:700">${r.abnormal}</td>
    <td style="color:#F47B7B;font-weight:700">${r.critical}</td>
    <td style="color:#22c55e;font-weight:700">$${r.revenue?.toLocaleString()||"—"}</td>
    <td>${r.invoices||"—"}</td></tr>`).join("")}
  </tbody></table>

  <h2>📅 Appointment Trends (Last 7 Days)</h2>
  <table><thead><tr><th>Day</th><th>Total</th><th>Confirmed</th><th>Completed</th><th>Pending</th><th>Cancelled</th></tr></thead><tbody>
  ${aptTrends.map(r=>`<tr><td><strong>${r.date}</strong></td><td>${r.total}</td>
    <td style="color:#4CAF82">${r.confirmed}</td>
    <td style="color:#5B8DEF">${r.completed}</td>
    <td style="color:#F5A623">${r.pending}</td>
    <td style="color:#F47B7B">${r.cancelled}</td></tr>`).join("")}
  </tbody></table>

  <h2>💊 Top Medicine Usage</h2>
  <div class="grid3">
  ${medicineUsage.slice(0,6).map(m=>`
    <div class="card">
      <div class="kpi-label">${m.name}</div>
      <div class="kpi-val" style="font-size:20px">${m.count}</div>
      <div class="bar-wrap"><div class="bar-fill" style="width:${Math.round(m.count/medicineUsage[0].count*100)}%;background:#4CAF82"></div></div>
    </div>`).join("")}
  </div>

  <h2>🚨 Risk Assessment</h2>
  <table><thead><tr><th>Patient</th><th>Risk Score</th><th>Level</th><th>Key Factors</th></tr></thead><tbody>
  ${riskData.map(r=>`<tr><td><strong>${r.patient_name}</strong></td>
    <td><strong>${r.risk_score}/100</strong></td>
    <td><span class="pill" style="background:${RISK_COL[r.risk_level]||"#ccc"}22;color:${RISK_COL[r.risk_level]||"#666"}">${r.risk_level}</span></td>
    <td>${r.factors?.slice(0,2).join("; ")||"—"}</td></tr>`).join("")}
  </tbody></table>

  <h2>💰 Revenue Summary</h2>
  <table><thead><tr><th>Month</th><th>Invoices</th><th>Revenue</th><th>Outstanding</th><th>Collection Rate</th></tr></thead><tbody>
  ${revenue.map(r=>{
    const rate = Math.round(r.revenue/(r.revenue+r.outstanding)*100);
    return `<tr><td><strong>${r.month}</strong></td><td>${r.invoices}</td>
      <td style="color:#22c55e;font-weight:700">$${r.revenue.toLocaleString()}</td>
      <td style="color:#F5A623;font-weight:700">$${r.outstanding.toLocaleString()}</td>
      <td><strong>${rate}%</strong></td></tr>`;
  }).join("")}
  </tbody></table>

  <div class="footer">
    <span>MediCore AI · Confidential Analytics Report · All data is indicative</span>
    <span>${new Date().toISOString()}</span>
  </div>
  <script>window.onload=()=>{window.print();}</script>
  </body></html>`);
  win.document.close();
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AnalyticsPage() {
  const [tab,           setTab]           = useState(() => ROLE_TABS[(() => { try { const u = JSON.parse(localStorage.getItem("mc_user")||"{}"); return u.role||"admin"; } catch { return "admin"; } })()?.[0]] || "overview");
  const [monthly,       setMonthly]       = useState([]);
  const [diseases,      setDiseases]      = useState([]);
  const [scanTypes,     setScanTypes]     = useState([]);
  const [doctors,       setDoctors]       = useState([]);
  const [riskData,      setRiskData]      = useState([]);
  const [revenue,       setRevenue]       = useState([]);
  const [aptTrends,     setAptTrends]     = useState([]);
  const [aptByDoctor,   setAptByDoctor]   = useState([]);
  const [medicineUsage, setMedicineUsage] = useState([]);
  const [patientStats,  setPatientStats]  = useState(null);
  const [aptStats,      setAptStats]      = useState(null);
  const [scanStats,     setScanStats]     = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [live,          setLive]          = useState(false);
  const [selRisk,       setSelRisk]       = useState(null);
  const [dateRange,     setDateRange]     = useState("7m");

  const { user } = useAuth();
  const userRole  = user?.role || "admin";
  const allowedTabs = ROLE_TABS[userRole] || ROLE_TABS.admin;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { analyticsService, request } = await import("../services/api");
      const results = await Promise.allSettled([
        analyticsService.getOverview(),
        analyticsService.getDoctors(),
        analyticsService.getRiskPrediction?.(),
        analyticsService.getRevenue?.(),
        analyticsService.getDiseaseTrends?.(),
        request("/appointments/stats/trends"),
        request("/appointments/stats/by-doctor"),
        request("/appointments/stats/summary"),
        request("/patients/stats/summary"),
        request("/diagnosis/stats"),
        request("/medicine-db/list?limit=8"),
      ]);

      const [ov, doc, risk, rev, diseaseT, aptT, aptDoc, aptSum, patSum, scanSum, meds] = results;

      if (ov.status === "fulfilled" && ov.value) {
        const v = ov.value;
        if (v.monthly_scans?.length) setMonthly(v.monthly_scans); else setMonthly(SEED_MONTHLY);
        if (v.disease_dist?.length)  setDiseases(v.disease_dist); else setDiseases(SEED_DISEASES);
        if (v.scan_types?.length)    setScanTypes(v.scan_types);  else setScanTypes(SEED_SCAN_TYPES);
      } else {
        setMonthly(SEED_MONTHLY); setDiseases(SEED_DISEASES); setScanTypes(SEED_SCAN_TYPES);
      }
      if (doc.status === "fulfilled" && doc.value?.length)  setDoctors(doc.value);  else setDoctors(SEED_DOCTORS);
      if (risk.status === "fulfilled" && risk.value?.length) setRiskData(risk.value); else setRiskData(SEED_RISK);
      if (rev.status === "fulfilled" && rev.value?.length)  setRevenue(rev.value);   else setRevenue(SEED_REVENUE);
      if (aptT.status === "fulfilled" && aptT.value?.length) {
        setAptTrends(aptT.value.map(d => ({
          ...d,
          date: new Date(d.date).toLocaleDateString("en-GB", { weekday:"short" }),
        })));
      }
      if (aptDoc.status === "fulfilled" && aptDoc.value?.length)   setAptByDoctor(aptDoc.value);
      if (aptSum.status === "fulfilled" && aptSum.value)           setAptStats(aptSum.value);
      if (patSum.status === "fulfilled" && patSum.value)           setPatientStats(patSum.value);
      if (scanSum.status === "fulfilled" && scanSum.value)         setScanStats(scanSum.value);
      if (meds.status === "fulfilled" && meds.value?.medicines?.length) {
        const sorted = [...meds.value.medicines].sort(() => Math.random() - 0.5).slice(0, 8);
        setMedicineUsage(sorted.map((m, i) => ({
          name:  m.name.split(" ")[0],
          count: Math.floor(Math.random() * 120) + 20,
        })).sort((a, b) => b.count - a.count));
      }
      setLive(true);
    } catch {
      setLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── derived KPIs ────────────────────────────────────────────────────────────
  const totalScans    = monthly.reduce((a, m) => a + m.total, 0);
  const totalCritical = monthly.reduce((a, m) => a + m.critical, 0);
  const totalRevenue  = revenue.reduce((a, r) => a + r.revenue, 0);
  const avgAccuracy   = doctors.length
    ? +(doctors.reduce((a, d) => a + (d.accuracy || 0), 0) / doctors.length).toFixed(1) : 0;
  const totalPatients = patientStats?.total ?? 0;
  const todayApt      = aptStats?.today ?? 0;

  const KPIS = [
    { label:"Total Patients",    value: loading ? "—" : totalPatients || "—", icon:"👥", color:C.blue,    bg:C.blueLight,    change:"+8%"  },
    { label:"Total Scans",       value: loading ? "—" : totalScans,           icon:"🔬", color:C.accent,  bg:C.accentLight,  change:"+12%" },
    { label:"Appts Today",       value: loading ? "—" : todayApt,             icon:"📅", color:"#8b5cf6", bg:"#f5f3ff",      change:aptStats ? `${aptStats.confirmed} confirmed` : "" },
    { label:"Critical Cases",    value: loading ? "—" : totalCritical,        icon:"🚨", color:C.coral,   bg:C.coralLight,   change:"+3"   },
    { label:"Avg AI Accuracy",   value: loading ? "—" : `${avgAccuracy}%`,    icon:"🎯", color:C.amber,   bg:C.amberLight,   change:"+0.8%"},
    { label:"Total Revenue",     value: loading ? "—" : `$${(totalRevenue/1000).toFixed(0)}k`, icon:"💰", color:"#22c55e", bg:"#f0fdf4", change:"+18%" },
  ];

  // ── tab content ─────────────────────────────────────────────────────────────
  const ALL_TABS = [
    ["overview",    "📈 Overview"],
    ["appointments","📅 Appointments"],
    ["medicines",   "💊 Medicines"],
    ["risk",        "🚨 Risk"],
    ["revenue",     "💰 Revenue"],
    ["doctors",     "👨‍⚕️ Doctors"],
    ["outbreak",    "🌍 Outbreak Map"],
    ["fitness",     "🏃 Fitness"],
    ["ai",          "🤖 AI Insights"],
  ];
  const TABS = ALL_TABS.filter(([id]) => allowedTabs.includes(id));

  const SEV_COL = { critical:C.coral, high:C.amber, moderate:C.blue, low:C.accent };

  return (
    <div className="page-enter">
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <PageHeader title="📊 Analytics & Reporting" subtitle="Live data · Risk · Revenue · Appointments · Fitness · AI Insights · Outbreak"/>
          <div style={{ display:"flex", gap:8, marginTop:4, flexWrap:"wrap" }}>
            <div style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background: live ? C.accentLight : C.amberLight, color: live ? C.accent : C.amber, fontWeight:700 }}>
              {live ? "🟢 Live backend" : "🟡 Seed data — start backend for live stats"}
            </div>
            {{
              admin:        <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:C.coralLight,   color:C.coral,    fontWeight:700 }}>🛡️ Admin — full access ({allowedTabs.length} tabs)</span>,
              doctor:       <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:C.blueLight,    color:C.blue,     fontWeight:700 }}>👨‍⚕️ Doctor — clinical view ({allowedTabs.length} tabs)</span>,
              radiologist:  <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:C.accentLight,  color:C.accent,   fontWeight:700 }}>🔬 Radiologist — imaging view ({allowedTabs.length} tabs)</span>,
              lab_tech:     <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:C.amberLight,   color:C.amber,    fontWeight:700 }}>🧪 Lab Tech — results view ({allowedTabs.length} tabs)</span>,
              receptionist: <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:"#f5f3ff",      color:"#7c3aed",  fontWeight:700 }}>🗂️ Receptionist — scheduling view ({allowedTabs.length} tabs)</span>,
            }[userRole]}
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn onClick={fetchAll} variant="secondary" style={{ borderRadius:10, padding:"9px 16px", fontSize:13 }}>🔄 Refresh</Btn>
          <Btn onClick={() => generatePDF({ monthly, riskData, revenue, aptTrends, medicineUsage, patientStats, aptStats, scanStats })}
            style={{ borderRadius:10, padding:"9px 18px", fontSize:13 }}>📄 Export PDF Report</Btn>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:22 }}>
        {KPIS.map(k => (
          <Card key={k.label} style={{ padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:10, color:C.textLight, fontWeight:700, letterSpacing:"0.05em", marginBottom:5 }}>{k.label.toUpperCase()}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.text, fontWeight:700 }}>
                  {loading ? <Spinner size={16}/> : k.value}
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:k.color, marginTop:3 }}>↑ {k.change}</div>
              </div>
              <div style={{ width:36, height:36, background:k.bg, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{k.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab}/>

      {/* ══ OVERVIEW ══ */}
      {tab === "overview" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <Card>
            <SectionTitle sub="Normal · Abnormal · Critical scan outcomes per month">Monthly Scan Volume</SectionTitle>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthly} margin={{ top:5, right:10, left:-10, bottom:0 }}>
                <defs>
                  {[[C.accent,"nG"],[C.amber,"aG"],[C.coral,"cG"]].map(([col,id]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={col} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={col} stopOpacity={0.02}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="month" tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }}/>
                <Area type="monotone" dataKey="normal"   name="Normal"   stroke={C.accent} strokeWidth={2} fill="url(#nG)"/>
                <Area type="monotone" dataKey="abnormal" name="Abnormal" stroke={C.amber}  strokeWidth={2} fill="url(#aG)"/>
                <Area type="monotone" dataKey="critical" name="Critical" stroke={C.coral}  strokeWidth={2} fill="url(#cG)"/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {/* Scan types donut */}
            <Card>
              <SectionTitle>Scan Types Distribution</SectionTitle>
              <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={scanTypes} cx="50%" cy="50%" innerRadius={38} outerRadius={65} dataKey="value" paddingAngle={3}>
                      {scanTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={v => [v + " scans"]}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex:1 }}>
                  {scanTypes.map((s, i) => {
                    const total = scanTypes.reduce((a, x) => a + x.value, 0);
                    return (
                      <div key={s.name} style={{ marginBottom:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                            <div style={{ width:8, height:8, borderRadius:"50%", background:COLORS[i % COLORS.length] }}/>
                            <span style={{ fontSize:12, fontWeight:700, color:C.text }}>{s.name}</span>
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:COLORS[i % COLORS.length] }}>{s.value}</span>
                        </div>
                        <div style={{ height:5, background:C.border, borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${total ? Math.round(s.value/total*100) : 0}%`, background:COLORS[i%COLORS.length], borderRadius:3 }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Top diagnoses */}
            <Card>
              <SectionTitle>Top Diagnoses</SectionTitle>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {diseases.map((d, i) => {
                  const max = diseases[0]?.count || 1;
                  return (
                    <div key={d.name}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:C.text }}>{d.name}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:COLORS[i%COLORS.length] }}>{d.count}</span>
                      </div>
                      <div style={{ height:6, background:C.border, borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${Math.round(d.count/max*100)}%`, background:COLORS[i%COLORS.length], borderRadius:3 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ══ APPOINTMENTS ══ */}
      {tab === "appointments" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {/* summary cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            {[
              { label:"Total",     value:aptStats?.total     ?? "—", color:C.blue,   bg:C.blueLight   },
              { label:"Today",     value:aptStats?.today     ?? "—", color:"#8b5cf6",bg:"#f5f3ff"      },
              { label:"Confirmed", value:aptStats?.confirmed ?? "—", color:C.accent, bg:C.accentLight  },
              { label:"Pending",   value:aptStats?.pending   ?? "—", color:C.amber,  bg:C.amberLight   },
            ].map(k => (
              <Card key={k.label} style={{ padding:"14px 16px" }}>
                <div style={{ fontSize:10, color:C.textLight, fontWeight:700, letterSpacing:"0.05em", marginBottom:4 }}>{k.label.toUpperCase()}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:k.color, fontWeight:700 }}>{loading ? "—" : k.value}</div>
              </Card>
            ))}
          </div>

          {/* 7-day trend */}
          <Card>
            <SectionTitle sub="Last 7 days appointment activity">Daily Appointment Trends</SectionTitle>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={aptTrends} margin={{ top:5, right:10, left:-10, bottom:0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="date" tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }}/>
                <Bar dataKey="confirmed"  name="Confirmed"  fill={C.accent}  radius={[4,4,0,0]}/>
                <Bar dataKey="completed"  name="Completed"  fill={C.blue}    radius={[4,4,0,0]}/>
                <Bar dataKey="pending"    name="Pending"    fill={C.amber}   radius={[4,4,0,0]}/>
                <Bar dataKey="cancelled"  name="Cancelled"  fill={C.coral}   radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* by doctor */}
          {(aptByDoctor.length > 0 || doctors.length > 0) && (
            <Card>
              <SectionTitle sub="Appointment load per doctor">Appointments by Doctor</SectionTitle>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={(aptByDoctor.length ? aptByDoctor : doctors).map(d => ({
                    name:      (d.doctor || d.name || "").split(" ").slice(-1)[0],
                    total:     d.total     || d.scans || 0,
                    confirmed: d.confirmed || Math.round((d.scans||0)*0.88) || 0,
                    completed: d.completed || Math.round((d.scans||0)*0.80) || 0,
                    cancelled: d.cancelled || Math.round((d.scans||0)*0.04) || 0,
                  }))}
                  layout="vertical" margin={{ top:0, right:20, left:70, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                  <XAxis type="number" tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{ fill:C.textMed, fontSize:12, fontWeight:700 }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTip/>}/>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }}/>
                  <Bar dataKey="confirmed"  name="Confirmed"  fill={C.accent} radius={[0,4,4,0]}/>
                  <Bar dataKey="completed"  name="Completed"  fill={C.blue}   radius={[0,4,4,0]}/>
                  <Bar dataKey="cancelled"  name="Cancelled"  fill={C.coral}  radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* ══ MEDICINES ══ */}
      {tab === "medicines" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <Card>
            <SectionTitle sub="Most prescribed medicines across all patients">Top Medicine Usage</SectionTitle>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={medicineUsage} margin={{ top:5, right:10, left:-10, bottom:40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="name" tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" interval={0}/>
                <YAxis tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTip/>}/>
                <Bar dataKey="count" name="Prescriptions" radius={[6,6,0,0]}>
                  {medicineUsage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {/* Category donut */}
            <Card>
              <SectionTitle>Medicine Categories</SectionTitle>
              {(() => {
                const cats = [
                  { name:"Analgesic / Antipyretic", value:28 },
                  { name:"Antibiotic",               value:22 },
                  { name:"Antihypertensive",         value:18 },
                  { name:"Antidiabetic",             value:14 },
                  { name:"Antihistamine",            value:10 },
                  { name:"Other",                    value:8  },
                ];
                return (
                  <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                    <ResponsiveContainer width={130} height={130}>
                      <PieChart>
                        <Pie data={cats} cx="50%" cy="50%" innerRadius={34} outerRadius={60} dataKey="value" paddingAngle={2}>
                          {cats.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                        </Pie>
                        <Tooltip formatter={v => [v + "%"]}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex:1 }}>
                      {cats.map((c, i) => (
                        <div key={c.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                            <div style={{ width:7, height:7, borderRadius:"50%", background:COLORS[i%COLORS.length], flexShrink:0 }}/>
                            <span style={{ fontSize:11, color:C.textMed }}>{c.name}</span>
                          </div>
                          <span style={{ fontSize:11, fontWeight:700, color:COLORS[i%COLORS.length] }}>{c.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Prescription vs OTC */}
            <Card>
              <SectionTitle>Prescription vs OTC</SectionTitle>
              {(() => {
                const data = [
                  { name:"Requires Rx",   value:32, color:C.coral  },
                  { name:"Over-the-counter", value:18, color:C.accent },
                ];
                const total = 50;
                return (
                  <div>
                    <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:20 }}>
                      <ResponsiveContainer width={120} height={120}>
                        <PieChart>
                          <Pie data={data} cx="50%" cy="50%" innerRadius={32} outerRadius={56} dataKey="value" paddingAngle={4}>
                            {data.map((d, i) => <Cell key={i} fill={d.color}/>)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div>
                        {data.map(d => (
                          <div key={d.name} style={{ marginBottom:12 }}>
                            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
                              <div style={{ width:8, height:8, borderRadius:"50%", background:d.color }}/>
                              <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{d.name}</span>
                            </div>
                            <div style={{ fontSize:22, fontFamily:"'Playfair Display',serif", fontWeight:700, color:d.color }}>{d.value}</div>
                            <div style={{ fontSize:11, color:C.textLight }}>{Math.round(d.value/total*100)}% of database</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding:"10px 14px", background:C.accentLight, borderRadius:10, fontSize:12, color:C.accent, fontWeight:600 }}>
                      💊 {total} WHO Essential Medicines now in your database
                    </div>
                  </div>
                );
              })()}
            </Card>
          </div>

          {/* Monthly medicine trends */}
          <Card>
            <SectionTitle sub="Prescription volume trends over 7 months">Medicine Prescription Trends</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthly.map((m, i) => ({
                month: m.month,
                prescriptions: 120 + i * 18 + Math.floor(Math.random() * 20),
                unique_medicines: 28 + i * 2,
              }))} margin={{ top:5, right:10, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="month" tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }}/>
                <Line type="monotone" dataKey="prescriptions"    name="Total Prescriptions" stroke={C.blue}   strokeWidth={2.5} dot={{ r:4 }}/>
                <Line type="monotone" dataKey="unique_medicines" name="Unique Medicines"    stroke={C.accent} strokeWidth={2}   dot={{ r:3 }} strokeDasharray="5 3"/>
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ══ RISK ══ */}
      {tab === "risk" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ padding:"12px 16px", background:"#fff3cd", border:"1px solid #f5a62344", borderRadius:10, display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:18 }}>🤖</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#92600a" }}>AI Risk Scoring Engine</div>
              <div style={{ fontSize:12, color:"#92600a" }}>Scores based on medical conditions, vital signs, scan severity, and clinical history. Not a clinical diagnosis.</div>
            </div>
          </div>

          {/* risk summary donut */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:16 }}>
            <Card>
              <SectionTitle>Risk Distribution</SectionTitle>
              {(() => {
                const levels = [
                  { name:"Critical", value:riskData.filter(r=>r.risk_level==="critical").length, color:C.coral  },
                  { name:"High",     value:riskData.filter(r=>r.risk_level==="high").length,     color:C.amber  },
                  { name:"Moderate", value:riskData.filter(r=>r.risk_level==="moderate").length, color:C.blue   },
                  { name:"Low",      value:riskData.filter(r=>r.risk_level==="low").length,      color:C.accent },
                ].filter(l => l.value > 0);
                return (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie data={levels} cx="50%" cy="50%" innerRadius={36} outerRadius={65} dataKey="value" paddingAngle={3}>
                          {levels.map((l, i) => <Cell key={i} fill={l.color}/>)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v + " patients", n]}/>
                      </PieChart>
                    </ResponsiveContainer>
                    {levels.map(l => (
                      <div key={l.name} style={{ display:"flex", justifyContent:"space-between", width:"100%", marginTop:6 }}>
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:l.color }}/>
                          <span style={{ fontSize:12, color:C.textMed }}>{l.name}</span>
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:l.color }}>{l.value}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Card>

            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {riskData.map((r, i) => (
                <Card key={i} hover onClick={() => setSelRisk(selRisk?.patient_name === r.patient_name ? null : r)}
                  style={{ cursor:"pointer", borderLeft:`4px solid ${RISK_COL[r.risk_level]||C.textLight}`, padding:"14px 16px" }}>
                  <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                    <div style={{ width:54, height:54, borderRadius:14, background:(RISK_COL[r.risk_level]||"#ccc")+"18", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:RISK_COL[r.risk_level] }}>{r.risk_score}</div>
                      <div style={{ fontSize:9, color:RISK_COL[r.risk_level], fontWeight:700 }}>/100</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:5 }}>
                        <span style={{ fontSize:14, fontWeight:800, color:C.text }}>{r.patient_name}</span>
                        <Badge label={r.risk_level} color={RISK_COL[r.risk_level]||C.textLight}/>
                      </div>
                      <div style={{ height:7, background:C.border, borderRadius:4, overflow:"hidden", marginBottom:5 }}>
                        <div style={{ height:"100%", width:`${r.risk_score}%`, background:RISK_COL[r.risk_level], borderRadius:4, transition:"width 0.8s" }}/>
                      </div>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        {r.conditions?.slice(0,3).map(c => (
                          <span key={c} style={{ background:C.cardAlt, borderRadius:20, padding:"2px 8px", fontSize:10, color:C.textMed, fontWeight:600 }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {selRisk?.patient_name === r.patient_name && r.factors?.length > 0 && (
                    <div style={{ marginTop:12, padding:"10px 12px", background:(RISK_COL[r.risk_level]||"#ccc")+"08", borderRadius:8, borderTop:`1px solid ${RISK_COL[r.risk_level]||"#ccc"}22` }}>
                      <div style={{ fontSize:10, fontWeight:700, color:C.textLight, letterSpacing:"0.05em", marginBottom:6 }}>RISK FACTORS</div>
                      {r.factors.map((f, j) => (
                        <div key={j} style={{ display:"flex", gap:6, alignItems:"center", fontSize:12, color:C.text, marginBottom:3 }}>
                          <span style={{ color:RISK_COL[r.risk_level] }}>▸</span>{f}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ REVENUE ══ */}
      {tab === "revenue" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            <StatCard label="Total Revenue"  value={`$${(totalRevenue/1000).toFixed(0)}k`}                                          icon="💰" color="#22c55e" bg="#f0fdf4"/>
            <StatCard label="Outstanding"    value={`$${(revenue.reduce((a,r)=>a+r.outstanding,0)/1000).toFixed(0)}k`}               icon="⏳" color={C.amber}  bg={C.amberLight}/>
            <StatCard label="Total Invoices" value={revenue.reduce((a,r)=>a+(r.invoices||0),0)}                                      icon="📄" color={C.blue}   bg={C.blueLight}/>
          </div>

          <Card>
            <SectionTitle sub="Revenue vs outstanding payments over 7 months">Revenue vs Outstanding</SectionTitle>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenue} margin={{ top:5, right:10, left:0, bottom:0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="month" tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<CustomTip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }}/>
                <Bar dataKey="revenue"     name="Revenue $"     fill="#22c55e" radius={[6,6,0,0]}/>
                <Bar dataKey="outstanding" name="Outstanding $" fill={C.amber} radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <SectionTitle>Monthly Breakdown</SectionTitle>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:C.cardAlt }}>
                    {["Month","Invoices","Revenue","Outstanding","Collection Rate"].map(h => (
                      <th key={h} style={{ padding:"10px 14px", fontSize:11, color:C.textLight, fontWeight:700, textAlign:"left", letterSpacing:"0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {revenue.map((r, i) => {
                    const total = r.revenue + r.outstanding;
                    const rate  = total ? Math.round(r.revenue / total * 100) : 100;
                    return (
                      <tr key={r.month} style={{ borderBottom:`1px solid ${C.border}`, background: i%2===0?"#fff":C.cardAlt }}>
                        <td style={{ padding:"10px 14px", fontWeight:700, color:C.text }}>{r.month}</td>
                        <td style={{ padding:"10px 14px", color:C.textMed }}>{r.invoices}</td>
                        <td style={{ padding:"10px 14px", fontWeight:700, color:"#22c55e" }}>${r.revenue.toLocaleString()}</td>
                        <td style={{ padding:"10px 14px", fontWeight:700, color:r.outstanding>0?C.amber:C.accent }}>${r.outstanding.toLocaleString()}</td>
                        <td style={{ padding:"10px 14px" }}>
                          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                            <div style={{ height:6, width:80, background:C.border, borderRadius:3, overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${rate}%`, background:"#22c55e", borderRadius:3 }}/>
                            </div>
                            <span style={{ fontSize:12, fontWeight:700, color:"#22c55e" }}>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ══ DOCTORS ══ */}
      {tab === "doctors" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16 }}>
            {doctors.map((d, i) => (
              <Card key={d.name || d.doctor} hover>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                    <Avatar initials={(d.name||d.doctor||"??").split(" ").filter(Boolean).slice(-1)[0].slice(0,2).toUpperCase()} color={COLORS[i%COLORS.length]} size={46}/>
                    <div>
                      <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{d.name || d.doctor}</div>
                      <div style={{ fontSize:12, color:C.textLight }}>
                        {d.scans||d.total||0} scans · {d.critical||0} critical
                        {d.avgTime ? ` · ${d.avgTime}h avg` : ""}
                      </div>
                    </div>
                  </div>
                  {d.accuracy && (
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:C.accent }}>{d.accuracy}%</div>
                  )}
                </div>

                {d.accuracy && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, color:C.textLight, fontWeight:700, letterSpacing:"0.05em", marginBottom:4 }}>AI ACCURACY</div>
                    <div style={{ height:7, background:C.border, borderRadius:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${d.accuracy}%`, background:C.accent, borderRadius:4 }}/>
                    </div>
                  </div>
                )}

                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:8 }}>
                  {[
                    { label:"Confirmed", value:d.confirmed||Math.round((d.scans||0)*0.88)||0, color:C.accent },
                    { label:"Completed", value:d.completed||Math.round((d.scans||0)*0.80)||0, color:C.blue   },
                    { label:"Cancelled", value:d.cancelled||Math.round((d.scans||0)*0.04)||0, color:C.coral  },
                  ].map(s => (
                    <div key={s.label} style={{ background:C.cardAlt, borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                      <div style={{ fontSize:10, color:C.textLight, fontWeight:700 }}>{s.label.toUpperCase()}</div>
                      <div style={{ fontSize:18, fontWeight:700, color:s.color, fontFamily:"'Playfair Display',serif" }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <SectionTitle sub="Comparative scan load across all doctors">Doctor Performance Comparison</SectionTitle>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={doctors.map(d => ({
                subject:   (d.name||d.doctor||"").split(" ").slice(-1)[0],
                Accuracy:  d.accuracy || 0,
                Volume:    Math.round(((d.scans||d.total||0) / (Math.max(...doctors.map(x=>x.scans||x.total||1)))) * 100),
                Efficiency: Math.round(100 - (d.avgTime||4)/6*100 + 33),
              }))} cx="50%" cy="50%" outerRadius={90}>
                <PolarGrid stroke={C.border}/>
                <PolarAngleAxis dataKey="subject" tick={{ fontSize:12, fill:C.textMed, fontWeight:700 }}/>
                <Radar name="Accuracy"   dataKey="Accuracy"   stroke={C.accent} fill={C.accent} fillOpacity={0.15}/>
                <Radar name="Volume"     dataKey="Volume"     stroke={C.blue}   fill={C.blue}   fillOpacity={0.10}/>
                <Radar name="Efficiency" dataKey="Efficiency" stroke={C.amber}  fill={C.amber}  fillOpacity={0.10}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }}/>
                <Tooltip content={<CustomTip/>}/>
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ══ OUTBREAK MAP ══ */}
      {tab === "outbreak" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <div style={{ padding:"12px 16px", background:C.coralLight, border:`1px solid ${C.coral}33`, borderRadius:10, display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:18 }}>🌍</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.coral }}>Disease Outbreak Monitoring</div>
              <div style={{ fontSize:12, color:"#92600a" }}>Cluster detection from patient diagnoses by location. Spot flu, dengue, or food poisoning outbreaks early.</div>
            </div>
          </div>

          {/* Summary cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            {[
              { label:"Active Clusters",   value:OUTBREAK_DATA.length,                                           color:C.coral,  bg:C.coralLight },
              { label:"Critical Zones",    value:OUTBREAK_DATA.filter(o=>o.severity==="critical").length,         color:"#ef4444",bg:"#fef2f2"    },
              { label:"Total Cases",       value:OUTBREAK_DATA.reduce((a,o)=>a+o.cases,0),                        color:C.amber,  bg:C.amberLight },
              { label:"Diseases Tracked",  value:[...new Set(OUTBREAK_DATA.map(o=>o.disease))].length,            color:C.blue,   bg:C.blueLight  },
            ].map(k => (
              <Card key={k.label} style={{ padding:"14px 16px" }}>
                <div style={{ fontSize:10, color:C.textLight, fontWeight:700, letterSpacing:"0.05em", marginBottom:4 }}>{k.label.toUpperCase()}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:k.color, fontWeight:700 }}>{k.value}</div>
              </Card>
            ))}
          </div>

          {/* Outbreak list with severity bars */}
          <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:16 }}>
            <Card>
              <SectionTitle sub="Patient diagnosis clusters by location">Active Outbreak Clusters</SectionTitle>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {OUTBREAK_DATA.sort((a,b)=>b.cases-a.cases).map((o, i) => {
                  const maxCases = Math.max(...OUTBREAK_DATA.map(x=>x.cases));
                  const sevColor = { critical:"#ef4444", high:C.coral, moderate:C.amber, low:C.accent };
                  return (
                    <div key={i} style={{ padding:"12px 14px", border:`1px solid ${sevColor[o.severity]||C.border}33`, borderRadius:10, borderLeft:`4px solid ${sevColor[o.severity]||C.border}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{ fontSize:14, fontWeight:800, color:C.text }}>📍 {o.city}</span>
                          <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:(sevColor[o.severity]||C.border)+"18", color:sevColor[o.severity]||C.textLight, fontWeight:700 }}>{o.severity}</span>
                        </div>
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <span style={{ fontSize:13, color:C.textMed }}>{o.disease}</span>
                          <span style={{ fontSize:14, fontWeight:800, color:sevColor[o.severity] }}>{o.cases} cases</span>
                        </div>
                      </div>
                      <div style={{ height:6, background:C.border, borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${Math.round(o.cases/maxCases*100)}%`, background:sevColor[o.severity]||C.border, borderRadius:3, transition:"width 0.8s" }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {/* Disease breakdown */}
              <Card>
                <SectionTitle>Cases by Disease</SectionTitle>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[...new Set(OUTBREAK_DATA.map(o=>o.disease))].map(d => ({
                    name:  d,
                    cases: OUTBREAK_DATA.filter(o=>o.disease===d).reduce((a,o)=>a+o.cases,0),
                  })).sort((a,b)=>b.cases-a.cases)} layout="vertical" margin={{ top:0, right:10, left:60, bottom:0 }}>
                    <XAxis type="number" tick={{ fill:C.textLight, fontSize:10 }} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{ fill:C.textMed, fontSize:11, fontWeight:700 }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTip/>}/>
                    <Bar dataKey="cases" name="Cases" radius={[0,4,4,0]}>
                      {[...new Set(OUTBREAK_DATA.map(o=>o.disease))].map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Alert panel */}
              <Card style={{ background:"#fef9ee" }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.amber, marginBottom:10 }}>⚠️ Active Alerts</div>
                {OUTBREAK_DATA.filter(o => o.severity === "critical" || o.severity === "high").map((o, i) => (
                  <div key={i} style={{ padding:"8px 10px", marginBottom:6, background:"#fff", borderRadius:8, border:`1px solid ${C.amber}33` }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{o.city} — {o.disease}</div>
                    <div style={{ fontSize:11, color:C.textLight }}>{o.cases} cases · {o.severity} severity</div>
                  </div>
                ))}
                <div style={{ fontSize:11, color:C.textLight, marginTop:8 }}>Public health report auto-generated on export</div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ══ FITNESS ══ */}
      {tab === "fitness" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* Fitness KPI row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
            {[
              { label:"Avg Daily Steps",  value:"9,400",  icon:"👟", color:C.accent, bg:C.accentLight },
              { label:"Avg Calories",     value:"488",    icon:"🔥", color:C.coral,  bg:C.coralLight  },
              { label:"Avg Active Mins",  value:"60",     icon:"⏱️", color:C.blue,   bg:C.blueLight   },
              { label:"Avg Resting HR",   value:"72 bpm", icon:"💓", color:"#ec4899",bg:"#fdf2f8"     },
              { label:"Avg Sleep",        value:"7.5h",   icon:"😴", color:"#8b5cf6",bg:"#f5f3ff"     },
            ].map(k => (
              <Card key={k.label} style={{ padding:"14px 16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:10, color:C.textLight, fontWeight:700, letterSpacing:"0.05em", marginBottom:4 }}>{k.label.toUpperCase()}</div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:k.color, fontWeight:700 }}>{k.value}</div>
                  </div>
                  <div style={{ width:32, height:32, background:k.bg, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>{k.icon}</div>
                </div>
              </Card>
            ))}
          </div>

          {/* Steps + Calories week chart */}
          <Card>
            <SectionTitle sub="Patient activity data — steps and calories burned this week">Weekly Activity Overview</SectionTitle>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={SEED_FITNESS_WEEKLY} margin={{ top:5, right:10, left:-10, bottom:0 }} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="day" tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="steps" orientation="left"  tick={{ fill:C.textLight, fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => (v/1000).toFixed(0)+"k"}/>
                <YAxis yAxisId="cal"   orientation="right" tick={{ fill:C.textLight, fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }}/>
                <Bar yAxisId="steps" dataKey="steps"    name="Steps"    fill={C.blue}   radius={[5,5,0,0]}/>
                <Bar yAxisId="cal"   dataKey="calories" name="Calories" fill={C.coral}  radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {/* Heart rate + sleep line */}
            <Card>
              <SectionTitle sub="Resting heart rate and sleep hours daily">Heart Rate & Sleep</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={SEED_FITNESS_WEEKLY} margin={{ top:5, right:10, left:-10, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="day" tick={{ fill:C.textLight, fontSize:10 }} axisLine={false} tickLine={false}/>
                  <YAxis yAxisId="hr"    orientation="left"  tick={{ fill:C.textLight, fontSize:10 }} axisLine={false} tickLine={false} domain={[60,90]}/>
                  <YAxis yAxisId="sleep" orientation="right" tick={{ fill:C.textLight, fontSize:10 }} axisLine={false} tickLine={false} domain={[5,10]}/>
                  <Tooltip content={<CustomTip/>}/>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }}/>
                  <Line yAxisId="hr"    type="monotone" dataKey="heartRate" name="Heart Rate (bpm)" stroke="#ec4899" strokeWidth={2.5} dot={{ r:4 }}/>
                  <Line yAxisId="sleep" type="monotone" dataKey="sleep"     name="Sleep (hrs)"      stroke="#8b5cf6" strokeWidth={2}   dot={{ r:3 }} strokeDasharray="5 3"/>
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* BMI distribution */}
            <Card>
              <SectionTitle sub="BMI categories across all registered patients">Patient BMI Distribution</SectionTitle>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie data={SEED_BMI_DIST} cx="50%" cy="50%" innerRadius={32} outerRadius={60} dataKey="count" paddingAngle={3}>
                      {SEED_BMI_DIST.map((d, i) => <Cell key={i} fill={d.color}/>)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v + " patients", n]}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex:1 }}>
                  {SEED_BMI_DIST.map(d => {
                    const total = SEED_BMI_DIST.reduce((a,x)=>a+x.count,0);
                    return (
                      <div key={d.range} style={{ marginBottom:8 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ fontSize:11, color:C.textMed }}>{d.range}</span>
                          <span style={{ fontSize:11, fontWeight:700, color:d.color }}>{d.count}</span>
                        </div>
                        <div style={{ height:5, background:C.border, borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${Math.round(d.count/total*100)}%`, background:d.color, borderRadius:3 }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* Vitals trend */}
          <Card>
            <SectionTitle sub="Average patient vitals tracked month-over-month">Population Vitals Trend</SectionTitle>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={SEED_VITALS_TREND} margin={{ top:5, right:10, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="month" tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }}/>
                <Line type="monotone" dataKey="avgBP"    name="Avg BP (systolic)"  stroke={C.coral}  strokeWidth={2.5} dot={{ r:4 }}/>
                <Line type="monotone" dataKey="avgHR"    name="Avg Heart Rate"     stroke="#ec4899"  strokeWidth={2}   dot={{ r:3 }}/>
                <Line type="monotone" dataKey="avgBMI"   name="Avg BMI"            stroke={C.amber}  strokeWidth={2}   dot={{ r:3 }} strokeDasharray="5 3"/>
                <Line type="monotone" dataKey="avgSleep" name="Avg Sleep (hrs)"    stroke="#8b5cf6"  strokeWidth={2}   dot={{ r:3 }} strokeDasharray="3 4"/>
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Patient fitness leaderboard */}
          <Card>
            <SectionTitle sub="Individual patient fitness scores and goals">Patient Fitness Leaderboard</SectionTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {SEED_FITNESS_PATIENTS.sort((a,b)=>b.score-a.score).map((p, i) => {
                const riskCol = { low:C.accent, moderate:C.amber, high:C.coral };
                const medal   = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
                return (
                  <div key={p.name} style={{ display:"flex", gap:14, alignItems:"center", padding:"12px 14px", background: i===0 ? C.accentLight : C.cardAlt, borderRadius:10, border:`1px solid ${i===0?C.accent+"44":C.border}` }}>
                    <div style={{ fontSize:i<3?20:14, fontWeight:700, width:28, textAlign:"center", color:C.textLight }}>{medal}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{ fontSize:14, fontWeight:800, color:C.text }}>{p.name}</span>
                          <Badge label={p.risk} color={riskCol[p.risk]||C.textLight}/>
                        </div>
                        <span style={{ fontSize:18, fontFamily:"'Playfair Display',serif", fontWeight:700, color:riskCol[p.risk]||C.blue }}>{p.score}</span>
                      </div>
                      <div style={{ height:6, background:C.border, borderRadius:3, overflow:"hidden", marginBottom:5 }}>
                        <div style={{ height:"100%", width:`${p.score}%`, background:riskCol[p.risk]||C.accent, borderRadius:3, transition:"width 0.8s" }}/>
                      </div>
                      <div style={{ display:"flex", gap:16, fontSize:11, color:C.textLight }}>
                        <span>👟 {p.steps.toLocaleString()} steps</span>
                        <span>💓 {p.heartRate} bpm</span>
                        <span>⚖️ BMI {p.bmi}</span>
                        <span>🩺 BP {p.bp}</span>
                        <span>🎯 {p.goal}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
      {/* ══ AI INSIGHTS ══ */}
      {tab === "ai" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* AI KPI row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            {[
              { label:"AI Features Active",  value:"6",       icon:"🤖", color:"#8b5cf6", bg:"#f5f3ff"    },
              { label:"Total AI Uses",       value:"6,399",   icon:"⚡", color:C.blue,    bg:C.blueLight   },
              { label:"Hours Saved by AI",   value:"773h",    icon:"⏱️", color:C.accent,  bg:C.accentLight },
              { label:"Avg AI Accuracy",     value:"94.5%",   icon:"🎯", color:C.amber,   bg:C.amberLight  },
            ].map(k => (
              <Card key={k.label} style={{ padding:"14px 16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:10, color:C.textLight, fontWeight:700, letterSpacing:"0.05em", marginBottom:4 }}>{k.label.toUpperCase()}</div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:k.color, fontWeight:700 }}>{k.value}</div>
                  </div>
                  <div style={{ width:34, height:34, background:k.bg, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{k.icon}</div>
                </div>
              </Card>
            ))}
          </div>

          {/* AI accuracy over time */}
          <Card>
            <SectionTitle sub="How each AI model's accuracy has improved month-over-month">AI Model Accuracy Trends</SectionTitle>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={SEED_AI_ACCURACY} margin={{ top:5, right:10, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="month" tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:C.textLight, fontSize:11 }} axisLine={false} tickLine={false} domain={[78,100]} tickFormatter={v => v+"%"}/>
                <Tooltip content={<CustomTip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12 }}/>
                <Line type="monotone" dataKey="diagnosis"    name="Diagnosis AI"    stroke="#8b5cf6" strokeWidth={2.5} dot={{ r:4 }}/>
                <Line type="monotone" dataKey="risk"         name="Risk Predictor"  stroke={C.coral}  strokeWidth={2}   dot={{ r:3 }}/>
                <Line type="monotone" dataKey="prescription" name="Prescription AI" stroke={C.accent} strokeWidth={2}   dot={{ r:3 }} strokeDasharray="5 3"/>
                <Line type="monotone" dataKey="imaging"      name="Imaging AI"      stroke={C.blue}   strokeWidth={2}   dot={{ r:3 }} strokeDasharray="3 4"/>
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {/* AI Feature usage bar */}
            <Card>
              <SectionTitle sub="Usage count per AI feature">AI Feature Usage</SectionTitle>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={SEED_AI_USAGE} layout="vertical" margin={{ top:0, right:10, left:110, bottom:0 }}>
                  <XAxis type="number" tick={{ fill:C.textLight, fontSize:10 }} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="feature" tick={{ fill:C.textMed, fontSize:11, fontWeight:600 }} axisLine={false} tickLine={false} width={110}/>
                  <Tooltip content={<CustomTip/>}/>
                  <Bar dataKey="uses" name="Uses" radius={[0,5,5,0]}>
                    {SEED_AI_USAGE.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* AI accuracy radar */}
            <Card>
              <SectionTitle sub="Accuracy per AI module">AI Module Accuracy</SectionTitle>
              <ResponsiveContainer width="100%" height={230}>
                <RadarChart data={SEED_AI_USAGE.map(u => ({ subject: u.feature.split(" ")[0], accuracy: u.accuracy }))} cx="50%" cy="50%" outerRadius={80}>
                  <PolarGrid stroke={C.border}/>
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize:11, fill:C.textMed, fontWeight:600 }}/>
                  <Radar name="Accuracy %" dataKey="accuracy" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2}/>
                  <Tooltip formatter={v => [v + "%", "Accuracy"]}/>
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* AI feature table — hours saved */}
          <Card>
            <SectionTitle sub="Time saved, usage, and accuracy per AI feature">AI Feature Performance Table</SectionTitle>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:C.cardAlt }}>
                  {["Feature","Uses This Month","Hours Saved","Accuracy","Status"].map(h => (
                    <th key={h} style={{ padding:"10px 14px", fontSize:11, color:C.textLight, fontWeight:700, textAlign:"left", letterSpacing:"0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SEED_AI_USAGE.map((u, i) => (
                  <tr key={u.feature} style={{ borderBottom:`1px solid ${C.border}`, background: i%2===0?"#fff":C.cardAlt }}>
                    <td style={{ padding:"10px 14px", fontWeight:700, color:C.text }}>{u.feature}</td>
                    <td style={{ padding:"10px 14px", color:C.textMed }}>{u.uses.toLocaleString()}</td>
                    <td style={{ padding:"10px 14px", fontWeight:700, color:C.accent }}>{u.saved}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <div style={{ height:6, width:70, background:C.border, borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${u.accuracy}%`, background: u.accuracy>=95?C.accent:u.accuracy>=88?C.blue:C.amber, borderRadius:3 }}/>
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color: u.accuracy>=95?C.accent:u.accuracy>=88?C.blue:C.amber }}>{u.accuracy}%</span>
                      </div>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:C.accentLight, color:C.accent, fontWeight:700 }}>Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* AI insight cards — auto-generated alerts */}
          <Card>
            <SectionTitle sub="Auto-generated insights from patient data patterns">AI-Generated Clinical Insights</SectionTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {SEED_AI_INSIGHTS.map((ins, i) => {
                const cfg = {
                  warning: { bg:"#fff3cd", border:C.amber,  icon:"⚠️", col:"#92600a" },
                  success: { bg:C.accentLight, border:C.accent, icon:"✅", col:"#155724" },
                  info:    { bg:C.blueLight, border:C.blue, icon:"💡", col:"#0c4a6e" },
                }[ins.type] || { bg:C.cardAlt, border:C.border, icon:"ℹ️", col:C.textMed };
                return (
                  <div key={i} style={{ display:"flex", gap:14, alignItems:"flex-start", padding:"14px 16px", background:cfg.bg, border:`1px solid ${cfg.border}33`, borderRadius:10, borderLeft:`4px solid ${cfg.border}` }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>{cfg.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:3 }}>{ins.title}</div>
                      <div style={{ fontSize:12, color:C.textMed, lineHeight:1.6 }}>{ins.desc}</div>
                    </div>
                    <button style={{ flexShrink:0, background:"transparent", border:`1px solid ${cfg.border}`, borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:700, color:cfg.col, cursor:"pointer" }}>
                      {ins.action} →
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* AI cost savings */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {[
              { label:"Avg time saved per diagnosis",  value:"14 min",  icon:"⏱️", sub:"vs manual review",          color:"#8b5cf6" },
              { label:"Prescriptions auto-checked",    value:"3,216",   icon:"💊", sub:"for drug interactions",      color:C.accent  },
              { label:"False positives prevented",     value:"187",     icon:"🛡️", sub:"by AI cross-validation",     color:C.blue    },
            ].map(k => (
              <Card key={k.label} style={{ padding:"16px 18px", textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:6 }}>{k.icon}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:k.color, marginBottom:4 }}>{k.value}</div>
                <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2 }}>{k.label}</div>
                <div style={{ fontSize:11, color:C.textLight }}>{k.sub}</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
