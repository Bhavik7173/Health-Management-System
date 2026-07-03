import { useState, useEffect } from "react";
import { C } from "../constants";
import { Card, Btn, PageHeader, Avatar, Badge } from "../components/UI";
import { adminService } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function RosterPage() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ user_id: "", date: new Date().toISOString().split('T')[0], start_time: "08:00", end_time: "16:00", note: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([adminService.getShifts(), adminService.getUsers()]);
      setShifts(s || []);
      setUsers(u || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const selectedUser = users.find(u => u.id === form.user_id);
    if (!selectedUser) return alert("Select a staff member");

    try {
      await adminService.createShift({ ...form, user_name: selectedUser.name, role: selectedUser.role });
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this shift?")) return;
    await adminService.deleteShift(id);
    loadData();
  };

  return (
    <div className="page-enter">
      <PageHeader title="📅 Staff Roster" subtitle="Manage clinical shifts and staff availability"
        action={user.role === 'admin' && <Btn onClick={() => setShowModal(true)}>+ Add Shift</Btn>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {shifts.map(s => (
          <Card key={s.id} hover style={{ borderLeft: `4px solid ${C.blue}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Avatar initials={s.user_name?.slice(0,2).toUpperCase()} color={C.blue} size={40} />
                <div>
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 14 }}>{s.user_name}</div>
                  <div style={{ fontSize: 11, color: C.textLight }}>{s.role?.toUpperCase()}</div>
                </div>
              </div>
              {user.role === 'admin' && <button onClick={() => handleDelete(s.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>🗑️</button>}
            </div>

            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: C.textLight }}>Date</span>
                <span style={{ fontWeight: 700, color: C.text }}>{s.date}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: C.textLight }}>Time</span>
                <span style={{ fontWeight: 700, color: C.accent }}>{s.start_time} — {s.end_time}</span>
              </div>
              {s.note && <div style={{ fontSize: 12, color: C.textMed, background: C.cardAlt, padding: "8px", borderRadius: 8 }}>📝 {s.note}</div>}
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <Card style={{ width: "100%", maxWidth: 400 }}>
            <h3 style={{ marginBottom: 20, color: C.text }}>Add New Shift</h3>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <select value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} style={{ padding: "10px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.cardAlt }}>
                <option value="">Select Staff...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={{ padding: "10px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.cardAlt }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} style={{ padding: "10px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.cardAlt }} />
                <input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} style={{ padding: "10px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.cardAlt }} />
              </div>
              <textarea placeholder="Shift notes..." value={form.note} onChange={e => setForm({...form, note: e.target.value})} style={{ padding: "10px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.cardAlt, resize: "none" }} rows={2} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <Btn type="submit" style={{ flex: 1 }}>Create Shift</Btn>
                <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancel</Btn>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
