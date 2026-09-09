# ContextRx — Intelligent Patient Context Reconstruction
### Project Documentation: Tech Stack + Architecture + PRD + TRD
**Hackathon:** Code x Merge Hackathon v2.0 — AI for Impact (Track: AI for HealthTech)
**Problem Statement:** "The Missing Context" — reconstruct the relevant context of a patient at the moment it's needed
**Build Window:** 2 days (solo tech build) | **Team:** 1 Tech Lead (solo) + 2 Research/Presentation

---

## 1. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Simple React or plain HTML/JS | Fast to build, no complex state needed |
| Frontend Hosting | S3 (static website) + CloudFront | Reused pattern from prior project, near-zero cost |
| API Layer | AWS API Gateway (REST) | Same reasoning — free tier, simple |
| Compute | AWS Lambda (Node.js or Python) | Serverless, no infra management |
| Data Storage | DynamoDB (patient records + encounter history) | Fast key-based lookups, free tier friendly |
| AI Model | Gemini API (Google AI Studio) | Long context window + strong summarization/retrieval synthesis, generous free tier |
| Synthetic Data | Generated via Gemini API (offline, one-time script) | No real patient data available — must simulate realistic records |

**Note on timeline reality**: given a 2-day solo build, keep the AWS layer as thin as possible. If Lambda/API Gateway setup eats too much time on Day 1, a same-stack fallback is a single Lambda function or even a local Python/Node backend calling Gemini directly, deployed to S3+CloudFront only for the frontend. Don't let infra setup consume core logic time.

---

## 2. Architecture Overview

```
[Offline / Prep step — before or at start of Day 1]
[Synthetic Patient Generator Script] --> Gemini API --> generates N synthetic patients,
    each with: demographics, multiple visit notes, lab reports, medication history,
    diagnoses across time --> stored in [DynamoDB: PatientRecords]

[Runtime flow]
[User Browser] --> [CloudFront] --> [S3: Frontend]
      |
      v
[API Gateway]
      |
      +--> GET /patients --> [Lambda: ListPatients] --> returns list of demo patients
      |
      +--> POST /context-query --> [Lambda: ContextEngine]
                                        |
                              1. Fetch full patient record from DynamoDB
                              2. Take user's query/decision context
                                 (e.g. "patient is being prepped for surgery,
                                  what does the doctor need to know right now?")
                              3. Send full record + query to Gemini API
                              4. Gemini synthesizes ONLY the relevant context
                                 (filters out irrelevant history, surfaces
                                 what matters for this specific moment)
                              5. Return structured, synthesized context
                                        |
                                        v
                              [Frontend renders: relevant context summary,
                               with source tags — "from visit note, 3 months ago"
                               etc. for traceability]
```

### Core Mechanism
This is a **retrieval + synthesis problem**, not a search-index problem at this scale — since synthetic demo patients will have a manageable amount of data (a handful of visits/notes/reports each), the simplest reliable approach is to feed the **entire patient record + the specific query/scenario** into Gemini's large context window and let it extract and synthesize only what's relevant. This avoids building a full vector-embedding RAG pipeline under a 2-day constraint, while still demonstrating the core value proposition convincingly.

