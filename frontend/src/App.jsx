import { useState, useEffect } from "react";
import "./index.css";
import { fetchPatients, fetchContext } from "./api";
import PatientCard from "./components/PatientCard";
import ScenarioInput from "./components/ScenarioInput";
import ContextOutput from "./components/ContextOutput";
import FullRecordViewer from "./components/FullRecordViewer";
import PatientHeader from "./components/PatientHeader";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { DoctorLoginPage, PatientLoginPage } from "./components/LoginPage";
import PatientDashboard from "./components/PatientDashboard";

function Header({
  onTriggerQuickPitch,
  onExportSBAR,
  onPrintReport,
  onToggleSidebar,
  isSidebarOpen,
  selectedPatient,
  hasResult,
  activeModel,
  user,
  onLogout,
}) {
  const isGemini = activeModel?.toLowerCase().includes("gemini");

  return (
    <header className="header" role="banner">
      <div className="header-left">
        <button
          type="button"
          className={`btn-sidebar-toggle ${isSidebarOpen ? "open" : "collapsed"}`}
          onClick={onToggleSidebar}
          aria-expanded={isSidebarOpen}
          aria-label={isSidebarOpen ? "Collapse patient roster sidebar" : "Expand patient roster sidebar"}
          title={isSidebarOpen ? "Collapse patient roster sidebar" : "Expand patient roster sidebar"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
          <span className="sidebar-toggle-text">
            {isSidebarOpen ? "Roster" : (selectedPatient ? selectedPatient.name.split(" ")[0] : "Roster")}
          </span>
          <span className="sidebar-toggle-arrow">
            {isSidebarOpen ? "◀" : "▶"}
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

        {/* User pill + logout */}
        {user && (
          <div className="header-user-pill">
            <span className="header-user-avatar" aria-hidden="true">
              {user.displayName?.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </span>
            <span className="header-user-name">{user.displayName}</span>
            <button
              type="button"
              className="logout-btn"
              onClick={onLogout}
              title="Sign out"
              id="doctor-logout-btn"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

// ─── Inner app — consumes auth context ───────────────────────────────────────
function AppInner() {
  const { user, logout, isAuthenticated } = useAuth();
  // "doctor" is the default landing portal; patient can switch
  const [loginPortal, setLoginPortal] = useState("doctor");

  // Not authenticated — show the appropriate login page
  if (!isAuthenticated) {
    return loginPortal === "patient" ? (
      <PatientLoginPage onSwitchToDoctor={() => setLoginPortal("doctor")} />
    ) : (
      <DoctorLoginPage onSwitchToPatient={() => setLoginPortal("patient")} />
    );
  }

  // Patient role → restricted personal health portal
  if (user.role === "patient") return <PatientDashboard />;

  // Doctor role → full clinical dashboard (rendered below)
  return <DoctorDashboard user={user} onLogout={logout} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

// ─── Full doctor dashboard (original App logic, moved here) ──────────────────
function DoctorDashboard({ user, onLogout }) {
  const [patients, setPatients] = useState([]);
  const [patientsError, setPatientsError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [forcedScenario, setForcedScenario] = useState("");
  const [contextResult, setContextResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [highlightSource, setHighlightSource] = useState(null);
  const [isRecordViewerOpen, setIsRecordViewerOpen] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [activeModel, setActiveModel] = useState("Google Gemini 3.6 Flash");

  // Persist selected main tab per patient session (defaults to "analysis")
  const [patientTabs, setPatientTabs] = useState(() => {
    try {
      const stored = sessionStorage.getItem("contextrx_patient_tabs");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const activeMainTab = (selectedPatient && patientTabs[selectedPatient.patient_id]) || "analysis";

  function handleSelectMainTab(tab) {
    if (!selectedPatient) return;
    setPatientTabs((prev) => {
      const next = { ...prev, [selectedPatient.patient_id]: tab };
      try {
        sessionStorage.setItem("contextrx_patient_tabs", JSON.stringify(next));
      } catch {
        // sessionStorage unavailable
      }
      return next;
    });
  }

  // Persist sidebar open/closed state during the session
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      const stored = sessionStorage.getItem("contextrx_sidebar_open");
      if (stored !== null) {
        return stored === "true";
      }
      return typeof window !== "undefined" ? window.innerWidth > 768 : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem("contextrx_sidebar_open", String(isSidebarOpen));
    } catch {
      // sessionStorage unavailable
    }
  }, [isSidebarOpen]);

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
      if (typeof window !== "undefined" && window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      }
      return;
    }
    setSelectedPatient(patient);
    setContextResult(null);
    setQueryError(null);
    setHighlightSource(null);
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  }

  async function handleScenarioSubmit(scenario) {
    if (!selectedPatient) return;
    setIsLoading(true);
    setQueryError(null);
    setContextResult(null);

    try {
      const result = await fetchContext(selectedPatient.patient_id, scenario);
      setContextResult(result);
      if (result?.cognitive_metrics?.provider_used) {
        setActiveModel(result.cognitive_metrics.provider_used);
      }
    } catch (e) {
      setQueryError(e.message || "An error occurred. Please retry.");
    } finally {
      setIsLoading(false);
    }
  }

  // 1-Click Quick Pitch Demo: Arjun Mehta + Pre-surgery prep
  function handleTriggerQuickPitch() {
    const targetPatient =
      patients.find((p) => p.name?.includes("Arjun") || p.patient_id === "P001" || p.patient_id === "patient_001") ||
      patients[0];
    if (targetPatient) {
      setSelectedPatient(targetPatient);
      handleSelectMainTab("analysis");
    }
    const pitchScenario =
      "Patient is being prepped for elective surgery. What does the surgical and anaesthesia team need to know right now to ensure patient safety?";
    setForcedScenario(pitchScenario);
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }

    if (targetPatient) {
      setIsLoading(true);
      setQueryError(null);
      setContextResult(null);
      fetchContext(targetPatient.patient_id, pitchScenario)
        .then((result) => {
          setContextResult(result);
          if (result?.cognitive_metrics?.provider_used) {
            setActiveModel(result.cognitive_metrics.provider_used);
          }
          showToast("🎯 Pitch Demo Loaded: Hidden Penicillin Allergy Identified!");
        })
        .catch((e) => {
          setQueryError(e.message || "Query failed");
        })
        .finally(() => setIsLoading(false));
    }
  }

  function handlePrintReport() {
    if (!contextResult || !selectedPatient) return;

    const now = new Date();
    const dateStr  = now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    const timeStr  = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    const reportId = `CRX-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

    const criticalItems  = contextResult.relevant_context?.filter((c) => c.critical) || [];
    const regularItems   = contextResult.relevant_context?.filter((c) => !c.critical) || [];
    const discrepancies  = contextResult.discrepancies || [];
    const metrics        = contextResult.cognitive_metrics || {};
    const p              = selectedPatient;

    const findingRow = (item, idx, isCritical) => `
      <tr class="${isCritical ? "crit-row" : ""}">
        <td class="col-num">${idx + 1}</td>
        <td class="col-point">${isCritical ? '<span class="crit-pill">CRITICAL</span> ' : ""}${item.point || "—"}</td>
        <td class="col-source">${item.source || "—"}</td>
        <td class="col-reason">${item.relevance_reason || "—"}</td>
      </tr>`;

    const discBlock = (d, i) => `
      <div class="disc-block">
        <div class="disc-header">
          <span class="disc-num">#${i + 1}</span>
          <span class="disc-type">${d.type || "Omitted History"}</span>
          ${d.temporal_gap ? `<span class="disc-gap">${d.temporal_gap} gap</span>` : ""}
        </div>
        <table class="disc-compare">
          <tr>
            <th class="th-claim">Recent Intake Form Claim</th>
            <th class="th-truth">Buried Historical Record</th>
          </tr>
          <tr>
            <td class="claim-body">${d.current_intake_claim || "—"}</td>
            <td class="truth-body">${d.historical_truth || "—"}</td>
          </tr>
        </table>
        ${d.clinical_hazard ? `<div class="disc-hazard"><strong>Clinical Hazard:</strong> ${d.clinical_hazard}</div>` : ""}
      </div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>ContextRx Clinical Report — ${p.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #1a1a2e; background: #fff; line-height: 1.55; }
  @page { size: A4; margin: 16mm 18mm 20mm 18mm; }

  .letterhead { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 3px solid #0284c7; margin-bottom: 12px; }
  .lh-left { display: flex; align-items: center; gap: 12px; }
  .lh-logo { width: 44px; height: 44px; background: linear-gradient(135deg,#0284c7,#1d4ed8); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18pt; font-weight: 900; flex-shrink: 0; }
  .lh-hospital { font-size: 13pt; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
  .lh-sub { font-size: 7.5pt; color: #64748b; letter-spacing: 0.04em; text-transform: uppercase; margin-top: 1px; }
  .lh-right { text-align: right; font-size: 8pt; color: #475569; }
  .lh-report-id { font-weight: 700; font-size: 9pt; color: #0284c7; letter-spacing: 0.04em; }
  .lh-doc-type { display: inline-block; margin-top: 4px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 2px 8px; font-size: 7pt; font-weight: 700; color: #1d4ed8; letter-spacing: 0.06em; text-transform: uppercase; }

  .confidential-bar { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 4px; padding: 4px 10px; font-size: 7.5pt; font-weight: 700; color: #92400e; text-align: center; letter-spacing: 0.05em; margin-bottom: 14px; text-transform: uppercase; }

  .demo-bar { background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; }
  .demo-bar-title { font-size: 7pt; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
  .demo-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px 16px; }
  .demo-cell-label { font-size: 7pt; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .demo-cell-val { font-size: 10pt; font-weight: 700; color: #0f172a; margin-top: 1px; }
  .demo-cell-val.blood { color: #dc2626; }

  .query-box { border: 1.5px solid #e0f2fe; border-left: 4px solid #0284c7; background: #f8fafc; border-radius: 4px; padding: 8px 12px; margin-bottom: 18px; font-size: 9.5pt; }
  .query-box-label { font-size: 7pt; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }

  .section { margin-bottom: 18px; page-break-inside: avoid; }
  .section-head { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 5px; margin-bottom: 8px; font-size: 8.5pt; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
  .section-head.critical   { background: #fef2f2; color: #991b1b; border-left: 4px solid #dc2626; }
  .section-head.regular    { background: #f0fdf4; color: #14532d; border-left: 4px solid #22c55e; }
  .section-head.discrepancy{ background: #fff7ed; color: #92400e; border-left: 4px solid #f97316; }
  .section-head.excluded   { background: #f8fafc; color: #475569; border-left: 4px solid #94a3b8; }
  .section-head.metrics    { background: #f5f3ff; color: #5b21b6; border-left: 4px solid #7c3aed; }

  table.findings { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 4px; }
  table.findings th { background: #f1f5f9; color: #475569; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 5px 8px; border: 1px solid #e2e8f0; text-align: left; }
  table.findings td { padding: 6px 8px; border: 1px solid #e2e8f0; vertical-align: top; line-height: 1.45; }
  table.findings tr.crit-row td { background: #fef9f9; }
  .col-num { width: 28px; text-align: center; color: #94a3b8; font-weight: 600; }
  .col-source { width: 20%; color: #0284c7; font-size: 8.5pt; }
  .col-reason { width: 32%; font-size: 8.5pt; color: #475569; }
  .crit-pill { display: inline-block; background: #dc2626; color: #fff; font-size: 6.5pt; font-weight: 800; padding: 1px 5px; border-radius: 3px; letter-spacing: 0.04em; margin-right: 3px; vertical-align: middle; }

  .disc-block { border: 1.5px solid #fed7aa; border-radius: 5px; margin-bottom: 10px; overflow: hidden; page-break-inside: avoid; }
  .disc-header { background: #fff7ed; padding: 5px 10px; display: flex; gap: 8px; align-items: center; font-size: 8pt; border-bottom: 1px solid #fed7aa; }
  .disc-num { font-weight: 800; color: #c2410c; }
  .disc-type { font-weight: 700; color: #92400e; background: #ffedd5; padding: 1px 6px; border-radius: 3px; font-size: 7.5pt; }
  .disc-gap { color: #b45309; font-size: 7.5pt; }
  table.disc-compare { width: 100%; border-collapse: collapse; }
  table.disc-compare th { padding: 5px 10px; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; text-align: left; }
  .th-claim { background: #fef2f2; color: #991b1b; border-right: 1px solid #fecaca; width: 50%; }
  .th-truth { background: #f0fdf4; color: #14532d; width: 50%; }
  .claim-body { background: #fffbfb; color: #7f1d1d; padding: 7px 10px; border-right: 1px solid #fecaca; font-size: 9pt; vertical-align: top; }
  .truth-body { background: #f7fef9; color: #14532d; padding: 7px 10px; font-size: 9pt; vertical-align: top; }
  .disc-hazard { background: #fffbeb; border-top: 1px solid #fed7aa; padding: 5px 10px; font-size: 8.5pt; color: #78350f; }

  .metrics-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; }
  .metric-cell { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 5px; padding: 6px 10px; text-align: center; }
  .metric-val { font-size: 14pt; font-weight: 800; color: #6d28d9; }
  .metric-label { font-size: 7pt; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }

  .excluded-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 8px 12px; font-size: 9pt; color: #475569; font-style: italic; }

  .signoff { margin-top: 28px; padding-top: 14px; border-top: 2px solid #e2e8f0; page-break-inside: avoid; }
  .signoff-title { font-size: 7.5pt; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }
  .signoff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 28px; }
  .sig-field { border-bottom: 1.5px solid #94a3b8; padding-bottom: 2px; }
  .sig-label { font-size: 7.5pt; color: #94a3b8; margin-top: 4px; }
  .sig-value { font-size: 9pt; font-weight: 600; color: #1e293b; min-height: 22px; }

  .report-footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 7pt; color: #94a3b8; }
  .no-items { font-size: 9pt; color: #64748b; font-style: italic; padding: 6px 0; }
</style>
</head>
<body>
<div class="page">

  <div class="letterhead">
    <div class="lh-left">
      <div class="lh-logo">Rx</div>
      <div>
        <div class="lh-hospital">ST. JUDE CLINICAL HEALTH SYSTEM</div>
        <div class="lh-sub">ContextRx &middot; Intelligent EHR Reconstruction Engine</div>
      </div>
    </div>
    <div class="lh-right">
      <div class="lh-report-id">${reportId}</div>
      <div>${dateStr} &nbsp;&middot;&nbsp; ${timeStr}</div>
      <div class="lh-doc-type">Patient Safety Audit Report (SBAR)</div>
    </div>
  </div>

  <div class="confidential-bar">
    CONFIDENTIAL &mdash; For Authorised Clinical Staff Use Only &mdash; Not to be Shared Without Patient Consent
  </div>

  <div class="demo-bar">
    <div class="demo-bar-title">Patient Demographics</div>
    <div class="demo-grid">
      <div><div class="demo-cell-label">Full Name</div><div class="demo-cell-val">${p.name}</div></div>
      <div><div class="demo-cell-label">MRN / Patient ID</div><div class="demo-cell-val">${p.patient_id}</div></div>
      <div><div class="demo-cell-label">Age &amp; Sex</div><div class="demo-cell-val">${p.age}y &middot; ${p.sex}</div></div>
      <div><div class="demo-cell-label">Blood Group</div><div class="demo-cell-val blood">${p.blood_group || "Unknown"}</div></div>
    </div>
  </div>

  <div class="query-box">
    <div class="query-box-label">Clinical Query / Scenario Intent</div>
    ${contextResult.scenario || "Context Reconstruction"}
  </div>

  <div class="section">
    <div class="section-head metrics">Analysis Metrics</div>
    <div class="metrics-grid">
      <div class="metric-cell"><div class="metric-val">${contextResult.relevant_context?.length || 0}</div><div class="metric-label">Findings Extracted</div></div>
      <div class="metric-cell"><div class="metric-val">${criticalItems.length}</div><div class="metric-label">Critical Alerts</div></div>
      <div class="metric-cell"><div class="metric-val">${discrepancies.length}</div><div class="metric-label">EHR Discrepancies</div></div>
      <div class="metric-cell"><div class="metric-val">${metrics.records_scanned || metrics.total_records || "—"}</div><div class="metric-label">Records Scanned</div></div>
    </div>
  </div>

  ${discrepancies.length > 0 ? `
  <div class="section">
    <div class="section-head discrepancy">EHR Discrepancies Caught (${discrepancies.length})</div>
    ${discrepancies.map((d, i) => discBlock(d, i)).join("")}
  </div>` : ""}

  ${criticalItems.length > 0 ? `
  <div class="section">
    <div class="section-head critical">Critical Safety Findings (${criticalItems.length})</div>
    <table class="findings">
      <thead><tr><th class="col-num">#</th><th>Finding</th><th class="col-source">Source</th><th class="col-reason">Relevance / Why It Matters</th></tr></thead>
      <tbody>${criticalItems.map((item, i) => findingRow(item, i, true)).join("")}</tbody>
    </table>
  </div>` : ""}

  <div class="section">
    <div class="section-head regular">Pertinent Clinical History (${regularItems.length})</div>
    ${regularItems.length > 0 ? `
    <table class="findings">
      <thead><tr><th class="col-num">#</th><th>Finding</th><th class="col-source">Source</th><th class="col-reason">Relevance</th></tr></thead>
      <tbody>${regularItems.map((item, i) => findingRow(item, i, false)).join("")}</tbody>
    </table>` : `<div class="no-items">No additional pertinent history extracted.</div>`}
  </div>

  <div class="section">
    <div class="section-head excluded">Excluded / Filtered Out</div>
    <div class="excluded-box">${contextResult.excluded_summary || "No non-actionable items were excluded from this analysis."}</div>
  </div>

  <div class="section">
    <div class="section-head regular">Recommended Clinical Actions</div>
    <table class="findings" style="font-size:9pt;">
      <thead><tr><th class="col-num">#</th><th>Action Item</th></tr></thead>
      <tbody>
        <tr><td class="col-num">1</td><td>Immediately verbally verify all flagged allergies and contraindications with patient and clinical team.</td></tr>
        <tr><td class="col-num">2</td><td>Reconcile discrepancies with attending physician and update intake form accordingly.</td></tr>
        <tr><td class="col-num">3</td><td>Document any corrections to the electronic health record before proceeding with treatment.</td></tr>
        ${criticalItems.length > 0 ? `<tr><td class="col-num">4</td><td><strong>URGENT:</strong> ${criticalItems.length} critical contraindication(s) flagged &mdash; do not proceed without senior physician sign-off.</td></tr>` : ""}
      </tbody>
    </table>
  </div>

  <div class="signoff">
    <div class="signoff-title">Physician Review &amp; Sign-Off</div>
    <div class="signoff-grid">
      <div><div class="sig-field"><div class="sig-value">&nbsp;</div></div><div class="sig-label">Attending Physician Signature</div></div>
      <div><div class="sig-field"><div class="sig-value">&nbsp;</div></div><div class="sig-label">Printed Name &amp; Medical Registration No.</div></div>
      <div><div class="sig-field"><div class="sig-value">&nbsp;</div></div><div class="sig-label">Designation / Specialty</div></div>
      <div><div class="sig-field"><div class="sig-value">&nbsp;</div></div><div class="sig-label">Date &amp; Time of Review</div></div>
    </div>
  </div>

  <div class="report-footer">
    <span>ContextRx &middot; AI-Assisted EHR Reconstruction &middot; ${activeModel || "Gemini"} &middot; Deterministic Grounding</span>
    <span>Report ID: ${reportId} &nbsp;&middot;&nbsp; Generated: ${dateStr} ${timeStr}</span>
  </div>

</div>
</body>
</html>`;

    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) {
      showToast("Pop-up blocked — please allow pop-ups and try again.");
      return;
    }
    printWin.document.write(html);
    printWin.document.close();
    printWin.onload = () => { setTimeout(() => { printWin.focus(); printWin.print(); }, 600); };
    setTimeout(() => { if (printWin && !printWin.closed) { printWin.focus(); printWin.print(); } }, 1200);
  }

  // Clickable citation jump
  function handleSelectSource(source) {
    setHighlightSource(source);
    setIsRecordViewerOpen(true);
    handleSelectMainTab("ehr");
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
    const q = searchQuery.trim().toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(q);
    const ageMatch = String(p.age).includes(q);
    const bloodMatch = p.blood_group ? p.blood_group.toLowerCase().includes(q) : false;
    const idMatch = p.patient_id?.toLowerCase().includes(q);
    return nameMatch || ageMatch || bloodMatch || idMatch;
  });

  return (
    <div className="app-shell">
      <Header
        onTriggerQuickPitch={handleTriggerQuickPitch}
        onExportSBAR={handleExportSBAR}
        onPrintReport={handlePrintReport}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        selectedPatient={selectedPatient}
        hasResult={!!contextResult}
        activeModel={activeModel}
        user={user}
        onLogout={onLogout}
      />

      {/* Backdrop for mobile collapsible sidebar */}
      {isSidebarOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}



      <div className={`main-grid${!isSidebarOpen ? " sidebar-collapsed" : ""}`}>
        {/* Collapsible Sidebar — patient roster with slide-in animation */}
        <aside
          className={`sidebar ${isSidebarOpen ? "open" : "collapsed"}`}
          aria-label="Patient roster"
          aria-hidden={!isSidebarOpen}
        >
          <div className="sidebar-header">
            <div className="sidebar-title-row">
              <div className="sidebar-title-group">
                <span className="sidebar-title">Patient Roster</span>
                <span className="patient-count-badge">{filteredPatients.length} Active</span>
              </div>
              <button
                type="button"
                className="btn-sidebar-collapse"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span className="collapse-btn-text">Collapse</span>
              </button>
            </div>

            {/* Single Search Bar Filtering by Name, Age, or Blood Group */}
            <div className="patient-search-wrapper">
              <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="patient-search-input"
                placeholder="Search by name, age, or blood group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter patient roster by name, age, or blood group"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search input"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {patientsError && (
            <div style={{ color: "#dc2626", fontSize: "0.78rem", padding: "0.5rem" }}>
              Could not load patients: {patientsError}
            </div>
          )}

          <div className="patient-list" role="listbox" aria-label="Select a patient">
            {filteredPatients.length === 0 ? (
              <div className="patient-search-empty">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p>No patients match "<strong>{searchQuery}</strong>"</p>
                <button
                  type="button"
                  className="btn-clear-search-link"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredPatients.map((p) => (
                <PatientCard
                  key={p.patient_id}
                  patient={p}
                  isSelected={selectedPatient?.patient_id === p.patient_id}
                  onClick={() => handleSelectPatient(p)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Collapsed Edge Tab to Reopen Sidebar */}
        {!isSidebarOpen && (
          <button
            type="button"
            className="sidebar-edge-tab"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Expand patient roster"
            title="Expand patient roster"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="edge-tab-label">Roster</span>
          </button>
        )}

        {/* Right panel — clinical scenario & outputs */}
        <div className="right-panel">
          <PatientHeader patient={selectedPatient} />

          {/* Simple horizontal tab bar directly below patient header */}
          {selectedPatient && (
            <div className="main-nav-tabs-bar" role="tablist" aria-label="Patient workspace views">
              <button
                type="button"
                role="tab"
                id="tab-analysis"
                aria-selected={activeMainTab === "analysis"}
                aria-controls="panel-analysis"
                className={`main-nav-tab-btn ${activeMainTab === "analysis" ? "active" : ""}`}
                onClick={() => handleSelectMainTab("analysis")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Analysis</span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-ehr"
                aria-selected={activeMainTab === "ehr"}
                aria-controls="panel-ehr"
                className={`main-nav-tab-btn ${activeMainTab === "ehr" ? "active" : ""}`}
                onClick={() => {
                  handleSelectMainTab("ehr");
                  setIsRecordViewerOpen(true);
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>EHR Chart</span>
              </button>
            </div>
          )}

          {/* "Analysis" Tab Panel */}
          <div
            id="panel-analysis"
            role="tabpanel"
            aria-labelledby="tab-analysis"
            className={`main-tab-panel ${activeMainTab !== "analysis" ? "hidden" : ""}`}
          >
            <ScenarioInput
              key={selectedPatient?.patient_id}
              selectedPatient={selectedPatient}
              onSubmit={handleScenarioSubmit}
              isLoading={isLoading}
              forcedScenario={forcedScenario}
            />

            <ContextOutput
              result={contextResult}
              patient={selectedPatient}
              isLoading={isLoading}
              error={queryError}
              onSelectSource={handleSelectSource}
            />
          </div>

          {/* "EHR Chart" Tab Panel */}
          <div
            id="panel-ehr"
            role="tabpanel"
            aria-labelledby="tab-ehr"
            className={`main-tab-panel main-tab-panel-ehr ${activeMainTab !== "ehr" ? "hidden" : ""}`}
          >
            {selectedPatient && (
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
