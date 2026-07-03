import { C } from "../constants";
import { Card, Btn } from "../components/UI";

const pages = {
  medicine: { icon: "💊", title: "Medicine",        desc: "Drug database, prescriptions & pharmacy management." },
  contact:  { icon: "💬", title: "Contact & Chat",  desc: "Secure messaging between doctors and patients."      },
};

export default function ComingSoon({ page, setPage }) {
  const info = pages[page] || { icon: "🚧", title: page, desc: "Coming soon." };
  return (
    <div className="page-enter" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <Card style={{ textAlign: "center", padding: "56px 48px", maxWidth: 420 }}>
        <div style={{ fontSize: 60, marginBottom: 18 }}>{info.icon}</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: C.text, marginBottom: 10 }}>{info.title}</div>
        <div style={{ fontSize: 14, color: C.textLight, lineHeight: 1.6, marginBottom: 24 }}>{info.desc}<br/>Connect your backend to enable this module.</div>
        <Btn onClick={() => setPage("dashboard")} variant="ghost" style={{ borderRadius: 12 }}>← Back to Dashboard</Btn>
      </Card>
    </div>
  );
}
