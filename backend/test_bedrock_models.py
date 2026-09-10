"""
ContextRx — Bedrock Model Access Tester
Tests which Anthropic Claude models your AWS credentials can invoke.
Usage: python test_bedrock_models.py <AWS_ACCESS_KEY_ID> <AWS_SECRET_ACCESS_KEY> [REGION]
"""
import sys
import json
import boto3
import botocore.config

MODELS_TO_TEST = [
    "anthropic.claude-3-5-haiku-20241022-v1:0",
    "us.anthropic.claude-3-5-haiku-20241022-v1:0",
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-instant-v1",
]

REGIONS_TO_TEST = ["us-east-1", "us-west-2", "ap-south-1"]


def test_model(client, model_id):
    """Try a minimal invoke on a model and return status."""
    try:
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 10,
            "temperature": 0.0,
            "messages": [
                {"role": "user", "content": "Say hello in 3 words."}
            ]
        })
        response = client.invoke_model(modelId=model_id, body=body)
        response_body = json.loads(response["body"].read())
        text = response_body["content"][0]["text"]
        return True, text.strip()
    except Exception as e:
        err = str(e)
        if "AccessDeniedException" in err:
            return False, "ACCESS DENIED (not enabled)"
        elif "ResourceNotFoundException" in err or "end of its life" in err:
            return False, "MODEL NOT FOUND / EOL"
        elif "ValidationException" in err:
            return False, f"VALIDATION ERROR: {err[:80]}"
        else:
            return False, f"ERROR: {err[:100]}"


def main():
    if len(sys.argv) < 3:
        print("Usage: python test_bedrock_models.py <AWS_ACCESS_KEY_ID> <AWS_SECRET_ACCESS_KEY> [REGION]")
        print("  If REGION is omitted, tests us-east-1, us-west-2, and ap-south-1")
        sys.exit(1)

    access_key = sys.argv[1]
    secret_key = sys.argv[2]
    regions = [sys.argv[3]] if len(sys.argv) > 3 else REGIONS_TO_TEST

    cfg = botocore.config.Config(
        read_timeout=15,
        connect_timeout=5,
        retries={"max_attempts": 0}
    )

    print("=" * 70)
    print("  ContextRx — AWS Bedrock Model Access Tester")
    print("=" * 70)
    print(f"  Key: {access_key[:8]}...{access_key[-4:]}")
    print(f"  Regions to test: {', '.join(regions)}")
    print("=" * 70)

    working_models = []

    for region in regions:
        print(f"\n── Region: {region} ──")
        try:
            client = boto3.client(
                "bedrock-runtime",
                region_name=region,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=cfg
            )
        except Exception as e:
            print(f"  ✗ Could not create client: {e}")
            continue

        for model_id in MODELS_TO_TEST:
            ok, msg = test_model(client, model_id)
            status = "✓" if ok else "✗"
            print(f"  {status} {model_id}")
            print(f"    → {msg}")
            if ok:
                working_models.append((region, model_id))

    print("\n" + "=" * 70)
    if working_models:
        print("  ✅ WORKING MODELS:")
        for region, model_id in working_models:
            print(f"     Region: {region}  Model: {model_id}")
        best = working_models[0]
        print(f"\n  🏆 RECOMMENDED: BEDROCK_REGION={best[0]}  BEDROCK_MODEL_ID={best[1]}")
    else:
        print("  ❌ No working models found. Check:")
        print("     1. Are credentials correct?")
        print("     2. Go to AWS Console → Bedrock → Model Access → Enable Claude models")
    print("=" * 70)


if __name__ == "__main__":
    main()
