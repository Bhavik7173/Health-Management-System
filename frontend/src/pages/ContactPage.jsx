import { useState, useRef, useEffect } from "react";
import { C, roleColor } from "../constants";
import { Card, Btn, Badge, Avatar, PageHeader } from "../components/UI";
import { messageService } from "../services/api";
import { useAuth } from "../context/AuthContext";

const statusBadge = { online: C.accent, busy: C.amber, offline: C.textLight };

export default function ContactPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [active,   setActive]   = useState(null);
  const [messages, setMessages] = useState({});
  const [draft,    setDraft]    = useState("");
  const [search,   setSearch]   = useState("");
  const bottomRef               = useRef(null);
  const ws                      = useRef(null);

  // WebSocket Connection
  useEffect(() => {
    if (!user?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws/${user.id}`;

    const connect = () => {
      ws.current = new WebSocket(wsUrl);

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "new_message") {
          const { from_id, ...msg } = data.message;
          setMessages(prev => ({
            ...prev,
            [from_id]: [...(prev[from_id] || []), msg]
          }));

          // Also update contact list last message
          setContacts(prev => prev.map(c =>
            c.id === from_id ? { ...c, lastMsg: msg.text, time: msg.time, unread: (active?.id === from_id ? c.unread : (c.unread || 0) + 1) } : c
          ));
        }
      };

      ws.current.onclose = () => {
        setTimeout(connect, 3000); // Reconnect after 3 seconds
      };
    };

    connect();
    return () => {
      if (ws.current) ws.current.close();
    };
  }, [user?.id, active?.id]);

  // Load contacts
  useEffect(() => {
    messageService.getContacts().then(data => {
      const mapped = (data || []).map(c => ({
        ...c,
        avatar: c.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "?",
        color:  roleColor[c.role] || C.blue,
        specialty: c.role,
      }));
      setContacts(mapped);
      if (mapped.length) setActive(mapped[0]);
    }).catch(() => {});
  }, []);

  // Load thread when active contact changes
  useEffect(() => {
    if (active?.id) {
      messageService.getThread(active.id).then(msgs => {
        setMessages(prev => ({ ...prev, [active.id]: msgs || [] }));
      }).catch(() => {});
    }
  }, [active?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active, messages]);

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.specialty || "").toLowerCase().includes(search.toLowerCase())
  );

  const send = async () => {
    if (!draft.trim() || !active) return;
    const time = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
    const newMsg = { from: "me", text: draft.trim(), time };
    setMessages(prev => ({ ...prev, [active.id]: [...(prev[active.id] || []), newMsg] }));

    // Update contact list last message
    setContacts(prev => prev.map(c =>
      c.id === active.id ? { ...c, lastMsg: newMsg.text, time } : c
    ));

    setDraft("");
    try { await messageService.send(active.id, newMsg.text); } catch { /* keep optimistic */ }
  };

  const handleKey = e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send());

  const thread = active ? (messages[active.id] || []) : [];

  return (
    <div className="page-enter">
      <PageHeader title="💬 Secure Messaging" subtitle="Encrypted communication between clinical staff" />

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, height: "calc(100vh - 220px)", minHeight: 500 }}>
        {/* ── Contact List ── */}
        <Card style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…"
                style={{ width: "100%", background: C.cardAlt, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "10px 12px 10px 36px", fontSize: 13, outline: "none" }} />
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map(c => (
              <div key={c.id} onClick={() => setActive(c)}
                style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 18px", cursor: "pointer", background: active?.id === c.id ? C.accentLight : "transparent", borderBottom: `1px solid ${C.border}`, transition: "background 0.15s" }}>
                <div style={{ position: "relative" }}>
                  <Avatar initials={c.avatar} color={c.color} size={44} />
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: "50%", background: statusBadge[c.status], border: "2px solid #fff" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: C.textLight }}>{c.time}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.textLight, marginTop: 1 }}>{c.specialty}</div>
                  <div style={{ fontSize: 12, color: C.textMed, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMsg}</div>
                </div>
                {c.unread > 0 && (
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.accent, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.unread}</div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* ── Chat ── */}
        <Card style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {!active ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, color: C.textLight }}>
              <div style={{ fontSize: 48 }}>💬</div>
              <div style={{ fontSize: 14 }}>Select a contact to start messaging</div>
            </div>
          ) : (
          <>
          {/* Header */}
          <div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14, background: "#fff" }}>
            <Avatar initials={active.avatar} color={active.color} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{active.name}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusBadge[active.status] }} />
                <span style={{ fontSize: 12, color: statusBadge[active.status], fontWeight: 600, textTransform: "capitalize" }}>{active.status}</span>
                <span style={{ fontSize: 12, color: C.textLight }}>· {active.specialty}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["📞","Call"],["🎥","Video"],["📎","Attach"]].map(([icon, tip]) => (
                <button key={tip} title={tip} style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.border}`, background: "#fff", fontSize: 16, cursor: "pointer" }}>{icon}</button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, background: C.cardAlt }}>
            {thread.length === 0 ? (
              <div style={{ textAlign: "center", color: C.textLight, fontSize: 13, marginTop: 20 }}>No messages yet — say hi 👋</div>
            ) : thread.map((msg, i) => {
              const isMe = msg.from === "me";
              return (
                <div key={i} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                  {!isMe && <Avatar initials={active.avatar} color={active.color} size={30} />}
                  <div style={{ maxWidth: "70%" }}>
                    <div style={{
                      background: isMe ? C.accent : "#fff",
                      color: isMe ? "#fff" : C.text,
                      padding: "10px 14px", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      fontSize: 14, lineHeight: 1.5, boxShadow: C.shadow,
                    }}>
                      {msg.text}
                    </div>
                    <div style={{ fontSize: 10, color: C.textLight, marginTop: 4, textAlign: isMe ? "right" : "left" }}>{msg.time}</div>
                  </div>
                  {isMe && <Avatar initials={user?.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "ME"} color={C.blue} size={30} />}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Compose */}
          <div style={{ padding: "14px 18px", borderTop: `1px solid ${C.border}`, background: "#fff", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKey}
              placeholder={`Message ${active.name.split(" ").pop()}…`}
              rows={1}
              style={{ flex: 1, background: C.cardAlt, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "12px 16px", fontSize: 14, color: C.text, outline: "none", resize: "none", fontFamily: "Nunito, sans-serif", lineHeight: 1.5 }}
            />
            <button onClick={send} disabled={!draft.trim()}
              style={{ width: 44, height: 44, borderRadius: 14, background: draft.trim() ? C.accent : C.border, border: "none", cursor: draft.trim() ? "pointer" : "not-allowed", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s", flexShrink: 0 }}>
              ➤
            </button>
          </div>
          </>
          )}
        </Card>
      </div>
    </div>
  );
}
