import { useState, useEffect } from "react";
import "./index.css";
import { fetchPatients, fetchContext } from "./api";
import PatientCard from "./components/PatientCard";
import ScenarioInput from "./components/ScenarioInput";
import ContextOutput from "./components/ContextOutput";
import FullRecordViewer from "./components/FullRecordViewer";

function Header({
  onTriggerQuickPitch,
  onExportSBAR,
  onPrintReport,
  onToggleMobileRoster,
  selectedPatient,
  hasResult,
}) {
  return (
    <header className="header" role="banner">
      <div className="header-left">
        <button
          type="button"
          className="btn-mobile-roster"
          onClick={onToggleMobileRoster}
          aria-label="Toggle patient selection roster"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="mobile-roster-text">
            {selectedPatient ? selectedPatient.name.split(" ")[0] : "Roster"}
          </span>
        </button>

        <div className="header-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
            <path
              d="M8 16h4l2-6 4 12 2-6h4"
              stroke="#ffffff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0284c7" />
                <stop offset="1" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
          </svg>
          <span className="logo-name">Context<span>Rx</span></span>
        </div>

        <div className="header-status-pill">
          <span className="status-pulse-dot" />
          <span className="status-pill-text">Gemini 3.7 Flash · Clinical EHR</span>
        </div>
      </div>

      <div className="header-right">
        <button
          type="button"
          className="btn-pitch-demo"
          onClick={onTriggerQuickPitch}
          title="1-Click Pitch Demo: Runs Arjun Mehta surgery case to demonstrate hidden allergy discovery"
        >
          <span>⚡</span>
          <span className="btn-label-responsive">Pitch Demo</span>
        </button>

        <button
          type="button"
          className="btn-sbar-export"
          onClick={onExportSBAR}
          disabled={!hasResult}
          title={hasResult ? "Copy clinical briefing in standardized SBAR format" : "Run a query first to export SBAR"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span className="btn-label-responsive">SBAR</span>
        </button>

        <button
          type="button"
          className="btn-sbar-export"
          onClick={onPrintReport}
          disabled={!hasResult}
          title={hasResult ? "Download or print official clinical clearance report (PDF)" : "Run a query first to print report"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <path d="M6 14h12v8H6z" />
          </svg>
          <span className="btn-label-responsive">PDF</span>
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const [patients, setPatients] = useState([]);
  const [patientsError, setPatientsError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [forcedScenario, setForcedScenario] = useState("");
  const [contextResult, setContextResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [highlightSource, setHighlightSource] = useState(null);
  const [isRecordViewerOpen, setIsRecordViewerOpen] = useState(false);
  const [isMobileRosterOpen, setIsMobileRosterOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Load patient roster on mount
  useEffect(() => {
    fetchPatients()
      .then((data) => {
        setPatients(data);
        if (data.length > 0) {
          setSelectedPatient((prev) => prev || data[0]);
        }
      })
      .catch((e) => setPatientsError(e.message));
  }, []);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  function handleSelectPatient(patient) {
    if (selectedPatient?.patient_id === patient.patient_id) {
      setIsMobileRosterOpen(false);
      return;
    }
    setSelectedPatient(patient);
    setContextResult(null);
    setQueryError(null);
    setHighlightSource(null);
    setIsMobileRosterOpen(false);
  }

  async function handleScenarioSubmit(scenario) {
    if (!selectedPatient) return;
    setIsLoading(true);
    setQueryError(null);
    setContextResult(null);

    try {
      const result = await fetchContext(selectedPatient.patient_id, scenario);
      setContextResult(result);
    } catch (e) {
      setQueryError(e.message || "An error occurred. Please retry.");
    } finally {
      setIsLoading(false);
    }
  }

  // 1-Click Quick Pitch Demo: Arjun Mehta + Pre-surgery prep
  function handleTriggerQuickPitch() {
    const targetPatient = patients.find((p) => p.patient_id === "patient_001") || patients[0];
    if (targetPatient) {
      setSelectedPatient(targetPatient);
    }
    const pitchScenario =
      "Patient is being prepped for elective surgery. What does the surgical and anaesthesia team need to know right now to ensure patient safety?";
    setForcedScenario(pitchScenario);
    setIsMobileRosterOpen(false);

    if (targetPatient) {
      setIsLoading(true);
      setQueryError(null);
      setContextResult(null);
      fetchContext(targetPatient.patient_id, pitchScenario)
        .then((result) => {
          setContextResult(result);
          showToast("🎯 Pitch Demo Loaded: Hidden Penicillin Allergy Identified!");
        })
        .catch((e) => {
          setQueryError(e.message || "Query failed");
        })
        .finally(() => setIsLoading(false));
    }
  }

  function handlePrintReport() {
    if (!contextResult) return;
    window.print();
  }

  // Clickable citation jump
  function handleSelectSource(source) {
    setHighlightSource(source);
    setIsRecordViewerOpen(true);
    const elem = document.getElementById("full-record-section");
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    showToast(`Navigated to source note: ${source}`);
  }

  // Format AI output to hospital SBAR handoff
  function handleExportSBAR() {
    if (!contextResult || !selectedPatient) return;

    const criticalItems = contextResult.relevant_context?.filter((c) => c.critical) || [];
    const regularItems = contextResult.relevant_context?.filter((c) => !c.critical) || [];

    const sbarText = `=== CLINICAL HANDOFF REPORT (SBAR) ===
Date/Time: ${new Date().toLocaleString()}
Hospital: ST. JUDE MEDICAL CENTER
System: ContextRx Intelligent EHR Reconstruction

[SITUATION]
Patient: ${selectedPatient.name} (Age: ${selectedPatient.age}, Sex: ${selectedPatient.sex}, Blood: ${selectedPatient.blood_group})
Clinical Scenario: ${contextResult.scenario || "Context Reconstruction"}

[BACKGROUND]
Patient ID: ${selectedPatient.patient_id}
Electronic Health Record reviewed: ${contextResult.relevant_context?.length || 0} pertinent clinical findings extracted.

[ASSESSMENT - CRITICAL SAFETY FINDINGS]
${
  criticalItems.length > 0
    ? criticalItems.map((c, i) => `${i + 1}. [CRITICAL ALERT] ${c.point}\n   Source: ${c.source}\n   Why it matters: ${c.relevance_reason}`).join("\n\n")
    : "No acute critical contraindications flagged."
}

[PERTINENT CLINICAL HISTORY]
${
  regularItems.map((c, i) => `${i + 1}. ${c.point}\n   Source: ${c.source}`).join("\n")
}

[RECOMMENDATION / ACTION]
1. Immediate verbal verification of flagged allergies/contraindications with patient & team.
2. Clinical reconciliation with attending physician.
3. Excluded non-actionable background: ${contextResult.excluded_summary || "None"}
======================================`;

    navigator.clipboard.writeText(sbarText).then(() => {
      showToast("✓ Clinical SBAR Handoff copied to clipboard!");
    });
  }

  const filteredPatients = patients.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.patient_id.toLowerCase().includes(q) ||
      p.sex.toLowerCase().includes(q) ||
      String(p.age).includes(q) ||
      (p.blood_group && p.blood_group.toLowerCase().includes(q))
    );
  });

  return (
    <div className="app-shell">
      <Header
        onTriggerQuickPitch={handleTriggerQuickPitch}
        onExportSBAR={handleExportSBAR}
        onPrintReport={handlePrintReport}
        onToggleMobileRoster={() => setIsMobileRosterOpen((prev) => !prev)}
        selectedPatient={selectedPatient}
        hasResult={!!contextResult}
      />

      {/* Backdrop for mobile drawer */}
      {isMobileRosterOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setIsMobileRosterOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Official Hospital Print Header (Visible ONLY when printing to PDF) */}
      {contextResult && selectedPatient && (
        <div className="print-hospital-header">
          <div className="print-header-top">
            <div>
              <div className="print-hospital-name">ST. JUDE CLINICAL HEALTH SYSTEM</div>
              <div className="print-doc-title">PATIENT CONTEXT RECONSTRUCTION & SAFETY AUDIT (SBAR)</div>
            </div>
            <div className="print-timestamp-box">
              <div><strong>Generated:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
              <div><strong>Engine:</strong> Gemini 3.7 Flash Grounded EHR</div>
            </div>
          </div>
          <div className="print-demographics-grid">
            <div><strong>Patient:</strong> {selectedPatient.name}</div>
            <div><strong>MRN:</strong> {selectedPatient.patient_id}</div>
            <div><strong>Age / Sex:</strong> {selectedPatient.age}y · {selectedPatient.sex}</div>
            <div><strong>Blood Group:</strong> {selectedPatient.blood_group}</div>
          </div>
          <div className="print-scenario-box">
            <strong>Clinical Query / Intent:</strong> {contextResult.scenario}
          </div>
        </div>
      )}

      <div className="main-grid">
        {/* Sidebar — patient directory (acts as drawer on mobile) */}
        <aside
          className={`sidebar${isMobileRosterOpen ? " mobile-open" : ""}`}
          aria-label="Patient roster"
        >
          <div className="sidebar-header">
            <div className="sidebar-title-row">
              <span className="sidebar-title">Patient Roster</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="patient-count-badge">{filteredPatients.length} Active</span>
                <button
                  type="button"
                  className="btn-mobile-close"
                  onClick={() => setIsMobileRosterOpen(false)}
                  aria-label="Close roster"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="patient-search-wrapper">
              <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="patient-search-input"
                placeholder="Search patient, age, blood..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter patients"
              />
            </div>
          </div>

          {patientsError && (
            <div style={{ color: "#dc2626", fontSize: "0.78rem", padding: "0.5rem" }}>
              Could not load patients: {patientsError}
            </div>
          )}

          <div className="patient-list" role="listbox" aria-label="Select a patient">
            {filteredPatients.map((p) => (
              <PatientCard
                key={p.patient_id}
                patient={p}
                isSelected={selectedPatient?.patient_id === p.patient_id}
                onClick={() => handleSelectPatient(p)}
              />
            ))}
          </div>
        </aside>

        {/* Right panel — clinical scenario & outputs */}
        <div className="right-panel">
          <ScenarioInput
            key={selectedPatient?.patient_id}
            selectedPatient={selectedPatient}
            onSubmit={handleScenarioSubmit}
            isLoading={isLoading}
            forcedScenario={forcedScenario}
          />

          <ContextOutput
            result={contextResult}
            isLoading={isLoading}
            error={queryError}
            onSelectSource={handleSelectSource}
          />

          {/* Structured Clinical EHR Chart */}
          {selectedPatient && !isLoading && (
            <div className="chart-wrapper-outer">
              <FullRecordViewer
                key={selectedPatient.patient_id}
                patientId={selectedPatient.patient_id}
                patientName={selectedPatient.name}
                highlightSource={highlightSource}
                isOpen={isRecordViewerOpen}
                onToggleOpen={setIsRecordViewerOpen}
              />
            </div>
          )}

          {/* Official Doctor Sign-off Box (Visible only when printing) */}
          <div className="print-signoff-box">
            <div className="print-signoff-line">Attending Physician Reviewer Signature: ____________________________________</div>
            <div className="print-signoff-line">Medical License #: ___________________ Date / Time: ________________________</div>
          </div>
        </div>
      </div>

      {/* Toast popup */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
