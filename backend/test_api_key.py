"""
ContextRx — API Key & Model Health Check
Verifies that GEMINI_API_KEY is configured and responding using google-genai and gemini-3.7-flash.
Usage:
    python test_api_key.py
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Configure utf-8 stdout for Windows terminals
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# 1. Load .env
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

api_key = os.environ.get("GEMINI_API_KEY")

print("=" * 60)
print(" ContextRx API Key & Connectivity Verification")
print("=" * 60)

if not api_key:
    print("\n[FAILED] GEMINI_API_KEY is not set in backend/.env")
    sys.exit(1)

masked_key = api_key[:6] + "..." + api_key[-4:] if len(api_key) > 10 else "***"
print(f"[OK] Found GEMINI_API_KEY: {masked_key}")

# 2. Check google-genai import
try:
    from google import genai
    from google.genai import types
    print("[OK] Successfully loaded new 'google-genai' SDK")
except ImportError as e:
    print(f"\n[FAILED] Failed to import google-genai: {e}")
    print("Run: pip install google-genai")
    sys.exit(1)

# 3. Test API Call with gemini-3.7-flash
model_name = os.environ.get("GEMINI_MODEL", "gemini-3.7-flash")
print(f"[OK] Target Model: {model_name}")
print("\nSending test prompt to Gemini API...")

try:
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=model_name,
        contents="Respond with: 'ContextRx API is healthy and connected!'",
        config=types.GenerateContentConfig(
            temperature=0.1
        )
    )
    
    print("\n[SUCCESS] API Key is valid and active!")
    print("-" * 60)
    print(f"Gemini Response: {response.text.strip()}")
    print("-" * 60)

except Exception as e:
    print(f"\n[FAILED] API Call Failed: {e}")
    sys.exit(1)
