# ══════════════════════════════════════════════════════════════════════════════
# AI SYMPTOM CHECKER — add these routes to your main.py
# ══════════════════════════════════════════════════════════════════════════════
# Paste this block into main.py before the # HEALTH section

# ── Paste from here ────────────────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel

class SymptomCheckIn(_BaseModel):
    symptoms:             str
    duration:             str  = ""
    severity:             str  = "mild"
    age:                  int  = 30
    gender:               str  = "unknown"
    existing_conditions:  list = []
    allergies:            list = []
    current_medications:  list = []

SYMPTOM_DB_BE = {
    "fever|temperature|hot|chills|sweating|body ache": {
        "condition":"Fever / Viral Infection","urgency":"moderate",
        "precautions":["Rest and avoid exertion","Stay in a cool room","Drink plenty of fluids","Monitor temperature every 4 hours","Isolate to prevent spread"],
        "medications":[{"name":"Paracetamol","dose":"500mg–1g every 4–6 hours","note":"Do not exceed 4g/day"},{"name":"Ibuprofen","dose":"400mg every 6–8 hours with food","note":"Avoid if stomach issues"}],
        "home_remedies":["Lukewarm sponge bath","Ginger + honey in warm water","Cold compress on forehead","Coconut water"],
        "when_to_see":"Fever above 39.5°C, lasting > 3 days, or with rash/stiff neck/confusion",
        "red_flags":["Fever > 39.5°C","Seizures","Difficulty breathing","Stiff neck + high fever","Confusion"],
    },
    "cough|throat|sore throat|phlegm|mucus|cold|runny nose": {
        "condition":"Upper Respiratory Infection","urgency":"mild",
        "precautions":["Gargle warm salt water 3–4x daily","Avoid cold drinks","Steam inhalation twice daily","Wear a mask"],
        "medications":[{"name":"Cough syrup (Dextromethorphan)","dose":"10–20ml every 4–6 hours","note":"Dry cough"},{"name":"Guaifenesin","dose":"200–400mg every 4 hours","note":"Productive cough"},{"name":"Throat lozenges","dose":"As needed","note":"Soothing"}],
        "home_remedies":["Honey + ginger + lemon tea","Turmeric milk","Steam inhalation","Salt water gargle"],
        "when_to_see":"Cough > 2 weeks, blood in sputum, or high fever",
        "red_flags":["Blood in sputum","Difficulty breathing","High fever + cough","Cough > 2 weeks"],
    },
    "headache|migraine|head pain|head hurts|dizzy": {
        "condition":"Headache / Migraine","urgency":"mild",
        "precautions":["Rest in dark quiet room","Cold compress on forehead","Stay hydrated","Avoid bright screens","Limit caffeine"],
        "medications":[{"name":"Paracetamol","dose":"500mg–1g every 4–6 hours","note":"First choice"},{"name":"Ibuprofen","dose":"400mg every 6–8 hours","note":"Anti-inflammatory"}],
        "home_remedies":["Peppermint oil on temples","Ginger tea","Cold compress","Gentle massage"],
        "when_to_see":"Sudden severe thunderclap headache, with fever/stiff neck, or after head injury",
        "red_flags":["Sudden worst headache of life","Headache + fever + stiff neck","After head injury","With vision changes"],
    },
    "stomach|nausea|vomit|diarrhea|diarrhoea|abdomen|bloating|indigestion|heartburn": {
        "condition":"Gastrointestinal Issue","urgency":"mild",
        "precautions":["BRAT diet: Banana Rice Applesauce Toast","Avoid spicy food","Stay hydrated with ORS","Small frequent meals"],
        "medications":[{"name":"ORS","dose":"1 sachet in 1L water after each stool","note":"Prevents dehydration"},{"name":"Domperidone","dose":"10mg 3x daily before meals","note":"For nausea"},{"name":"Omeprazole","dose":"20mg once daily before breakfast","note":"For acidity"}],
        "home_remedies":["Ginger tea","Coconut water","Probiotic yogurt","Peppermint tea","Rice water"],
        "when_to_see":"Severe pain, blood in stool, dehydration, or symptoms > 48 hours",
        "red_flags":["Blood in stool or vomit","Severe cramping","Signs of dehydration","Symptoms > 48 hours"],
    },
    "chest|breathing|breathe|shortness|wheeze|asthma": {
        "condition":"Chest / Breathing Difficulty","urgency":"high",
        "precautions":["Sit upright — do NOT lie flat","Avoid triggers","Use prescribed inhaler","Loosen clothing","Stay calm"],
        "medications":[{"name":"Salbutamol inhaler","dose":"2 puffs every 4–6 hours","note":"Reliever"},{"name":"Montelukast","dose":"10mg once daily","note":"Preventive — prescription required"}],
        "home_remedies":["Steam inhalation","Pursed lip breathing","Warm ginger tea","Sleep with head elevated"],
        "when_to_see":"IMMEDIATE if severe breathing difficulty, bluish lips, or cannot speak full sentences",
        "red_flags":["Severe breathlessness","Bluish lips","Cannot complete sentence","Chest pain + arm/jaw pain"],
    },
    "back|spine|lower back|lumbar|backache": {
        "condition":"Back Pain / Musculoskeletal","urgency":"mild",
        "precautions":["Rest 1–2 days then gentle movement","Ice first 48h then heat","Good posture","Avoid heavy lifting"],
        "medications":[{"name":"Ibuprofen","dose":"400mg every 6–8 hours with food","note":"Anti-inflammatory"},{"name":"Paracetamol","dose":"500mg–1g every 4–6 hours","note":"Pain relief"},{"name":"Diclofenac gel","dose":"Apply 3–4x daily","note":"Topical relief"}],
        "home_remedies":["Alternating hot/cold compress","Turmeric milk","Gentle yoga","Epsom salt bath"],
        "when_to_see":"Pain radiating to leg, numbness, bladder/bowel changes, or after injury",
        "red_flags":["Pain shooting down leg","Numbness in legs","Bladder/bowel problems","After injury"],
    },
    "skin|rash|itch|hives|allergy|allergic": {
        "condition":"Skin Rash / Allergic Reaction","urgency":"moderate",
        "precautions":["Do not scratch","Avoid trigger","Loose cotton clothing","Moisturise skin","Lukewarm showers"],
        "medications":[{"name":"Cetirizine","dose":"10mg once daily","note":"Antihistamine"},{"name":"Loratadine","dose":"10mg once daily","note":"Non-drowsy"},{"name":"1% Hydrocortisone cream","dose":"Apply thinly 2x daily","note":"Localised itch"},{"name":"Calamine lotion","dose":"Apply as needed","note":"Soothing"}],
        "home_remedies":["Cold compress","Aloe vera gel","Oatmeal bath","Coconut oil"],
        "when_to_see":"Throat swelling, difficulty breathing, rapidly spreading rash, or rash + fever",
        "red_flags":["Throat swelling","Difficulty breathing (anaphylaxis)","Rapidly spreading rash","Rash + fever"],
    },
    "anxiety|stress|panic|depressed|depression|sleep|insomnia|mental": {
        "condition":"Mental Health / Stress / Anxiety","urgency":"moderate",
        "precautions":["Deep breathing exercises","Consistent sleep schedule","Reduce caffeine","Exercise 30 min daily","Reach out to someone trusted"],
        "medications":[{"name":"Ashwagandha","dose":"300–600mg daily","note":"Natural adaptogen"},{"name":"Melatonin","dose":"0.5–5mg at bedtime","note":"For sleep"},{"name":"⚠️ Note","dose":"","note":"Psychiatric medications require doctor prescription"}],
        "home_remedies":["10-min daily meditation","Gratitude journaling","Progressive muscle relaxation","Lavender oil","Yoga"],
        "when_to_see":"Hopelessness > 2 weeks, thoughts of self-harm, or severe panic attacks",
        "red_flags":["Thoughts of self-harm or suicide","Unable to perform daily tasks","Severe panic attacks"],
    },
}

