import { useState, useRef } from "react";
import { C } from "../constants";
import { Btn } from "./UI";

// ── Local AI engine ────────────────────────────────────────────────────────────
const SYMPTOM_DB = [
  {
    keywords:["fever","temperature","hot","chills","sweating","body ache"],
    condition:"Fever / Viral Infection", urgency:"moderate",
    precautions:["Rest and avoid physical exertion","Stay in a cool, well-ventilated room","Drink plenty of fluids — water, ORS, juice","Monitor temperature every 4 hours","Isolate to prevent spreading infection"],
    medications:[
      {name:"Paracetamol (Acetaminophen)",dose:"500mg–1g every 4–6 hours",note:"Do not exceed 4g/day. Safe for most adults."},
      {name:"Ibuprofen",dose:"400mg every 6–8 hours with food",note:"Avoid if you have stomach ulcers or kidney problems."},
    ],
    home_remedies:["Lukewarm sponge bath","Ginger + honey in warm water","Tulsi tea","Cold compress on forehead","Coconut water for hydration"],
    when_to_see:"Fever above 39.5°C, lasting more than 3 days, or with rash/stiff neck/confusion",
    red_flags:["Fever > 39.5°C","Seizures","Difficulty breathing","Stiff neck with high fever","Confusion or unusual behaviour"],
  },
  {
    keywords:["cough","throat","sore throat","phlegm","mucus","cold","runny nose","congestion"],
    condition:"Upper Respiratory Infection", urgency:"mild",
    precautions:["Gargle with warm salt water 3–4 times daily","Avoid cold drinks and ice cream","Steam inhalation twice a day","Rest your voice","Wear a mask to prevent spreading"],
    medications:[
      {name:"Dextromethorphan syrup",dose:"10–20ml every 4–6 hours",note:"For dry, irritating cough"},
      {name:"Guaifenesin (expectorant)",dose:"200–400mg every 4 hours",note:"For productive cough with mucus"},
      {name:"Throat lozenges",dose:"1 lozenge every 2–3 hours",note:"Soothing for sore throat"},
    ],
    home_remedies:["Honey + ginger + lemon in warm water","Turmeric milk at bedtime","Steam inhalation with eucalyptus","Salt water gargle"],
    when_to_see:"Cough lasting more than 2 weeks, blood in sputum, or high fever with cough",
    red_flags:["Blood in sputum","Difficulty breathing","High fever + cough","Cough > 2 weeks"],
  },
  {
    keywords:["headache","migraine","head pain","head hurts","dizzy","dizziness"],
    condition:"Headache / Migraine", urgency:"mild",
    precautions:["Rest in a dark, quiet room","Apply cold compress to forehead","Stay well hydrated","Avoid bright screens","Limit caffeine","Practice slow deep breathing"],
    medications:[
      {name:"Paracetamol",dose:"500mg–1g every 4–6 hours",note:"First-line for most headaches"},
      {name:"Ibuprofen",dose:"400mg every 6–8 hours with food",note:"Good for tension headaches"},
      {name:"Sumatriptan",dose:"50–100mg at onset",note:"For confirmed migraines only — prescription required"},
    ],
    home_remedies:["Peppermint oil on temples","Ginger tea","Cold compress on neck","Lavender aromatherapy","Gentle scalp massage"],
    when_to_see:"Sudden severe 'thunderclap' headache, with fever/stiff neck, or after head injury",
    red_flags:["Sudden 'worst headache of your life'","Headache + fever + stiff neck","After head injury","With vision changes"],
  },
  {
    keywords:["stomach","nausea","vomit","vomiting","diarrhea","diarrhoea","abdomen","gut","bloating","indigestion","acidity","heartburn"],
    condition:"Gastrointestinal Issue", urgency:"mild",
    precautions:["Follow BRAT diet: Banana, Rice, Applesauce, Toast","Avoid spicy and oily foods","Stay hydrated with ORS","Eat small, frequent meals","Wash hands thoroughly"],
    medications:[
      {name:"ORS (Oral Rehydration Salt)",dose:"1 sachet in 1L water after each loose stool",note:"Most important — prevents dangerous dehydration"},
      {name:"Domperidone",dose:"10mg 3× daily before meals",note:"For nausea and vomiting"},
      {name:"Loperamide",dose:"2mg initially then 1mg after each loose stool",note:"For diarrhoea — not for children under 12"},
      {name:"Omeprazole",dose:"20mg once daily before breakfast",note:"For acidity / heartburn"},
    ],
    home_remedies:["Ginger tea for nausea","Coconut water for electrolytes","Probiotic yogurt","Peppermint tea for bloating","Rice water (kanji)"],
    when_to_see:"Severe abdominal pain, blood in stool, signs of dehydration, or symptoms over 48 hours",
    red_flags:["Blood in stool or vomit","Severe cramping","Signs of dehydration","Symptoms > 48 hours"],
  },
  {
    keywords:["chest","breathing","breathe","shortness of breath","wheeze","wheezing","asthma","tight chest"],
    condition:"Chest / Breathing Difficulty", urgency:"high",
    precautions:["Sit upright — do NOT lie flat","Avoid all triggers (dust, smoke, cold air)","Use prescribed reliever inhaler if available","Loosen tight clothing","Stay calm, breathe slowly through pursed lips"],
    medications:[
      {name:"Salbutamol inhaler (reliever)",dose:"2 puffs every 4–6 hours",note:"Use at first sign of symptoms"},
      {name:"Montelukast",dose:"10mg once daily at night",note:"Preventive — requires prescription"},
    ],
    home_remedies:["Steam inhalation for mild cases","Pursed lip breathing","Warm ginger tea","Sleep with head elevated"],
    when_to_see:"SEEK IMMEDIATE CARE — severe breathing difficulty, bluish lips, or cannot speak full sentences",
    red_flags:["Severe breathlessness at rest","Bluish lips or fingertips","Cannot complete a sentence","Chest tightness with jaw/arm pain"],
  },
  {
    keywords:["back pain","backache","lower back","spine","lumbar","back hurts"],
    condition:"Back Pain / Musculoskeletal", urgency:"mild",
    precautions:["Rest 1–2 days but avoid prolonged bed rest","Ice first 48 hours then heat pad","Maintain good posture","Avoid heavy lifting","Sleep on firm mattress","Gentle stretching when pain allows"],
    medications:[
      {name:"Ibuprofen",dose:"400mg every 6–8 hours with food",note:"Anti-inflammatory — best choice"},
      {name:"Paracetamol",dose:"500mg–1g every 4–6 hours",note:"For pain relief"},
      {name:"Diclofenac gel",dose:"Apply to area 3–4× daily",note:"Topical — local relief"},
    ],
    home_remedies:["Alternating hot/cold compress","Turmeric milk at night","Gentle yoga stretches","Epsom salt bath","Warm oil massage"],
    when_to_see:"Pain radiating to leg, numbness/tingling, bladder/bowel changes, or after injury",
    red_flags:["Pain shooting down leg (sciatica)","Numbness or weakness in legs","Bladder or bowel problems","After a fall"],
  },
  {
    keywords:["skin","rash","itch","itching","hives","allergy","allergic","swelling","urticaria"],
    condition:"Skin Rash / Allergic Reaction", urgency:"moderate",
    precautions:["Do not scratch — worsens rash and risks infection","Identify and avoid the trigger","Wear loose, soft cotton clothing","Keep skin moisturised","Avoid hot showers — use lukewarm water"],
    medications:[
      {name:"Cetirizine (Zyrtec)",dose:"10mg once daily",note:"Antihistamine — may cause drowsiness"},
      {name:"Loratadine (Claritin)",dose:"10mg once daily",note:"Non-drowsy antihistamine"},
      {name:"1% Hydrocortisone cream",dose:"Apply thinly 2× daily up to 7 days",note:"Not for face — mild steroid"},
      {name:"Calamine lotion",dose:"Apply as needed",note:"Soothing — safe for all ages"},
    ],
    home_remedies:["Cold compress on rash","Pure aloe vera gel","Oatmeal bath","Coconut oil moisturiser","Avoid fragranced soaps"],
    when_to_see:"Throat swelling, difficulty breathing, rapidly spreading rash, or rash with high fever",
    red_flags:["Throat swelling / difficulty swallowing","Difficulty breathing (anaphylaxis)","Rapidly spreading rash","Rash + high fever","Blistering skin"],
  },
  {
    keywords:["anxiety","stress","panic","worry","mental","depressed","depression","sad","low mood","sleep","insomnia","can't sleep"],
    condition:"Mental Health / Stress / Anxiety", urgency:"moderate",
    precautions:["Deep breathing: inhale 4s, hold 4s, exhale 6s","Maintain consistent sleep schedule","Reduce caffeine, alcohol, screen time before bed","Exercise 30 minutes daily","Reach out to a trusted person","Limit social media and news"],
    medications:[
      {name:"Ashwagandha supplement",dose:"300–600mg daily",note:"Natural adaptogen — not a prescription drug"},
      {name:"Melatonin",dose:"0.5–5mg at bedtime",note:"For sleep disturbance — start lowest dose"},
      {name:"⚠️ Note",dose:"",note:"SSRIs and psychiatric medications MUST be prescribed by a doctor only"},
    ],
    home_remedies:["10-min mindfulness meditation daily","Gratitude journaling","Progressive muscle relaxation","Lavender essential oil","Yoga and pranayama breathing"],
    when_to_see:"Hopelessness lasting > 2 weeks, thoughts of self-harm, or severe panic attacks",
    red_flags:["Thoughts of self-harm or suicide","Unable to perform daily tasks","Severe repeated panic attacks","Feeling disconnected from reality"],
  },
  {
    keywords:["diabetes","blood sugar","glucose","sugar level"],
    condition:"Diabetes Management", urgency:"moderate",
    precautions:["Monitor blood glucose regularly","Follow low-sugar, low-carb diet","Never skip meals","Exercise 30 minutes daily","Stay hydrated","Carry glucose tablets for hypoglycaemia"],
    medications:[
      {name:"Metformin",dose:"500–1000mg with meals",note:"Prescribed — do not self-start"},
      {name:"Glucose tablets",dose:"15–20g if blood sugar < 4 mmol/L",note:"For hypoglycaemia"},
      {name:"⚠️ Note",dose:"",note:"All diabetes medications require doctor supervision"},
    ],
    home_remedies:["Bitter melon juice (karela)","Fenugreek seeds soaked overnight","Cinnamon in warm water","Apple cider vinegar diluted","Regular brisk walking"],
    when_to_see:"Blood sugar above 15 mmol/L, hypoglycaemia symptoms, or new symptoms",
    red_flags:["Blood sugar > 15 mmol/L","Severe hypoglycaemia (shaking, confusion)","Fruity breath (ketoacidosis)","Chest pain"],
  },
  {
    keywords:["blood pressure","hypertension","bp","high bp","pressure"],
    condition:"High Blood Pressure", urgency:"moderate",
    precautions:["Reduce salt to < 5g/day","Avoid alcohol and smoking","Exercise regularly — walking, swimming","Manage stress with meditation","Monitor BP daily at same time","Maintain healthy weight"],
    medications:[
      {name:"Amlodipine",dose:"5–10mg once daily",note:"Prescribed — do not self-start"},
      {name:"Lisinopril",dose:"5–40mg once daily",note:"Prescribed"},
      {name:"⚠️ Note",dose:"",note:"BP medications should only be started by a doctor"},
    ],
    home_remedies:["DASH diet (fruits, vegetables, low-fat dairy)","Garlic supplement","Hibiscus tea","Reduce caffeine","Deep breathing exercises"],
    when_to_see:"BP above 180/120 mmHg, chest pain, or sudden severe headache",
    red_flags:["BP > 180/120 mmHg","Chest pain + high BP","Sudden severe headache","Vision changes","Shortness of breath"],
  },
];

