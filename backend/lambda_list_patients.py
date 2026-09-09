import json
import os
import boto3
from boto3.dynamodb.conditions import Key

# Initialise DynamoDB
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
table = dynamodb.Table(os.environ.get("DYNAMODB_TABLE_NAME", "PatientRecords"))


def lambda_handler(event, context):
    """
    GET /patients
    Returns a lightweight list of patients for the selector UI.
    Does NOT return full records or planted_critical_details.
    """
    try:
        result = table.scan(
            ProjectionExpression="patient_id, demographics"
        )
        items = result.get("Items", [])

        patients = []
        for item in items:
            demo = item.get("demographics", {})
            patients.append({
                "patient_id": item["patient_id"],
                "name": demo.get("name", "Unknown"),
                "age": demo.get("age", ""),
                "sex": demo.get("sex", ""),
                "blood_group": demo.get("blood_group", "")
            })

        # Stable sort by patient_id for consistent ordering
        patients.sort(key=lambda p: p["patient_id"])

        return _response(200, {"patients": patients})

    except Exception as e:
        return _response(500, {"error": "Failed to fetch patients", "detail": str(e)})


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,GET"
        },
        "body": json.dumps(body)
    }
