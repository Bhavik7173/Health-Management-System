import { useState, useEffect } from "react";
import { C } from "../constants";
import { Card, PageHeader, StatCard } from "../components/UI";
import SymptomChecker from "../components/SymptomChecker";
import { medicineDbService } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function SymptomCheckerPage() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState("checker"); // checker | medicines
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [symptomQuery, setSymptomQuery] = useState("");
  const [symptomResults, setSymptomResults] = useState(null);
  const [searchingSymptom, setSearchingSymptom] = useState(false);

  useEffect(() => {
    if (activeView === "medicines") loadMedicines();
  }, [activeView, selectedCategory]);

  const loadMedicines = async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        medicineDbService.list({ category: selectedCategory, search, limit: 20 }),
        medicineDbService.getCategories(),
      ]);
      setMedicines(mRes.data || []);
      setCategories(cRes.data || []);
    } catch (e) {
      console.error("Medicine DB error:", e);
    } finally {
      setLoading(false);
    }
  };

  const searchBySymptom = async () => {
    if (!symptomQuery.trim()) return;
    setSearchingSymptom(true);
    try {
      const res = await medicineDbService.searchBySymptom(symptomQuery.trim());
      setSymptomResults(res);
      setActiveView("symptomResults");
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingSymptom(false);
    }
  };

  // Profile from user account for SymptomChecker
  const userProfile = {
    age:        30,
    gender:     user?.gender || "",
    conditions: [],
    allergies:  [],
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="🧠 AI Symptom Checker & Medicine Database"
        subtitle="Describe your symptoms for AI analysis, or browse our comprehensive medicine database"
      />

      {/* View toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          ["checker",        "🧠 AI Symptom Checker"],
          ["medicines",      "💊 Medicine Database"],
          ["symptomSearch",  "🔍 Search by Symptom/Disease"],
        ].map(([v, l]) => (
          <button key={v} onClick={() => { setActiveView(v); setSelectedMed(null); }}
            style={{
              padding: "10px 20px", borderRadius: 20,
              border: `1.5px solid ${activeView === v ? C.accent : C.border}`,
              background: activeView === v ? C.accent : "#fff",
              color: activeView === v ? "#fff" : C.textMed,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── AI Symptom Checker ── */}
      {activeView === "checker" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
          <Card style={{ padding: 24 }}>
            <SymptomChecker userProfile={userProfile} />
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 12 }}>⚡ Quick Tips</div>
              {[
                ["🌡️ Temperature", "Normal: 36–37.5°C. Fever: > 37.5°C. High fever: > 39°C"],
                ["💧 Hydration", "Drink 8–10 glasses of water daily, especially during illness"],
                ["😴 Rest", "Sleep is when your body heals — prioritise it when unwell"],
                ["🩺 See a doctor", "If symptoms > 3 days, are worsening, or you're concerned"],
                ["🚨 Emergency", "Chest pain, difficulty breathing → Call 999/911 immediately"],
              ].map(([title, desc]) => (
                <div key={title} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</div>
                  <div style={{ fontSize: 12, color: C.textLight, marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </Card>
            <Card style={{ padding: 20, background: C.accentLight, border: `1px solid ${C.accent}44` }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.accent, marginBottom: 8 }}>EMERGENCY NUMBERS</div>
              {[["🇬🇧 UK", "999"], ["🇺🇸 USA", "911"], ["🇮🇳 India", "112"], ["🌍 EU", "112"]].map(([c, n]) => (
                <div key={c} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: C.textMed }}>{c}</span>
                  <span style={{ fontWeight: 800, color: C.coral, fontFamily: "monospace" }}>{n}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── Symptom/Disease Search ── */}
      {(activeView === "symptomSearch" || activeView === "symptomResults") && (
        <div>
          <Card style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 16 }}>
              🔍 Search Medicines by Symptom or Disease
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <input value={symptomQuery} onChange={e => setSymptomQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchBySymptom()}
                placeholder="e.g. fever, headache, PCOS, arthritis, diabetes, cold..."
                style={{ flex: 1, padding: "12px 16px", background: C.cardAlt, border: `1.5px solid ${C.border}`, borderRadius: 14, fontSize: 14, color: C.text, outline: "none" }}
              />
              <button onClick={searchBySymptom} disabled={searchingSymptom}
                style={{ padding: "12px 24px", borderRadius: 14, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {searchingSymptom ? "Searching…" : "Search"}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["fever", "headache", "diabetes", "allergy", "cold", "acidity", "back pain", "arthritis", "PCOS", "cough", "UTI", "insomnia"].map(s => (
                <button key={s} onClick={() => { setSymptomQuery(s); }}
                  style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${C.border}`, background: "#fff", color: C.textMed, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          </Card>

          {symptomResults && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                  Results for: <span style={{ color: C.accent }}>"{symptomResults.query}"</span>
                </span>
                <span style={{ fontSize: 12, background: C.blueLight, color: C.blue, borderRadius: 20, padding: "4px 12px", fontWeight: 700 }}>
                  {symptomResults.total} medicines
                </span>
              </div>

              {symptomResults.medicines?.length === 0 ? (
                <Card style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>No medicines found for "{symptomResults.query}"</div>
                  <div style={{ fontSize: 13, color: C.textLight, marginTop: 6 }}>Try terms like "fever", "headache", "cold", "diabetes", etc.</div>
                </Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginBottom: 32 }}>
                  {symptomResults.medicines.map(med => (
                    <MedicineCard key={med._id || med.id} med={med} onClick={() => { setSelectedMed(med); setActiveTab("overview"); }} />
                  ))}
                </div>
              )}

              {symptomResults.homeRemedies?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 16 }}>🌿 Home Remedies</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                    {symptomResults.homeRemedies.map((r, i) => <RemedyCard key={i} remedy={r} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Medicine Database ── */}
      {activeView === "medicines" && !selectedMed && (
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && loadMedicines()}
              placeholder="Search medicines..."
              style={{ flex: 1, minWidth: 220, padding: "10px 16px", background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, fontSize: 14, color: C.text, outline: "none" }}
            />
            <button onClick={loadMedicines} style={{ padding: "10px 20px", borderRadius: 14, border: "none", background: C.accent, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              Search
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
            {["", ...categories].map(cat => (
              <button key={cat} onClick={() => { setSelectedCategory(cat); }}
                style={{ padding: "6px 16px", borderRadius: 20, border: `1.5px solid ${selectedCategory === cat ? C.accent : C.border}`, background: selectedCategory === cat ? C.accentLight : "#fff", color: selectedCategory === cat ? C.accent : C.textMed, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {cat || "All Categories"}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: C.textLight }}>Loading medicines…</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {medicines.map(med => (
                <MedicineCard key={med._id || med.id} med={med} onClick={() => { setSelectedMed(med); setActiveTab("overview"); }} />
              ))}
              {medicines.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💊</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>No medicines found</div>
                  <div style={{ fontSize: 13, color: C.textLight, marginTop: 6 }}>
                    Run the seed script first: <code style={{ color: C.accent }}>cd backend && python seedMedicines.py</code>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Medicine Detail ── */}
      {selectedMed && (
        <MedicineDetail med={selectedMed} activeTab={activeTab} setActiveTab={setActiveTab} onBack={() => setSelectedMed(null)} />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function MedicineCard({ med, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px 20px", cursor: "pointer",
        boxShadow: hov ? C.shadowHover : C.shadow, transition: "all 0.2s", transform: hov ? "translateY(-2px)" : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, background: C.accentLight, color: C.accent, borderRadius: 20, padding: "3px 10px" }}>
          {med.category}
        </span>
        {med.requiresPrescription && (
          <span style={{ fontSize: 10, fontWeight: 700, background: C.amberLight, color: C.amber, borderRadius: 20, padding: "3px 8px" }}>Rx</span>
        )}
      </div>
      <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 4 }}>{med.name}</div>
      <div style={{ fontSize: 12, color: C.textLight, marginBottom: 12 }}>{med.brandNames?.slice(0, 4).join(" · ")}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
        {med.uses?.slice(0, 4).map((u, i) => (
          <span key={i} style={{ fontSize: 11, background: C.cardAlt, color: C.textMed, borderRadius: 6, padding: "3px 8px" }}>{u}</span>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.textLight, display: "flex", justifyContent: "space-between" }}>
        <span>{med.variants?.length || 0} variants</span>
        <span>{med.homeRemedies?.length || 0} home remedies</span>
        <span style={{ color: C.accent }}>View →</span>
      </div>
    </div>
  );
}

function MedicineDetail({ med, activeTab, setActiveTab, onBack }) {
  const tabs = [
    ["overview",  "📋 Overview"],
    ["dosage",    "💉 Dosage"],
    ["benefits",  "✅ Benefits & Risks"],
    ["variants",  "🔬 Variants"],
    ["remedies",  "🌿 Home Remedies"],
  ];

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontWeight: 700, fontSize: 14, marginBottom: 20 }}>
        ← Back to list
      </button>

      <Card style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, background: C.accentLight, color: C.accent, borderRadius: 20, padding: "4px 14px" }}>{med.category}</span>
          <span style={{ fontSize: 12, fontWeight: 700, background: med.requiresPrescription ? C.amberLight : C.blueLight, color: med.requiresPrescription ? C.amber : C.blue, borderRadius: 20, padding: "4px 14px" }}>
            {med.requiresPrescription ? "🔴 Prescription Required" : "🟢 OTC Available"}
          </span>
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: C.text, marginBottom: 8 }}>{med.name}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {med.brandNames?.map((b, i) => (
            <span key={i} style={{ fontSize: 12, background: C.cardAlt, color: C.textMed, borderRadius: 20, padding: "4px 12px" }}>{b}</span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            ["Variants", med.variants?.length || 0],
            ["Uses", med.uses?.length || 0],
            ["Home Remedies", med.homeRemedies?.length || 0],
            ["Side Effects", med.sideEffects?.length || 0],
          ].map(([label, val]) => (
            <div key={label} style={{ textAlign: "center", background: C.cardAlt, borderRadius: 14, padding: "14px 8px" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: C.accent }}>{val}</div>
              <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding: "9px 18px", borderRadius: 20, border: `1.5px solid ${activeTab === id ? C.accent : C.border}`, background: activeTab === id ? C.accent : "#fff", color: activeTab === id ? "#fff" : C.textMed, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <InfoBox title="✦ Uses" color={C.accent} items={med.uses} type="tags" tagBg={C.accentLight} tagColor={C.accent} />
          <InfoBox title="◎ Symptoms Treated" color={C.blue} items={med.symptoms} type="tags" tagBg={C.blueLight} tagColor={C.blue} />
          {med.diseases?.length > 0 && <InfoBox title="⊕ Related Diseases" color="#8b5cf6" items={med.diseases} type="tags" tagBg="#f3f0ff" tagColor="#8b5cf6" />}
          {med.warnings?.length > 0 && <InfoBox title="⚠ Warnings" color={C.amber} items={med.warnings} type="list" />}
        </div>
      )}

      {activeTab === "dosage" && med.howToTake && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[["👨 Adult Dose", med.howToTake.adults, C.accent], ["👶 Child Dose", med.howToTake.children, C.blue],
            ["🍽 When to Take", med.howToTake.timing, C.amber], ["🔄 Frequency", med.howToTake.frequency, "#8b5cf6"],
            ["⛔ Max Daily Dose", med.howToTake.maxDailyDose, C.coral]].map(([t, v, c]) => v && (
            <Card key={t} style={{ padding: 20, borderLeft: `4px solid ${c}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{t}</div>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{v}</div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "benefits" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {med.benefits?.length > 0 && <InfoBox title="✅ Benefits" color="#4ade80" items={med.benefits} type="list" prefix="✓" />}
          {med.sideEffects?.length > 0 && <InfoBox title="⚠ Common Side Effects" color={C.amber} items={med.sideEffects} type="list" prefix="•" />}
          {med.seriousSideEffects?.length > 0 && <InfoBox title="🚨 Serious Side Effects" color={C.coral} items={med.seriousSideEffects} type="list" prefix="⚠" />}
          {med.contraindications?.length > 0 && <InfoBox title="🚫 Do NOT Use If..." color={C.coral} items={med.contraindications} type="list" prefix="✗" />}
        </div>
      )}

      {activeTab === "variants" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {med.variants?.map((v, i) => (
            <Card key={i} style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 12 }}>{v.name}</div>
              {[["Form", v.dosageForm], ["Strength", v.strength], ["Manufacturer", v.manufacturer], ["Price", v.price]].map(([k, val]) => val && (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.textLight, fontWeight: 600 }}>{k}</span>
                  <span style={{ fontSize: 13, color: C.text, textAlign: "right", maxWidth: "60%" }}>{val}</span>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}

      {activeTab === "remedies" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {med.homeRemedies?.length === 0 && (
            <Card style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🌿</div>
              <div style={{ color: C.textLight }}>No home remedies recorded for this medicine</div>
            </Card>
          )}
          {med.homeRemedies?.map((r, i) => <RemedyCard key={i} remedy={r} defaultExpanded />)}
        </div>
      )}
    </div>
  );
}

function InfoBox({ title, color, items, type, tagBg, tagColor, prefix = "" }) {
  if (!items?.length) return null;
  return (
    <Card style={{ padding: 20, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{title}</div>
      {type === "tags" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {items.map((item, i) => (
            <span key={i} style={{ fontSize: 12, background: tagBg, color: tagColor, borderRadius: 8, padding: "4px 10px", textTransform: "capitalize" }}>{item}</span>
          ))}
        </div>
      ) : (
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {items.map((item, i) => (
            <li key={i} style={{ fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 6, paddingLeft: 4 }}>
              {prefix && <span style={{ color, marginRight: 6 }}>{prefix}</span>}{item}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RemedyCard({ remedy, defaultExpanded = false }) {
  const [open, setOpen] = useState(defaultExpanded);
  return (
    <Card style={{ padding: 20, borderLeft: `4px solid #4ade80` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, background: "#f0fdf4", color: "#166534", borderRadius: 20, padding: "3px 10px", display: "inline-block", marginBottom: 8 }}>
            🌿 For: {remedy.symptom}
          </span>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{remedy.remedy}</div>
        </div>
        <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.textLight }}>{open ? "▲" : "▼"}</button>
      </div>
      {open && (
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {remedy.ingredients?.length > 0 && (
            <div style={{ background: "#faf5ff", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>🧪 Ingredients</div>
              <ul style={{ listStyle: "none", paddingLeft: 0 }}>
                {remedy.ingredients.map((ing, i) => <li key={i} style={{ fontSize: 12, color: C.textMed, marginBottom: 4 }}>• {ing}</li>)}
              </ul>
            </div>
          )}
          {remedy.instructions && (
            <div style={{ background: C.blueLight, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>📋 Instructions</div>
              <p style={{ fontSize: 13, color: C.textMed, lineHeight: 1.7, margin: 0 }}>{remedy.instructions}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
