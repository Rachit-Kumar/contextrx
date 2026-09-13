# ContextRx

**Intelligent Patient Context Reconstruction** for the "Missing Context" problem in healthcare.

ContextRx takes a synthetic patient's longitudinal record and a clinician's current scenario, then returns only the documented facts that matter for that decision. Every finding includes a source reference, and the engine can flag contradictions between recent intake information and older encounters. ContextRx is a context-retrieval prototype: it does not diagnose, prescribe, or replace clinical judgment.

> **Prototype notice:** This repository contains synthetic patient data and demo-only, in-memory authentication. It is not suitable for real protected health information (PHI), production clinical use, or real identity management without substantial security and compliance work.

## Contents

- [What it does](#what-it-does)
- [Features](#features)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Run locally](#run-locally)
- [Demo accounts](#demo-accounts)
- [Configuration](#configuration)
- [API](#api)
- [Data model](#data-model)
- [Deploy to AWS](#deploy-to-aws)
- [Deploy the frontend to Vercel](#deploy-the-frontend-to-vercel)
- [Validation and testing](#validation-and-testing)
- [Limitations and roadmap](#limitations-and-roadmap)
- [License and responsible use](#license-and-responsible-use)

## What it does

Medical records spread important facts across encounters, medication history, laboratory reports, and intake forms. A chronological record can make a time-sensitive fact difficult to find. ContextRx lets a user:

1. Sign in as a demo doctor or patient.
2. Select a synthetic patient (doctors can select from the full list; patients see their assigned record).
3. Describe a clinical scenario, such as pre-operative preparation or medication review.
4. Analyze the record with an AI context engine.
5. Review grounded findings, discrepancies, excluded information, and the original record.
6. Export an SBAR handoff or print/PDF-style clinical dossier from the browser.

The AI receives the complete record and scenario in one request. Deterministic backend code then calculates cognitive metrics and performs a lightweight source-grounding check against the original record.

## Features

- **Scenario-specific context reconstruction:** filters a full longitudinal record for the current decision.
- **Source traceability:** findings cite encounters, reports, or medication entries.
- **Discrepancy detection:** surfaces documented omissions and contradictions across time.
- **Interactive patient record:** view demographics, encounters, medications, labs, and source-linked findings.
- **Clinical workflow utilities:** voice dictation where supported by the browser, SBAR clipboard export, and print/PDF dossier export.
- **Role-based demo experience:** separate doctor dashboard and patient portal.
- **Resilient AI providers in AWS:** Gemini is the default provider, with AWS Bedrock Claude configured as a hot standby.
- **Local JSON mode:** run the complete flow without DynamoDB.
- **Synthetic seed data:** five hand-authored patient records in `data/patients.json`.

## Architecture

```text
                              Local development
 [React/Vite browser] ───────> [Flask server] ───────> [Gemini API]
        │                             │
        └── local demo auth            └── patients.json

                              AWS deployment
 [React/Vite on Vercel]
          │
          ▼
 [API Gateway: REST routes]
          │
          ├── GET /patients ───────────────> Lambda: list patients
          ├── GET /patients/{id}/record ───> Lambda: full safe record
          └── POST /context-query ─────────> Lambda: context engine
                                                  │
                              ┌───────────────────┴───────────────────┐
                              ▼                                       ▼
                       DynamoDB PatientRecords              Gemini primary
                                                              │
                                                              └── Bedrock/Claude fallback
```

The model is instructed to return strict JSON containing `discrepancies`, `relevant_context`, and `excluded_summary`. Internal `planted_critical_details` fields are never sent to the model or returned by the record APIs.

## Repository layout

```text
.
├── backend/
│   ├── .env.example              # Backend configuration template
│   ├── local_server.py            # Flask development API
│   ├── lambda_context_engine.py   # AI context Lambda
│   ├── lambda_get_record.py       # Full-record Lambda
│   ├── lambda_list_patients.py    # Patient-list Lambda
│   ├── prompt_templates.py        # Grounding and JSON-output prompts
│   ├── build_lambdas.ps1          # Creates AWS deployment packages
│   ├── requirements.txt
│   └── test_*.py                  # API/model smoke-test helpers
├── data/
│   ├── patients.json              # Synthetic patient records
│   ├── seed_dynamodb.py           # Python DynamoDB seed script
│   ├── seed_dynamodb.js           # Node.js DynamoDB seed script
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── auth/                  # Demo auth and role routing
│   │   ├── components/            # Dashboard, record, and output UI
│   │   ├── api.js                 # API client
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── architecture_diagram.jpg
└── README.md
```

## Prerequisites

- Python 3.10+ (Python 3.12 is used by the Lambda packaging notes)
- Node.js 18+ and npm
- A Google Gemini API key for local AI queries
- AWS CLI credentials only when using DynamoDB or deploying to AWS
- An AWS account with access to DynamoDB, Lambda, API Gateway, and (for fallback) Bedrock

## Run locally

### 1. Start the backend

From the repository root in PowerShell:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` and set a real `GEMINI_API_KEY`. Keep `USE_LOCAL_JSON=true` for the simplest local setup:

```powershell
python local_server.py
```

The API is available at `http://localhost:5000`.

### 2. Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

The frontend defaults to `http://localhost:5000`. To use another backend URL, create `frontend/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Try the application

Use one of the [demo accounts](#demo-accounts), choose a patient or open the assigned patient portal, enter a scenario, and select **Analyze Patient History**.

## Demo accounts

Authentication is intentionally hardcoded in `frontend/src/auth/AuthContext.jsx` for the hackathon prototype. Passwords are not hashed, users are not stored server-side, and sessions are kept only in browser `sessionStorage`.

| Role | Username | Password | Assigned patient |
|---|---|---|---|
| Doctor | `dr.menon` | `doctor123` | All patients |
| Doctor | `dr.gupta` | `doctor123` | All patients |
| Patient | `arjun.mehta` | `patient123` | `patient_001` |
| Patient | `priya.sharma` | `patient123` | `patient_002` |
| Patient | `kavya.nair` | `patient123` | `patient_003` |

## Configuration

### Backend environment variables

Copy `backend/.env.example` to `backend/.env`. Do not commit `.env`.

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | — | Google GenAI credential; required for AI queries |
| `GEMINI_MODEL` | `gemini-3.7-flash` locally / `gemini-3.6-flash` in Lambda | Primary Gemini model |
| `PRIMARY_PROVIDER` | `gemini` | Lambda primary provider; use `bedrock` to reverse provider priority |
| `GEMINI_FALLBACK_MODELS` | Code-defined | Fallback models are defined in the handlers |
| `AWS_REGION` | `ap-south-1` | DynamoDB region |
| `DYNAMODB_TABLE_NAME` | `PatientRecords` | DynamoDB table name |
| `USE_LOCAL_JSON` | `true` in the example | `true` reads `data/patients.json`; `false` uses DynamoDB |
| `BEDROCK_REGION` | `us-east-1` | Region for the Bedrock runtime client |
| `BEDROCK_MODEL_ID` | Claude Haiku cross-region profile | Preferred Bedrock model |

When `USE_LOCAL_JSON=false`, the local Flask server requires AWS credentials available through the normal boto3 credential chain (`aws configure`, an IAM role, or environment variables).

### Frontend environment variables

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API base URL, without a trailing route; defaults to `http://localhost:5000` |

## API

All endpoints return JSON and are CORS-enabled by the included local server and Lambda response helpers.

### `GET /patients`

Returns lightweight patient summaries for the selector UI. Full records and internal test fields are not included.

```json
{
  "patients": [
    {
      "patient_id": "patient_001",
      "name": "Arjun Mehta",
      "age": 54,
      "sex": "Male",
      "blood_group": "B+"
    }
  ]
}
```

### `GET /patients/{patient_id}/record`

Returns the selected patient's safe full record. The internal `planted_critical_details` field is removed.

### `POST /context-query`

Request:

```json
{
  "patient_id": "patient_001",
  "scenario": "The patient is being prepared for surgery. What does the care team need to know right now?"
}
```

Successful responses include:

```json
{
  "patient_id": "patient_001",
  "patient_name": "Arjun Mehta",
  "scenario": "The patient is being prepared for surgery.",
  "discrepancies": [
    {
      "type": "Omitted Allergy",
      "current_intake_claim": "No known drug allergies",
      "historical_truth": "Earlier encounter documents a penicillin reaction",
      "temporal_gap": "2 years, 4 months",
      "clinical_hazard": "The documented allergy could be missed during perioperative medication selection."
    }
  ],
  "relevant_context": [
    {
      "point": "A documented fact from the patient record.",
      "source": "Visit note, 14 Mar 2022",
      "relevance_reason": "Why the fact matters to this scenario.",
      "critical": true,
      "verified": true
    }
  ],
  "excluded_summary": "Unrelated routine encounters were excluded.",
  "cognitive_metrics": {
    "provider_used": "Google Gemini 3.6 Flash",
    "raw_record_words": 590,
    "distilled_words": 105,
    "noise_reduction_pct": 82.2,
    "encounters_scanned": 5,
    "medications_reviewed": 4,
    "reading_time_saved_mins": 3.0,
    "grounding_accuracy_pct": 100.0
  }
}
```

Validation errors return `400`, missing patients return `404`, malformed model output returns `502`, and unexpected failures return `500` (or `503` for a temporary Gemini overload in the local server).

## Data model

`data/patients.json` is an array of patient documents. Each document contains:

| Field | Description |
|---|---|
| `patient_id` | DynamoDB partition key, for example `patient_001` |
| `demographics` | Name, age, sex, blood group, and other demographic fields |
| `encounters` | Dated clinical encounters and notes |
| `medications` | Current and historical medications |
| `lab_reports` | Dated tests, results, and notes |
| `planted_critical_details` | Internal demo-validation data; never expose in API responses |

The Python seed script validates required fields before writing:

```powershell
python data/seed_dynamodb.py
```

The DynamoDB table must be named `PatientRecords` (or match `DYNAMODB_TABLE_NAME`) and use `patient_id` as a String partition key.

## Deploy to AWS

### 1. Create and seed DynamoDB

Create a DynamoDB table with:

- Table name: `PatientRecords`
- Partition key: `patient_id`
- Key type: String

Then configure AWS credentials and seed the synthetic records:

```powershell
$env:AWS_REGION = "ap-south-1"
$env:DYNAMODB_TABLE_NAME = "PatientRecords"
python data/seed_dynamodb.py
```

### 2. Build Lambda packages

Run from `backend/`:

```powershell
.\build_lambdas.ps1
```

This creates:

- `backend/lambda_packages/list_patients.zip`
- `backend/lambda_packages/context_engine.zip`
- `backend/lambda_packages/get_record.zip`

Use these handlers in AWS Lambda:

| Package | Lambda handler |
|---|---|
| `list_patients.zip` | `lambda_list_patients.lambda_handler` |
| `context_engine.zip` | `lambda_context_engine.lambda_handler` |
| `get_record.zip` | `lambda_get_record.lambda_handler` |

Set Lambda environment variables for `AWS_REGION`, `DYNAMODB_TABLE_NAME`, `GEMINI_API_KEY`, and the provider settings described in [Configuration](#configuration). For Bedrock fallback, the Lambda execution role also needs permission to invoke the configured Bedrock models.

**Packaging note for Windows:** `context_engine.zip` contains third-party Python dependencies. AWS Lambda runs Linux, so packages must contain Linux-compatible wheels. If a Windows-built package fails with an import error, build it in AWS CloudShell/Linux or install Linux wheels explicitly before zipping. Set the context-engine Lambda timeout high enough for a model request (30 seconds is a practical starting point).

### 3. Configure API Gateway

Create routes and connect them to the corresponding functions:

| Method | Route | Lambda |
|---|---|---|
| `GET` | `/patients` | `contextrx-list-patients` |
| `POST` | `/context-query` | `contextrx-context-engine` |
| `GET` | `/patients/{patient_id}/record` | `contextrx-get-record` |

Enable CORS for the frontend origin and deploy the API. The Lambda handlers include CORS headers and support preflight `OPTIONS` requests.

## Deploy the frontend to Vercel

1. Import the repository into Vercel.
2. Set the project root directory to `frontend`.
3. Keep the build command as `npm run build`.
4. Set `VITE_API_BASE_URL` to the deployed API Gateway base URL.
5. Deploy.

For a local production build:

```powershell
cd frontend
npm run build
npm run preview
```

## Validation and testing

Frontend checks:

```powershell
cd frontend
npm run lint
npm run build
```

Backend smoke-test helpers:

```powershell
cd backend
python test_api_key.py
python test_bedrock_models.py
```

The smoke tests make real provider calls when configured, so they may incur API usage and require valid credentials. The repository currently has no automated end-to-end test suite; manually verify the three API routes and both role flows after deployment.

## Limitations and roadmap

Current prototype limitations:

- Data is synthetic and hand-authored; there is no EHR/FHIR/HL7 integration.
- Authentication is a frontend demo only and provides no authorization boundary.
- The full record is sent to the model in one request; large real-world records need retrieval, chunking, and token-budget controls.
- Source verification is deterministic string matching, not a clinical-grade provenance system.
- CORS is intentionally broad in the local server and Lambda examples.
- AI output is not a medical recommendation and must be reviewed by a qualified clinician.

Potential production work:

- Integrate a compliant identity provider, audit logging, least-privilege authorization, and encrypted secret management.
- Ingest validated FHIR resources instead of hand-authored JSON.
- Add retrieval and ranking for large records while preserving source citations.
- Add schema validation, model evaluations, adversarial tests, observability, rate limiting, and human review workflows.

## License and responsible use

No license file is currently included. Treat this repository as a hackathon prototype unless a separate license is added by the project owners. Do not upload real patient data or credentials to this repository, its issue tracker, logs, frontend, or model prompts.
