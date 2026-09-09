import { useState, useEffect } from "react";
import "./index.css";
import { fetchPatients, fetchContext } from "./api";
import PatientCard from "./components/PatientCard";
import ScenarioInput from "./components/ScenarioInput";
import ContextOutput from "./components/ContextOutput";
import FullRecordViewer from "./components/FullRecordViewer";

function Header() {
  return (
    <header className="header" role="banner">
      <div className="header-logo">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
          <path d="M10 16h4l2-6 4 12 2-6h4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0096b4" />
              <stop offset="1" stopColor="#0050c8" />
            </linearGradient>
          </defs>
        </svg>
        <span className="logo-name">ContextRx</span>
      </div>
      <span className="logo-tagline">Surface what matters now · AI for HealthTech</span>
    </header>
  );
}

export default function App() {
  const [patients, setPatients] = useState([]);
  const [patientsError, setPatientsError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [contextResult, setContextResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queryError, setQueryError] = useState(null);

  // Load patient list on mount
  useEffect(() => {
    fetchPatients()
      .then(setPatients)
      .catch((e) => setPatientsError(e.message));
  }, []);

  function handleSelectPatient(patient) {
    if (selectedPatient?.patient_id === patient.patient_id) return;
    setSelectedPatient(patient);
    setContextResult(null);
    setQueryError(null);
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

  return (
    <div className="app-shell">
      <Header />

      <div className="main-grid">
        {/* Sidebar — patient list */}
        <aside className="sidebar" aria-label="Patient list">
          <div className="sidebar-title">Patients</div>
          {patientsError && (
            <div style={{ color: "#ff9090", fontSize: "0.78rem", padding: "0.5rem" }}>
              Could not load patients: {patientsError}
            </div>
          )}
          <div className="patient-list" role="listbox" aria-label="Select a patient">
            {patients.map((p) => (
              <PatientCard
                key={p.patient_id}
                patient={p}
                isSelected={selectedPatient?.patient_id === p.patient_id}
                onClick={() => handleSelectPatient(p)}
              />
            ))}
          </div>
        </aside>

        {/* Right panel — scenario + output */}
        <div className="right-panel">
          <ScenarioInput
            selectedPatient={selectedPatient}
            onSubmit={handleScenarioSubmit}
            isLoading={isLoading}
          />

          <ContextOutput
            result={contextResult}
            isLoading={isLoading}
            error={queryError}
          />

          {/* Full record viewer — shown below output when a patient is selected */}
          {selectedPatient && !isLoading && (
            <div style={{ padding: "0 2rem 2rem" }}>
              <FullRecordViewer
                patientId={selectedPatient.patient_id}
                patientName={selectedPatient.name}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
