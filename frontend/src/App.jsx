import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";
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
import SettingsPage from "./pages/SettingsPage";
import RosterPage from "./pages/RosterPage";
import PatientPortalPage from "./pages/PatientPortalPage";

// Role → which pages they can access
const ROLE_ACCESS = {
  admin:        ["dashboard","patients","appointments","doctor","diagnosis","analytics","resources","medicine","contact","admin","audit","portal","reports","ehr","collaboration","symptoms","settings","roster"],
  doctor:       ["dashboard","patients","appointments","doctor","diagnosis","analytics","medicine","contact","resources","reports","ehr","collaboration","symptoms","settings","roster"],
  radiologist:  ["dashboard","diagnosis","patients","analytics","contact","resources","reports","ehr","collaboration","symptoms","settings","roster"],
  lab_tech:     ["dashboard","diagnosis","patients","analytics","contact","reports","symptoms","settings","roster"],
  receptionist: ["dashboard","patients","appointments","analytics","doctor","contact","symptoms","settings","roster"],
  patient:      ["portal","settings"],
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

  // Patient portal layout
  if (user.role === "patient") return (
    <>
      <SessionTimeout />
      <div style={{minHeight:"100vh", background:"var(--bg)"}}>
        <TopNav isPatient={true} />
        <div style={{maxWidth:1100, margin:"0 auto", padding:"24px 28px"}}>
          <PatientPortalPage />
        </div>
      </div>
    </>
  );

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"var(--bg)"}}>
      <SessionTimeout />
      <Sidebar page={page} setPage={navigate} userRole={user.role} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden" }}>
        <TopNav />
        <main style={{flex:1,overflow:"auto",padding:"24px 28px",background:"var(--bg)"}}>
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
          {page==="settings"      && <SettingsPage/>}
          {page==="roster"        && <RosterPage/>}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </AuthProvider>
  );
}
