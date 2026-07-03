import { useState, useEffect } from "react";
import { C } from "../constants";
import { Btn } from "./UI";
import { useAuth } from "../context/AuthContext";

export default function SessionTimeout() {
  const { sessionWarn, extendSession, logout } = useAuth();
  const [seconds, setSeconds] = useState(120);

  useEffect(() => {
    if (!sessionWarn) { setSeconds(120); return; }
    setSeconds(120);
    const interval = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(interval); logout(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionWarn]);

  if (!sessionWarn) return null;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:9999, backdropFilter:"blur(4px)"
    }}>
      <div style={{background:"#fff",borderRadius:24,padding:"40px 44px",maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 32px 80px rgba(0,0,0,0.2)"}}>
        <div style={{fontSize:52,marginBottom:16}}>⏱️</div>
        <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.text,marginBottom:8}}>
          Session Expiring
        </h3>
        <p style={{fontSize:14,color:C.textLight,marginBottom:24,lineHeight:1.6}}>
          Your session will expire in
        </p>

        {/* Countdown */}
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:48,fontWeight:700,color:seconds<30?C.coral:C.amber,marginBottom:8}}>
          {String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
        </div>
        <div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden",marginBottom:28}}>
          <div style={{height:"100%",width:`${(seconds/120)*100}%`,background:seconds<30?C.coral:C.amber,borderRadius:3,transition:"width 1s linear"}} />
        </div>

        <div style={{display:"flex",gap:12}}>
          <Btn onClick={extendSession} style={{flex:1,borderRadius:12,padding:"12px"}}>
            ✅ Stay Signed In
          </Btn>
          <Btn variant="danger" onClick={logout} style={{flex:1,borderRadius:12,padding:"12px"}}>
            Sign Out
          </Btn>
        </div>
        <p style={{fontSize:11,color:C.textLight,marginTop:16}}>
          You'll be signed out automatically to protect patient data
        </p>
      </div>
    </div>
  );
}
