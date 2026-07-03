import { useState } from "react";
import { C, roleColor } from "../constants";
import { Avatar } from "./UI";
import { useAuth } from "../context/AuthContext";
import MfaSetup from "./MfaSetup";

const ROLE_NAV = {
  admin:        [
    {id:"dashboard",icon:"⊞",  label:"Dashboard"},
    {id:"patients",  icon:"👥", label:"Patients",  badge:0},
    {id:"appointments",icon:"📅",label:"Schedule"},
    {id:"doctor",    icon:"👨‍⚕️",label:"Doctors"},
    {id:"diagnosis", icon:"🔬", label:"Diagnosis"},
    {id:"analytics", icon:"📊", label:"Analytics"},
    {id:"resources", icon:"🏥", label:"Resources"},
    {id:"medicine",  icon:"💊", label:"Medicine"},
    {id:"contact",   icon:"💬", label:"Chat"},
    {id:"admin",     icon:"🛡️", label:"Admin"},
    {id:"audit",     icon:"📋", label:"Audit"},
    {id:"reports",   icon:"📄", label:"Reports"},
    {id:"ehr",       icon:"📋", label:"EHR"},
    {id:"collaboration",icon:"👥", label:"Collab"},
  ],
  doctor:       [
    {id:"dashboard",   icon:"⊞",  label:"Dashboard"},
    {id:"patients",    icon:"👥", label:"Patients"},
    {id:"appointments",icon:"📅", label:"Schedule"},
    {id:"doctor",      icon:"👨‍⚕️",label:"Doctors"},
    {id:"diagnosis",   icon:"🔬", label:"Diagnosis"},
    {id:"medicine",    icon:"💊", label:"Medicine"},
    {id:"contact",     icon:"💬", label:"Chat"},
    {id:"resources",   icon:"🏥", label:"Resources"},
    {id:"reports",     icon:"📄", label:"Reports"},
    {id:"ehr",         icon:"📋", label:"EHR"},
    {id:"collaboration",icon:"👥", label:"Collab"},
  ],
  radiologist:  [
    {id:"dashboard", icon:"⊞",  label:"Dashboard"},
    {id:"diagnosis", icon:"🔬", label:"Diagnosis"},
    {id:"patients",  icon:"👥", label:"Patients"},
    {id:"contact",   icon:"💬", label:"Chat"},
    {id:"resources", icon:"🏥", label:"Resources"},
    {id:"reports",    icon:"📄", label:"Reports"},
    {id:"ehr",        icon:"📋", label:"EHR"},
    {id:"collaboration",icon:"👥", label:"Collab"},
  ],
  lab_tech:     [
    {id:"dashboard", icon:"⊞",  label:"Dashboard"},
    {id:"diagnosis", icon:"🔬", label:"Lab"},
    {id:"patients",  icon:"👥", label:"Patients"},
    {id:"contact",   icon:"💬", label:"Chat"},
  ],
  receptionist: [
    {id:"dashboard",   icon:"⊞",  label:"Dashboard"},
    {id:"patients",    icon:"👥", label:"Patients"},
    {id:"appointments",icon:"📅", label:"Schedule"},
    {id:"doctor",      icon:"👨‍⚕️",label:"Doctors"},
    {id:"contact",     icon:"💬", label:"Chat"},
  ],
};

const ROLE_LABELS = {
  admin:"Administrator", doctor:"Doctor", radiologist:"Radiologist",
  lab_tech:"Lab Tech", receptionist:"Receptionist", patient:"Patient",
};

