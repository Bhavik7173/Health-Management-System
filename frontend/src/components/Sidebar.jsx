import { useState } from "react";
import { C, roleColor } from "../constants";
import { useAuth } from "../context/AuthContext";
import MfaSetup from "./MfaSetup";

// ── Design tokens matching the HavenMed wide sidebar ─────────────────────────
const S = {
  bg:       "#FFFFFF",
  active:   "#EDE9FB",
  activeText:"#7C6FD4",
  text:     "#374151",
  textLight:"#9CA3AF",
  border:   "#F3F4F6",
  accent:   "#7C6FD4",
  dot:      "#4CAF82",
};

const ROLE_NAV = {
  admin: [
    { group:"Main Menu", items:[
      { id:"dashboard",    icon:"▣",  label:"Dashboard"   },
      { id:"appointments", icon:"📅", label:"Appointments" },
      { id:"patients",     icon:"👥", label:"Patients"    },
    ]},
    { group:"Other Menu", items:[
      { id:"doctor",       icon:"👨‍⚕️", label:"Doctors",    expandable:true },
      { id:"diagnosis",    icon:"🔬", label:"Department",  expandable:true },
      { id:"ehr",          icon:"📄", label:"Doctor Schedule" },
      { id:"analytics",   icon:"📊", label:"Analytics" },
      { id:"reports",      icon:"📄", label:"Payments"    },
      { id:"resources",    icon:"📅", label:"Calendar"    },
      { id:"medicine",     icon:"💊", label:"Inventory"   },
      { id:"symptoms",     icon:"🧠", label:"AI Check"    },
      { id:"collaboration",icon:"👥", label:"Collab"      },
      { id:"contact",      icon:"💬", label:"Chat"        },
      { id:"admin",        icon:"🛡️", label:"Admin"       },
      { id:"audit",        icon:"📋", label:"Audit"       },
    ]},
    { group:"Help", items:[
      { id:"resources",    icon:"❓", label:"Help Center"  },
      { id:"reports",      icon:"🚩", label:"Report"      },
    ]},
  ],
  doctor: [
    { group:"Main Menu", items:[
      { id:"dashboard",    icon:"▣",  label:"Dashboard"   },
      { id:"appointments", icon:"📅", label:"Appointments" },
      { id:"patients",     icon:"👥", label:"Patients"    },
    ]},
    { group:"Clinical", items:[
      { id:"doctor",       icon:"👨‍⚕️", label:"Doctors"     },
      { id:"diagnosis",    icon:"🔬", label:"Diagnosis"   },
      { id:"ehr",          icon:"📄", label:"EHR"         },
      { id:"medicine",     icon:"💊", label:"Medicine"    },
      { id:"analytics",    icon:"📊", label:"Analytics"   },
      { id:"reports",      icon:"📄", label:"Reports"     },
      { id:"contact",      icon:"💬", label:"Chat"        },
      { id:"symptoms",     icon:"🧠", label:"AI Check"    },
    ]},
  ],
  radiologist: [
    { group:"Main Menu", items:[
      { id:"dashboard",    icon:"▣",  label:"Dashboard"   },
      { id:"diagnosis",    icon:"🔬", label:"Diagnosis"   },
      { id:"patients",     icon:"👥", label:"Patients"    },
    ]},
    { group:"Tools", items:[
      { id:"analytics",    icon:"📊", label:"Analytics"   },
      { id:"reports",      icon:"📄", label:"Reports"     },
      { id:"ehr",          icon:"📋", label:"EHR"         },
      { id:"contact",      icon:"💬", label:"Chat"        },
      { id:"symptoms",     icon:"🧠", label:"AI Check"    },
    ]},
  ],
  lab_tech: [
    { group:"Main Menu", items:[
      { id:"dashboard",    icon:"▣",  label:"Dashboard"   },
      { id:"diagnosis",    icon:"🧪", label:"Lab"         },
      { id:"patients",     icon:"👥", label:"Patients"    },
    ]},
    { group:"Tools", items:[
      { id:"analytics",    icon:"📊", label:"Analytics"   },
      { id:"contact",      icon:"💬", label:"Chat"        },
      { id:"symptoms",     icon:"🧠", label:"AI Check"    },
    ]},
  ],
  receptionist: [
    { group:"Main Menu", items:[
      { id:"dashboard",    icon:"▣",  label:"Dashboard"   },
      { id:"appointments", icon:"📅", label:"Appointments" },
      { id:"patients",     icon:"👥", label:"Patients"    },
    ]},
    { group:"Tools", items:[
      { id:"analytics",    icon:"📊", label:"Analytics"   },
      { id:"doctor",       icon:"👨‍⚕️", label:"Doctors"     },
      { id:"contact",      icon:"💬", label:"Chat"        },
      { id:"symptoms",     icon:"🧠", label:"AI Check"    },
    ]},
  ],
};

const ROLE_LABELS = {
  admin:"Super admin", doctor:"Doctor", radiologist:"Radiologist",
  lab_tech:"Lab Tech", receptionist:"Receptionist", patient:"Patient",
};

