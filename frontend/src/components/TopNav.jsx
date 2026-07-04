import { useState, useEffect, useRef } from "react";
import { C } from "../constants";
import { useAuth } from "../context/AuthContext";
import { notificationService } from "../services/api";

export default function TopNav({ isPatient = false }) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const dropdownRef = useRef(null);
  const ws = useRef(null);

  const signOut = () => {
    import("../services/api").then(({ authService }) => { authService.logout(); });
    logout();
  };

  const loadNotif = () => {
    notificationService.list().then(data => setNotifications(data || []));
    notificationService.unreadCount().then(data => setUnread(data?.count || 0));
  };

  // ... (rest of useEffect logic remains same)

  useEffect(() => {
    loadNotif();
    if (!user?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws/${user.id}`;

    const connect = () => {
      ws.current = new WebSocket(wsUrl);
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "notification") {
          loadNotif(); // Reload when new notification arrives
        }
      };
      ws.current.onclose = () => { setTimeout(connect, 3000); };
    };

    connect();
    return () => { if (ws.current) ws.current.close(); };
  }, [user?.id]);

  const markRead = async (id) => {
    await notificationService.markRead(id);
    loadNotif();
  };

  return (
    <header style={{
      height: 72, background: "var(--card)", borderBottom: `1px solid var(--border)`,
      display: "flex", alignItems: "center", justifyContent: isPatient ? "space-between" : "flex-end", padding: "0 40px",
      position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
    }}>
      {isPatient && (
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <div style={{ width:36, height:36, borderRadius:10, background: "linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color: "#fff" }}>⚕️</div>
          <span style={{fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:800, color:"var(--text)", letterSpacing: "-0.01em"}}>MediCore AI</span>
          <span style={{fontSize:10, color:"var(--blue)", fontWeight:800, background:"var(--blue-light)", padding:"4px 10px", borderRadius:20, letterSpacing: "0.05em", textTransform: "uppercase"}}>Patient Portal</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <button onClick={() => setShowNotif(!showNotif)} style={{
            background: "var(--bg)", border: "none", fontSize: 18, cursor: "pointer", position: "relative",
            width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s"
          }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
             onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
            🔔
            {unread > 0 && (
              <span style={{
                position: "absolute", top: -2, right: -2, background: "var(--coral)", color: "#fff",
                fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 9, border: "3px solid var(--card)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {unread}
              </span>
            )}
          </button>

          {/* ... dropdown ... */}
          {showNotif && (
            <div style={{
              position: "absolute", top: 50, right: 0, width: 320, background: "var(--card)",
              borderRadius: 14, boxShadow: "var(--shadow)", border: `1px solid var(--border)`,
              overflow: "hidden", zIndex: 200
            }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid var(--border)`, fontWeight: 800, fontSize: 14, color: "var(--text)" }}>
                Notifications
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "var(--text-light)", fontSize: 13 }}>
                    No new notifications
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} onClick={() => markRead(n.id)} style={{
                      padding: "12px 18px", borderBottom: `1px solid var(--border)`, cursor: "pointer",
                      background: n.read ? "transparent" : "var(--accent-light)", transition: "background 0.2s"
                    }} onMouseEnter={e => e.currentTarget.style.background = "var(--card-alt)"}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-med)", marginTop: 2 }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: "var(--text-light)", marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {isPatient && (
          <div style={{display:"flex", gap:12, alignItems:"center"}}>
            <span style={{fontSize:13, color:"var(--text-light)", fontWeight:600}}>{user?.name}</span>
            <button onClick={signOut}
              style={{fontSize:12, color:"var(--coral)", background:"none", border:"1px solid var(--coral-light)", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontWeight:700}}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