URGENCY_ADVICE_BE = {
    "mild":      {"emoji":"🟢","label":"Non-urgent",          "color":"#4CAF82","advice":"Symptoms appear mild. Monitor at home and follow precautions below."},
    "moderate":  {"emoji":"🟡","label":"See a doctor soon",   "color":"#F5A623","advice":"Consult a doctor within 24–48 hours if symptoms don't improve."},
    "high":      {"emoji":"🔴","label":"Seek care today",     "color":"#F47B7B","advice":"See a doctor today or visit an urgent care centre."},
    "emergency": {"emoji":"🚨","label":"Go to Emergency NOW", "color":"#ef4444","advice":"Call 999/911 or go to A&E immediately."},
}

EMERGENCY_KW = ["chest pain","can't breathe","cannot breathe","unconscious","fainted","collapsed","stroke","heart attack","suicidal","overdose","seizure","fitting","throat closing","choking"]

def _analyse(text, severity, age, allergies):
    tl = text.lower()
    if any(k in tl for k in EMERGENCY_KW):
        return {"condition":"Potential Medical Emergency","urgency":"emergency",
                "precautions":["Call 999/911 immediately","Keep person calm","Do not give food/water"],
                "medications":[],"home_remedies":[],"when_to_see":"GO TO EMERGENCY NOW",
                "red_flags":["Requires immediate emergency care"]}
    best, best_score = None, 0
    for kws, data in SYMPTOM_DB_BE.items():
        score = sum(1 for k in kws.split("|") if k in tl)
        if score > best_score:
            best_score = score; best = data
    if not best:
        best = {"condition":"General Health Concern","urgency":"moderate",
                "precautions":["Rest and stay hydrated","Monitor symptoms 24–48 hours"],
                "medications":[{"name":"Paracetamol","dose":"500mg as needed","note":"For pain/fever"}],
                "home_remedies":["Rest","Hydration"],"when_to_see":"If symptoms worsen or persist > 48 hours",
                "red_flags":["Worsening symptoms","High fever","Difficulty breathing"]}
    urgency = best["urgency"]
    if severity == "severe" and urgency == "mild":     urgency = "moderate"
    if severity == "severe" and urgency == "moderate": urgency = "high"
    if (age < 5 or age > 70) and urgency == "mild":   urgency = "moderate"
    meds = []
    for m in best["medications"]:
        mc = dict(m)
        if any(a.lower() in m["name"].lower() for a in allergies if a):
            mc["warning"] = f"⚠️ ALLERGY ALERT — check with doctor before taking"
        meds.append(mc)
    return {**best, "urgency": urgency, "medications": meds}

# ── Routes to add ──────────────────────────────────────────────────────────────
# @app.post("/portal/symptom-check")
# async def symptom_check(data: SymptomCheckIn, cu=Depends(get_current_user)):
#     result = _analyse(data.symptoms, data.severity, data.age, data.allergies)
#     doc = {"_id":new_id(),"user_id":cu["_id"],"patient_name":cu["name"],
#            "symptoms":data.symptoms,"severity":data.severity,"result":result,"created_at":now_iso()}
#     await db.symptom_checks.insert_one(doc)
#     await audit(cu["_id"],"SYMPTOM_CHECK","portal",f"AI check: {result['condition']}")
#     return {**result,"check_id":doc["_id"],"urgency_info":URGENCY_ADVICE_BE.get(result["urgency"],{})}
#
# @app.get("/portal/symptom-history")
# async def symptom_history(cu=Depends(get_current_user)):
#     docs = await db.symptom_checks.find({"user_id":cu["_id"]}).sort("created_at",-1).limit(10).to_list(10)
#     return fix_ids(docs)