const EMERGENCY_KEYWORDS = [
  "chest pain","can't breathe","cannot breathe","unconscious","fainted","collapsed",
  "stroke","heart attack","suicidal","overdose","seizure","fitting","throat closing",
  "tongue swelling","can't speak","choking",
];

const URGENCY_CONFIG = {
  mild:      { emoji:"🟢", label:"Non-urgent",          color:"#4CAF82", bg:"#e8f5ee", advice:"Your symptoms appear mild. Monitor at home and follow the precautions below." },
  moderate:  { emoji:"🟡", label:"See a doctor soon",   color:"#F5A623", bg:"#fffbeb", advice:"Consult a doctor within 24–48 hours if symptoms don't improve." },
  high:      { emoji:"🔴", label:"Seek care today",     color:"#F47B7B", bg:"#FEF0F0", advice:"See a doctor today or visit an urgent care centre." },
  emergency: { emoji:"🚨", label:"Go to Emergency NOW", color:"#ef4444", bg:"#fee2e2", advice:"Potential emergency — call 999/911 or go to A&E immediately." },
};

function analyseSymptoms(symptoms, severity, age, existingConditions, allergies) {
  const text = symptoms.toLowerCase();

  // Emergency check
  if (EMERGENCY_KEYWORDS.some(k => text.includes(k))) {
    return {
      condition:"Potential Medical Emergency", urgency:"emergency",
      precautions:["Call emergency services (999/911) immediately","Do not leave the person alone","Keep them calm and still","Do not give food or water","Be ready to describe symptoms to paramedics"],
      medications:[], home_remedies:[],
      when_to_see:"GO TO EMERGENCY NOW",
      red_flags:["This requires immediate emergency medical attention"],
    };
  }

  // Find best match by keyword score
  let best = null, bestScore = 0;
  for (const entry of SYMPTOM_DB) {
    const score = entry.keywords.filter(k => text.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = entry; }
  }

  if (!best) {
    best = {
      condition:"General Health Concern", urgency:"moderate",
      precautions:["Rest and stay well hydrated","Monitor symptoms 24–48 hours","Keep a symptom diary","Avoid self-medicating without guidance"],
      medications:[{name:"Paracetamol",dose:"500mg as needed",note:"For pain or fever only"}],
      home_remedies:["Stay hydrated","Adequate rest","Light nutritious diet"],
      when_to_see:"If symptoms worsen, persist beyond 48 hours, or you are concerned",
      red_flags:["Rapidly worsening symptoms","High fever","Difficulty breathing","Severe pain"],
    };
  }

  // Escalate urgency based on severity / age
  let urgency = best.urgency;
  if (severity === "severe" && urgency === "mild")     urgency = "moderate";
  if (severity === "severe" && urgency === "moderate") urgency = "high";
  if ((age < 5 || age > 70) && urgency === "mild")    urgency = "moderate";

  // Flag allergy conflicts in medications
  const meds = best.medications.map(m => {
    const hasAllergy = allergies.some(a => a && m.name.toLowerCase().includes(a.toLowerCase()));
    return hasAllergy
      ? { ...m, warning:`⚠️ ALLERGY ALERT — you listed "${allergies.join(", ")}" as allergies. Consult your doctor before taking this.` }
      : m;
  });

  return { ...best, urgency, medications: meds };
}

