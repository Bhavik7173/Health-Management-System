import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import { C } from "../constants";
import { Card, Btn, Badge, Avatar, PageHeader, StatCard, TabBar } from "../components/UI";

const COLORS = [C.blue, C.accent, C.coral, C.amber, "#8b5cf6", "#ef4444", C.textLight];

// ── Seed data ──────────────────────────────────────────────────────────────────
const SEED_MONTHLY = [
  {month:"Nov",total:98, normal:54,abnormal:30,critical:14,revenue:9200,invoices:12},
  {month:"Dec",total:112,normal:60,abnormal:35,critical:17,revenue:10800,invoices:15},
  {month:"Jan",total:134,normal:72,abnormal:42,critical:20,revenue:12400,invoices:18},
  {month:"Feb",total:119,normal:68,abnormal:36,critical:15,revenue:11600,invoices:16},
  {month:"Mar",total:148,normal:80,abnormal:48,critical:20,revenue:13800,invoices:20},
  {month:"Apr",total:163,normal:90,abnormal:52,critical:21,revenue:15200,invoices:22},
  {month:"May",total:178,normal:98,abnormal:58,critical:22,revenue:16800,invoices:25},
];
const SEED_SCAN_TYPES = [
  {name:"X-Ray",value:642,color:C.blue},
  {name:"MRI",  value:318,color:C.accent},
  {name:"CT",   value:288,color:C.coral},
];
const SEED_DISEASES = [
  {name:"Normal",       count:480,color:C.accent},
  {name:"Pneumonia",    count:187,color:C.coral},
  {name:"Brain Tumor",  count:94, color:"#8b5cf6"},
  {name:"Tuberculosis", count:76, color:C.amber},
  {name:"Lung Cancer",  count:58, color:"#ef4444"},
  {name:"Emphysema",    count:42, color:C.blue},
];
const SEED_DOCTORS = [
  {name:"Dr. Gutierrez",scans:312,accuracy:96.2,critical:48,avgTime:4.2},
  {name:"Dr. Gomez",    scans:287,accuracy:94.8,critical:52,avgTime:3.8},
  {name:"Dr. Frazier",  scans:198,accuracy:97.1,critical:31,avgTime:5.1},
  {name:"Dr. Reed",     scans:251,accuracy:95.5,critical:39,avgTime:4.6},
];
const SEED_RISK = [
  {patient_name:"James Lee",   risk_score:95,risk_level:"critical",factors:["Grade 2 Glioma","Critical scan(s)","Low O₂ 96%"],conditions:["Brain Tumor","Diabetes"]},
  {patient_name:"Tom Chen",    risk_score:80,risk_level:"critical",factors:["Active TB","COPD","Low O₂ 94%"],conditions:["Tuberculosis","COPD"]},
  {patient_name:"Sarah Johnson",risk_score:35,risk_level:"moderate",factors:["Hypertension","Pneumonia scan"],conditions:["Hypertension","Asthma"]},
  {patient_name:"Maria Garcia",risk_score:10,risk_level:"low",factors:["Mild Asthma"],conditions:["Asthma"]},
];
const SEED_REVENUE = [
  {month:"Nov",revenue:9200, outstanding:2300,invoices:12},
  {month:"Dec",revenue:10800,outstanding:1800,invoices:15},
  {month:"Jan",revenue:12400,outstanding:2600,invoices:18},
  {month:"Feb",revenue:11600,outstanding:1200,invoices:16},
  {month:"Mar",revenue:13800,outstanding:3200,invoices:20},
  {month:"Apr",revenue:15200,outstanding:2800,invoices:22},
  {month:"May",revenue:16800,outstanding:4200,invoices:25},
];

const RISK_COL   = {critical:C.coral,high:C.amber,moderate:C.blue,low:C.accent};
const CustomTip  = ({active,payload,label})=>{
  if(!active||!payload?.length) return null;
  return <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",boxShadow:C.shadow,fontSize:12}}>
    <div style={{fontWeight:700,color:C.text,marginBottom:6}}>{label}</div>
    {payload.map(p=><div key={p.dataKey} style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
      <div style={{width:8,height:8,borderRadius:"50%",background:p.color}}/><span style={{color:C.textMed}}>{p.name}:</span><span style={{fontWeight:700,color:C.text}}>{typeof p.value==="number"&&p.name?.includes("$")?`$${p.value.toLocaleString()}`:p.value}</span>
    </div>)}
  </div>;
};

