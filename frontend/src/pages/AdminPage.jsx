import { useState, useEffect } from "react";
import { C, roleColor } from "../constants";
import { Card, Btn, Badge, Avatar, StatCard, PageHeader } from "../components/UI";
import { adminService } from "../services/api";

export default function AdminPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    adminService.getUsers()
      .then(data => {
        const mapped = (data || []).map(u => ({
          ...u,
          avatar: u.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),
          color:  roleColor[u.role] || C.blue,
          joined: u.created_at?.slice(0,10) || "—",
        }));
        setUsers(mapped);
      })
      .catch(() => setUsers([]));
  }, []);

  return (
    <div className="page-enter">
      <PageHeader title="🛡️ Admin Panel" subtitle="Manage users and system settings" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Users"   value={users.length}                                       icon="👥" color={C.blue}  bg={C.blueLight}  />
        <StatCard label="Doctors"       value={users.filter(u=>u.role==="doctor").length}          icon="👨‍⚕️" color={C.accent} bg={C.accentLight} />
        <StatCard label="Radiologists"  value={users.filter(u=>u.role==="radiologist").length}     icon="🔬" color={C.coral} bg={C.coralLight} />
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: C.text }}>All Users</h3>
          <Btn style={{ padding: "8px 16px", fontSize: 12, borderRadius: 10 }}>+ Invite User</Btn>
        </div>
        {users.map((u, i) => (
          <div key={u.id || u.email} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 24px", borderBottom: i < users.length - 1 ? `1px solid ${C.border}` : "none", background: i % 2 === 0 ? "#fff" : C.cardAlt }}>
            <Avatar initials={u.avatar || u.name?.slice(0,2).toUpperCase()} color={u.color || roleColor[u.role] || C.blue} size={42} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{u.name}</div>
              <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>{u.email}</div>
            </div>
            <Badge label={u.role} color={roleColor[u.role] || C.blue} />
            <div style={{ fontSize: 12, color: C.textLight, minWidth: 100 }}>Joined {u.joined}</div>
            <Btn variant="ghost" style={{ padding: "6px 14px", fontSize: 11, borderRadius: 8 }}>Manage</Btn>
          </div>
        ))}
      </Card>
    </div>
  );
}
