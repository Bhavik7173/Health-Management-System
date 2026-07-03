import { useState } from "react";
import { C } from "../constants";
import { Card, Btn, PageHeader, Avatar } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { authService } from "../services/api";
import MfaSetup from "../components/MfaSetup";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showMfa, setShowMfa] = useState(false);
  const [loading, setLoading] = useState(false);

  const themeOptions = [
    { id: "minimalist", name: "Soft Minimalist", color: "#6366f1", icon: "🌈", desc: "Clean & Trustworthy" },
    { id: "bento", name: "Modern Bento", color: "#10b981", icon: "🍱", desc: "Organized & Efficient" },
    { id: "glass", name: "AI Glass", color: "#764ba2", icon: "✨", desc: "Futuristic & Premium" },
    { id: "command", name: "Command Center", color: "#22c55e", icon: "📟", desc: "High-Performance Dark" },
  ];

  const [pwd, setPwd] = useState({ current:"", new:"", confirm:"" });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwd.new !== pwd.confirm) return alert("Passwords do not match");
    setLoading(true);
    try {
      await authService.changePassword(pwd.current, pwd.new);
      alert("Password changed successfully!");
      setPwd({ current:"", new:"", confirm:"" });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter">
      <PageHeader title="⚙️ Settings & Customization" subtitle="Manage clinical security and application design" />

      <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:24 }}>
        {/* Sidebar Nav */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Card style={{ padding:"20px" }}>
            <div style={{ textAlign:"center" }}>
              <Avatar initials={user?.name?.slice(0,2).toUpperCase()} color={C.blue} size={64} />
              <div style={{ marginTop:12, fontWeight:800, fontSize:16, color:C.text }}>{user?.name}</div>
              <div style={{ fontSize:12, color:C.textLight, marginTop:2 }}>{user?.role?.toUpperCase()}</div>
            </div>
          </Card>

          <Card style={{ padding:0, overflow:"hidden" }}>
             {["Profile", "Security", "Preferences", "Notifications"].map(item => (
               <div key={item} style={{ padding:"12px 18px", fontSize:14, fontWeight:600, color:C.text, borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}>
                 {item}
               </div>
             ))}
          </Card>
        </div>

        {/* Content */}
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {/* Theme Gallery */}
          <Card>
            <h3 style={{ fontSize:16, fontWeight:800, marginBottom:20, color:C.text }}>Application Design</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:16 }}>
              {themeOptions.map(opt => (
                <div key={opt.id} onClick={() => toggleTheme(opt.id)}
                  style={{
                    padding: "16px", borderRadius: 16, border: `2px solid ${theme === opt.id ? opt.color : C.border}`,
                    background: theme === opt.id ? `${opt.color}15` : "var(--card)", cursor: "pointer", transition: "all 0.2s"
                  }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: opt.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{opt.icon}</div>
                    <div>
                      <div style={{ fontWeight: 800, color: C.text, fontSize: 14 }}>{opt.name}</div>
                      <div style={{ fontSize: 11, color: C.textLight }}>{opt.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Security */}
          <Card>
            <h3 style={{ fontSize:16, fontWeight:800, marginBottom:20, color:C.text }}>Security & Privacy</h3>

            <div style={{ padding:"16px", background:C.cardAlt, borderRadius:12, marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:700, color:C.text }}>Two-Factor Authentication (MFA)</div>
                  <div style={{ fontSize:12, color:C.textLight }}>Add an extra layer of security to your account</div>
                </div>
                <Btn onClick={() => setShowMfa(true)} variant={user?.mfa_enabled ? "secondary" : "primary"}>
                  {user?.mfa_enabled ? "Manage MFA" : "Enable MFA"}
                </Btn>
              </div>
            </div>

            <h4 style={{ fontSize:14, fontWeight:700, marginBottom:16, color:C.text }}>Change Password</h4>
            <form onSubmit={handlePasswordChange} style={{ display:"flex", flexDirection:"column", gap:12, maxWidth:400 }}>
              <input type="password" placeholder="Current Password" value={pwd.current} onChange={e => setPwd({...pwd, current:e.target.value})}
                style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${C.border}`, background:C.cardAlt, color:C.text }} />
              <input type="password" placeholder="New Password" value={pwd.new} onChange={e => setPwd({...pwd, new:e.target.value})}
                style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${C.border}`, background:C.cardAlt, color:C.text }} />
              <input type="password" placeholder="Confirm New Password" value={pwd.confirm} onChange={e => setPwd({...pwd, confirm:e.target.value})}
                style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${C.border}`, background:C.cardAlt, color:C.text }} />
              <Btn type="submit" loading={loading}>Update Password</Btn>
            </form>
          </Card>
        </div>
      </div>

      {showMfa && <MfaSetup user={user} onClose={() => setShowMfa(false)} />}
    </div>
  );
}