function generatePDF(monthly, risk, revenue) {
  const totalRevenue = revenue.reduce((a,r)=>a+r.revenue,0);
  const win = window.open("","_blank","width=900,height=700");
  win.document.write(`<!DOCTYPE html><html><head>
  <title>MediCore AI — Analytics Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
  <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Nunito',sans-serif;background:#fff;color:#1a1a2e;padding:40px;font-size:12px;line-height:1.6;}h1{font-family:'Playfair Display',serif;font-size:24px;}h2{font-family:'Playfair Display',serif;font-size:17px;margin:22px 0 12px;padding-bottom:6px;border-bottom:2px solid #4CAF82;}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:3px solid #4CAF82;}.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px;}.card{background:#f7f9f7;border-radius:12px;padding:14px;}.kpi-val{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin:4px 0;}.kpi-label{font-size:10px;color:#94a3b8;font-weight:700;letter-spacing:0.05em;}table{border-collapse:collapse;width:100%;margin-bottom:18px;}th{padding:10px 14px;font-size:10px;color:#94a3b8;font-weight:700;text-align:left;background:#f7f9f7;letter-spacing:0.05em;}td{padding:10px 14px;font-size:11px;border-bottom:1px solid #e8eef0;}.bar-wrap{background:#e8eef0;border-radius:4px;height:7px;overflow:hidden;}.bar-fill{height:100%;border-radius:4px;}.footer{margin-top:32px;padding-top:14px;border-top:1px solid #e8eef0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between;}@media print{body{padding:24px;}}</style></head><body>
  <div class="header"><div><h1>⚕️ MediCore AI Analytics</h1><div style="font-size:12px;color:#94a3b8">Comprehensive Performance Report · ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div></div>
  <div style="font-size:11px;color:#94a3b8;text-align:right">Generated: ${new Date().toLocaleTimeString()}<br/>Confidential</div></div>
  <h2>📊 Key Metrics</h2>
  <div class="grid4">
    <div class="card"><div class="kpi-label">TOTAL SCANS</div><div class="kpi-val">${monthly.reduce((a,m)=>a+m.total,0)}</div></div>
    <div class="card"><div class="kpi-label">TOTAL REVENUE</div><div class="kpi-val">$${totalRevenue.toLocaleString()}</div></div>
    <div class="card"><div class="kpi-label">CRITICAL CASES</div><div class="kpi-val" style="color:#F47B7B">${monthly.reduce((a,m)=>a+m.critical,0)}</div></div>
    <div class="card"><div class="kpi-label">RISK PATIENTS</div><div class="kpi-val" style="color:#F5A623">${risk.filter(r=>r.risk_level==="critical"||r.risk_level==="high").length}</div></div>
  </div>
  <h2>🔬 Monthly Scan Volume</h2>
  <table><thead><tr><th>Month</th><th>Total</th><th>Normal</th><th>Abnormal</th><th>Critical</th><th>Revenue</th></tr></thead><tbody>
  ${monthly.map(r=>`<tr><td><strong>${r.month}</strong></td><td>${r.total}</td><td style="color:#4CAF82;font-weight:700">${r.normal}</td><td style="color:#F5A623;font-weight:700">${r.abnormal}</td><td style="color:#F47B7B;font-weight:700">${r.critical}</td><td style="color:#4CAF82;font-weight:700">$${r.revenue?.toLocaleString()||"—"}</td></tr>`).join("")}
  </tbody></table>
  <h2>🚨 Risk Assessment</h2>
  <table><thead><tr><th>Patient</th><th>Risk Score</th><th>Level</th><th>Key Factors</th></tr></thead><tbody>
  ${risk.map(r=>`<tr><td><strong>${r.patient_name}</strong></td><td><strong>${r.risk_score}/100</strong></td><td>${r.risk_level}</td><td>${r.factors?.slice(0,2).join("; ")||"—"}</td></tr>`).join("")}
  </tbody></table>
  <div class="footer"><span>MediCore AI · Confidential Analytics Report</span><span>${new Date().toISOString()}</span></div>
  <script>window.onload=()=>{window.print();}</script></body></html>`);
  win.document.close();
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AnalyticsPage() {
  const [tab,       setTab]       = useState("overview");
  const [monthly,   setMonthly]   = useState([]);
  const [diseases,  setDiseases]  = useState([]);
  const [scanTypes, setScanTypes] = useState([]);
  const [doctors,   setDoctors]   = useState([]);
  const [riskData,  setRiskData]  = useState([]);
  const [revenue,   setRevenue]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [selRisk,   setSelRisk]   = useState(null);

  useEffect(()=>{
    setLoading(true);
    import("../services/api").then(({analyticsService})=>{
      Promise.allSettled([
        analyticsService.getOverview(),
        analyticsService.getDoctors(),
        analyticsService.getRiskPrediction?.(),
        analyticsService.getRevenue?.(),
      ]).then(([ov,doc,risk,rev])=>{
        if(ov.status==="fulfilled"&&ov.value?.monthly_scans?.length) setMonthly(m=>ov.value.monthly_scans.map((s,i)=>({...s,...(m[i]||{})})));
        if(ov.status==="fulfilled"&&ov.value?.disease_dist?.length)  setDiseases(ov.value.disease_dist.map((d,i)=>({...d,color:COLORS[i%COLORS.length]})));
        if(ov.status==="fulfilled"&&ov.value?.scan_types?.length)    setScanTypes(ov.value.scan_types.map((s,i)=>({name:s.name,value:s.value,color:COLORS[i%COLORS.length]})));
        if(doc.status==="fulfilled"&&doc.value?.length)              setDoctors(doc.value);
        if(risk.status==="fulfilled"&&risk.value?.length)            setRiskData(risk.value);
        if(rev.status==="fulfilled"&&rev.value?.length)              setRevenue(rev.value);
        setError(null);
      }).catch(e=>setError(e.message)).finally(()=>setLoading(false));
    });
  },[]);

  const totalScans   = monthly.reduce((a,m)=>a+m.total,0);
  const totalCritical= monthly.reduce((a,m)=>a+m.critical,0);
  const totalRevenue = revenue.reduce((a,r)=>a+r.revenue,0);
  const avgAccuracy  = doctors.length?+(doctors.reduce((a,d)=>a+(d.accuracy||0),0)/doctors.length).toFixed(1):0;

  const KPI = [
    {label:"Total Scans",    value:totalScans,      icon:"🔬",color:C.blue,  bg:C.blueLight,  change:"+12%"},
    {label:"AI Accuracy",    value:`${avgAccuracy}%`,icon:"🎯",color:C.accent,bg:C.accentLight,change:"+0.8%"},
    {label:"Critical Cases", value:totalCritical,   icon:"🚨",color:C.coral, bg:C.coralLight, change:"+3"},
    {label:"Total Revenue",  value:`$${(totalRevenue/1000).toFixed(0)}k`,icon:"💰",color:"#22c55e",bg:"#f0fdf4",change:"+18%"},
  ];

  return (
    <div className="page-enter">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <PageHeader title="📊 Analytics & AI Insights" subtitle="Real-time data · Risk prediction · Revenue · Performance"/>
          {error&&<div style={{fontSize:12,color:C.amber,marginTop:-16}}>⚠️ Backend offline — showing seed data. Start your backend for live stats.</div>}
        </div>
        <Btn onClick={()=>generatePDF(monthly,riskData,revenue)} style={{borderRadius:12,padding:"11px 22px",flexShrink:0}}>📄 Export PDF</Btn>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        {KPI.map(k=>(
          <Card key={k.label} hover>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:11,color:C.textLight,fontWeight:600,marginBottom:6,letterSpacing:"0.05em"}}>{k.label}</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:C.text,fontWeight:700}}>{loading?"—":k.value}</div>
                <div style={{fontSize:12,fontWeight:700,color:C.accent,marginTop:4}}>↑ {k.change} vs last month</div>
              </div>
              <div style={{width:44,height:44,background:k.bg,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{k.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <TabBar tabs={[["overview","📈 Overview"],["risk","🚨 Risk Prediction"],["revenue","💰 Revenue"],["doctors","👨‍⚕️ Doctors"],["ai","🤖 AI Insights"]]} active={tab} onChange={setTab}/>

      {/* ── Overview ── */}
      {tab==="overview"&&(
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <Card>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text,marginBottom:20}}>Monthly Scan Volume <span style={{fontSize:12,color:C.textLight,fontWeight:400}}>— live from DB</span></h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthly} margin={{top:5,right:10,left:-10,bottom:0}}>
                <defs>
                  {[[C.accent,"nG"],[C.amber,"aG"],[C.coral,"cG"]].map(([col,id])=>(
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={col} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={col} stopOpacity={0.02}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="month" tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:12}}/>
                <Area type="monotone" dataKey="normal"   name="Normal"   stroke={C.accent} strokeWidth={2} fill="url(#nG)"/>
                <Area type="monotone" dataKey="abnormal" name="Abnormal" stroke={C.amber}  strokeWidth={2} fill="url(#aG)"/>
                <Area type="monotone" dataKey="critical" name="Critical" stroke={C.coral}  strokeWidth={2} fill="url(#cG)"/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <Card>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:16}}>Scan Types</h3>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <ResponsiveContainer width={150} height={150}>
                  <PieChart><Pie data={scanTypes} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" paddingAngle={3}>
                    {scanTypes.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie><Tooltip formatter={(v)=>[v+" scans"]}/></PieChart>
                </ResponsiveContainer>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
                  {scanTypes.map((s,i)=>{const total=scanTypes.reduce((a,x)=>a+x.value,0);return(
                    <div key={s.name}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{width:10,height:10,borderRadius:"50%",background:COLORS[i%COLORS.length]}}/><span style={{fontSize:13,fontWeight:700,color:C.text}}>{s.name}</span></div>
                        <span style={{fontSize:12,fontWeight:700,color:COLORS[i%COLORS.length]}}>{s.value}</span>
                      </div>
                      <div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${total?(s.value/total*100).toFixed(0):0}%`,background:COLORS[i%COLORS.length],borderRadius:3}}/></div>
                    </div>
                  );})}
                </div>
              </div>
            </Card>
            <Card>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:16}}>Top Diagnoses</h3>
              {diseases.length===0
                ? <div style={{fontSize:13,color:C.textLight,textAlign:"center",padding:20}}>No diagnosis data yet</div>
                : <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {diseases.map((d,i)=>{const max=diseases[0]?.count||1;return(
                      <div key={d.name}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:12,fontWeight:700,color:C.text}}>{d.name}</span>
                          <span style={{fontSize:12,fontWeight:700,color:COLORS[i%COLORS.length]}}>{d.count}</span>
                        </div>
                        <div style={{height:7,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(d.count/max*100).toFixed(0)}%`,background:COLORS[i%COLORS.length],borderRadius:3}}/></div>
                      </div>
                    );})}
                  </div>
              }
            </Card>
          </div>
        </div>
      )}

      {/* ── Risk Prediction ── */}
      {tab==="risk"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{padding:"14px 18px",background:"#fff3cd",border:"1px solid #f5a62344",borderRadius:12,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:18}}>🤖</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#92600a"}}>AI Risk Scoring Engine</div>
              <div style={{fontSize:12,color:"#92600a"}}>Scores based on medical conditions, vital signs, scan severity, and clinical history. Not a clinical diagnosis tool.</div>
            </div>
          </div>

          {riskData.map((r,i)=>(
            <Card key={i} hover onClick={()=>setSelRisk(selRisk?.patient_name===r.patient_name?null:r)}
              style={{cursor:"pointer",borderLeft:`4px solid ${RISK_COL[r.risk_level]||C.textLight}`}}>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <div style={{width:60,height:60,borderRadius:16,background:RISK_COL[r.risk_level]+"18",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:RISK_COL[r.risk_level]}}>{r.risk_score}</div>
                  <div style={{fontSize:9,color:RISK_COL[r.risk_level],fontWeight:700}}>/100</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:14,fontWeight:800,color:C.text}}>{r.patient_name}</span>
                    <Badge label={r.risk_level} color={RISK_COL[r.risk_level]||C.textLight}/>
                  </div>
                  {/* Risk bar */}
                  <div style={{height:8,background:C.border,borderRadius:4,overflow:"hidden",marginBottom:6}}>
                    <div style={{height:"100%",width:`${r.risk_score}%`,background:`linear-gradient(90deg,${RISK_COL[r.risk_level]}88,${RISK_COL[r.risk_level]})`,borderRadius:4,transition:"width 1s"}}/>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {r.conditions?.slice(0,3).map(c=><span key={c} style={{background:C.cardAlt,borderRadius:20,padding:"2px 8px",fontSize:10,color:C.textMed,fontWeight:600}}>{c}</span>)}
                  </div>
                </div>
              </div>
              {/* Expanded risk factors */}
              {selRisk?.patient_name===r.patient_name&&r.factors?.length>0&&(
                <div style={{marginTop:14,padding:"12px 14px",background:RISK_COL[r.risk_level]+"08",borderRadius:10,borderTop:`1px solid ${RISK_COL[r.risk_level]}22`}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.textLight,letterSpacing:"0.05em",marginBottom:8}}>RISK FACTORS</div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {r.factors.map((f,j)=>(
                      <div key={j} style={{display:"flex",gap:8,alignItems:"center",fontSize:13,color:C.text}}>
                        <span style={{color:RISK_COL[r.risk_level]}}>▸</span>{f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ── Revenue ── */}
      {tab==="revenue"&&(
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
            <StatCard label="Total Revenue"     value={`$${(totalRevenue/1000).toFixed(0)}k`}                                        icon="💰" color="#22c55e" bg="#f0fdf4"/>
            <StatCard label="Outstanding"       value={`$${(revenue.reduce((a,r)=>a+r.outstanding,0)/1000).toFixed(0)}k`}             icon="⏳" color={C.amber}  bg={C.amberLight}/>
            <StatCard label="Total Invoices"    value={revenue.reduce((a,r)=>a+r.invoices,0)}                                         icon="📄" color={C.blue}   bg={C.blueLight}/>
          </div>

          <Card>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text,marginBottom:20}}>Revenue vs Outstanding — 7 Months</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenue} margin={{top:5,right:10,left:0,bottom:0}} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="month" tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<CustomTip/>} formatter={(v)=>`$${v.toLocaleString()}`}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:12}}/>
                <Bar dataKey="revenue"     name="Revenue $"     fill="#22c55e" radius={[6,6,0,0]}/>
                <Bar dataKey="outstanding" name="Outstanding $" fill={C.amber}  radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:16}}>Monthly Breakdown</h3>
            <div style={{overflowX:"auto"}}>
              <table>
                <thead><tr style={{background:C.cardAlt}}>
                  {["Month","Invoices","Revenue","Outstanding","Collection Rate"].map(h=><th key={h} style={{padding:"12px 14px",fontSize:11,color:C.textLight,fontWeight:700,textAlign:"left",letterSpacing:"0.05em"}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {revenue.map((r,i)=>{
                    const total=r.revenue+r.outstanding;
                    const rate=total?((r.revenue/total)*100).toFixed(0):100;
                    return(
                      <tr key={r.month} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"#fff":C.cardAlt}}>
                        <td style={{padding:"12px 14px",fontWeight:700,color:C.text}}>{r.month}</td>
                        <td style={{padding:"12px 14px",color:C.textMed}}>{r.invoices}</td>
                        <td style={{padding:"12px 14px",fontWeight:700,color:"#22c55e"}}>${r.revenue.toLocaleString()}</td>
                        <td style={{padding:"12px 14px",fontWeight:700,color:r.outstanding>0?C.amber:C.accent}}>${r.outstanding.toLocaleString()}</td>
                        <td style={{padding:"12px 14px"}}>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <div style={{height:6,width:80,background:C.border,borderRadius:3,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${rate}%`,background:"#22c55e",borderRadius:3}}/>
                            </div>
                            <span style={{fontSize:12,fontWeight:700,color:"#22c55e"}}>{rate}%</span>
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

      {/* ── Doctors ── */}
      {tab==="doctors"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {doctors.map((d,i)=>(
            <Card key={d.name} hover>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <Avatar initials={d.name.split(" ").pop().slice(0,2).toUpperCase()} color={COLORS[i%COLORS.length]} size={46}/>
                  <div>
                    <div style={{fontSize:15,fontWeight:800,color:C.text}}>{d.name}</div>
                    <div style={{fontSize:12,color:C.textLight}}>{d.scans||0} scans · {d.critical||0} critical · {d.avgTime||"—"}h avg</div>
                  </div>
                </div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:C.accent}}>{d.accuracy}%</div>
              </div>
              <div style={{height:8,background:C.border,borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${d.accuracy}%`,background:`linear-gradient(90deg,${C.accent}88,${C.accent})`,borderRadius:4}}/>
              </div>
            </Card>
          ))}

          {doctors.length>0&&(
            <Card>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:20}}>Comparative Performance</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={doctors.map(d=>({name:d.name.split(" ").pop(),accuracy:d.accuracy,scans:d.scans||0,critical:d.critical||0}))} layout="vertical" margin={{top:0,right:20,left:60,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                  <XAxis type="number" tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false} domain={[0,400]}/>
                  <YAxis type="category" dataKey="name" tick={{fill:C.textMed,fontSize:12,fontWeight:700}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTip/>}/>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:12}}/>
                  <Bar dataKey="scans"    name="Scans"    fill={C.blue}  radius={[0,6,6,0]}/>
                  <Bar dataKey="critical" name="Critical" fill={C.coral} radius={[0,6,6,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* ── AI Insights ── */}
      {tab==="ai"&&(
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          {/* Auto-report suggestions */}
          <Card>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text,marginBottom:16}}>🤖 AI Auto-Report Suggestions</h3>
            <p style={{fontSize:13,color:C.textLight,marginBottom:16}}>AI-generated report text templates based on diagnosis. Click any diagnosis to see suggested findings, impression, and recommendation.</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {[["Pneumonia","☢️",C.coral],["Normal","✅",C.accent],["Brain Tumor","🧠","#8b5cf6"],["Tuberculosis","🫁",C.amber],["Lung Cancer","💿","#ef4444"]].map(([disease,icon,col])=>(
                <div key={disease} style={{background:col+"10",border:`1px solid ${col}33`,borderRadius:12,padding:"14px",cursor:"pointer"}}
                  onClick={()=>{
                    import("../services/api").then(({analyticsService})=>analyticsService.getAutoReportSuggestions?.().catch(()=>{}));
                  }}>
                  <div style={{fontSize:24,marginBottom:6}}>{icon}</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>{disease}</div>
                  <div style={{fontSize:11,color:col,fontWeight:600}}>Click to use template →</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Severity scoring */}
          <Card>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text,marginBottom:16}}>📊 AI Severity Scoring by Scan Type</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
              {[["X-Ray","☢️",{normal:55,abnormal:34,critical:11,avg:94.2}],["MRI","🧲",{normal:44,abnormal:38,critical:18,avg:96.8}],["CT","💿",{normal:50,abnormal:30,critical:20,avg:93.5}]].map(([type,icon,stats])=>(
                <div key={type} style={{background:C.cardAlt,borderRadius:14,padding:"16px"}}>
                  <div style={{fontSize:24,marginBottom:8}}>{icon}</div>
                  <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:12}}>{type}</div>
                  {[["Normal",stats.normal,C.accent],["Abnormal",stats.abnormal,C.amber],["Critical",stats.critical,C.coral]].map(([l,v,c])=>(
                    <div key={l} style={{marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{fontSize:11,color:C.textLight}}>{l}</span>
                        <span style={{fontSize:11,fontWeight:700,color:c}}>{v}%</span>
                      </div>
                      <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${v}%`,background:c,borderRadius:3}}/>
                      </div>
                    </div>
                  ))}
                  <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`,fontSize:12,color:C.accent,fontWeight:700}}>
                    Avg Confidence: {stats.avg}%
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Disease trend prediction */}
          <Card>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text,marginBottom:20}}>📈 Disease Trend Forecast (7 months)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthly} margin={{top:5,right:10,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="month" tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:12}}/>
                <Line type="monotone" dataKey="total"    name="Total Scans" stroke={C.blue}  strokeWidth={2.5} dot={{r:4}} activeDot={{r:6}}/>
                <Line type="monotone" dataKey="critical" name="Critical"    stroke={C.coral} strokeWidth={2}   dot={{r:3}} strokeDasharray="5 3"/>
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}
