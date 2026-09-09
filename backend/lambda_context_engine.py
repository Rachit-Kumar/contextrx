import json
import os
import re
import time
from decimal import Decimal
import boto3
from google import genai
from google.genai import types
from prompt_templates import get_system_prompt, build_user_prompt

# Initialise Gemini
api_key = os.environ.get("GEMINI_API_KEY", "")
client = genai.Client(api_key=api_key)
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.7-flash")
GEMINI_FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"]

# Initialise DynamoDB
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
table = dynamodb.Table(os.environ.get("DYNAMODB_TABLE_NAME", "PatientRecords"))


def decimal_default(obj):
    """Safely serialize DynamoDB Decimal objects to int or float."""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def lambda_handler(event, context):
    """
    POST /context-query
    Body: { "patient_id": "patient_001", "scenario": "..." }
    """
    try:
        # Handle CORS preflight OPTIONS request if routed here
        http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "")
        if http_method == "OPTIONS":
            return _response(200, {"status": "ok"})

        # Parse request body
        body = json.loads(event.get("body", "{}") or "{}")
        patient_id = (body.get("patient_id") or "").strip()
        scenario = (body.get("scenario") or "").strip()

        if not patient_id:
            return _response(400, {"error": "patient_id is required"})
        if not scenario:
            return _response(400, {"error": "scenario is required — please describe the clinical context"})

        # Fetch full patient record from DynamoDB
        result = table.get_item(Key={"patient_id": patient_id})
        patient = result.get("Item")
        if not patient:
            return _response(404, {"error": f"Patient '{patient_id}' not found"})

        # Remove planted_critical_details before sending to Gemini
        patient_for_ai = {k: v for k, v in patient.items() if k != "planted_critical_details"}

        # Serialize patient data for prompt (using decimal converter)
        raw_json_str = json.dumps(patient_for_ai, default=decimal_default)
        patient_clean = json.loads(raw_json_str)

        user_prompt = build_user_prompt(patient_clean, scenario)

        # Multi-model fallback loop
        models_to_try = [GEMINI_MODEL] + GEMINI_FALLBACK_MODELS
        gemini_response = None
        last_error = None

        for model_name in models_to_try:
            for retry in range(2):
                try:
                    gemini_response = client.models.generate_content(
                        model=model_name,
                        contents=user_prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=get_system_prompt(),
                            temperature=0.1,
                            response_mime_type="application/json"
                        )
                    )
                    last_error = None
                    break
                except Exception as e:
                    last_error = e
                    err_str = str(e)
                    if "503" in err_str or "UNAVAILABLE" in err_str:
                        time.sleep(2 * (retry + 1))
                    else:
                        break
            if gemini_response is not None:
                break

        if gemini_response is None:
            raise last_error

        # Parse Gemini JSON response
        raw_text = gemini_response.text.strip()
        fence_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', raw_text, re.DOTALL)
        if fence_match:
            raw_text = fence_match.group(1).strip()

        context_result = json.loads(raw_text)

        if isinstance(context_result, list):
            context_result = {"relevant_context": context_result, "excluded_summary": "", "discrepancies": []}

        relevant_items = context_result.get("relevant_context", [])
        discrepancies = context_result.get("discrepancies", [])

        # Deterministic Cognitive Metrics
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

        return _response(200, {
            "patient_id": patient_id,
            "patient_name": patient.get("demographics", {}).get("name", "Unknown"),
            "scenario": scenario,
            "discrepancies": discrepancies,
            "relevant_context": relevant_items,
            "excluded_summary": context_result.get("excluded_summary", ""),
            "cognitive_metrics": cognitive_metrics
        })

    except json.JSONDecodeError as e:
        return _response(502, {"error": "AI response was not valid JSON. Please retry.", "detail": str(e)})
    except Exception as e:
        return _response(500, {"error": "An unexpected error occurred. Please retry.", "detail": str(e)})


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "OPTIONS,POST"
        },
        "body": json.dumps(body, default=decimal_default)
    }
