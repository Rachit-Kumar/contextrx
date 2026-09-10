import json
import re
import ast

def parse_ai_json(raw_text: str) -> dict:
    if not raw_text:
        raise ValueError("Empty response from AI")
        
    fence_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', raw_text, re.DOTALL)
    if fence_match:
        raw_text = fence_match.group(1).strip()
    else:
        raw_text = raw_text.strip()

    brace_start = raw_text.find('{')
    brace_end = raw_text.rfind('}')
    if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
        raw_text = raw_text[brace_start:brace_end + 1]

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        pass

    try:
        py_text = re.sub(r'\btrue\b', 'True', raw_text)
        py_text = re.sub(r'\bfalse\b', 'False', py_text)
        py_text = re.sub(r'\bnull\b', 'None', py_text)
        parsed = ast.literal_eval(py_text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    try:
        fixed = re.sub(r"(?<!\\)'", '"', raw_text)
        return json.loads(fixed)
    except Exception:
        pass

    return json.loads(raw_text)

# Test with single-quoted string
test_s = "{'discrepancies': [{'type': 'Omitted Allergy'}], 'relevant_context': [{'point': 'Penicillin allergy', 'critical': true}], 'excluded_summary': 'None'}"
res = parse_ai_json(test_s)
print("Parsed successfully:", res)
assert res["discrepancies"][0]["type"] == "Omitted Allergy"
assert res["relevant_context"][0]["critical"] is True
print("All assertions passed!")
