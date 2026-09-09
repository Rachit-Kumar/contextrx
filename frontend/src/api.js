const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * Fetch list of patients (lightweight summary only).
 * @returns {Promise<Array>} Array of { patient_id, name, age, sex, blood_group }
 */
export async function fetchPatients() {
  const res = await fetch(`${BASE_URL}/patients`);
  if (!res.ok) throw new Error(`Failed to fetch patients (${res.status})`);
  const data = await res.json();
  return data.patients || [];
}

/**
 * Query Gemini for relevant context given a patient and scenario.
 * @param {string} patientId
 * @param {string} scenario
 * @returns {Promise<Object>} { patient_id, patient_name, scenario, relevant_context, excluded_summary }
 */
export async function fetchContext(patientId, scenario) {
  const res = await fetch(`${BASE_URL}/context-query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patient_id: patientId, scenario }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Context query failed (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch the full patient record for the Full Record Viewer.
 * @param {string} patientId
 * @returns {Promise<Object>} Full patient record object
 */
export async function fetchFullRecord(patientId) {
  const res = await fetch(`${BASE_URL}/patients/${patientId}/record`);
  if (!res.ok) throw new Error(`Failed to fetch record (${res.status})`);
  return res.json();
}