export default function Sidebar({ page, setPage, userRole }) {
  const { user, logout } = useAuth();
  const [showMfa, setShowMfa] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const groups  = ROLE_NAV[userRole] || ROLE_NAV.doctor;
  const initials = user?.name?.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() || "U";
  const rc = roleColor[userRole] || S.accent;

  return (
    <>
      <aside style={{
        width: 220, background: S.bg, display:"flex", flexDirection:"column",
        borderRight:`1px solid ${S.border}`, flexShrink:0, position:"sticky",
        top:0, height:"100vh", overflowY:"auto",
      }}>
        {/* Logo */}
        <div style={{ padding:"22px 20px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${S.border}` }}>
          <div style={{ width:36, height:36, borderRadius:10, background:S.active, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⚕️</div>
          <div>
            <span style={{ fontWeight:800, fontSize:16, color:S.text }}>Medi</span>
            <span style={{ fontWeight:800, fontSize:16, color:S.accent }}>Core</span>
          </div>
        </div>

        {/* Nav groups */}
        <nav style={{ flex:1, padding:"12px 10px", overflowY:"auto" }}>
          {groups.map(group => (
            <div key={group.group} style={{ marginBottom:8 }}>
              <div style={{ fontSize:10, fontWeight:700, color:S.textLight, letterSpacing:"0.06em", padding:"6px 10px 4px", textTransform:"uppercase" }}>
                {group.group}
              </div>
              {group.items.map(item => {
                const active = page === item.id;
                return (
                  <button key={item.id+item.label} onClick={() => setPage(item.id)}
                    style={{
                      width:"100%", display:"flex", alignItems:"center", gap:10,
                      padding:"9px 12px", borderRadius:12, border:"none", cursor:"pointer",
                      background: active ? S.active : "transparent",
                      color: active ? S.activeText : S.text,
                      fontSize:13, fontWeight: active ? 700 : 500,
                      textAlign:"left", marginBottom:2, transition:"background 0.15s",
                    }}
                    onMouseEnter={e => { if(!active) e.currentTarget.style.background=S.border; }}
                    onMouseLeave={e => { if(!active) e.currentTarget.style.background="transparent"; }}>
                    <span style={{ fontSize:15, width:20, textAlign:"center" }}>{item.icon}</span>
                    <span style={{ flex:1 }}>{item.label}</span>
                    {item.expandable && <span style={{ fontSize:11, color:S.textLight }}>▾</span>}
                    {active && <div style={{ width:3, height:16, borderRadius:2, background:S.accent, marginLeft:2 }}/>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Dark mode toggle */}
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${S.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:14 }}>🌙</span>
            <span style={{ fontSize:12, fontWeight:600, color:S.text }}>Dark Mode</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} style={{
            width:40, height:22, borderRadius:11, border:"none", cursor:"pointer",
            background: darkMode ? S.accent : S.border, position:"relative", transition:"background 0.2s", padding:0,
          }}>
            <div style={{
              width:16, height:16, borderRadius:"50%", background:"#fff",
              position:"absolute", top:3, left: darkMode ? 21 : 3, transition:"left 0.2s",
              boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
            }}/>
          </button>
        </div>

        {/* User profile strip */}
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${S.border}`, position:"relative" }}>
          <div onClick={() => setShowUserMenu(!showUserMenu)} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", borderRadius:12, padding:"8px", transition:"background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background=S.border}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
            <div style={{ width:36, height:36, borderRadius:10, background:rc+"22", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13, color:rc, flexShrink:0, position:"relative" }}>
              {initials}
              {user?.mfa_enabled && <div style={{ position:"absolute", bottom:-1, right:-1, width:9, height:9, borderRadius:"50%", background:S.dot, border:"1.5px solid #fff" }}/>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, color:S.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user?.name}</div>
              <div style={{ fontSize:10, color:S.textLight }}>{ROLE_LABELS[userRole] || userRole}</div>
            </div>
            <span style={{ fontSize:12, color:S.textLight }}>▾</span>
          </div>

          {showUserMenu && (
            <div style={{ position:"absolute", bottom:80, left:10, right:10, background:"#fff", borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.12)", border:`1px solid ${S.border}`, zIndex:200, overflow:"hidden" }}>
              <div style={{ padding:"12px 14px", borderBottom:`1px solid ${S.border}` }}>
                <div style={{ fontSize:13, fontWeight:700, color:S.text }}>{user?.name}</div>
                <div style={{ fontSize:11, color:S.textLight }}>{ROLE_LABELS[userRole]}</div>
              </div>
              {[
                { icon:"🔐", label: user?.mfa_enabled ? "MFA: ON ✅" : "Enable MFA", action:() => { setShowUserMenu(false); setShowMfa(true); }, color: user?.mfa_enabled ? "#4CAF82" : S.text },
                { icon:"🔑", label:"Change Password", action:() => setShowUserMenu(false), color:S.text },
                { icon:"🚪", label:"Sign Out",         action:() => { setShowUserMenu(false); logout(); }, color:"#F47B7B" },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ display:"flex", gap:8, alignItems:"center", width:"100%", padding:"10px 14px", background:"none", border:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:item.color, textAlign:"left" }}
                  onMouseEnter={e => e.currentTarget.style.background=S.border}
                  onMouseLeave={e => e.currentTarget.style.background="none"}>
                  <span>{item.icon}</span>{item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {showMfa && <MfaSetup user={user} onClose={() => setShowMfa(false)}/>}
    </>
  );
}
