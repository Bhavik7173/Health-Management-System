import { useState } from "react";
import { C } from "../constants";
import { Btn, Input } from "../components/UI";
import { authService } from "../services/api";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { value:"doctor",       label:"Doctor",         icon:"👨‍⚕️", desc:"Access patient records, scans, prescriptions" },
  { value:"radiologist",  label:"Radiologist",    icon:"🔬",  desc:"Upload & analyse medical imaging" },
  { value:"lab_tech",     label:"Lab Technician", icon:"🧪",  desc:"Manage lab results and reports" },
  { value:"receptionist", label:"Receptionist",   icon:"🗂️",  desc:"Manage appointments and patient registration" },
  { value:"patient",      label:"Patient",        icon:"🏥",  desc:"View your own records and appointments" },
];

const ROLE_COLORS = {
  doctor:"#5B8DEF", radiologist:"#F47B7B", lab_tech:"#F5A623",
  receptionist:"#8b5cf6", patient:"#94a3b8",
};

// ── Shared UI helpers ─────────────────────────────────────────────────────────
function PageWrapper({ children }) {
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#e8f5ee 0%,#f0f7ff 50%,#fef0f0 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      {children}
    </div>
  );
}
function Logo() {
  return (
    <div style={{textAlign:"center",marginBottom:28}}>
      <div style={{width:56,height:56,background:C.accentLight,borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 12px"}}>⚕️</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.text,fontWeight:700}}>MediCore AI</div>
    </div>
  );
}
function ErrorBox({ error }) {
  if (!error) return null;
  return <div style={{background:C.coralLight,border:`1px solid ${C.coral}33`,borderRadius:10,padding:"10px 14px",fontSize:13,color:C.coral}}>⚠️ {error}</div>;
}
function SuccessBox({ msg }) {
  if (!msg) return null;
  return <div style={{background:C.accentLight,border:`1px solid ${C.accent}33`,borderRadius:10,padding:"10px 14px",fontSize:13,color:C.accent,fontWeight:600}}>✅ {msg}</div>;
}

// ── OTP input boxes ────────────────────────────────────────────────────────────
function OtpBoxes({ value, onChange }) {
  return (
    <div style={{display:"flex",gap:10,justifyContent:"center"}}>
      {[0,1,2,3,4,5].map(i=>(
        <input key={i} id={`otp-${i}`}
          value={value[i]||""} maxLength={1} inputMode="numeric"
          onChange={e=>{
            const v=e.target.value.replace(/\D/,"");
            const arr=value.split(""); arr[i]=v;
            onChange(arr.join("").slice(0,6));
            if(v&&i<5) document.getElementById(`otp-${i+1}`)?.focus();
          }}
          onKeyDown={e=>{
            if(e.key==="Backspace"&&!value[i]&&i>0) document.getElementById(`otp-${i-1}`)?.focus();
          }}
          style={{width:50,height:58,textAlign:"center",fontSize:22,fontWeight:700,
            border:`2px solid ${value[i]?C.accent:C.border}`,borderRadius:12,
            outline:"none",background:value[i]?C.accentLight:"#fff",
            transition:"all 0.15s"}}
        />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AuthPage() {
  const { login, adminExists, markAdminRegistered } = useAuth();

  // mode: admin_setup | login | register | forgot | verify_otp | reset_password | mfa
  const [mode,       setMode]       = useState(adminExists ? "login" : "admin_setup");
  const [form,       setForm]       = useState({ name:"", email:"", password:"", confirmPassword:"", role:"doctor", phone:"", dob:"" });
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [loading,    setLoading]    = useState(false);

  // Forgot password state
  const [fpEmail,    setFpEmail]    = useState("");
  const [fpOtp,      setFpOtp]      = useState("");
  const [fpSigned,   setFpSigned]   = useState("");
  const [fpDevOtp,   setFpDevOtp]   = useState("");  // shown in dev mode
  const [fpToken,    setFpToken]    = useState("");
  const [fpNewPw,    setFpNewPw]    = useState("");
  const [fpConfirm,  setFpConfirm]  = useState("");
  const [fpResendCd, setFpResendCd] = useState(0);  // resend countdown

  // MFA state
  const [mfaCode,    setMfaCode]    = useState("");
  const [tempToken,  setTempToken]  = useState("");
  const [mfaUser,    setMfaUser]    = useState("");

  const set = k => v => setForm(f=>({...f,[k]:v}));
  const clearErrors = () => { setError(""); setSuccess(""); };

  // ── Resend countdown timer ──
  const startResendTimer = () => {
    setFpResendCd(60);
    const interval = setInterval(() => {
      setFpResendCd(s => { if(s<=1){clearInterval(interval);return 0;} return s-1; });
    }, 1000);
  };

  // ── Admin Setup ───────────────────────────────────────────────────────────
  const handleAdminSetup = async () => {
    clearErrors();
    if(!form.name||!form.email||!form.password){ setError("All fields are required."); return; }
    if(form.password.length<6){ setError("Password must be at least 6 characters."); return; }
    if(form.password!==form.confirmPassword){ setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const data = await authService.register(form.name,form.email,form.password,"admin");
      markAdminRegistered();
      login(data.user, data.access_token);
    } catch {
      markAdminRegistered();
      login({id:"admin_local",name:form.name,email:form.email,role:"admin",created_at:new Date().toISOString()},"local_admin_token");
    }
    setLoading(false);
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    clearErrors(); setLoading(true);
    try {
      const data = await authService.login(form.email, form.password);
      if(data.mfa_required){ setTempToken(data.temp_token); setMfaUser(data.user_name); setMode("mfa"); }
      else login(data.user, data.access_token);
    } catch(e){ setError(e.message||"Invalid credentials."); }
    setLoading(false);
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    clearErrors();
    if(!form.name||!form.email||!form.password){ setError("All fields are required."); return; }
    if(form.password.length<6){ setError("Min 6 characters."); return; }
    setLoading(true);
    try {
      const data = await authService.register(form.name,form.email,form.password,form.role,form.phone,form.dob);
      login(data.user, data.access_token);
    } catch(e){ setError(e.message||"Registration failed."); }
    setLoading(false);
  };

  // ── MFA verify ────────────────────────────────────────────────────────────
  const handleMfa = async () => {
    clearErrors(); setLoading(true);
    try {
      const data = await authService.verifyMfa(tempToken, mfaCode);
      login(data.user, data.access_token);
    } catch(e){ setError(e.message||"Invalid code."); }
    setLoading(false);
  };

  // ── Step 1: Request reset code ────────────────────────────────────────────
  const handleForgotSubmit = async () => {
    clearErrors();
    if(!fpEmail.trim()){ setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      const data = await authService.forgotPassword(fpEmail.trim().toLowerCase());
      setFpSigned(data.signed||"");
      setFpDevOtp(data.dev_otp||"");  // shown in dev — remove in production
      setSuccess("Reset code sent! Check your email.");
      startResendTimer();
      setMode("verify_otp");
    } catch(e){ setError(e.message||"Failed to send reset code."); }
    setLoading(false);
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    clearErrors();
    if(fpOtp.length!==6){ setError("Enter the complete 6-digit code."); return; }
    setLoading(true);
    try {
      const data = await authService.verifyResetOtp(fpEmail, fpOtp, fpSigned);
      setFpToken(data.reset_token);
      setSuccess("Code verified! Set your new password.");
      setMode("reset_password");
    } catch(e){ setError(e.message||"Invalid or expired code."); }
    setLoading(false);
  };

  // ── Step 3: Set new password ──────────────────────────────────────────────
  const handleResetPassword = async () => {
    clearErrors();
    if(!fpNewPw||fpNewPw.length<6){ setError("Password must be at least 6 characters."); return; }
    if(fpNewPw!==fpConfirm){ setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await authService.resetPassword(fpToken, fpNewPw, fpConfirm);
      setSuccess("Password reset successfully! You can now log in.");
      setTimeout(()=>{ setMode("login"); setFpEmail(""); setFpOtp(""); setFpToken(""); setFpNewPw(""); setFpConfirm(""); setFpDevOtp(""); clearErrors(); }, 2000);
    } catch(e){ setError(e.message||"Reset failed. Please start over."); }
    setLoading(false);
  };

  // ── Resend code ───────────────────────────────────────────────────────────
  const handleResend = async () => {
    if(fpResendCd>0) return;
    clearErrors();
    setLoading(true);
    try {
      const data = await authService.forgotPassword(fpEmail);
      setFpSigned(data.signed||"");
      setFpDevOtp(data.dev_otp||"");
      setFpOtp("");
      setSuccess("New code sent!");
      startResendTimer();
    } catch(e){ setError("Failed to resend."); }
    setLoading(false);
  };

  const handleKey = e => {
    if(e.key!=="Enter") return;
    if(mode==="admin_setup") handleAdminSetup();
    else if(mode==="login")          handleLogin();
    else if(mode==="register")       handleRegister();
    else if(mode==="forgot")         handleForgotSubmit();
    else if(mode==="verify_otp")     handleVerifyOtp();
    else if(mode==="reset_password") handleResetPassword();
    else if(mode==="mfa")            handleMfa();
  };

  // ══ Admin Setup ════════════════════════════════════════════════════════════
  if(mode==="admin_setup") return (
    <PageWrapper>
      <div style={{width:"100%",maxWidth:480}}>
        <Logo/>
        <div style={{background:"#fff",borderRadius:24,padding:"36px 40px",boxShadow:"0 24px 80px rgba(0,0,0,0.10)"}}>
          <div style={{background:"linear-gradient(135deg,#4CAF82,#2d8f5f)",borderRadius:14,padding:"16px 20px",marginBottom:24,display:"flex",gap:12,alignItems:"center"}}>
            <div style={{fontSize:28}}>🛡️</div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>Create Administrator Account</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginTop:2}}>One-time setup · Cannot be repeated</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Input label="FULL NAME"        value={form.name}            onChange={set("name")}            placeholder="Admin full name"    icon="👤"/>
            <Input label="EMAIL"            type="email" value={form.email} onChange={set("email")}        placeholder="admin@hospital.com" icon="✉️"/>
            <Input label="PASSWORD"         type="password" value={form.password} onChange={set("password")} placeholder="Min 6 characters" icon="🔒"/>
            <Input label="CONFIRM PASSWORD" type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="Repeat password" icon="🔒" onKeyDown={handleKey}/>
            <ErrorBox error={error}/>
            <Btn onClick={handleAdminSetup} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:14,fontSize:14}}>
              {loading?"Setting up…":"Create Admin Account →"}
            </Btn>
          </div>
        </div>
      </div>
    </PageWrapper>
  );

  // ══ MFA ════════════════════════════════════════════════════════════════════
  if(mode==="mfa") return (
    <PageWrapper>
      <div style={{width:"100%",maxWidth:420}}>
        <Logo/>
        <div style={{background:"#fff",borderRadius:24,padding:"36px 40px",boxShadow:"0 24px 80px rgba(0,0,0,0.10)"}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:48,marginBottom:12}}>🔐</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.text,fontWeight:700}}>Two-Factor Auth</div>
            <div style={{fontSize:13,color:C.textLight,marginTop:6}}>Welcome back, <strong>{mfaUser}</strong></div>
            <div style={{fontSize:13,color:C.textLight,marginTop:4}}>Enter the 6-digit code from your authenticator app</div>
          </div>
          <OtpBoxes value={mfaCode} onChange={setMfaCode}/>
          <div style={{marginTop:20,display:"flex",flexDirection:"column",gap:12}}>
            <ErrorBox error={error}/>
            <Btn onClick={handleMfa} disabled={loading||mfaCode.length<6} style={{width:"100%",padding:"13px",borderRadius:14,fontSize:14}}>
              {loading?"Verifying…":"Verify Code →"}
            </Btn>
            <button onClick={()=>{setMode("login");setMfaCode("");clearErrors();}} style={{background:"none",border:"none",fontSize:13,color:C.textLight,cursor:"pointer"}}>
              ← Back to login
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );

  // ══ FORGOT PASSWORD — Step 1: Enter email ══════════════════════════════════
  if(mode==="forgot") return (
    <PageWrapper>
      <div style={{width:"100%",maxWidth:440}}>
        <Logo/>
        <div style={{background:"#fff",borderRadius:24,padding:"36px 40px",boxShadow:"0 24px 80px rgba(0,0,0,0.10)"}}>
          {/* Progress steps */}
          <StepIndicator current={1}/>

          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:48,marginBottom:12}}>🔑</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.text,fontWeight:700}}>Forgot Password?</div>
            <div style={{fontSize:13,color:C.textLight,marginTop:6,lineHeight:1.6}}>
              Enter your registered email address and we'll send you a 6-digit reset code.
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Input label="EMAIL ADDRESS" type="email" value={fpEmail} onChange={setFpEmail}
              placeholder="your@hospital.com" icon="✉️" onKeyDown={handleKey}/>
            <ErrorBox error={error}/>
            <SuccessBox msg={success}/>
            <Btn onClick={handleForgotSubmit} disabled={loading||!fpEmail.trim()}
              style={{width:"100%",padding:"13px",borderRadius:14,fontSize:14}}>
              {loading?"Sending…":"Send Reset Code →"}
            </Btn>
            <button onClick={()=>{setMode("login");clearErrors();}} style={{background:"none",border:"none",fontSize:13,color:C.textLight,cursor:"pointer",textAlign:"center"}}>
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );

  // ══ FORGOT PASSWORD — Step 2: Enter OTP ════════════════════════════════════
  if(mode==="verify_otp") return (
    <PageWrapper>
      <div style={{width:"100%",maxWidth:440}}>
        <Logo/>
        <div style={{background:"#fff",borderRadius:24,padding:"36px 40px",boxShadow:"0 24px 80px rgba(0,0,0,0.10)"}}>
          <StepIndicator current={2}/>

          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:48,marginBottom:12}}>📧</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.text,fontWeight:700}}>Check Your Email</div>
            <div style={{fontSize:13,color:C.textLight,marginTop:6,lineHeight:1.6}}>
              We sent a 6-digit code to <strong>{fpEmail}</strong>
            </div>
          </div>

          {/* Dev mode OTP display — remove in production */}
          {fpDevOtp && (
            <div style={{background:"#fff3cd",border:"1px solid #f5a62344",borderRadius:12,padding:"12px 16px",marginBottom:16,textAlign:"center"}}>
              <div style={{fontSize:11,color:"#92600a",fontWeight:700,marginBottom:4}}>🧪 DEV MODE — OTP (remove in production)</div>
              <div style={{fontFamily:"monospace",fontSize:28,fontWeight:800,color:"#92600a",letterSpacing:8}}>{fpDevOtp}</div>
            </div>
          )}

          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em",textAlign:"center",marginBottom:14}}>ENTER 6-DIGIT CODE</div>
            <OtpBoxes value={fpOtp} onChange={setFpOtp}/>
          </div>

          {/* Expiry note */}
          <div style={{textAlign:"center",fontSize:12,color:C.textLight,marginBottom:16}}>
            Code expires in <strong>15 minutes</strong>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <ErrorBox error={error}/>
            <SuccessBox msg={success}/>
            <Btn onClick={handleVerifyOtp} disabled={loading||fpOtp.length<6}
              style={{width:"100%",padding:"13px",borderRadius:14,fontSize:14}}>
              {loading?"Verifying…":"Verify Code →"}
            </Btn>

            {/* Resend */}
            <div style={{textAlign:"center"}}>
              <button onClick={handleResend} disabled={fpResendCd>0||loading}
                style={{background:"none",border:"none",fontSize:13,cursor:fpResendCd>0?"default":"pointer",
                  color:fpResendCd>0?C.textLight:C.accent,fontWeight:600}}>
                {fpResendCd>0?`Resend code in ${fpResendCd}s`:"Didn't get it? Resend code"}
              </button>
            </div>

            <button onClick={()=>{setMode("forgot");setFpOtp("");clearErrors();}}
              style={{background:"none",border:"none",fontSize:13,color:C.textLight,cursor:"pointer",textAlign:"center"}}>
              ← Change email address
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );

  // ══ FORGOT PASSWORD — Step 3: New password ═════════════════════════════════
  if(mode==="reset_password") return (
    <PageWrapper>
      <div style={{width:"100%",maxWidth:440}}>
        <Logo/>
        <div style={{background:"#fff",borderRadius:24,padding:"36px 40px",boxShadow:"0 24px 80px rgba(0,0,0,0.10)"}}>
          <StepIndicator current={3}/>

          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:48,marginBottom:12}}>🔒</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.text,fontWeight:700}}>Set New Password</div>
            <div style={{fontSize:13,color:C.textLight,marginTop:6}}>Choose a strong password for your account</div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <Input label="NEW PASSWORD" type="password" value={fpNewPw} onChange={setFpNewPw}
                placeholder="Min 6 characters" icon="🔒"/>
              {/* Password strength indicator */}
              {fpNewPw&&<PasswordStrength password={fpNewPw}/>}
            </div>
            <Input label="CONFIRM PASSWORD" type="password" value={fpConfirm} onChange={setFpConfirm}
              placeholder="Repeat new password" icon="🔒" onKeyDown={handleKey}/>

            {/* Match indicator */}
            {fpConfirm&&(
              <div style={{fontSize:12,color:fpNewPw===fpConfirm?C.accent:C.coral,fontWeight:600}}>
                {fpNewPw===fpConfirm?"✅ Passwords match":"❌ Passwords do not match"}
              </div>
            )}

            <ErrorBox error={error}/>
            <SuccessBox msg={success}/>
            <Btn onClick={handleResetPassword} disabled={loading||!fpNewPw||fpNewPw!==fpConfirm}
              style={{width:"100%",padding:"13px",borderRadius:14,fontSize:14}}>
              {loading?"Resetting…":"Reset Password →"}
            </Btn>
          </div>
        </div>
      </div>
    </PageWrapper>
  );

  // ══ Normal Login / Register ════════════════════════════════════════════════
  return (
    <PageWrapper>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",width:"100%",maxWidth:960,borderRadius:28,overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.12)"}}>

        {/* Left panel */}
        <div style={{background:"linear-gradient(160deg,#4CAF82 0%,#2d8f5f 100%)",padding:"52px 44px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:40}}>
            <div style={{width:40,height:40,background:"rgba(255,255,255,0.25)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⚕️</div>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:"#fff",fontWeight:700}}>MediCore AI</span>
          </div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:32,color:"#fff",lineHeight:1.25,marginBottom:16}}>
            Intelligent<br/>Healthcare<br/>Platform
          </h2>
          <p style={{fontSize:14,color:"rgba(255,255,255,0.82)",lineHeight:1.7,marginBottom:36}}>
            AI-powered diagnosis & hospital management for modern healthcare teams.
          </p>
          {[["🧠","AI Scan Analysis","X-Ray, MRI, CT · 97%+ accuracy"],
            ["🛡️","Role-Based Access","6 roles · Secure · Audited"],
            ["🔐","MFA + Password Reset","Two-factor & account recovery"],
          ].map(([icon,title,desc])=>(
            <div key={title} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:14}}>
              <div style={{width:36,height:36,background:"rgba(255,255,255,0.2)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{icon}</div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{title}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginTop:2}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Right panel */}
        <div style={{background:"#fff",padding:"48px 44px",display:"flex",flexDirection:"column",justifyContent:"center",overflowY:"auto",maxHeight:"100vh"}}>
          <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:C.text,marginBottom:6}}>
            {mode==="login"?"Welcome back":"Create account"}
          </h3>
          <p style={{fontSize:13,color:C.textLight,marginBottom:22}}>
            {mode==="login"?"Sign in to your account":"Register as a staff member or patient"}
          </p>

          {/* Mode tabs */}
          <div style={{display:"flex",gap:4,background:C.cardAlt,borderRadius:12,padding:4,marginBottom:22}}>
            {["login","register"].map(m=>(
              <button key={m} onClick={()=>{setMode(m);clearErrors();}}
                style={{flex:1,padding:"9px",borderRadius:9,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
                  background:mode===m?"#fff":"transparent",color:mode===m?C.accent:C.textLight,
                  boxShadow:mode===m?C.shadow:"none",transition:"all 0.2s"}}>
                {m==="login"?"Sign In":"Register"}
              </button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            {mode==="register"&&<Input label="FULL NAME" value={form.name} onChange={set("name")} placeholder="Full name" icon="👤"/>}
            <Input label="EMAIL" type="email" value={form.email} onChange={set("email")} placeholder="you@hospital.com" icon="✉️"/>
            <Input label="PASSWORD" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" icon="🔒" onKeyDown={mode==="login"?handleKey:undefined}/>

            {mode==="register"&&(
              <>
                <div>
                  <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em",display:"block",marginBottom:8}}>SELECT YOUR ROLE</label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {ROLES.map(r=>(
                      <button key={r.value} onClick={()=>set("role")(r.value)}
                        style={{padding:"10px 12px",borderRadius:12,textAlign:"left",cursor:"pointer",
                          border:`2px solid ${form.role===r.value?ROLE_COLORS[r.value]:C.border}`,
                          background:form.role===r.value?ROLE_COLORS[r.value]+"15":"#fff",transition:"all 0.18s"}}>
                        <div style={{fontSize:16,marginBottom:3}}>{r.icon}</div>
                        <div style={{fontSize:12,fontWeight:700,color:form.role===r.value?ROLE_COLORS[r.value]:C.text}}>{r.label}</div>
                        <div style={{fontSize:10,color:C.textLight,marginTop:2,lineHeight:1.3}}>{r.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {form.role==="patient"&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <Input label="PHONE"        value={form.phone} onChange={set("phone")} placeholder="+1 234 567 8900" icon="📞"/>
                    <Input label="DATE OF BIRTH" value={form.dob}  onChange={set("dob")}   placeholder="YYYY-MM-DD"      icon="🎂"/>
                  </div>
                )}
                <div style={{fontSize:11,color:C.textLight,padding:"8px 12px",background:C.cardAlt,borderRadius:10}}>
                  🛡️ Admin accounts are created only by your system administrator.
                </div>
              </>
            )}

            <ErrorBox error={error}/>

            <Btn onClick={mode==="login"?handleLogin:handleRegister} disabled={loading}
              style={{width:"100%",padding:"13px",borderRadius:14,fontSize:14}}>
              {loading?"Please wait…":mode==="login"?"Sign In →":"Create Account →"}
            </Btn>

            {/* Forgot password link */}
            {mode==="login"&&(
              <button onClick={()=>{setMode("forgot");setFpEmail(form.email);clearErrors();}}
                style={{background:"none",border:"none",fontSize:13,color:C.accent,cursor:"pointer",fontWeight:600,textAlign:"center",marginTop:-4}}>
                Forgot password?
              </button>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  const steps = ["Email","Verify","New Password"];
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:28,gap:0}}>
      {steps.map((label,i)=>{
        const n=i+1, done=n<current, active=n===current;
        return (
          <div key={label} style={{display:"flex",alignItems:"center"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,
                background:done?C.accent:active?C.blue:"#f0f0f0",
                color:done||active?"#fff":C.textLight,transition:"all 0.3s"}}>
                {done?"✓":n}
              </div>
              <span style={{fontSize:10,fontWeight:600,color:active?C.blue:done?C.accent:C.textLight,whiteSpace:"nowrap"}}>{label}</span>
            </div>
            {i<steps.length-1&&(
              <div style={{width:60,height:2,background:done?C.accent:C.border,margin:"0 6px",marginBottom:18,transition:"background 0.3s"}}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Password strength meter ───────────────────────────────────────────────────
function PasswordStrength({ password }) {
  const checks = [
    { label:"6+ characters",    pass: password.length >= 6 },
    { label:"Uppercase letter", pass: /[A-Z]/.test(password) },
    { label:"Number",           pass: /[0-9]/.test(password) },
    { label:"Special character",pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score  = checks.filter(c=>c.pass).length;
  const colors = ["#ef4444","#f97316","#f5a623","#4CAF82"];
  const labels = ["Weak","Fair","Good","Strong"];
  return (
    <div>
      <div style={{display:"flex",gap:4,marginBottom:8}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{flex:1,height:5,borderRadius:3,background:i<score?colors[score-1]:C.border,transition:"background 0.3s"}}/>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {checks.map(c=>(
            <span key={c.label} style={{fontSize:10,color:c.pass?C.accent:C.textLight,display:"flex",gap:3,alignItems:"center"}}>
              {c.pass?"✅":"◻️"} {c.label}
            </span>
          ))}
        </div>
        <span style={{fontSize:11,fontWeight:700,color:colors[score-1]||C.textLight,flexShrink:0}}>{score>0?labels[score-1]:""}</span>
      </div>
    </div>
  );
}
