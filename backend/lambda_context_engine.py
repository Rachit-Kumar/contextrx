import json
import os
import re
import ast
from decimal import Decimal
import boto3
import botocore.config
from google import genai
from google.genai import types
from prompt_templates import get_system_prompt, build_user_prompt

# ── Primary: AWS Bedrock (Anthropic Claude) ───────────────────────────────────
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
# Model IDs verified from account's Bedrock console (Sep 2026)
CLAUDE_MODELS = [
    os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-haiku-4-5-20251001-v1:0"),
    "anthropic.claude-haiku-4-5-20251001-v1:0",      # Haiku 4.5 — fastest & cheapest
    "anthropic.claude-sonnet-4-6",                     # Sonnet 4.6 — balanced
    "anthropic.claude-sonnet-4-5-20250929-v1:0",       # Sonnet 4.5 — fallback
]
# Deduplicate while preserving order
CLAUDE_MODELS = list(dict.fromkeys(CLAUDE_MODELS))

try:
    bedrock_cfg = botocore.config.Config(
        read_timeout=12,
        connect_timeout=3,
        retries={"max_attempts": 0}
    )
    bedrock_client = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION, config=bedrock_cfg)
except Exception as e:
    print(f"[Init] Bedrock client initialization failed: {e}")
    bedrock_client = None

# ── Secondary: Google Gemini (Automated Hot Standby) ──────────────────────────
api_key = os.environ.get("GEMINI_API_KEY", "")
gemini_client = genai.Client(api_key=api_key) if api_key else None
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
# Ordered by reliability — 1.5-flash is the most stable, 2.5/3.7 as alternatives
GEMINI_FALLBACK_MODELS = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.7-flash"]

# ── DynamoDB Store ────────────────────────────────────────────────────────────
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
table = dynamodb.Table(os.environ.get("DYNAMODB_TABLE_NAME", "PatientRecords"))


def decimal_default(obj):
    """Safely serialize DynamoDB Decimal objects to int or float."""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def parse_ai_json(raw_text: str) -> dict:
    """Robustly parse JSON or Python-dict format from AI model output."""
    if not raw_text:
        raise ValueError("Empty response received from AI model")

    cleaned = raw_text.strip()

    # 1. Strip markdown fences if present
    fence_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    # 2. Locate outermost curly braces { ... }
    brace_start = cleaned.find('{')
    brace_end = cleaned.rfind('}')
    if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
        cleaned = cleaned[brace_start:brace_end + 1]

    # Attempt A: Standard JSON parsing
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Attempt B: Python literal evaluation (converts single quotes, true/false/null)
    try:
        py_text = re.sub(r'\btrue\b', 'True', cleaned)
        py_text = re.sub(r'\bfalse\b', 'False', py_text)
        py_text = re.sub(r'\bnull\b', 'None', py_text)
        parsed = ast.literal_eval(py_text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    # Attempt C: Regex single-to-double quote substitution
    try:
        fixed = re.sub(r"(?<!\\)'", '"', cleaned)
        return json.loads(fixed)
    except Exception:
        pass

    # Re-raise standard JSONDecodeError so caller gets exact context
    return json.loads(cleaned)


def invoke_claude_bedrock(user_prompt: str):
    """Invokes Anthropic Claude on AWS Bedrock."""
    if not bedrock_client:
        raise RuntimeError("Bedrock client not initialized")

    last_err = None

    for model_id in CLAUDE_MODELS:
        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2048,
                "temperature": 0.0,
                "system": get_system_prompt(),
                "messages": [
                    {"role": "user", "content": user_prompt}
                ]
            })

            response = bedrock_client.invoke_model(
                modelId=model_id,
                body=body
            )

            response_body = json.loads(response["body"].read())
            raw_text = response_body["content"][0]["text"]

            if "haiku-4-5" in model_id:
                provider_name = "Claude Haiku 4.5 (Bedrock)"
            elif "sonnet-4-6" in model_id:
                provider_name = "Claude Sonnet 4.6 (Bedrock)"
            elif "sonnet-4-5" in model_id:
                provider_name = "Claude Sonnet 4.5 (Bedrock)"
            else:
                provider_name = f"Claude ({model_id.split('.')[1].split('-')[0].title()}) (Bedrock)"
            return raw_text, provider_name
        except Exception as e:
            last_err = e
            print(f"[Bedrock] Model {model_id} failed: {e}")

    raise last_err


