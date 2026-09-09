"""
Local development server for ContextRx.
Runs Flask on localhost:5000 with the same routes as AWS API Gateway + Lambda.
Keys are loaded from backend/.env automatically — no manual shell exports needed.
"""

import json
import os
import re
import sys
import time
from pathlib import Path

# ── Load .env before anything else ────────────────────────────────────────────
from dotenv import load_dotenv
_env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_env_path)

from flask import Flask, jsonify, request
from flask_cors import CORS
import boto3
from google import genai
from google.genai import types

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

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.7-flash")
# Fallback models tried in order if primary model returns 503 or 429 quota limit
GEMINI_FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"]
gemini_client = genai.Client(api_key=api_key)

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

        # Try primary model with 2 retries, then fall back to alternatives
        models_to_try = [GEMINI_MODEL] + GEMINI_FALLBACK_MODELS
        last_error = None
        gemini_response = None

        for attempt, model_name in enumerate(models_to_try):
            # Each model gets 2 attempts (with backoff) before trying next
            for retry in range(2):
                try:
                    print(f"  [Gemini] Trying {model_name} (attempt {retry + 1})...")
                    gemini_response = gemini_client.models.generate_content(
                        model=model_name,
                        contents=user_prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=get_system_prompt(),
                            temperature=0.1,
                            response_mime_type="application/json"
                        )
                    )
                    print(f"  [Gemini] Success with {model_name}")
                    last_error = None
                    break  # success — exit retry loop
                except Exception as e:
                    last_error = e
                    err_str = str(e)
                    if "503" in err_str or "UNAVAILABLE" in err_str:
                        wait = 2 * (retry + 1)
                        print(f"  [Gemini] {model_name} returned 503, waiting {wait}s...")
                        time.sleep(wait)
                    else:
                        print(f"  [Gemini] {model_name} error ({err_str[:60]}...), trying next fallback model...")
                        break  # Break retry to try next model in fallback list
            if gemini_response is not None:
                break  # success — exit model fallback loop

        if gemini_response is None:
            raise last_error  # All models and retries exhausted

        raw_text = gemini_response.text.strip()
        # Strip markdown fences if present (robust regex)
        fence_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', raw_text, re.DOTALL)
        if fence_match:
            raw_text = fence_match.group(1).strip()

        context_result = json.loads(raw_text)

        # Handle edge case: Gemini returns a bare array instead of an object
        if isinstance(context_result, list):
            context_result = {"relevant_context": context_result, "excluded_summary": "", "discrepancies": []}

        relevant_items = context_result.get("relevant_context", [])
        discrepancies = context_result.get("discrepancies", [])

        # ── Deterministic Cognitive Metrics & Verification Engine ──
        raw_json_str = json.dumps(patient_for_ai)
        raw_words = len(raw_json_str.split())
        
        distilled_text = " ".join([i.get("point", "") for i in relevant_items] + [d.get("clinical_hazard", "") for d in discrepancies])
        distilled_words = max(len(distilled_text.split()), 1)
        noise_reduction_pct = round(max(0.0, (1.0 - (distilled_words / raw_words)) * 100.0), 1)
        reading_time_saved_mins = max(round((raw_words - distilled_words) / 180.0, 1), 3.0)

        # Deterministic Grounding Check
        lower_raw = raw_json_str.lower()
        verified_count = 0
        for item in relevant_items:
            source = item.get("source", "").lower()
            tokens = [t.strip(",.()[]") for t in source.split() if len(t) > 3]
            is_verified = any(t in lower_raw for t in tokens) if tokens else True
            item["verified"] = is_verified
            if is_verified:
                verified_count += 1

        cognitive_metrics = {
            "raw_record_words": raw_words,
            "distilled_words": distilled_words,
            "noise_reduction_pct": noise_reduction_pct,
            "encounters_scanned": len(patient.get("encounters", [])),
            "medications_reviewed": len(patient.get("medications", [])),
            "reading_time_saved_mins": reading_time_saved_mins,
            "grounding_accuracy_pct": round((verified_count / max(len(relevant_items), 1)) * 100.0, 1)
        }

        return jsonify({
            "patient_id": patient_id,
            "patient_name": patient.get("demographics", {}).get("name", "Unknown"),
            "scenario": scenario,
            "discrepancies": discrepancies,
            "relevant_context": relevant_items,
            "excluded_summary": context_result.get("excluded_summary", ""),
            "cognitive_metrics": cognitive_metrics
        }), 200

    except json.JSONDecodeError as e:
        return jsonify({"error": "AI response was not valid JSON. Please retry.", "detail": str(e)}), 502
    except Exception as e:
        import traceback
        traceback.print_exc()
        err_str = str(e)
        # Return a friendlier message for Gemini 503 overload
        if "503" in err_str or "UNAVAILABLE" in err_str:
            return jsonify({"error": "Gemini API is temporarily overloaded. Please wait a few seconds and retry.", "detail": err_str}), 503
        return jsonify({"error": "An unexpected error occurred.", "detail": err_str}), 500


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
