import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import SessionTimeout from "./components/SessionTimeout";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import DoctorPage from "./pages/DoctorPage";
import DiagnosisPage from "./pages/DiagnosisPage";
import ResourcePage from "./pages/ResourcePage";
import AdminPage from "./pages/AdminPage";
import MedicinePage from "./pages/MedicinePage";
import ContactPage from "./pages/ContactPage";
import AppointmentPage from "./pages/AppointmentPage";
import PatientPage from "./pages/PatientPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import ReportPage from "./pages/ReportPage";
import EHRPage from "./pages/EHRPage";
import CollaborationPage from "./pages/CollaborationPage";
import SymptomCheckerPage from "./pages/SymptomCheckerPage";
import PatientPortalPage from "./pages/PatientPortalPage";

// Role → which pages they can access
const ROLE_ACCESS = {
  admin:        ["dashboard","patients","appointments","doctor","diagnosis","analytics","resources","medicine","contact","admin","audit","portal","reports","ehr","collaboration","symptoms"],
  doctor:       ["dashboard","patients","appointments","doctor","diagnosis","analytics","medicine","contact","resources","reports","ehr","collaboration","symptoms"],
  radiologist:  ["dashboard","diagnosis","patients","analytics","contact","resources","reports","ehr","collaboration","symptoms"],
  lab_tech:     ["dashboard","diagnosis","patients","analytics","contact","reports","symptoms"],
  receptionist: ["dashboard","patients","appointments","analytics","doctor","contact","symptoms"],
  patient:      ["portal"],
};

function canAccess(role, page) {
  const allowed = ROLE_ACCESS[role] || [];
  return allowed.includes(page);
}

function AppInner() {
  const { user, token, loading, logout } = useAuth();
  const [page, setPage] = useState(() => {
    // Patients go directly to portal
    const saved = localStorage.getItem("mc_user");
    if (saved) {
      try { const u = JSON.parse(saved); if (u.role==="patient") return "portal"; } catch {}
    }
    return "dashboard";
  });

  const navigate = (p) => {
    if (!user) return;
    if (canAccess(user.role, p)) setPage(p);
  };

  const signOut = () => {
    import("./services/api").then(({ authService }) => { authService.logout(); });
    logout();
  };

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f0f4f0"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>⚕️</div>
        <div style={{fontSize:14,color:"#94a3b8",fontFamily:"Nunito,sans-serif"}}>Loading MediCore AI…</div>
      </div>
    </div>
  );

  if (!user) return <AuthPage />;

  // Patient portal — no sidebar, clean topnav
  if (user.role === "patient") return (
    <>
      <SessionTimeout />
      <div style={{minHeight:"100vh", background:"#f0f4f0"}}>
        <div style={{background:"#fff", padding:"0 28px", height:58, display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #e8eef0", position:"sticky", top:0, zIndex:100}}>
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            <span style={{fontSize:20}}>⚕️</span>
            <span style={{fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:"#1a1a2e"}}>MediCore AI</span>
            <span style={{fontSize:11, color:"#5B8DEF", fontWeight:700, background:"#EEF3FD", padding:"2px 10px", borderRadius:20}}>Patient Portal</span>
          </div>
          <div style={{display:"flex", gap:12, alignItems:"center"}}>
            <span style={{fontSize:13, color:"#94a3b8", fontWeight:600}} data-testid="patient-portal-name">{user.name}</span>
            <button data-testid="patient-portal-signout" onClick={signOut}
              style={{fontSize:12, color:"#F47B7B", background:"none", border:"1px solid #F47B7B44", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontWeight:700}}>
              Sign Out
            </button>
          </div>
        </div>
        <div style={{maxWidth:1100, margin:"0 auto", padding:"24px 28px"}}>
          <PatientPortalPage />
        </div>
      </div>
    </>
  );

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#F4F6FA"}}>
      <SessionTimeout />
      <Sidebar page={page} setPage={navigate} userRole={user.role} />
      <main style={{flex:1,overflow:"auto",padding:"24px 28px",background:"#F4F6FA"}}>
        {page==="dashboard"    && <Dashboard       setPage={navigate}/>}
        {page==="patients"     && <PatientPage     />}
        {page==="appointments" && <AppointmentPage />}
        {page==="doctor"       && <DoctorPage      />}
        {page==="diagnosis"    && <DiagnosisPage   token={token}/>}
        {page==="analytics"    && <AnalyticsPage   />}
        {page==="resources"    && <ResourcePage    />}
        {page==="medicine"     && <MedicinePage    />}
        {page==="contact"      && <ContactPage     />}
        {page==="admin"        && user.role==="admin" && <AdminPage/>}
        {page==="audit"        && user.role==="admin" && <AuditLogsPage/>}
        {page==="reports"      && <ReportPage/>}
        {page==="ehr"          && <EHRPage/>}
        {page==="collaboration" && <CollaborationPage/>}
        {page==="symptoms"      && <SymptomCheckerPage/>}
      </main>
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}
