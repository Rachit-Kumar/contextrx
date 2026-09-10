import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import PatientHeader from "./PatientHeader";
import PatientClinicalCards from "./PatientClinicalCards";
import FullRecordViewer from "./FullRecordViewer";
import { fetchPatients } from "../api";

/**
 * PatientDashboard — Restricted portal shown to users with role="patient".
 *
 * Shows ONLY:
 *   - Personal patient header (name, demographics)
 *   - Active Medications & Allergies/Conditions cards (PatientClinicalCards)
 *   - Doctor's notes / EHR chart (FullRecordViewer)
 *
 * Hidden / absent:
 *   - Patient roster sidebar
 *   - AI Scenario input & ContextOutput (clinical analysis tools)
 *   - Pitch Demo / PDF export buttons
 *   - Any multi-patient view or FindingsFilterBar
 */
export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const [patient, setPatient] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Map from patientId (e.g. "patient_001") to the API-style id (e.g. "P001")
  // We load the roster once and find the matching patient object
  useEffect(() => {
    if (!user?.patientId) return;
    fetchPatients()
      .then((patients) => {
        // The stored patientId might be "patient_001" or "P001" — try both
        const found =
          patients.find(
            (p) =>
              p.patient_id === user.patientId ||
              p.patient_id?.toLowerCase() === user.patientId?.toLowerCase()
          ) || null;
        setPatient(found);
        if (!found) {
          setLoadError("Your patient record could not be found. Please contact support.");
        }
      })
      .catch((e) => setLoadError(e.message));
  }, [user]);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  const initials = user?.displayName
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2) || "?";

  return (
    <div className="patient-portal-shell">
      {/* ── Portal Header ── */}
      <header className="patient-portal-header" role="banner">
        <div className="patient-portal-header-left">
          {/* Logo */}
          <div className="header-logo">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="url(#portalLogoGrad)" />
              <path
                d="M8 16h4l2-6 4 12 2-6h4"
                stroke="#ffffff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="portalLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0284c7" />
                  <stop offset="1" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
            </svg>
            <span className="logo-name">
              Context<span>Rx</span>
            </span>
          </div>

          {/* Portal badge */}
          <div className="patient-portal-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            My Health Portal
          </div>
        </div>

        <div className="patient-portal-header-right">
          {/* User avatar + name */}
          <div className="patient-portal-user-info">
            <div className="patient-portal-avatar" aria-hidden="true">{initials}</div>
            <span className="patient-portal-username">{user?.displayName}</span>
          </div>

          {/* Logout */}
          <button
            type="button"
            className="logout-btn"
            onClick={logout}
            title="Sign out of patient portal"
            id="patient-logout-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="patient-portal-main" role="main">
        {loadError ? (
          <div className="patient-portal-error">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{loadError}</p>
          </div>
        ) : !patient ? (
          <div className="patient-portal-loading">
            <span className="spinner" style={{ borderColor: "rgba(2, 132, 199, 0.2)", borderTopColor: "#0284c7", width: 28, height: 28 }} />
            <span>Loading your health record…</span>
          </div>
        ) : (
          <>
            {/* Patient demographics header */}
            <PatientHeader patient={patient} />

            {/* Welcome greeting */}
            <div className="patient-portal-greeting">
              <div className="patient-portal-greeting-inner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>
                  Welcome back, <strong>{user?.displayName?.split(" ")[0]}</strong>. Here is your personal health summary.
                </span>
              </div>
            </div>

            {/* Clinical summary cards — only shows medications & allergies cards */}
            <section className="patient-portal-section" aria-label="Clinical summary">
              <PatientClinicalCards patient={patient} patientId={patient.patient_id} />
            </section>

            {/* EHR Chart — Doctor's notes & encounter history */}
            <section
              className="patient-portal-section patient-portal-ehr-section"
              id="patient-ehr-section"
              aria-label="Health record and doctor's notes"
            >
              <FullRecordViewer
                key={patient.patient_id}
                patientId={patient.patient_id}
                patientName={patient.name}
                highlightSource={null}
                isOpen={isRecordOpen}
                onToggleOpen={setIsRecordOpen}
              />
            </section>
          </>
        )}
      </main>

      {/* Toast */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
