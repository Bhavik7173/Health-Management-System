import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { C } from "../constants";
import { Card, StatCard, Avatar } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { diagnosisService, appointmentService, patientService } from "../services/api";

export default function Dashboard({ setPage }) {
  const { user } = useAuth();
  const [stats, setStats]     = useState({ total_scans:0, critical:0, recoveries:0, appointments:0 });
  const [appts, setAppts]     = useState([]);
  const [healthRange, setHealthRange] = useState("Y");

  const firstName = user?.name?.split(" ").find(w=>!w.startsWith("Dr"))||user?.name?.split(" ")[0]||"Doctor";

  useEffect(() => {
    // Load real stats from backend; silently fall back if offline
    Promise.allSettled([
      diagnosisService.getStats(),
      appointmentService.stats(),
      patientService.stats(),
      appointmentService.list({ status:"", search:"" }),
    ]).then(([scanRes, apptRes, patRes, apptListRes]) => {
      const scanData = scanRes.status==="fulfilled" ? scanRes.value : {};
      const apptData = apptRes.status==="fulfilled" ? apptRes.value : {};
      setStats({
        total_scans:  scanData.total       || 0,
        critical:     scanData.critical    || 0,
        recoveries:   scanData.normal      || 0,
        appointments: apptData.total       || 0,
      });
      if (apptListRes.status==="fulfilled") {
        setAppts((apptListRes.value||[]).slice(0,2));
      }
    });
  }, []);

  const HEALTH_CURVE = [
    {year:"2015",avg:55,mine:48},{year:"2016",avg:60,mine:72},
    {year:"2017",avg:58,mine:55},{year:"2018",avg:65,mine:60},
    {year:"2019",avg:62,mine:58},{year:"2020",avg:70,mine:88},
  ];

  return (
    <div className="page-enter">
      <div style={{marginBottom:28}}>
        <h2 style={{fontFamily:"'Playfair Display', serif",fontSize:26,color:C.text}}>
          Good morning, {firstName} 👋
        </h2>
        <p style={{fontSize:14,color:C.textLight,marginTop:4}}>
          Here's what's happening at your facility today.
        </p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
        <StatCard label="Total Scans"    value={stats.total_scans}  icon="🔬" color={C.blue}  bg={C.blueLight}  />
        <StatCard label="Critical Cases" value={stats.critical}     icon="🚨" color={C.coral} bg={C.coralLight} />
        <StatCard label="Normal Scans"   value={stats.recoveries}   icon="✅" color={C.accent} bg={C.accentLight} />
        <StatCard label="Appointments"   value={stats.appointments} icon="📅" color={C.amber} bg={C.amberLight}  />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1.7fr",gap:20}}>
        <div>
          <h3 style={{fontFamily:"'Playfair Display', serif",fontSize:18,color:C.text,marginBottom:14}}>
            Upcoming Appointments
          </h3>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {appts.length === 0
              ? <Card style={{textAlign:"center",padding:32}}>
                  <div style={{fontSize:32,marginBottom:8}}>📅</div>
                  <div style={{fontSize:13,color:C.textLight}}>No appointments yet</div>
                </Card>
              : appts.map((a,i)=>(
                  <Card key={a.id||i} hover style={{padding:"18px 20px"}}>
                    <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
                      <Avatar initials={(a.doctor||"Dr").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()} color={C.coral} size={44}/>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:C.text}}>{a.patient}</div>
                        <div style={{fontSize:12,color:C.textLight,marginTop:1}}>{a.doctor}</div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                      {[["Date",a.date],["Time",a.time]].map(([k,v])=>(
                        <div key={k} style={{background:C.cardAlt,borderRadius:10,padding:"8px 12px"}}>
                          <div style={{fontSize:11,color:C.textLight,marginBottom:2}}>{k}</div>
                          <div style={{fontSize:13,fontWeight:700,color:C.text}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:12,color:C.textLight}}>{a.type} · {a.status}</div>
                  </Card>
                ))
            }
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{fontFamily:"'Playfair Display', serif",fontSize:20,color:C.text}}>Health Curve</h3>
              <div style={{display:"flex",gap:6}}>
                {["D","W","M","Y"].map(r=>(
                  <button key={r} onClick={()=>setHealthRange(r)}
                    style={{width:34,height:34,borderRadius:10,border:"none",background:healthRange===r?C.coral:C.cardAlt,color:healthRange===r?"#fff":C.textLight,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={HEALTH_CURVE} margin={{top:5,right:5,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="avgG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.coral} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={C.coral} stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tick={{fill:C.textLight,fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip contentStyle={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,fontSize:12}}/>
                <Area type="monotone" dataKey="mine" stroke={C.coral} strokeWidth={2.5} fill="url(#avgG)" dot={{fill:C.coral,r:4,strokeWidth:0}} activeDot={{r:6}}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card hover style={{padding:"18px",cursor:"pointer"}} onClick={()=>setPage("diagnosis")}>
              <div style={{fontSize:22}}>🎯</div>
              <div style={{fontFamily:"'Playfair Display', serif",fontSize:26,color:C.accent,fontWeight:700,marginTop:6}}>{stats.total_scans}</div>
              <div style={{fontSize:12,color:C.textLight,marginTop:2}}>Total Scans (DB)</div>
            </Card>
            <Card hover style={{padding:"18px",cursor:"pointer"}} onClick={()=>setPage("analytics")}>
              <div style={{fontSize:22}}>📊</div>
              <div style={{fontFamily:"'Playfair Display', serif",fontSize:26,color:C.blue,fontWeight:700,marginTop:6}}>{stats.critical}</div>
              <div style={{fontSize:12,color:C.textLight,marginTop:2}}>Critical Cases</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
