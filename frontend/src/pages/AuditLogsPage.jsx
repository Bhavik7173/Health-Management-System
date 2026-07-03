import { useState, useEffect } from "react";
import { C } from "../constants";
import { Card, Badge, PageHeader, StatCard } from "../components/UI";

const ACTION_COLORS = {
  LOGIN:"#4CAF82", LOGOUT:"#94a3b8", REGISTER:"#5B8DEF",
  LOGIN_FAILED:"#F47B7B", MFA_ENABLED:"#8b5cf6", MFA_DISABLED:"#F5A623",
  MFA_FAILED:"#F47B7B", MFA_SUCCESS:"#4CAF82",
  CREATE:"#5B8DEF", UPDATE:"#F5A623", DELETE:"#F47B7B",
  VIEW:"#94a3b8", PASSWORD_CHANGED:"#F5A623",
  USER_ACTIVATED:"#4CAF82", USER_DEACTIVATED:"#F47B7B",
  APPOINTMENT_BOOKED:"#5B8DEF",
};
const ACTION_ICONS = {
  LOGIN:"🔓", LOGOUT:"🔒", REGISTER:"👤", LOGIN_FAILED:"❌",
  MFA_ENABLED:"🔐", MFA_DISABLED:"🔓", MFA_FAILED:"⚠️", MFA_SUCCESS:"✅",
  CREATE:"➕", UPDATE:"✏️", DELETE:"🗑️", VIEW:"👁️",
  PASSWORD_CHANGED:"🔑", USER_ACTIVATED:"✅", USER_DEACTIVATED:"🚫",
  APPOINTMENT_BOOKED:"📅",
};


export default function AuditLogsPage() {
  const [logs,    setLogs]    = useState([]);
  const [filterAction,  setFilterAction]  = useState("ALL");
  const [filterResource,setFilterResource]= useState("ALL");
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    import("../services/api").then(({ adminService }) => {
      adminService.getAuditLogs?.()
        .then(data => setLogs(data?.logs || []))
        .catch(() => setLogs([]))
        .finally(() => setLoading(false));
    });
  }, []);

  const actions    = ["ALL", ...new Set(logs.map(l => l.action))];
  const resources  = ["ALL", ...new Set(logs.map(l => l.resource))];

  const filtered = logs.filter(l => {
    const matchAction   = filterAction   ==="ALL" || l.action   ===filterAction;
    const matchResource = filterResource ==="ALL" || l.resource ===filterResource;
    const matchSearch   = !search ||
      l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.detail?.toLowerCase().includes(search.toLowerCase()) ||
      l.ip?.includes(search);
    return matchAction && matchResource && matchSearch;
  });

  const stats = {
    total:   logs.length,
    failed:  logs.filter(l=>l.action.includes("FAILED")).length,
    logins:  logs.filter(l=>l.action==="LOGIN").length,
    today:   logs.filter(l=>l.timestamp?.startsWith(new Date().toISOString().slice(0,10))).length,
  };

  return (
    <div className="page-enter">
      <PageHeader title="📋 Audit Logs" subtitle="Complete activity trail — all user actions recorded" />

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        <StatCard label="Total Events" value={stats.total}  icon="📋" color={C.blue}  bg={C.blueLight}  />
        <StatCard label="Today"        value={stats.today}  icon="📅" color={C.accent} bg={C.accentLight} />
        <StatCard label="Logins"       value={stats.logins} icon="🔓" color="#8b5cf6" bg="#f3f0ff"       />
        <StatCard label="Failed Auth"  value={stats.failed} icon="❌" color={C.coral} bg={C.coralLight}  />
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",flex:1,minWidth:200}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search user, IP, detail…"
            style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:12,padding:"10px 12px 10px 36px",fontSize:13,outline:"none"}} />
        </div>
        <select value={filterAction} onChange={e=>setFilterAction(e.target.value)}
          style={{background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:12,padding:"10px 14px",fontSize:13,outline:"none",cursor:"pointer"}}>
          {actions.map(a=><option key={a}>{a}</option>)}
        </select>
        <select value={filterResource} onChange={e=>setFilterResource(e.target.value)}
          style={{background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:12,padding:"10px 14px",fontSize:13,outline:"none",cursor:"pointer"}}>
          {resources.map(r=><option key={r}>{r}</option>)}
        </select>
        <div style={{fontSize:13,color:C.textLight,fontWeight:600}}>{filtered.length} events</div>
      </div>

      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table>
            <thead>
              <tr style={{background:C.cardAlt}}>
                {["Timestamp","User","Role","Action","Resource","Detail","IP"].map(h=>(
                  <th key={h} style={{padding:"12px 16px",fontSize:11,color:C.textLight,fontWeight:700,textAlign:"left",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l,i)=>{
                const col = ACTION_COLORS[l.action] || C.textLight;
                const icon = ACTION_ICONS[l.action] || "•";
                return (
                  <tr key={l.id||i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"#fff":C.cardAlt}}>
                    <td style={{padding:"12px 16px",fontSize:11,color:C.textLight,whiteSpace:"nowrap",fontFamily:"monospace"}}>
                      {l.timestamp?.replace("T"," ").slice(0,19)}
                    </td>
                    <td style={{padding:"12px 16px",fontSize:13,fontWeight:700,color:C.text,whiteSpace:"nowrap"}}>{l.user?.name||"—"}</td>
                    <td style={{padding:"12px 16px"}}>
                      <Badge label={l.user?.role||"—"} color={C.blue} />
                    </td>
                    <td style={{padding:"12px 16px",whiteSpace:"nowrap"}}>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <span>{icon}</span>
                        <span style={{fontSize:11,fontWeight:700,color:col,background:col+"15",padding:"2px 8px",borderRadius:20}}>{l.action}</span>
                      </div>
                    </td>
                    <td style={{padding:"12px 16px",fontSize:12,color:C.textMed,fontWeight:600}}>{l.resource}</td>
                    <td style={{padding:"12px 16px",fontSize:12,color:C.textMed,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={l.detail}>{l.detail}</td>
                    <td style={{padding:"12px 16px",fontSize:11,color:C.textLight,fontFamily:"monospace"}}>{l.ip||"—"}</td>
                  </tr>
                );
              })}
              {filtered.length===0 && (
                <tr><td colSpan={7} style={{padding:"40px",textAlign:"center",color:C.textLight}}>No audit events match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
