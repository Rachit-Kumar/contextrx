# ContextRx — Hackathon Presentation Deck
**Team Name:** Coder Dumplings  
**Topic:** The Missing Context  
**Live Application:** [https://contextrx.vercel.app](https://contextrx.vercel.app)  
**Repository:** [https://github.com/Rachit-Kumar/contextrx](https://github.com/Rachit-Kumar/contextrx)  

---

## Slide 1: Title Slide
### ContextRx: Intelligent Patient Context Reconstruction
*Solving "The Missing Context" at the Moment of Clinical Decision*

- **Team:** Coder Dumplings
- **Hackathon Track:** The Missing Context
- **Live Cloud Prototype:** `https://contextrx.vercel.app`
- **Core Proposition:** Reconstructing fragmented, multi-year EHR records into a decision-specific, zero-hallucination clinical briefing in under 2 seconds.

---

## Slide 2: The Problem Statement & Current Gaps

### What Problem Are We Solving?
- **The 5-Minute Time Crunch:** In emergency rooms, consultations, and surgical prep, physicians have only 5 to 10 minutes to review a patient's entire medical record before making life-or-death decisions.
- **Scattered & Fragmented Records:** Critical clinical facts lie buried across years of unstructured GP visit notes, scanned lab reports, past prescriptions, and discharge summaries from different specialists.
- **The Forced Dilemma:** Doctors must either waste precious minutes hunting through dozens of legacy documents or rely on patient recall—which is notoriously incomplete or inaccurate in high-stress clinical moments.
- **Catastrophic Real-World Impact:** Hidden context leads to duplicate lab tests, overlooked chronic contraindications, and accidental administration of lethal allergens.

### Current System Gaps
- **Chronological Silos:** Legacy EHRs (Electronic Health Records) dump data chronologically or by department, lacking semantic intelligence to connect past history with today's immediate visit.
- **Literal Keyword Search vs. Meaning:** String searches fail on clinical nuance—searching "chest pain" fails to retrieve a 4-year-old cardiology note documenting "myocardial infarction" or "angina".

### Why Now?
- **Explosion of Unstructured Health Data:** Digital records have surged post-COVID with teleconsultations and multi-specialist notes, creating severe cognitive fatigue for physicians.
- **Clinical Reasoning Maturity:** Modern LLMs with long context windows (Gemini 3.7 Flash) can now parse messy clinical text, resolve inconsistent terminology, and detect contradictions across years of encounters in a single pass.

---

## Slide 3: Proposed Solution — ContextRx

### An Intelligent Clinical Context Reconstruction Engine
ContextRx synthesizes a patient's entire longitudinal history against today's specific clinical decision context. Rather than forcing physicians to navigate scattered records, our system delivers a focused, decision-aware briefing with 100% citation traceability.

- **Core Value:** Replaces manual record hunting with complaint-specific context reconstruction, guaranteeing zero missed background facts within existing consultation windows.

### How It Works (The 4-Step Pipeline)
1. **Decision Context Input:** The clinician enters the clinical scenario (e.g., pre-op surgery prep, acute chest pain, or medication change) via text or hands-free voice dictation.
2. **Single-Pass Multi-Encounter Scan:** The engine analyzes multi-year records (encounters, vitals, prescriptions, doctor notes) in a single reasoning pass.
3. **Cross-Encounter Discrepancy Detection:** Actively compares recent intake forms against buried historical records to flag omitted allergies and contraindications.
4. **Grounded Briefing with Citations:** Delivers an actionable briefing paired with clickable direct links to the original EHR chart for zero-hallucination verification.

---

## Slide 4: Key Features & Clinical Differentiators

1. **Cross-Encounter Discrepancy Engine (Core Hackathon Showcase)**
   - Automatically catches when a recent intake form (e.g., *"No known allergies"*) contradicts a buried archival finding (e.g., *GP note from 2 years ago documenting penicillin hypersensitivity*).
   - Computes temporal lapse (`⏱ 2 years, 4 months gap`) and highlights the immediate clinical hazard.

2. **Deterministic Cognitive Load Telemetry (ROI for Hospitals)**
   - Quantifies cognitive noise eliminated: **82.2% EHR Noise Filtered** (distilling 590 raw record words down to 105 actionable words).
   - Calculates physician chart review time saved: **~3.0 minutes saved** per clinical encounter.
   - Proves **100% Deterministic Grounding** across all citations.

3. **Reason-Based Context Filtering**
   - Eliminates cognitive overload by filtering out irrelevant historical encounters (e.g., excluding resolved seasonal allergies during an acute knee surgery evaluation).

4. **1-Click Interactive EHR Chart Verification**
   - Clicking any finding or discrepancy citation automatically scrolls to and highlights the exact encounter card in the patient's longitudinal EHR timeline.

5. **Physician Workflow Utilities**
   - **Web Speech Dictation:** Hands-free voice input for fast-paced ER workflows.
   - **SBAR Clipboard Export:** Instant hospital handoff summary formatting (Situation, Background, Assessment, Recommendation).
   - **PDF / Print Dossier:** Formal clinical handoff printout formatted with hospital letterhead and doctor sign-off.

---

## Slide 5: Production Technology Stack

### 1. AI & Clinical Reasoning Layer
- **Google Gemini 3.7 Flash:** Single-pass multi-encounter synthesis via Google GenAI SDK.
- **Low Temperature (0.1):** Enforces factual, deterministic outputs with zero conversational filler.
- **Strict JSON Schema Enforcement:** Direct structured output (`discrepancies`, `relevant_context`, `excluded_summary`).
- **Resilient Fallback Loop:** Multi-model failover (`Gemini 3.7` $\rightarrow$ `3.6` $\rightarrow$ `3.5`) ensuring 100% uptime during live presentations.

### 2. Cloud Backend Architecture (AWS Serverless)
- **AWS Lambda:** Serverless Python 3.13 compute functions with 512MB RAM and 30-second timeout.
- **AWS DynamoDB (`PatientRecords`):** NoSQL document store hosting complete multi-year patient records in `ap-south-1` (Mumbai).
- **AWS API Gateway:** High-performance HTTP API with automated CORS preflight handling.

### 3. Frontend & User Experience
- **React 19 + Vite:** Sub-second client builds and instantaneous state rendering.
- **Design System:** Custom hospital-grade workstation light theme (`#ffffff` canvas, clinical blue `#0284c7`, alert crimson `#dc2626`).
- **Hosting:** Vercel Global Edge CDN (`contextrx.vercel.app`) with single-page application route rewrites.

---

## Slide 6: System Architecture & Data Flow

```text
[ 👨‍⚕️ Clinician ]
       │ (Chief Complaint / Voice Dictation / ⚡ 1-Click Pitch Demo)
       ▼
[ 💻 React 19 Frontend (Vercel Global CDN) ]
       │ (Encrypted HTTPS API Request)
       ▼
[ 🌐 AWS API Gateway (HTTP API - ap-south-1) ]
       │ (Routes: GET /patients, GET /record, POST /context-query)
       ▼
[ ⚡ AWS Lambda Context Engine (Python 3.13) ]
       ├──▶ 1. Fetches full multi-year record from AWS DynamoDB (PatientRecords)
       ├──▶ 2. Dispatches unified context to Google Gemini 3.7 Flash
       ├──▶ 3. Executes Python Deterministic Guardrails:
       │       • Mathematical word reduction calculation (82.2% Noise Filtered)
       │       • Grounding string-verification against raw EHR encounter text
       ▼
[ 📊 Clinical Intelligence View ]
       ├── Unified Telemetry Strip (Noise Filtered, Flags Detected, Time Saved)
       ├── Reconciled Discrepancy Card (Intake Claim vs. Buried Truth)
       └── Grounded Supporting Findings with 1-Click EHR Chart Jump
```

---

## Slide 7: Live Prototype & "The Missing Context" Demo

### Live Deployment Links
- **Web Application:** `https://contextrx.vercel.app`
- **Cloud Backend:** `https://7pajfw5e23.execute-api.ap-south-1.amazonaws.com`
- **GitHub Repository:** `https://github.com/Rachit-Kumar/contextrx`

### The Winning Demo Flow (Patient: Arjun Mehta, 54M)
1. **The Scenario:** Arjun is admitted for emergency elective surgery.
2. **The Intake Claim:** Recent pre-op form recorded: *"No known drug allergies — patient did not mention sensitivity during intake."*
3. **The Buried Reality:** GP visit note from 2 years, 4 months ago explicitly recorded: *"Childhood history of rash on torso and itching following Penicillin; Amoxicillin changed to Azithromycin."*
4. **The Prevented Disaster:** ContextRx flags an **Immediate Clinical Hazard**: inadvertent perioperative beta-lactam prophylaxis could trigger fatal intraoperative anaphylaxis.
5. **The Proof:** Click **"Verify in Patient EHR Chart ➔"** to jump directly to the original 2022 encounter card in the interactive timeline.

---

## Slide 8: Innovation & What Sets ContextRx Apart

### 1. Solving the Step BEFORE Diagnosis
Most healthcare AI tools attempt **diagnostic support** (telling doctors what disease the patient has). This is high-risk, legally contentious, and often rejected by clinicians.  
ContextRx deliberately solves **the step before diagnosis**: ensuring the physician has the complete, connected context before forming an opinion. Reliability matters more than speculative ambition when medical history is on the line.

### 2. Single-Pass Unified Reasoning vs. Siloed Retrieval
Keyword search and naive RAG chunk records into isolated fragments, missing connections between distant entries. ContextRx feeds the complete longitudinal record into Gemini in a single pass, allowing the model to correlate an intake claim today with an entry written years ago by an entirely different specialist.

### 3. Deterministic Guardrails (Zero Black-Box Math)
Hospitals cannot trust arbitrary AI estimates. ContextRx computes cognitive noise reduction, review time saved, and source verification deterministically in Python code—combining LLM reasoning with mathematical accountability.

---

## Slide 9: Impact, Feasibility & Scalability

### Clinical Impact
- **Saves Life-Critical ER Minutes:** Eliminates 3–14 minutes of frantic record hunting per complex patient.
- **Reduces Preventable Medical Errors:** Eradicates duplicate diagnostic orders and overlooked drug-drug/drug-allergy contraindications.
- **Combats Physician Burnout:** Eliminates cognitive fatigue by filtering out 80%+ of routine medical noise.

### Feasibility
- **Production-Ready Today:** Not an unvalidated concept—the full pipeline is live end-to-end on AWS Lambda, DynamoDB, and Vercel.
- **FHIR & HL7 Ready:** Designed to ingest standard FHIR JSON patient bundles from Epic, Cerner, or regional health exchanges.

### Scalability Beyond Outpatient Consultations
The core pattern—*reasoning over longitudinal history to surface the missing context at decision time*—applies across healthcare:
- **Nurse Shift Handoffs:** Generates structured SBAR handoffs at shift changes.
- **Specialist Referrals:** Creates complaint-specific pre-consultation dossiers.
- **Insurance Pre-Authorizations:** Instantly extracts documentation required for treatment approval.

---

## Slide 10: Conclusion & Summary

> *"A medical record can contain years of information, but the information needed for a particular decision is often buried or contradicted. ContextRx reconstructs the relevant context at the exact moment it is needed."*

- **Live Demo:** [contextrx.vercel.app](https://contextrx.vercel.app)
- **Team:** Coder Dumplings
- **Status:** 100% Deployed, Grounded, and Operational.
