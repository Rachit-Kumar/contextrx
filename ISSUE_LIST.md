# Issue List & Incident Reports

This document tracks technical defects, root causes, system errors, and recommended resolutions across ContextRx.

---

## [ISS-001] AI Response Formatting Error (HTTP 502 Bad Gateway)

- **Date Logged:** 2026-09-10
- **Severity:** High
- **Component:** Backend / API Gateway Lambda (`backend/lambda_context_engine.py`)
- **Status:** Open (Investigated — No code changes applied per instruction)

---

### 1. Error Description
When triggering context reconstruction from the frontend UI (clicking **Reconstruct Context**), the query fails with the following error banner:

> **Context Reconstruction Error**  
> `AI response formatting error. Please retry.`

---

### 2. Trace & Location of Failure
- **Frontend Source:** [`frontend/src/api.js`](file:///d:/Code-Learning/Hackathon-r2/frontend/src/api.js#L20-L31)  
  Throws `err.error` when the API Gateway returns a non-200 HTTP response.
- **Frontend Display:** [`frontend/src/components/ContextOutput.jsx`](file:///d:/Code-Learning/Hackathon-r2/frontend/src/components/ContextOutput.jsx#L241-L257)  
  Renders the error banner in `<div className="error-block">`.
- **Backend Origin:** [`backend/lambda_context_engine.py`](file:///d:/Code-Learning/Hackathon-r2/backend/lambda_context_engine.py#L309-L310)  
  ```python
  except (json.JSONDecodeError, ValueError) as e:
      return _response(502, {"error": "AI response formatting error. Please retry.", "detail": str(e)})
  ```

---

### 3. Root Cause Analysis
The error occurs when the backend Lambda successfully invokes the LLM (Google Gemini or AWS Bedrock Claude), but the raw response returned by the model fails validation inside `parse_ai_json(raw_text)`:

1. **Unescaped Quotes or Control Characters in JSON String Fields:**
   * When the LLM extracts verbatim clinical text containing unescaped quotation marks (e.g., `"point": "Patient reported "mild palpitations" after discharge"`), standard `json.loads()` fails with `JSONDecodeError: Expecting ',' delimiter`.
2. **Output Token Truncation (Max Tokens):**
   * If the synthesis output is lengthy and reaches the maximum output token limit (e.g., `max_tokens: 2048` on Bedrock), the response is cut off mid-payload. The outermost closing curly brace `}` is missing, resulting in `JSONDecodeError: Unterminated string` or `Expecting '}' delimiter`.
3. **Empty or Blocked Model Response:**
   * If Gemini safety filters trigger on sensitive clinical terminology or if the candidate text is empty, `raw_text` evaluates to empty, raising `ValueError("Empty response received from AI model")`.
4. **Fallback Parser Limitations in `parse_ai_json`:**
   * While `parse_ai_json` has fallback attempts (Python `ast.literal_eval` and regex quote replacement), complex malformations (such as unescaped internal double quotes inside JSON string values or trailing commas in arrays) still trigger `JSONDecodeError`.

---

### 4. Proposed Resolutions (For Future Implementation)

1. **Integrate a Fault-Tolerant JSON Parser (e.g., `json_repair`):**
   * Use an automated JSON repair utility (`json-repair` in Python) that automatically closes open brackets, escapes unescaped quotes within strings, and strips trailing commas.
2. **Enforce Strict Schema Enforcement on Gemini:**
   * Use Gemini's `response_schema` parameter with `response_mime_type="application/json"` using Pydantic or `types.Schema` to constrain the token generation process at the decoding layer.
3. **Increase Output Token Window:**
   * Increase `max_tokens` for Bedrock Claude and Gemini to 4096 to prevent mid-stream truncations on complex multi-year patient records.
4. **Automatic Retry on Formatting Failure:**
   * Add an automatic single-retry loop inside Lambda when `JSONDecodeError` is caught before bubbling a 502 error to the user interface.

---

## [ISS-002] Context Query Failed (HTTP 503 Service Unavailable)

- **Date Logged:** 2026-09-11
- **Severity:** High
- **Component:** Backend / API Gateway or Lambda Invocation Layer
- **Status:** Open (Investigated — No code changes applied per instruction)

---

### 1. Error Description

When triggering context reconstruction from the frontend UI (clicking **Analyze Patient History**), the query fails with the following error banner:

> **Context Reconstruction Error**  
> `Context query failed (503)`

---

### 2. Trace & Location of Failure

- **Frontend Source:** [`frontend/src/api.js`](file:///d:/Code-Learning/Hackathon-r2/frontend/src/api.js#L20-L31)  
  The `fetchContext` function receives a non-200 response, parses any JSON error body, and throws:
  ```js
  throw new Error(err.error || `Context query failed (${res.status})`);
  ```
  Since the server returned HTTP 503 and `err.error` was absent or empty, the thrown message is `"Context query failed (503)"`.
- **Frontend Display:** [`frontend/src/components/ContextOutput.jsx`](file:///d:/Code-Learning/Hackathon-r2/frontend/src/components/ContextOutput.jsx#L271-L288)  
  Renders the error banner via `<div className="error-block">`.
- **Backend Origin:** HTTP 503 is returned **before Lambda execution** — either by the AWS API Gateway layer or by the Lambda concurrency/provisioning subsystem.

---

### 3. Root Cause Analysis

Unlike ISS-001 (HTTP 502 — Lambda executed but returned malformed JSON), HTTP 503 is a **Service Unavailable** signal generated upstream, before the Lambda function body runs. Likely causes:

1. **Lambda Cold-Start Throttle / Concurrency Exhaustion:**  
   * If the Lambda function has a reserved concurrency limit (e.g., 1–2 concurrent executions) and multiple requests arrive simultaneously, AWS throttles additional invocations and returns HTTP 503 (TooManyRequestsException mapped by API Gateway as 503 rather than 429).
2. **API Gateway Throttling Limit Exceeded:**  
   * AWS API Gateway default throttle limits (10,000 RPS burst, 5,000 RPS steady) can be overridden at the stage or route level with much lower values (e.g., 1 RPS for a free-tier setup). Exceeding the configured per-route burst results in a 503 response with body `{"message": "Service Unavailable"}`.
3. **Lambda Function Timeout During Provisioned Concurrency Init:**  
   * If the Lambda cold-start initialization exceeds the configured timeout (e.g., 29 seconds for API Gateway proxy integration), the API Gateway itself emits a 503 before the function responds.
4. **Downstream Dependency Timeout (Gemini / Bedrock API call):**  
   * If the Gemini or Bedrock AI inference call inside Lambda hangs or exceeds the function's total timeout window, the Lambda is terminated mid-execution and API Gateway emits 503 to the caller.
5. **Lambda Deployment or Revision Conflict:**  
   * If a new Lambda version was deployed during an active request or if the alias/function ARN is temporarily unavailable during a rollout, API Gateway may briefly return 503.

---

### 4. Proposed Resolutions (For Future Implementation)

1. **Check CloudWatch Lambda Logs:**
   * Navigate to AWS CloudWatch → Log Groups → `/aws/lambda/<function-name>` and filter by the timestamp of the 503 to identify whether the Lambda was throttled (no log entry) or timed out (partial log entry with `Task timed out after X seconds`).
2. **Increase Lambda Timeout:**
   * Raise the Lambda timeout from the default (3s or 6s) to at least 30–60 seconds to accommodate Gemini and Bedrock API latency on complex patient records.
3. **Configure Lambda Reserved Concurrency:**
   * Set a higher reserved concurrency (e.g., 5–10) if the function is throttle-limited, or remove the reserved concurrency cap to allow unrestricted concurrency within account limits.
4. **Add Frontend Retry with Exponential Backoff:**
   * Implement an automatic retry (max 2 attempts) in `fetchContext()` when a 503 is received, with a 1–2 second delay before the second attempt, to handle transient throttle windows gracefully.
5. **Add API Gateway Usage Plan with Higher Burst:**
   * Review and increase the API Gateway stage throttle limit (burst and rate) to prevent gateway-level 503 rejections under normal clinical usage loads.
