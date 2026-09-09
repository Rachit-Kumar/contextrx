import json
import os
from decimal import Decimal
import boto3

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
    GET /patients/{patient_id}/record
    Returns the full patient record for the Full Record viewer.
    Strips planted_critical_details (internal-only).
    """
    try:
        http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "")
        if http_method == "OPTIONS":
            return _response(200, {"status": "ok"})

        # Extract patient_id from path parameters
        path_params = event.get("pathParameters") or {}
        patient_id = (path_params.get("patient_id") or "").strip()

        if not patient_id:
            return _response(400, {"error": "patient_id is required in path"})

        result = table.get_item(Key={"patient_id": patient_id})
        patient = result.get("Item")
        if not patient:
            return _response(404, {"error": f"Patient '{patient_id}' not found"})

        # Exclude internal planted_critical_details from API response
        safe_record = {k: v for k, v in patient.items() if k != "planted_critical_details"}

        return _response(200, safe_record)

    except Exception as e:
        return _response(500, {"error": "Failed to fetch patient record", "detail": str(e)})


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "OPTIONS,GET"
        },
        "body": json.dumps(body, default=decimal_default)
    }
