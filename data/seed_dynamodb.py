"""
Seed script: reads data/patients.json and writes all patients to DynamoDB PatientRecords table.
Usage:
  set DYNAMODB_TABLE_NAME=PatientRecords
  set AWS_REGION=ap-south-1
  python seed_dynamodb.py

Safe to re-run — uses put_item (upsert).
"""

import json
import os
import sys
import boto3
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────────────
TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "PatientRecords")
AWS_REGION = os.environ.get("AWS_REGION", "ap-south-1")
PATIENTS_FILE = Path(__file__).parent / "patients.json"

REQUIRED_FIELDS = ["patient_id", "demographics", "encounters", "medications", "lab_reports"]


def validate_patient(patient: dict) -> list[str]:
    """Returns a list of validation errors, empty if valid."""
    errors = []
    for field in REQUIRED_FIELDS:
        if field not in patient:
            errors.append(f"Missing required field: '{field}'")
    if "patient_id" in patient and not patient["patient_id"].strip():
        errors.append("patient_id must not be empty")
    return errors


def seed():
    print(f"\nContextRx — DynamoDB Seed Script")
    print(f"Table  : {TABLE_NAME}")
    print(f"Region : {AWS_REGION}")
    print(f"File   : {PATIENTS_FILE}\n")

    # Load JSON
    if not PATIENTS_FILE.exists():
        print(f"ERROR: {PATIENTS_FILE} not found.")
        sys.exit(1)

    with open(PATIENTS_FILE, "r", encoding="utf-8") as f:
        patients = json.load(f)

    print(f"Loaded {len(patients)} patient(s) from JSON.")

    # Validate all patients before writing anything
    all_valid = True
    for i, patient in enumerate(patients):
        errors = validate_patient(patient)
        if errors:
            all_valid = False
            print(f"\n[Patient {i+1}] VALIDATION FAILED:")
            for err in errors:
                print(f"  - {err}")

    if not all_valid:
        print("\nAborting — fix validation errors before seeding.")
        sys.exit(1)

    print("All patients passed validation.\n")

    # Connect to DynamoDB
    dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
    table = dynamodb.Table(TABLE_NAME)

    # Seed each patient
    success_count = 0
    for patient in patients:
        pid = patient["patient_id"]
        try:
            table.put_item(Item=patient)
            print(f"  ✓ Seeded: {pid} ({patient['demographics']['name']})")
            success_count += 1
        except Exception as e:
            print(f"  ✗ FAILED: {pid} — {e}")

    print(f"\nDone: {success_count}/{len(patients)} patients seeded to '{TABLE_NAME}'.")


if __name__ == "__main__":
    seed()