const loadHistory = () => { try { return JSON.parse(sessionStorage.getItem("sc_history")||"[]"); } catch { return []; } };
const saveHistory = (h)  => { try { sessionStorage.setItem("sc_history", JSON.stringify(h.slice(0,10))); } catch {} };

const QUICK_SYMPTOMS = [
  "I have a fever and body aches",
  "Sore throat and cough for 2 days",
  "Severe headache since this morning",
  "Stomach pain and nausea",
  "Difficulty breathing",
  "Skin rash and itching",
  "Lower back pain",
  "Feeling anxious and can't sleep",
  "Blood sugar is high",
  "Cold, runny nose and congestion",
];

// ══════════════════════════════════════════════════════════════════════════════
export default function SymptomChecker({ userProfile }) {
  const [step,       setStep]     = useState("form");
  const [symptoms,   setSymptoms] = useState("");
  const [severity,   setSeverity] = useState("mild");
  const [duration,   setDuration] = useState("");
  const [age,        setAge]      = useState(userProfile?.age || 30);
  const [gender,     setGender]   = useState(userProfile?.gender || "");
  const [conditions, setConditions]=useState((userProfile?.conditions||[]).join(", "));
  const [allergies,  setAllergies]= useState((userProfile?.allergies||[]).join(", "));
  const [result,     setResult]   = useState(null);
  const [history,    setHistory]  = useState(loadHistory);
  const [activeTab,  setActiveTab]= useState("precautions");
  const [charCount,  setCharCount]= useState(0);
  const textRef = useRef(null);

  const handleSubmit = async () => {
    if (!symptoms.trim()) return;
    setStep("loading");

    await new Promise(r => setTimeout(r, 1400));

    const allergyList   = allergies.split(",").map(s=>s.trim()).filter(Boolean);
    const conditionList = conditions.split(",").map(s=>s.trim()).filter(Boolean);

    let aiResult = null;

    // Try backend
    try {
      const token = localStorage.getItem("mc_token") || "";
      const API   = window.__API_BASE__ || "http://localhost:8080";
      const res   = await fetch(`${API}/portal/symptom-check`, {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ symptoms, severity, duration, age:parseInt(age)||30, gender, existing_conditions:conditionList, allergies:allergyList }),
      });
      if (res.ok) aiResult = await res.json();
    } catch { /* offline */ }

    // Local fallback
    if (!aiResult) aiResult = analyseSymptoms(symptoms, severity, parseInt(age)||30, conditionList, allergyList);

    const entry = {
      id:        Date.now(),
      symptoms:  symptoms.slice(0,80)+(symptoms.length>80?"…":""),
      severity,  condition: aiResult.condition,
      urgency:   aiResult.urgency,
      date:      new Date().toLocaleString(),
      result:    aiResult,
    };
    const newHistory = [entry, ...history].slice(0,10);
    setHistory(newHistory);
    saveHistory(newHistory);
    setResult(aiResult);
    setStep("result");
  };

  const reset = () => { setSymptoms(""); setSeverity("mild"); setDuration(""); setResult(null); setStep("form"); setCharCount(0); };
  const urgCfg = result ? (URGENCY_CONFIG[result.urgency] || URGENCY_CONFIG.moderate) : null;

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (step === "loading") return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"56px 20px",textAlign:"center"}}>
      <div style={{width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#5B8DEF,#4CAF82)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,marginBottom:22,animation:"spin 2s linear infinite"}}>🧠</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.text,marginBottom:6}}>Analysing your symptoms…</div>
      <div style={{fontSize:13,color:C.textLight,marginBottom:28}}>AI is reviewing your case</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",maxWidth:300}}>
        {["Matching symptom patterns…","Checking drug interactions…","Generating personalised advice…"].map((msg,i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"center",background:C.cardAlt,borderRadius:10,padding:"10px 14px",textAlign:"left"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:C.accent,animation:`pulse ${0.8+i*0.3}s ease-in-out infinite`}}/>
            <span style={{fontSize:12,color:C.textMed}}>{msg}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (step === "result" && result) return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* Urgency banner */}
      <div style={{background:urgCfg.bg,border:`2px solid ${urgCfg.color}44`,borderRadius:18,padding:"20px 24px",display:"flex",gap:16,alignItems:"flex-start"}}>
        <div style={{fontSize:40,flexShrink:0}}>{urgCfg.emoji}</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:urgCfg.color,marginBottom:4}}>{result.condition}</div>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:urgCfg.color+"22",borderRadius:20,padding:"4px 14px",marginBottom:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:urgCfg.color}}/>
            <span style={{fontSize:12,fontWeight:700,color:urgCfg.color}}>{urgCfg.label}</span>
          </div>
          <div style={{fontSize:13,color:C.textMed,lineHeight:1.6}}>{urgCfg.advice}</div>
        </div>
        <button onClick={reset} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:"6px 14px",fontSize:12,color:C.textLight,cursor:"pointer",fontWeight:600,flexShrink:0}}>
          🔄 New Check
        </button>
      </div>

      {/* Tab bar */}
      <div style={{display:"flex",gap:4,background:C.cardAlt,borderRadius:12,padding:4}}>
        {[["precautions","🛡️ Precautions"],["medications","💊 Medicines"],["home_remedies","🌿 Home Remedies"],["red_flags","🚨 Warning Signs"]].map(([t,l])=>(
          <button key={t} onClick={()=>setActiveTab(t)}
            style={{flex:1,padding:"9px 4px",borderRadius:9,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,
              background:activeTab===t?"#fff":"transparent",color:activeTab===t?C.accent:C.textLight,
              boxShadow:activeTab===t?C.shadow:"none",transition:"all 0.15s"}}>
            {l}
          </button>
        ))}
      </div>

      {/* Precautions */}
      {activeTab==="precautions" && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {result.precautions.map((p,i)=>(
            <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",boxShadow:C.shadow}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.accent,flexShrink:0}}>{i+1}</div>
              <span style={{fontSize:14,color:C.text,lineHeight:1.6}}>{p}</span>
            </div>
          ))}
          <div style={{background:"#fffbeb",border:"1px solid #f5a62344",borderRadius:12,padding:"14px 16px",marginTop:4}}>
            <div style={{fontSize:11,fontWeight:700,color:C.amber,letterSpacing:"0.05em",marginBottom:6}}>👨‍⚕️ WHEN TO SEE A DOCTOR</div>
            <div style={{fontSize:13,color:"#92600a",lineHeight:1.6}}>{result.when_to_see}</div>
          </div>
        </div>
      )}

      {/* Medications */}
      {activeTab==="medications" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.blueLight,border:`1px solid ${C.blue}33`,borderRadius:12,padding:"12px 16px",fontSize:13,color:C.blue,lineHeight:1.6}}>
            💡 General suggestions only. Always consult your doctor or pharmacist before starting any medication.
          </div>
          {result.medications.length === 0
            ? <div style={{textAlign:"center",padding:32,color:C.textLight,fontSize:13}}>No OTC medications suggested. Please see a doctor for treatment.</div>
            : result.medications.map((m,i)=>(
              <div key={i} style={{background:"#fff",border:`1.5px solid ${m.warning?C.coral:C.border}`,borderRadius:14,padding:"16px 18px",boxShadow:C.shadow}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{fontSize:15,fontWeight:800,color:m.warning?C.coral:C.text}}>{m.name}</div>
                  {m.warning && <span style={{fontSize:10,background:C.coralLight,color:C.coral,borderRadius:20,padding:"2px 8px",fontWeight:700,marginLeft:8,flexShrink:0}}>⚠️ ALLERGY</span>}
                </div>
                {m.dose && (
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:11,color:C.textLight,fontWeight:700,background:C.cardAlt,padding:"3px 8px",borderRadius:8}}>DOSE</span>
                    <span style={{fontSize:13,color:C.text,fontWeight:600}}>{m.dose}</span>
                  </div>
                )}
                <div style={{fontSize:12,color:m.warning?C.coral:C.textMed,background:m.warning?C.coralLight:C.cardAlt,borderRadius:8,padding:"8px 10px",lineHeight:1.5}}>
                  {m.warning || m.note}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Home Remedies */}
      {activeTab==="home_remedies" && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d033",borderRadius:12,padding:"12px 16px",fontSize:13,color:"#166534"}}>
            🌿 Natural remedies to complement medical treatment — not a replacement for professional care.
          </div>
          {(result.home_remedies||[]).length === 0
            ? <div style={{textAlign:"center",padding:32,color:C.textLight,fontSize:13}}>No specific home remedies for this condition.</div>
            : (result.home_remedies||[]).map((r,i)=>(
              <div key={i} style={{display:"flex",gap:12,alignItems:"center",background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",boxShadow:C.shadow}}>
                <span style={{fontSize:22,flexShrink:0}}>🌿</span>
                <span style={{fontSize:14,color:C.text,lineHeight:1.5}}>{r}</span>
              </div>
            ))
          }
        </div>
      )}

      {/* Red Flags */}
      {activeTab==="red_flags" && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:C.coralLight,border:`1px solid ${C.coral}44`,borderRadius:12,padding:"12px 16px",fontSize:13,color:C.coral,fontWeight:600}}>
            🚨 Seek emergency care immediately if you experience ANY of these:
          </div>
          {result.red_flags.map((f,i)=>(
            <div key={i} style={{display:"flex",gap:12,alignItems:"center",background:"#fff",border:`1.5px solid ${C.coral}44`,borderRadius:12,padding:"12px 16px",boxShadow:C.shadow}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:C.coralLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🚨</div>
              <span style={{fontSize:14,color:C.text,fontWeight:600,lineHeight:1.5}}>{f}</span>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div style={{background:"#f8f9fa",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",fontSize:12,color:C.textLight,lineHeight:1.7}}>
        ⚕️ <strong>Medical Disclaimer:</strong> This AI assessment is for informational purposes only — not a substitute for professional medical advice. Always consult a qualified healthcare provider. In an emergency call <strong>999 (UK) · 911 (US) · 112 (EU)</strong>.
      </div>

      <div style={{display:"flex",gap:10}}>
        <Btn onClick={reset} variant="outline" style={{flex:1,borderRadius:12,padding:"12px"}}>🔄 Check New Symptoms</Btn>
        {history.length>0 && <Btn onClick={()=>setStep("history")} variant="ghost" style={{borderRadius:12,padding:"12px 16px"}}>📋 History</Btn>}
      </div>
    </div>
  );

  // ── HISTORY ───────────────────────────────────────────────────────────────
  if (step === "history") return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text}}>📋 Past Checks</div>
        <button onClick={()=>setStep("form")} style={{background:"none",border:"none",fontSize:13,color:C.accent,cursor:"pointer",fontWeight:700}}>+ New Check</button>
      </div>
      {history.length === 0
        ? <div style={{textAlign:"center",padding:48,color:C.textLight}}><div style={{fontSize:40,marginBottom:12}}>📋</div>No past checks yet</div>
        : history.map(h=>(
          <div key={h.id} onClick={()=>{ setResult(h.result); setActiveTab("precautions"); setStep("result"); }}
            style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 18px",cursor:"pointer",boxShadow:C.shadow,borderLeft:`4px solid ${(URGENCY_CONFIG[h.urgency]||URGENCY_CONFIG.moderate).color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{h.condition}</div>
                <div style={{fontSize:12,color:C.textLight,marginTop:2}}>{h.symptoms}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:(URGENCY_CONFIG[h.urgency]||URGENCY_CONFIG.moderate).color,fontWeight:700}}>
                  {(URGENCY_CONFIG[h.urgency]||URGENCY_CONFIG.moderate).emoji} {(URGENCY_CONFIG[h.urgency]||URGENCY_CONFIG.moderate).label}
                </div>
                <div style={{fontSize:10,color:C.textLight,marginTop:2}}>{h.date}</div>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  );

  // ── FORM ──────────────────────────────────────────────────────────────────
  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {/* Hero */}
      <div style={{background:"linear-gradient(135deg,#5B8DEF,#4CAF82)",borderRadius:18,padding:"22px 24px"}}>
        <div style={{fontSize:32,marginBottom:8}}>🧠</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:"#fff",marginBottom:6}}>AI Symptom Checker</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",lineHeight:1.6}}>
          Describe your symptoms in plain language. Get instant precautions, medicine suggestions, and home remedies — personalised for you.
        </div>
        {history.length > 0 && (
          <button onClick={()=>setStep("history")} style={{marginTop:12,background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:20,color:"#fff",padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>
            📋 {history.length} past check{history.length!==1?"s":""}
          </button>
        )}
      </div>

      {/* Quick chips */}
      <div>
        <div style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em",marginBottom:10}}>QUICK SELECT</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {QUICK_SYMPTOMS.map(s=>(
            <button key={s} onClick={()=>{ setSymptoms(s); setCharCount(s.length); textRef.current?.focus(); }}
              style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${symptoms===s?C.blue:C.border}`,background:symptoms===s?C.blueLight:"#fff",color:symptoms===s?C.blue:C.textMed,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Symptom textarea */}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em"}}>DESCRIBE YOUR SYMPTOMS *</label>
          <span style={{fontSize:11,color:charCount>400?C.coral:C.textLight}}>{charCount}/500</span>
        </div>
        <textarea ref={textRef} value={symptoms}
          onChange={e=>{ if(e.target.value.length<=500){ setSymptoms(e.target.value); setCharCount(e.target.value.length); }}}
          placeholder="Example: I've had a fever of 38.5°C for 2 days, along with body aches, sore throat, and no appetite. I also feel very tired..."
          rows={5}
          style={{background:"#fff",border:`2px solid ${symptoms?C.accent:C.border}`,borderRadius:14,padding:"14px 16px",fontSize:14,color:C.text,outline:"none",resize:"none",fontFamily:"Nunito,sans-serif",lineHeight:1.6,transition:"border-color 0.2s"}}
        />
      </div>

      {/* Severity + Duration */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div>
          <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em",display:"block",marginBottom:8}}>HOW SEVERE?</label>
          <div style={{display:"flex",gap:6}}>
            {[["mild","🟢 Mild"],["moderate","🟡 Moderate"],["severe","🔴 Severe"]].map(([v,l])=>(
              <button key={v} onClick={()=>setSeverity(v)}
                style={{flex:1,padding:"10px 4px",borderRadius:10,border:`2px solid ${severity===v?(v==="severe"?C.coral:v==="moderate"?C.amber:C.accent):C.border}`,background:severity===v?(v==="severe"?C.coralLight:v==="moderate"?C.amberLight:C.accentLight):"#fff",color:severity===v?(v==="severe"?C.coral:v==="moderate"?C.amber:C.accent):C.textMed,fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.15s"}}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{fontSize:12,color:C.textLight,fontWeight:600,letterSpacing:"0.05em",display:"block",marginBottom:8}}>HOW LONG?</label>
          <select value={duration} onChange={e=>setDuration(e.target.value)}
            style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:12,padding:"10px 14px",fontSize:13,color:C.text,outline:"none",height:46}}>
            <option value="">Select duration…</option>
            {["Just started","A few hours","1 day","2–3 days","4–7 days","1–2 weeks","More than 2 weeks"].map(d=><option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Optional details */}
      <details style={{background:C.cardAlt,borderRadius:14,padding:"14px 16px"}}>
        <summary style={{fontSize:13,fontWeight:700,color:C.text,cursor:"pointer",listStyle:"none",display:"flex",justifyContent:"space-between"}}>
          👤 Your Details <span style={{fontSize:11,color:C.textLight,fontWeight:400}}>optional — improves accuracy</span>
        </summary>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:14}}>
          <div>
            <label style={{fontSize:11,color:C.textLight,fontWeight:600,display:"block",marginBottom:5}}>AGE</label>
            <input type="number" min={1} max={120} value={age} onChange={e=>setAge(e.target.value)}
              style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,outline:"none"}}/>
          </div>
          <div>
            <label style={{fontSize:11,color:C.textLight,fontWeight:600,display:"block",marginBottom:5}}>GENDER</label>
            <select value={gender} onChange={e=>setGender(e.target.value)}
              style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,outline:"none",cursor:"pointer"}}>
              <option value="">—</option>{["Male","Female","Other"].map(g=><option key={g}>{g}</option>)}
            </select>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:11,color:C.textLight,fontWeight:600,display:"block",marginBottom:5}}>EXISTING CONDITIONS</label>
            <input value={conditions} onChange={e=>setConditions(e.target.value)} placeholder="e.g. Diabetes, Asthma, Hypertension"
              style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,outline:"none"}}/>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:11,color:C.textLight,fontWeight:600,display:"block",marginBottom:5}}>KNOWN ALLERGIES</label>
            <input value={allergies} onChange={e=>setAllergies(e.target.value)} placeholder="e.g. Penicillin, Aspirin, Sulfa drugs"
              style={{width:"100%",background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px",fontSize:13,outline:"none"}}/>
          </div>
        </div>
      </details>

      <Btn onClick={handleSubmit} disabled={!symptoms.trim()}
        style={{width:"100%",padding:"14px",borderRadius:14,fontSize:15,
          background:symptoms.trim()?"linear-gradient(135deg,#5B8DEF,#4CAF82)":"",border:"none"}}>
        🧠 Analyse My Symptoms →
      </Btn>

      <div style={{textAlign:"center",fontSize:11,color:C.textLight,lineHeight:1.6}}>
        ⚠️ For informational purposes only. Not a substitute for professional medical advice.
      </div>
    </div>
  );
}
