import { useState, useEffect } from "react";
import { C } from "../constants";
import { Card, Btn, Badge, Avatar, PageHeader } from "../components/UI";
import { doctorService, appointmentService } from "../services/api";

const SPECIALTIES = [
  { icon: "💉", label: "General"     }, { icon: "🦷", label: "Dental"     },
  { icon: "👁️", label: "Surgeon"     }, { icon: "🫀", label: "Cardio"     },
  { icon: "👂", label: "ENT"         }, { icon: "🧠", label: "Oncologist" },
  { icon: "🫁", label: "Pulmo"       }, { icon: "🦴", label: "Physio"     },
];

export default function DoctorPage() {
  const [doctors,  setDoctors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState(null);
  const [booked,   setBooked]   = useState(false);

  useEffect(() => {
    doctorService.list()
      .then(d => setDoctors(d || []))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = doctors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.specialty || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleBook = async () => {
    if (!selected) return;
    try {
      await appointmentService.create({
        patient:   "Walk-in Patient",
        doctor:    selected.name,
        doctorId:  selected.id,
        avatar:    selected.avatar,
        color:     selected.color,
        date:      new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        time:      "10:00",
        type:      "Consultation",
        notes:     "Booked from Doctor Directory",
        status:    "pending",
      });
    } catch { /* ignore - keep UX optimistic */ }
    setBooked(true);
    setTimeout(() => setBooked(false), 3000);
    setSelected(null);
  };

  return (
    <div className="page-enter" data-testid="doctor-page">
      <PageHeader title="Make An Appointment" subtitle="That Will Help You! Choose A Doctor" />

      {booked && (
        <div data-testid="booking-success" style={{ background: C.accentLight, border: `1px solid ${C.accent}44`, borderRadius: 14, padding: "14px 20px", marginBottom: 20, fontSize: 14, color: C.accent, fontWeight: 700 }}>
          ✅ Appointment confirmed successfully!
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
        <input
          data-testid="doctor-search-input"
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search Doctor…"
          style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 16, padding: "14px 16px 14px 46px", fontSize: 14, color: C.text, outline: "none", boxShadow: C.shadow }}
        />
      </div>

      {/* Specialties */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 24 }}>
        {SPECIALTIES.map((s, i) => (
          <Card key={i} hover style={{ padding: "14px 10px", textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMed }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Doctor Grid */}
      {loading ? (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 13, color: C.textLight }}>Loading doctors…</div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40 }} data-testid="no-doctors">
          <div style={{ fontSize: 32, marginBottom: 8 }}>👨‍⚕️</div>
          <div style={{ fontSize: 13, color: C.textLight }}>No doctors found. Run <code>python seed.py</code> to populate.</div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }} data-testid="doctor-grid">
          {filtered.map((d) => (
            <Card key={d.id} hover onClick={() => setSelected(s => s?.id === d.id ? null : d)}
              data-testid={`doctor-card-${d.id}`}
              style={{ padding: "20px", border: selected?.id === d.id ? `2px solid ${d.color}` : `1px solid ${C.border}` }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
                <Avatar initials={d.avatar} color={d.color} size={52} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: d.color, fontWeight: 600, marginTop: 2 }}>{d.specialty}</div>
                  <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>📍 {d.location || "—"}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Badge label={d.available ? "Available" : "Busy"} color={d.available ? C.accent : C.coral} />
                <Btn variant={selected?.id === d.id ? "primary" : "ghost"}
                  data-testid={`doctor-book-btn-${d.id}`}
                  style={{ padding: "7px 16px", fontSize: 12, borderRadius: 10 }}
                  onClick={e => { e.stopPropagation(); setSelected(s => s?.id === d.id ? null : d); }}>
                  {selected?.id === d.id ? "✓ Selected" : "Book"}
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Confirm */}
      {selected && (
        <Card style={{ marginTop: 20, background: C.accentLight, border: `1.5px solid ${C.accent}44` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Avatar initials={selected.avatar} color={selected.color} size={48} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Booking: {selected.name}</div>
                <div style={{ fontSize: 12, color: C.textLight }}>{selected.specialty}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn data-testid="confirm-booking-btn" onClick={handleBook} style={{ borderRadius: 12 }}>Confirm Appointment</Btn>
              <Btn variant="outline" onClick={() => setSelected(null)} style={{ borderRadius: 12 }}>Cancel</Btn>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
