import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { C, sevColor } from "../constants";
import { Card, Badge, TabBar, PageHeader } from "../components/UI";
import { resourceService } from "../services/api";

export default function ResourcePage() {
  const [tab, setTab]               = useState("facilities");
  const [facilities, setFacilities] = useState([]);
  const [alerts,     setAlerts]     = useState([]);
  const [forecast,   setForecast]   = useState([]);

  useEffect(() => {
    resourceService.getFacilities().then(d => setFacilities(d || [])).catch(() => {});
    resourceService.getAlerts().then(d => setAlerts(d || [])).catch(() => {});
    resourceService.getForecast().then(data => {
      setForecast((data || []).map(d => ({
        date: d.date?.slice(5) || d.date,
        admissions: d.predicted_admissions,
        icu: d.icu_demand,
        vents: d.ventilator_demand,
      })));
    }).catch(() => {});
  }, []);

  return (
    <div className="page-enter">
      <PageHeader title="🏥 Resource Management" subtitle="Predictive capacity planning across all facilities" />
      <TabBar
        tabs={[["facilities","🏨 Facilities"],["forecast","📈 AI Forecast"],["alerts","🚨 Alerts"]]}
        active={tab} onChange={setTab} activeColor={C.blue}
      />
      {tab === "facilities" && <FacilitiesTab facilities={facilities} />}
      {tab === "forecast"   && <ForecastTab   forecast={forecast}     />}
      {tab === "alerts"     && <AlertsTab      alerts={alerts}         />}
    </div>
  );
}

function FacilitiesTab({ facilities }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {facilities.map(f => {
        const icuPct  = Math.round(f.icu_used  / f.icu   * 100);
        const ventPct = Math.round(f.vent_used / f.vents * 100);
        const status  = icuPct > 85 ? "critical" : icuPct > 65 ? "high" : "stable";
        return (
          <Card key={f.name} hover>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: C.text, fontWeight: 700 }}>{f.name}</div>
                <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>
                  👥 {f.staff} staff · 📈 <strong>{f.predicted_admissions || f.predicted}</strong> predicted admissions today
                </div>
              </div>
              <Badge label={status} color={status === "critical" ? C.coral : status === "high" ? C.amber : C.accent} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[["🛏️ ICU Beds", f.icu_used, f.icu, icuPct], ["💨 Ventilators", f.vent_used, f.vents, ventPct]].map(([label, used, total, pct]) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: C.textMed, fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: pct > 85 ? C.coral : pct > 65 ? C.amber : C.accent }}>
                      {used}/{total} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct > 85 ? C.coral : pct > 65 ? C.amber : C.accent, borderRadius: 4, transition: "width 1s" }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ForecastTab({ forecast }) {
  return (
    <Card>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: C.text, marginBottom: 20 }}>7-Day AI Demand Forecast</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={forecast} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            {[["aG", C.blue], ["iG", C.coral], ["vG", C.accent]].map(([id, color]) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="date" tick={{ fill: C.textLight, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: C.textLight, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12 }} />
          <Area type="monotone" dataKey="admissions" stroke={C.blue}   strokeWidth={2} fill="url(#aG)" name="Admissions" />
          <Area type="monotone" dataKey="icu"        stroke={C.coral}  strokeWidth={2} fill="url(#iG)" name="ICU Demand"  />
          <Area type="monotone" dataKey="vents"      stroke={C.accent} strokeWidth={2} fill="url(#vG)" name="Ventilators" />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 20, marginTop: 16, justifyContent: "center" }}>
        {[["Admissions", C.blue], ["ICU Demand", C.coral], ["Ventilators", C.accent]].map(([l, c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.textMed }}>
            <div style={{ width: 14, height: 3, background: c, borderRadius: 2 }} />{l}
          </div>
        ))}
      </div>
    </Card>
  );
}

function AlertsTab({ alerts }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {alerts.map((a, i) => (
        <Card key={i} hover style={{ borderLeft: `4px solid ${sevColor[a.severity]}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 48, height: 48, background: sevColor[a.severity] + "18", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                {a.severity === "critical" ? "🚨" : a.severity === "high" ? "⚠️" : "📊"}
              </div>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <Badge label={a.severity} color={sevColor[a.severity]} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{a.resource}</span>
                </div>
                <div style={{ fontSize: 12, color: C.textLight }}>📍 {a.facility}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: sevColor[a.severity], fontFamily: "'Playfair Display', serif" }}>
                {a.current} → {a.predicted}
              </div>
              <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>Current → Predicted</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