*(If there's spare time on Day 2, a lightweight RAG layer — chunk records, embed, retrieve top-k relevant chunks before synthesis — can be added as a "scales to real-world record volume" story for judges, but is not required for the demo to work.)*

---

## 3. Product Requirements Document (PRD)

### 3.1 Problem Statement
A patient's medical record can span years — multiple visits, specialists, lab reports, medications, and notes. When a clinician needs to make a decision (e.g., prescribing a new medication, prepping for surgery, handling an ER admission), the relevant information is often buried across this history. Manually reviewing the full record under time pressure is impractical and risks missing critical details (e.g., a drug allergy noted two years ago, a chronic condition mentioned only once).

### 3.2 Solution Summary
**ContextRx** is a system that, given a patient's full historical record and a specific clinical moment/decision ("what's happening now"), reconstructs only the relevant context — synthesizing scattered notes, reports, medications, and past encounters into a focused, decision-ready summary, with traceability back to source entries.

### 3.3 Target Users
- Clinicians/doctors needing fast, relevant patient context during a consultation, admission, or procedure prep
- ER staff handling patients with limited time to review full history

### 3.4 Goals for This Prototype
- Demonstrate the core "context reconstruction" value convincingly with synthetic but realistic patient data
- Show that the system correctly filters signal from noise — i.e., surfaces the relevant 10% of the record for a given scenario, not the whole record
- Keep it demo-reliable within a 2-day solo build

### 3.5 Out of Scope (for this version)
- Real patient data / EHR integration (no data available — synthetic only)
- User authentication
- Full vector-embedding RAG pipeline (only if time allows, otherwise full-context approach)
- Multi-user roles/permissions
- Clinical decision-making or diagnosis suggestions (this system surfaces context, it does not recommend treatment)

### 3.6 Core Features
| # | Feature | Priority |
|---|---------|----------|
| 1 | Synthetic patient record generator (offline, pre-demo) | Must-have |
| 2 | Patient selector (choose from demo patients) | Must-have |
| 3 | Scenario/query input ("what's the context needed right now") | Must-have |
| 4 | AI-synthesized relevant context output | Must-have |
| 5 | Source traceability (which note/report each point came from) | Must-have |
| 6 | Multiple pre-set demo scenarios per patient | Nice-to-have |
| 7 | Full record view (for comparison/judge transparency) | Nice-to-have |

### 3.7 User Flow
1. User (playing clinician role in demo) selects a synthetic patient from a list
2. User selects or types a scenario (e.g., "Patient is being prepped for surgery," "Patient presents to ER with chest pain," "Reviewing before prescribing a new medication")
3. System sends full patient record + scenario to Gemini API
4. Output: a focused context summary — relevant diagnoses, medications, allergies, prior related incidents — each tagged with its source
5. Full record remains viewable for comparison ("here's everything vs. here's what mattered")

### 3.8 Success Metrics (for demo purposes)
- System correctly surfaces the "planted" critical detail in synthetic records (e.g., an allergy noted once, years ago) when relevant to the scenario
- System correctly excludes irrelevant history for a given scenario (demonstrating filtering, not just summarizing everything)
- Response time acceptable for live demo (~10–15 sec per query)
- Works reliably across at least 3–4 demo patients/scenarios without failure

---

## 4. Technical Requirements Document (TRD)

### 4.1 Synthetic Data Generation Strategy
- Write a one-time offline script (run before/during Day 1) that prompts Gemini API to generate **3–5 synthetic patients**, each with:
  - Basic demographics (age, sex, no real PII)
  - 4–6 visit notes across a simulated multi-year timeline
  - Lab/diagnostic reports
  - Medication history (including at least one discontinued/changed medication)
  - At least one "planted" critical detail per patient (e.g., a drug allergy, a chronic condition mentioned once) to later prove the system surfaces it correctly
- Store output as structured JSON, seed directly into DynamoDB (skip building an admin UI for this — just a seed script)

### 4.2 DynamoDB Schema
**Table: `PatientRecords`**

| Attribute | Type | Notes |
|-----------|------|-------|
| `patient_id` (PK) | String | e.g. `patient_001` |
| `demographics` | Map | age, sex, etc. |
| `encounters` | List of Maps | each: `{date, type, notes, source_label}` |
| `medications` | List of Maps | each: `{name, start_date, end_date, notes}` |
| `lab_reports` | List of Maps | each: `{date, test, result, notes}` |
| `planted_critical_details` | List of Strings | for internal testing/demo verification only |

### 4.3 API Contract

**`GET /patients`**
- Response: list of `{patient_id, name_label, age, sex}` for selection UI

**`POST /context-query`**
- Request:
```json
{
  "patient_id": "patient_001",
  "scenario": "Patient is being prepped for surgery. What does the doctor need to know right now?"
}
```
- Response:
```json
{
  "relevant_context": [
    {
      "point": "Patient has a documented penicillin allergy.",
      "source": "Visit note, 14 Mar 2023",
      "relevance_reason": "Critical for anesthesia/antibiotic selection during surgery."
    },
    {
      "point": "Patient is currently on Warfarin (blood thinner).",
      "source": "Medication history, ongoing since Jan 2025",
      "relevance_reason": "Must be flagged pre-surgery due to bleeding risk."
    }
  ],
  "excluded_summary": "Routine visits for unrelated minor complaints were excluded as not relevant to this scenario."
}
```

### 4.4 Prompt Strategy (Lambda: ContextEngine)
- Send the **full structured patient record (JSON)** + the **scenario text** to Gemini in a single call
- System prompt instructs the model to:
  1. Identify only information relevant to the given scenario
  2. Cite the source (which encounter/report/medication entry) for each point
  3. Briefly note what was excluded and why (demonstrates filtering, not just dumping everything)
  4. Return strict JSON matching the response schema above — no preamble, no markdown fences
- This is a single well-crafted prompt, not a multi-step pipeline — keeps Day 1–2 build time realistic

### 4.5 Error Handling & Edge Cases
- Scenario text empty → prompt user to select/enter a scenario before querying
- Gemini API failure/timeout → retry once, then show friendly error, suggest retry
- Patient record missing expected fields → generator script should validate output structure before seeding DynamoDB

### 4.6 Deployment Notes
- Given the 2-day window, prioritize get-it-working over polish: build and test locally against Gemini API first, deploy to AWS only once the core query→synthesis flow works reliably
- Manual AWS Console setup (no IaC) — same reasoning as before, speed over infra elegance
- Keep the Lambda functions minimal: `ListPatients` and `ContextEngine` — no need for async/polling here since Gemini response time is short enough for a synchronous API Gateway call (under the 29s timeout)

---

## 5. 2-Day Build Plan

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Day 1 | Synthetic data generation script + DynamoDB seeding; AWS setup (API Gateway, Lambda skeleton); `GET /patients` working | 3–5 synthetic patients seeded, patient list endpoint working |
| Day 2 | `ContextEngine` Lambda + Gemini prompt; frontend (patient select → scenario input → context output); deploy to S3+CloudFront; test all demo scenarios | Full working demo, tested across all synthetic patients/scenarios |

### Handoff to Teammates
- **Immediately**: problem framing, solution summary, and the "why this matters" narrative (buried critical info causing real clinical risk) for their deck
- **End of Day 1**: sample synthetic patient record, so they can visualize "before" (full messy record) for the deck
- **End of Day 2**: sample query→output pairs (especially one showing a planted critical detail correctly surfaced) — this is the single strongest demo visual for the pitch

## 6. Anticipated Judge Questions
- *"How does this scale to real, much larger EHR records?"* → Acknowledge current approach uses full-context synthesis for demo scale; real-world scaling would add a retrieval layer (vector search/RAG) to select relevant chunks before synthesis, keeping the same synthesis logic.
- *"How do you prevent the AI from missing or hallucinating critical details?"* → Source-tagging every output point back to a specific record entry makes it auditable — a clinician can verify each point against the original note rather than trusting a black-box summary.
- *"Is this making clinical decisions?"* → No — explicitly positioned as context surfacing only, not diagnosis or treatment recommendation; final judgment remains with the clinician.
- *"Why not real hospital data?"* → No data access available for a hackathon prototype; synthetic data with planted realistic scenarios is used to demonstrate the mechanism, which is data-agnostic and would work the same way with real records.
