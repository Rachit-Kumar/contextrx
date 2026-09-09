# ContextRx

**Intelligent Patient Context Reconstruction** — Code x Merge Hackathon v2.0 · AI for HealthTech

> Given a patient's full history and a specific clinical scenario, ContextRx surfaces only the relevant information — with source traceability back to the original record entry. The AI extracts; it never fabricates.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React (Vite) → Vercel |
| API | AWS API Gateway (REST) |
| Compute | AWS Lambda (Python 3.12) |
| Database | AWS DynamoDB |
| AI | Google Gemini API (`gemini-2.0-flash`) |

---

## Local Development

### 1. Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt

# Add your keys to backend/.env (copy from .env.example)
copy .env.example .env
# Edit .env → set GEMINI_API_KEY and USE_LOCAL_JSON=true

.\venv\Scripts\python local_server.py
# Server runs on http://localhost:5000
```

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

> **Note**: With `USE_LOCAL_JSON=true` in `backend/.env`, the server reads from `data/patients.json` — no DynamoDB needed for local dev.

---

## Deployment

### Backend → AWS
1. Create DynamoDB table `PatientRecords` (PK: `patient_id`, String)
2. Run `python data/seed_dynamodb.py` (set `USE_LOCAL_JSON=false` in `.env`)
3. Zip and upload `backend/lambda_context_engine.py` + `backend/lambda_list_patients.py` + `backend/prompt_templates.py` to Lambda
4. Set Lambda env vars: `GEMINI_API_KEY`, `DYNAMODB_TABLE_NAME`, `AWS_REGION`
5. Create API Gateway: `GET /patients`, `POST /context-query`, CORS enabled

### Frontend → Vercel
1. Push to GitHub
2. Import repo in Vercel, set root directory to `frontend/`
3. Set env var `VITE_API_BASE_URL` = your API Gateway invoke URL
4. Deploy

---

## Project Structure

```
Hackathon-r2/
├── data/
│   ├── patients.json         # 5 synthetic patients (hand-crafted)
│   └── seed_dynamodb.py      # Seed script
├── backend/
│   ├── .env.example          # Key template (safe to commit)
│   ├── .env                  # Real keys (gitignored)
│   ├── local_server.py       # Flask dev server
│   ├── lambda_context_engine.py
│   ├── lambda_list_patients.py
│   ├── prompt_templates.py
│   └── requirements.txt
└── frontend/                 # React (Vite) app
    └── src/
        ├── App.jsx
        ├── api.js
        └── components/
```