export default function Sidebar({ page, setPage, userRole }) {
  const { user, logout } = useAuth();
  const [showMfa, setShowMfa] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = ROLE_NAV[userRole] || ROLE_NAV.doctor;
  const initials = user?.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "U";
  const roleColor_ = roleColor[userRole] || C.blue;

  return (
    <>
      <aside style={{width:80,background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 0",boxShadow:"2px 0 16px rgba(0,0,0,0.05)",flexShrink:0,zIndex:10,position:"sticky",top:0,height:"100vh"}}>
        <div style={{width:44,height:44,background:C.accentLight,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:24,cursor:"pointer"}}
          onClick={()=>setPage("dashboard")} title="MediCore AI">⚕️</div>

        <nav style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flex:1,width:"100%",overflowY:"auto"}}>
          {navItems.map(item=><NavBtn key={item.id} item={item} active={page===item.id} onClick={()=>setPage(item.id)}/>)}
        </nav>

        {/* User menu */}
        <div style={{paddingTop:14,borderTop:`1px solid ${C.border}`,width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
          <div style={{position:"relative"}}>
            <div onClick={()=>setShowUserMenu(!showUserMenu)} title={`${user?.name} · ${ROLE_LABELS[userRole]||userRole}`} style={{cursor:"pointer"}}>
              <Avatar initials={initials} color={roleColor_} size={38}/>
            </div>
            {/* MFA indicator dot */}
            {user?.mfa_enabled && (
              <div style={{position:"absolute",bottom:-1,right:-1,width:12,height:12,borderRadius:"50%",background:"#4CAF82",border:"2px solid #fff"}} title="MFA enabled"/>
            )}

            {showUserMenu && (
              <div style={{position:"absolute",bottom:50,left:"50%",transform:"translateX(-50%)",background:"#fff",borderRadius:16,boxShadow:"0 8px 32px rgba(0,0,0,0.15)",padding:"8px",minWidth:180,zIndex:100,border:`1px solid ${C.border}`}}>
                <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,marginBottom:4}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{user?.name}</div>
                  <div style={{fontSize:11,color:C.textLight,marginTop:2}}>{ROLE_LABELS[userRole]||userRole}</div>
                </div>
                <MenuItem icon="🔐" label={user?.mfa_enabled?"MFA: ON ✅":"Enable MFA"} onClick={()=>{setShowUserMenu(false);setShowMfa(true);}} color={user?.mfa_enabled?C.accent:C.textMed}/>
                <MenuItem icon="🔑" label="Change Password" onClick={()=>{setShowUserMenu(false);}} color={C.textMed}/>
                <div style={{borderTop:`1px solid ${C.border}`,marginTop:4,paddingTop:4}}>
                  <MenuItem icon="🚪" label="Sign Out" onClick={()=>{setShowUserMenu(false);logout();}} color={C.coral}/>
                </div>
              </div>
            )}
          </div>
          <div style={{fontSize:8,color:C.textLight,fontWeight:700,letterSpacing:"0.03em",textAlign:"center",lineHeight:1.2}}>
            {(ROLE_LABELS[userRole]||userRole).toUpperCase()}
          </div>
        </div>
      </aside>

      {showMfa && <MfaSetup user={user} onClose={()=>setShowMfa(false)}/>}
    </>
  );
}

function MenuItem({ icon, label, onClick, color }) {
  return (
    <button onClick={onClick} style={{display:"flex",gap:8,alignItems:"center",width:"100%",padding:"9px 14px",background:"none",border:"none",cursor:"pointer",borderRadius:10,fontSize:13,fontWeight:600,color,textAlign:"left"}}
      onMouseEnter={e=>e.currentTarget.style.background=C.cardAlt}
      onMouseLeave={e=>e.currentTarget.style.background="none"}>
      <span>{icon}</span>{label}
    </button>
  );
}

function NavBtn({item,active,onClick}){
  return(
    <button onClick={onClick} title={item.label}
      style={{width:68,height:52,borderRadius:14,border:"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,cursor:"pointer",background:active?C.accentLight:"transparent",color:active?C.accent:C.textLight,transition:"all 0.18s",position:"relative"}}>
      {active&&<div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:22,background:C.accent,borderRadius:"0 3px 3px 0"}}/>}
      {item.badge>0&&!active&&(
        <div style={{position:"absolute",top:5,right:6,width:16,height:16,borderRadius:"50%",background:C.coral,color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid #fff"}}>
          {item.badge}
        </div>
      )}
      <span style={{fontSize:18}}>{item.icon}</span>
      <span style={{fontSize:8,fontWeight:700,letterSpacing:"0.02em"}}>{item.label}</span>
    </button>
  );
}
