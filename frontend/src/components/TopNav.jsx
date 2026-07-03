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
      height: 64, background: "var(--card)", borderBottom: `1px solid var(--border)`,
      display: "flex", alignItems: "center", justifyContent: isPatient ? "space-between" : "flex-end", padding: "0 24px",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      {isPatient && (
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{fontSize:20}}>⚕️</span>
          <span style={{fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:"var(--text)"}}>MediCore AI</span>
          <span style={{fontSize:11, color:"var(--blue)", fontWeight:700, background:"var(--blue-light)", padding:"2px 10px", borderRadius:20}}>Patient Portal</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative" }} ref={dropdownRef}>
          {/* ... bell button ... */}
          <button onClick={() => setShowNotif(!showNotif)} style={{
            background: "none", border: "none", fontSize: 20, cursor: "pointer", position: "relative",
            width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.2s"
          }} onMouseEnter={e => e.currentTarget.style.background = "var(--card-alt)"}
             onMouseLeave={e => e.currentTarget.style.background = "none"}>
            🔔
            {unread > 0 && (
              <span style={{
                position: "absolute", top: 8, right: 8, background: "var(--coral)", color: "#fff",
                fontSize: 10, fontWeight: 700, padding: "2px 5px", borderRadius: 10, border: "2px solid var(--card)"
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
