"""
ContextRx — DynamoDB Seeder Script
Populates the AWS DynamoDB 'PatientRecords' table with mock patient data.
Requires AWS credentials either in backend/.env or configured via 'aws configure'.
"""

import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import boto3
from botocore.exceptions import NoCredentialsError, ClientError

# Load environment variables from .env
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
TABLE_NAME = os.getenv("DYNAMODB_TABLE_NAME", "PatientRecords")
AWS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET = os.getenv("AWS_SECRET_ACCESS_KEY")

DATA_PATH = Path(__file__).parent.parent / "data" / "patients.json"

print("=" * 60)
print("  ContextRx — DynamoDB Patient Seeder")
print("=" * 60)
print(f"Region: {AWS_REGION}")
print(f"Target Table: {TABLE_NAME}")
print(f"Source JSON: {DATA_PATH}\n")

if not DATA_PATH.exists():
    print(f"ERROR: Data file not found at {DATA_PATH}")
    sys.exit(1)

with open(DATA_PATH, "r", encoding="utf-8") as f:
    patients = json.load(f)

print(f"Loaded {len(patients)} patient records from disk.")

# Configure session
try:
    if AWS_KEY and AWS_SECRET:
        session = boto3.Session(
            aws_access_key_id=AWS_KEY,
            aws_secret_access_key=AWS_SECRET,
            region_name=AWS_REGION
        )
    else:
        session = boto3.Session(region_name=AWS_REGION)

    dynamodb = session.resource("dynamodb")
    table = dynamodb.Table(TABLE_NAME)

    # Test access by checking table status
    table.load()
    print(f"Connected to DynamoDB table '{TABLE_NAME}' (Status: {table.table_status})")

    # Seed items
    for idx, p in enumerate(patients, 1):
        pid = p.get("patient_id")
        name = p.get("demographics", {}).get("name", "Unknown")
        print(f"  [{idx}/{len(patients)}] Seeding {pid} ({name})...", end=" ")
        table.put_item(Item=p)
        print("✓")

    print("\nSUCCESS: All patients seeded into DynamoDB successfully!")

except NoCredentialsError:
    print("\n" + "!" * 60)
    print("AUTHENTICATION ERROR: Unable to locate AWS credentials.")
    print("!" * 60)
    print("\nTo fix this, choose one of these two options:\n")
    print("OPTION 1: Put your AWS keys in 'backend/.env':")
    print("  AWS_ACCESS_KEY_ID=your_access_key_here")
    print("  AWS_SECRET_ACCESS_KEY=your_secret_key_here")
    print("  AWS_REGION=ap-south-1\n")
    print("OPTION 2: Run AWS CLI configuration:")
    print("  aws configure\n")
    print("If you haven't created IAM Access Keys yet:")
    print("  1. Go to AWS Console -> IAM -> Users -> (Your User) -> Security credentials")
    print("  2. Click 'Create access key' -> Choose 'CLI' -> Copy keys")
    sys.exit(1)

except ClientError as e:
    err_code = e.response.get("Error", {}).get("Code")
    if err_code == "ResourceNotFoundException":
        print(f"\nERROR: Table '{TABLE_NAME}' does not exist in region '{AWS_REGION}'.")
        print("Please create the table first in the DynamoDB AWS Console:")
        print("  - Table name: PatientRecords")
        print("  - Partition key: patient_id (String)")
    else:
        print(f"\nAWS CLIENT ERROR ({err_code}): {e}")
    sys.exit(1)

except Exception as e:
    print(f"\nUNEXPECTED ERROR: {e}")
    sys.exit(1)
