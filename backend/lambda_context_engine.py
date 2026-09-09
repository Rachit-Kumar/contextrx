import json
import os
import boto3
import google.generativeai as genai
from prompt_templates import get_system_prompt, build_user_prompt

# Initialise Gemini
genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    system_instruction=get_system_prompt()
)

# Initialise DynamoDB
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
table = dynamodb.Table(os.environ.get("DYNAMODB_TABLE_NAME", "PatientRecords"))


def lambda_handler(event, context):
    """
    POST /context-query
    Body: { "patient_id": "patient_001", "scenario": "..." }
    """
    try:
        # Parse request body
        body = json.loads(event.get("body", "{}"))
        patient_id = body.get("patient_id", "").strip()
        scenario = body.get("scenario", "").strip()

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
        # (internal only — not for AI to use as a cheat-sheet)
        patient_for_ai = {k: v for k, v in patient.items() if k != "planted_critical_details"}

        # Build prompt and call Gemini
        user_prompt = build_user_prompt(patient_for_ai, scenario)

        gemini_response = model.generate_content(
            user_prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.1,          # Low temperature: factual, consistent
                response_mime_type="application/json"
            )
        )

        # Parse Gemini's JSON response
        raw_text = gemini_response.text.strip()
        # Strip markdown fences if model includes them despite instructions
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        context_result = json.loads(raw_text)

        return _response(200, {
            "patient_id": patient_id,
            "patient_name": patient.get("demographics", {}).get("name", "Unknown"),
            "scenario": scenario,
            "relevant_context": context_result.get("relevant_context", []),
            "excluded_summary": context_result.get("excluded_summary", "")
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
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST"
        },
        "body": json.dumps(body)
    }
