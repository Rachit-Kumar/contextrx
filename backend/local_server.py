"""
Local development server for ContextRx.
Runs Flask on localhost:5000 with the same routes as AWS API Gateway + Lambda.
Keys are loaded from backend/.env automatically — no manual shell exports needed.
"""

import json
import os
import sys
from pathlib import Path

# ── Load .env before anything else ────────────────────────────────────────────
from dotenv import load_dotenv
_env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_env_path)

from flask import Flask, jsonify, request
from flask_cors import CORS
import boto3
import google.generativeai as genai

# Allow importing Lambda handlers and shared modules from same dir
sys.path.insert(0, os.path.dirname(__file__))
from prompt_templates import get_system_prompt, build_user_prompt

app = Flask(__name__)
CORS(app)  # Allow all origins for local dev

# ── Initialise Gemini ──────────────────────────────────────────────────────────
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("ERROR: GEMINI_API_KEY environment variable not set.")
    sys.exit(1)

genai.configure(api_key=api_key)
gemini_model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    system_instruction=get_system_prompt()
)

# ── Data source: DynamoDB or local JSON fallback ───────────────────────────────
USE_LOCAL_JSON = os.environ.get("USE_LOCAL_JSON", "false").lower() == "true"
LOCAL_JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "patients.json")

if USE_LOCAL_JSON:
    print("Using local patients.json (no DynamoDB)")
    with open(LOCAL_JSON_PATH, "r", encoding="utf-8") as f:
        LOCAL_PATIENTS = json.load(f)
    PATIENTS_BY_ID = {p["patient_id"]: p for p in LOCAL_PATIENTS}
else:
    AWS_REGION = os.environ.get("AWS_REGION", "ap-south-1")
    TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "PatientRecords")
    dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
    table = dynamodb.Table(TABLE_NAME)


def get_patient_by_id(patient_id: str):
    if USE_LOCAL_JSON:
        return PATIENTS_BY_ID.get(patient_id)
    result = table.get_item(Key={"patient_id": patient_id})
    return result.get("Item")


def get_all_patients_summary():
    if USE_LOCAL_JSON:
        return [
            {
                "patient_id": p["patient_id"],
                "name": p["demographics"]["name"],
                "age": p["demographics"]["age"],
                "sex": p["demographics"]["sex"],
                "blood_group": p["demographics"]["blood_group"]
            }
            for p in LOCAL_PATIENTS
        ]
    result = table.scan(ProjectionExpression="patient_id, demographics")
    patients = []
    for item in result.get("Items", []):
        demo = item.get("demographics", {})
        patients.append({
            "patient_id": item["patient_id"],
            "name": demo.get("name", "Unknown"),
            "age": demo.get("age", ""),
            "sex": demo.get("sex", ""),
            "blood_group": demo.get("blood_group", "")
        })
    return sorted(patients, key=lambda p: p["patient_id"])


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/patients", methods=["GET"])
def list_patients():
    """GET /patients — returns lightweight patient list."""
    try:
        patients = get_all_patients_summary()
        return jsonify({"patients": patients}), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch patients", "detail": str(e)}), 500


@app.route("/context-query", methods=["POST"])
def context_query():
    """POST /context-query — calls Gemini to synthesise relevant context."""
    try:
        body = request.get_json(force=True)
        patient_id = (body.get("patient_id") or "").strip()
        scenario = (body.get("scenario") or "").strip()

        if not patient_id:
            return jsonify({"error": "patient_id is required"}), 400
        if not scenario:
            return jsonify({"error": "scenario is required — please describe the clinical context"}), 400

        patient = get_patient_by_id(patient_id)
        if not patient:
            return jsonify({"error": f"Patient '{patient_id}' not found"}), 404

        # Strip planted_critical_details — internal only, not fed to Gemini
        patient_for_ai = {k: v for k, v in patient.items() if k != "planted_critical_details"}

        user_prompt = build_user_prompt(patient_for_ai, scenario)

        print(f"\n[ContextEngine] Patient: {patient_id} | Scenario: {scenario[:80]}...")

        gemini_response = gemini_model.generate_content(
            user_prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
        )

        raw_text = gemini_response.text.strip()
        # Strip markdown fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        context_result = json.loads(raw_text)

        return jsonify({
            "patient_id": patient_id,
            "patient_name": patient.get("demographics", {}).get("name", "Unknown"),
            "scenario": scenario,
            "relevant_context": context_result.get("relevant_context", []),
            "excluded_summary": context_result.get("excluded_summary", "")
        }), 200

    except json.JSONDecodeError as e:
        return jsonify({"error": "AI response was not valid JSON. Please retry.", "detail": str(e)}), 502
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "An unexpected error occurred.", "detail": str(e)}), 500


@app.route("/patients/<patient_id>/record", methods=["GET"])
def get_full_record(patient_id):
    """GET /patients/:id/record — returns full patient record for the Full Record viewer."""
    try:
        patient = get_patient_by_id(patient_id)
        if not patient:
            return jsonify({"error": f"Patient '{patient_id}' not found"}), 404
        # Exclude internal planted_critical_details from API response
        safe_record = {k: v for k, v in patient.items() if k != "planted_critical_details"}
        return jsonify(safe_record), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch patient record", "detail": str(e)}), 500


if __name__ == "__main__":
    print("=" * 60)
    print("  ContextRx Local Dev Server")
    print(f"  Data source: {'Local JSON' if USE_LOCAL_JSON else 'DynamoDB'}")
    print("  http://localhost:5000")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=True)
