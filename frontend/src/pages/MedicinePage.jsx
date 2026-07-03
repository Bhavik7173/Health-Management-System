import { useState, useEffect } from "react";
import { C } from "../constants";
import { Card, Btn, Badge, Input, PageHeader, TabBar, StatCard } from "../components/UI";
import { medicineService } from "../services/api";

const CATEGORIES = ["All","Antibiotic","Cardiology","Diabetes","Gastrology","Pain Relief","Psychiatry","Pulmonology"];

const statusCol = { available: C.accent, low: C.amber, out: C.coral };
const rxStatusCol = { dispensed: C.accent, pending: C.blue, cancelled: C.coral, active: C.accent };

export default function MedicinePage() {
  const [tab, setTab]       = useState("drugs");
  const [search, setSearch] = useState("");
  const [cat, setCat]       = useState("All");
  const [selected, setSelected] = useState(null);
  const [showPrescribe, setShowPrescribe] = useState(false);
  const [rxForm, setRxForm] = useState({ patient:"", drug:"", dosage:"", duration:"", refills:"0" });
  const [allDrugs,      setAllDrugs]      = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    medicineService.getDrugs().then(d => setAllDrugs(d || [])).catch(() => {});
    medicineService.getPrescriptions().then(d => setPrescriptions(d || [])).catch(() => {});
  }, []);

  const drugs = allDrugs.filter(d =>
    (cat === "All" || d.category === cat) &&
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total:     allDrugs.length,
    available: allDrugs.filter(d => d.status === "available").length,
    low:       allDrugs.filter(d => d.status === "low").length,
    out:       allDrugs.filter(d => d.status === "out").length,
  };

  const handlePrescribe = async () => {
    if (!rxForm.patient || !rxForm.drug || !rxForm.dosage || !rxForm.duration) return;
    try {
      const saved = await medicineService.createPrescription({
        patient: rxForm.patient, drug: rxForm.drug, dosage: rxForm.dosage,
        duration: rxForm.duration, refills: parseInt(rxForm.refills),
      });
      setPrescriptions(p => [saved, ...p]);
      setSuccessMsg(`Prescription for ${rxForm.patient} created successfully!`);
    } catch (e) {
      setSuccessMsg(`⚠️ Failed: ${e.message}`);
    }
    setShowPrescribe(false);
    setRxForm({ patient:"", drug:"", dosage:"", duration:"", refills:"0" });
    setTimeout(() => setSuccessMsg(""), 3500);
    setTab("prescriptions");
  };

  return (
    <div className="page-enter">
      <PageHeader title="💊 Medicine" subtitle="Drug inventory, prescriptions & pharmacy management" />

      {successMsg && (
        <div style={{ background: C.accentLight, border: `1px solid ${C.accent}44`, borderRadius: 14, padding: "14px 20px", marginBottom: 20, fontSize: 14, color: C.accent, fontWeight: 700 }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Drugs"  value={stats.total}     icon="💊" color={C.blue}  bg={C.blueLight}  />
        <StatCard label="Available"    value={stats.available} icon="✅" color={C.accent} bg={C.accentLight} />
        <StatCard label="Low Stock"    value={stats.low}       icon="⚠️" color={C.amber} bg={C.amberLight}  />
        <StatCard label="Out of Stock" value={stats.out}       icon="🚫" color={C.coral} bg={C.coralLight}  />
      </div>

      <TabBar
        tabs={[["drugs","💊 Drug Inventory"],["prescriptions","📋 Prescriptions"]]}
        active={tab} onChange={setTab}
      />

      {tab === "drugs" && (
        <>
          {/* Search + filter */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search drugs…"
                style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "11px 14px 11px 40px", fontSize: 13, color: C.text, outline: "none", boxShadow: C.shadow }} />
            </div>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{ padding: "10px 16px", borderRadius: 20, border: `1.5px solid ${cat === c ? C.blue : C.border}`, background: cat === c ? C.blue : "#fff", color: cat === c ? "#fff" : C.textMed, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {c}
              </button>
            ))}
          </div>

          {/* Drug grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
            {drugs.map(d => (
              <Card key={d.id} hover onClick={() => setSelected(s => s?.id === d.id ? null : d)}
                style={{ border: selected?.id === d.id ? `2px solid ${C.blue}` : `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: C.textLight, marginTop: 3 }}>{d.category} · {d.dosage}</div>
                    <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>By {d.manufacturer}</div>
                  </div>
                  <Badge label={d.status.replace("out","out of stock")} color={statusCol[d.status]} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[["Stock", `${d.stock.toLocaleString()} ${d.unit}`], ["Unit Price", `$${d.price.toFixed(2)}`], ["Total Value", `$${(d.stock * d.price).toFixed(0)}`]].map(([k, v]) => (
                    <div key={k} style={{ background: C.cardAlt, borderRadius: 10, padding: "8px 12px" }}>
                      <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2 }}>{k}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{v}</div>
                    </div>
                  ))}
                </div>
                {d.status === "low" && (
                  <div style={{ marginTop: 12, padding: "8px 12px", background: C.amberLight, borderRadius: 10, fontSize: 12, color: C.amber, fontWeight: 600 }}>
                    ⚠️ Stock below minimum threshold — consider reordering
                  </div>
                )}
                {d.status === "out" && (
                  <div style={{ marginTop: 12, padding: "8px 12px", background: C.coralLight, borderRadius: 10, fontSize: 12, color: C.coral, fontWeight: 600 }}>
                    🚫 Out of stock — prescribing disabled
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Quick prescribe from selected drug */}
          {selected && selected.status !== "out" && (
            <Card style={{ marginTop: 20, background: C.blueLight, border: `1.5px solid ${C.blue}33` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>
                    Prescribe: {selected.name} {selected.dosage}
                  </div>
                  <div style={{ fontSize: 12, color: C.textLight }}>{selected.stock.toLocaleString()} {selected.unit} in stock</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn variant="blue" onClick={() => { setRxForm(f => ({ ...f, drug: selected.name + " " + selected.dosage })); setShowPrescribe(true); setSelected(null); }} style={{ borderRadius: 12 }}>
                    📋 Write Prescription
                  </Btn>
                  <Btn variant="outline" onClick={() => setSelected(null)} style={{ borderRadius: 12 }}>Cancel</Btn>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === "prescriptions" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <Btn onClick={() => setShowPrescribe(true)} style={{ borderRadius: 12 }}>+ New Prescription</Btn>
          </div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr style={{ background: C.cardAlt }}>
                    {["RX #","Patient","Doctor","Drug","Dosage","Duration","Date","Status","Refills"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", fontSize: 11, color: C.textLight, fontWeight: 700, textAlign: "left", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((rx, i) => (
                    <tr key={rx.id} style={{ borderBottom: `1px solid ${C.border}`, background: i%2===0?"#fff":C.cardAlt }}>
                      <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, color: C.blue }}>{rx.id}</td>
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: C.text }}>{rx.patient}</td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: C.textMed }}>{rx.doctor}</td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: C.text }}>{rx.drug}</td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: C.textMed }}>{rx.dosage}</td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: C.textMed }}>{rx.duration}</td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: C.textLight }}>{rx.date}</td>
                      <td style={{ padding: "14px 16px" }}><Badge label={rx.status} color={rxStatusCol[rx.status]} /></td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: C.textMed, textAlign: "center" }}>{rx.refills}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Prescription Modal */}
      {showPrescribe && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <Card style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: C.text }}>📋 New Prescription</h3>
              <button onClick={() => setShowPrescribe(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textLight }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Input label="Patient Name" value={rxForm.patient} onChange={v => setRxForm(f => ({ ...f, patient: v }))} placeholder="Full patient name" icon="👤" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: C.textLight, fontWeight: 600, letterSpacing: "0.05em" }}>DRUG</label>
                <select value={rxForm.drug} onChange={e => setRxForm(f => ({ ...f, drug: e.target.value }))}
                  style={{ background: C.cardAlt, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "12px 16px", fontSize: 14, color: C.text, outline: "none" }}>
                  <option value="">Select drug…</option>
                  {allDrugs.filter(d => d.status !== "out").map(d => (
                    <option key={d.id || d._id} value={`${d.name} ${d.dosage}`}>{d.name} {d.dosage}</option>
                  ))}
                </select>
              </div>
              <Input label="Dosage Instructions" value={rxForm.dosage} onChange={v => setRxForm(f => ({ ...f, dosage: v }))} placeholder="e.g. 500mg 3× per day with food" icon="💉" />
              <Input label="Duration" value={rxForm.duration} onChange={v => setRxForm(f => ({ ...f, duration: v }))} placeholder="e.g. 7 days" icon="📅" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: C.textLight, fontWeight: 600, letterSpacing: "0.05em" }}>REFILLS ALLOWED</label>
                <select value={rxForm.refills} onChange={e => setRxForm(f => ({ ...f, refills: e.target.value }))}
                  style={{ background: C.cardAlt, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "12px 16px", fontSize: 14, color: C.text, outline: "none" }}>
                  {[0,1,2,3,5].map(n => <option key={n} value={n}>{n} refill{n !== 1 ? "s" : ""}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <Btn onClick={handlePrescribe} disabled={!rxForm.patient || !rxForm.drug || !rxForm.dosage || !rxForm.duration} style={{ flex: 1, borderRadius: 12, padding: "12px" }}>
                  Issue Prescription
                </Btn>
                <Btn variant="outline" onClick={() => setShowPrescribe(false)} style={{ borderRadius: 12, padding: "12px 20px" }}>Cancel</Btn>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