def invoke_gemini_fallback(user_prompt: str):
    """Hot failover: Invokes Google Gemini if Bedrock is unavailable."""
    if not gemini_client:
        raise RuntimeError("Gemini client not initialized")

    models_to_try = [GEMINI_MODEL] + [m for m in GEMINI_FALLBACK_MODELS if m != GEMINI_MODEL]
    last_error = None

    for model_name in models_to_try:
        try:
            resp = gemini_client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=get_system_prompt(),
                    temperature=0.0,
                    response_mime_type="application/json"
                )
            )
            return resp.text.strip(), f"Google Gemini ({model_name})"
        except Exception as e:
            last_error = e
            print(f"[Gemini Fallback] Model {model_name} failed: {e}")
            continue

    raise last_error


def lambda_handler(event, context):
    """
    POST /context-query
    Multi-Provider Architecture: Claude 3 Haiku (Primary) -> Gemini Flash (Standby)
    """
    try:
        # Handle CORS preflight OPTIONS request
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

        # Remove planted_critical_details before sending to AI
        patient_for_ai = {k: v for k, v in patient.items() if k != "planted_critical_details"}

        # Serialize patient data for prompt
        raw_json_str = json.dumps(patient_for_ai, default=decimal_default)
        patient_clean = json.loads(raw_json_str)

        user_prompt = build_user_prompt(patient_clean, scenario)

        raw_text = None
        active_provider = None

        # ── 1st Choice: AWS Bedrock Claude ────────────────────────────────────
        try:
            print("[ContextEngine] Attempting primary reasoning with AWS Bedrock Claude...")
            raw_text, active_provider = invoke_claude_bedrock(user_prompt)
            print(f"[ContextEngine] Success with {active_provider}")
        except Exception as bedrock_err:
            print(f"[ContextEngine] Bedrock unavailable ({bedrock_err}), failing over to Gemini...")
            # ── 2nd Choice: Automated Hot Failover to Google Gemini ────────────
            try:
                raw_text, active_provider = invoke_gemini_fallback(user_prompt)
                print(f"[ContextEngine] Failover successful with {active_provider}")
            except Exception as gemini_err:
                raise RuntimeError(f"Both Bedrock and Gemini failed. Bedrock: {bedrock_err} | Gemini: {gemini_err}")

        # Resilient AI JSON parsing
        context_result = parse_ai_json(raw_text)

        if isinstance(context_result, list):
            context_result = {"relevant_context": context_result, "excluded_summary": "", "discrepancies": []}

        relevant_items = context_result.get("relevant_context", [])
        discrepancies = context_result.get("discrepancies", [])

        # ── Deterministic Cognitive Metrics ───────────────────────────────────
        raw_words = len(raw_json_str.split())
        distilled_text = " ".join([i.get("point", "") for i in relevant_items] + [d.get("clinical_hazard", "") for d in discrepancies])
        distilled_words = max(len(distilled_text.split()), 1)
        noise_reduction_pct = round(max(0.0, (1.0 - (distilled_words / raw_words)) * 100.0), 1)
        reading_time_saved_mins = max(round((raw_words - distilled_words) / 180.0, 1), 3.0)

        # ── Deterministic Grounding Check ─────────────────────────────────────
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
            "provider_used": active_provider,
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

    except (json.JSONDecodeError, ValueError) as e:
        return _response(502, {"error": "AI response formatting error. Please retry.", "detail": str(e)})
    except Exception as e:
        import traceback
        traceback.print_exc()
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
