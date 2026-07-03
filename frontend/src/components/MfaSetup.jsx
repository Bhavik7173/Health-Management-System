import { useState } from "react";
import { C } from "../constants";
import { Card, Btn, Input } from "./UI";
import { authService } from "../services/api";

export default function MfaSetup({ user, onClose }) {
  const [step,    setStep]    = useState("intro");  // intro | qr | confirm | done | disable
  const [qrData,  setQrData]  = useState(null);
  const [secret,  setSecret]  = useState("");
  const [code,    setCode]    = useState("");
  const [password,setPassword]= useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const startSetup = async () => {
    setLoading(true); setError("");
    try {
      const data = await authService.setupMfa();
      setQrData(data.qr_code);
      setSecret(data.secret);
      setStep("qr");
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const confirmSetup = async () => {
    if (code.length !== 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true); setError("");
    try {
      await authService.confirmMfa(code);
      setStep("done");
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const disableMfa = async () => {
    if (!password) { setError("Password required"); return; }
    setLoading(true); setError("");
    try {
      await authService.disableMfa(password);
      onClose();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const isMfaEnabled = user?.mfa_enabled;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,backdropFilter:"blur(4px)"}}>
      <Card style={{width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text}}>🔐 Two-Factor Authentication</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.textLight}}>✕</button>
        </div>

        {step==="intro" && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{padding:"16px",background:isMfaEnabled?C.accentLight:C.amberLight,borderRadius:14,display:"flex",gap:12,alignItems:"center"}}>
              <div style={{fontSize:28}}>{isMfaEnabled?"✅":"⚠️"}</div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:isMfaEnabled?C.accent:C.amber}}>
                  MFA is {isMfaEnabled?"enabled":"not enabled"}
                </div>
                <div style={{fontSize:12,color:C.textMed,marginTop:2}}>
                  {isMfaEnabled
                    ? "Your account is protected with two-factor authentication"
                    : "Add an extra layer of security to your account"}
                </div>
              </div>
            </div>

            {!isMfaEnabled ? (
              <>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[["1. Install","Google Authenticator, Authy, or any TOTP app"],
                    ["2. Scan","Scan the QR code with your app"],
                    ["3. Verify","Enter the 6-digit code to confirm"]].map(([n,d])=>(
                    <div key={n} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 14px",background:C.cardAlt,borderRadius:10}}>
                      <div style={{fontWeight:800,color:C.accent,minWidth:24}}>{n}</div>
                      <div style={{fontSize:13,color:C.textMed}}>{d}</div>
                    </div>
                  ))}
                </div>
                <Btn onClick={startSetup} disabled={loading} style={{borderRadius:12,padding:"12px"}}>
                  {loading?"Setting up…":"Set Up MFA →"}
                </Btn>
              </>
            ) : (
              <Btn variant="danger" onClick={()=>setStep("disable")} style={{borderRadius:12,padding:"12px"}}>
                Disable MFA
              </Btn>
            )}
            {error && <div style={{color:C.coral,fontSize:13}}>⚠️ {error}</div>}
          </div>
        )}

        {step==="qr" && (
          <div style={{display:"flex",flexDirection:"column",gap:16,alignItems:"center"}}>
            <div style={{fontSize:13,color:C.textMed,textAlign:"center",lineHeight:1.6}}>
              Scan this QR code with your authenticator app:
            </div>
            {qrData && <img src={qrData} alt="QR Code" style={{width:200,height:200,borderRadius:12,border:`2px solid ${C.border}`}} />}
            <div style={{background:C.cardAlt,borderRadius:10,padding:"10px 16px",width:"100%"}}>
              <div style={{fontSize:11,color:C.textLight,marginBottom:4}}>Manual entry key:</div>
              <div style={{fontSize:12,fontFamily:"monospace",fontWeight:700,color:C.text,wordBreak:"break-all"}}>{secret}</div>
            </div>
            <Btn onClick={()=>setStep("confirm")} style={{borderRadius:12,padding:"12px",width:"100%"}}>
              I've scanned it →
            </Btn>
          </div>
        )}

        {step==="confirm" && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{fontSize:13,color:C.textMed,textAlign:"center"}}>
              Enter the 6-digit code from your authenticator app to confirm setup:
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              {[0,1,2,3,4,5].map(i=>(
                <input key={i} id={`setup-mfa-${i}`}
                  value={code[i]||""} maxLength={1} inputMode="numeric"
                  onChange={e=>{
                    const v=e.target.value.replace(/\D/,"");
                    const arr=code.split(""); arr[i]=v;
                    setCode(arr.join("").slice(0,6));
                    if(v&&i<5) document.getElementById(`setup-mfa-${i+1}`)?.focus();
                  }}
                  onKeyDown={e=>{if(e.key==="Enter"&&code.length===6)confirmSetup();}}
                  style={{width:44,height:52,textAlign:"center",fontSize:20,fontWeight:700,border:`2px solid ${code[i]?C.accent:C.border}`,borderRadius:10,outline:"none"}}
                />
              ))}
            </div>
            {error && <div style={{color:C.coral,fontSize:13,textAlign:"center"}}>⚠️ {error}</div>}
            <Btn onClick={confirmSetup} disabled={loading||code.length<6} style={{borderRadius:12,padding:"12px"}}>
              {loading?"Verifying…":"Activate MFA ✅"}
            </Btn>
            <button onClick={()=>setStep("qr")} style={{background:"none",border:"none",fontSize:13,color:C.textLight,cursor:"pointer"}}>← Back to QR code</button>
          </div>
        )}

        {step==="done" && (
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:56,marginBottom:16}}>🎉</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:8}}>MFA Activated!</div>
            <div style={{fontSize:13,color:C.textLight,marginBottom:24,lineHeight:1.6}}>
              Your account is now protected. You'll need your authenticator app at each login.
            </div>
            <Btn onClick={onClose} style={{borderRadius:12,padding:"12px 32px"}}>Done</Btn>
          </div>
        )}

        {step==="disable" && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{padding:"14px",background:C.coralLight,borderRadius:12,fontSize:13,color:C.coral,fontWeight:600}}>
              ⚠️ Disabling MFA will make your account less secure
            </div>
            <Input label="CONFIRM PASSWORD" type="password" value={password} onChange={setPassword}
              placeholder="Enter your password" icon="🔒" />
            {error && <div style={{color:C.coral,fontSize:13}}>⚠️ {error}</div>}
            <div style={{display:"flex",gap:10}}>
              <Btn variant="danger" onClick={disableMfa} disabled={loading} style={{flex:1,borderRadius:12,padding:"12px"}}>
                {loading?"Disabling…":"Disable MFA"}
              </Btn>
              <Btn variant="outline" onClick={onClose} style={{flex:1,borderRadius:12,padding:"12px"}}>Cancel</Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
