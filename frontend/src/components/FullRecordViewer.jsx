import { useState, useEffect, useRef } from "react";
import { fetchFullRecord } from "../api";

export default function FullRecordViewer({
  patientId,
  patientName,
  highlightSource,
  isOpen,
  onToggleOpen,
}) {
  const [record, setRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("encounters"); // encounters | medications | demographics
  const encounterRefs = useRef({});

  // Auto-fetch record when opened or patient changes
  useEffect(() => {
    if (isOpen && !record && patientId) {
      setIsLoading(true);
      setError(null);
      fetchFullRecord(patientId)
        .then((data) => setRecord(data))
        .catch((e) => setError(e.message))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, record, patientId]);

  // Handle scroll & highlight when a citation source is clicked in ContextOutput
  useEffect(() => {
    if (highlightSource && record) {
      if (!isOpen) {
        onToggleOpen(true);
      }
      setActiveTab("encounters");

      // Find best matching encounter ref
      const normalizedQuery = highlightSource.toLowerCase();
      const matchedKey = Object.keys(encounterRefs.current).find((key) =>
        normalizedQuery.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedQuery)
      );

      if (matchedKey && encounterRefs.current[matchedKey]) {
        setTimeout(() => {
          encounterRefs.current[matchedKey].scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 150);
      }
    }
  }, [highlightSource, record, isOpen, onToggleOpen]);

  if (!patientId) return null;

  const demographics = record?.demographics || {};
  const encounters = record?.encounters || [];
  const medications = record?.medications || [];

  return (
    <div className="chart-viewer-container" id="full-record-section">
      {/* Header bar */}
      <div
        className="chart-header"
        onClick={() => onToggleOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
      >
        <div className="chart-title-block">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <div>
            <div className="chart-title">Electronic Health Record (EHR) Chart — {patientName}</div>
            <div className="chart-subtitle">
              {isOpen ? "Click to collapse full medical dossier" : "Click to view hospital encounters, medications & clinical timeline"}
            </div>
          </div>
        </div>

        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
            color: "var(--text-muted)",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isOpen && (
        <>
          {/* Demographics Strip */}
          {record && (
            <div style={{ padding: "1rem 1.4rem 0.5rem", borderBottom: "1px solid var(--border)", background: "#ffffff" }}>
              <div className="demo-summary-grid">
                <div className="demo-item">
                  <div className="demo-item-label">Blood Group</div>
                  <div className="demo-item-val" style={{ color: "#0284c7" }}>{demographics.blood_group || "Unknown"}</div>
                </div>
                <div className="demo-item">
                  <div className="demo-item-label">Date of Birth</div>
                  <div className="demo-item-val">{demographics.dob || "—"}</div>
                </div>
                <div className="demo-item">
                  <div className="demo-item-label">Age & Sex</div>
                  <div className="demo-item-val">{demographics.age}y · {demographics.sex}</div>
                </div>
                <div className="demo-item" style={{ gridColumn: "span 2" }}>
                  <div className="demo-item-label">Emergency Contact</div>
                  <div className="demo-item-val" style={{ fontSize: "0.8rem", fontWeight: 600 }}>{demographics.emergency_contact || "—"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="chart-tabs-bar">
            <button
              type="button"
              className={`chart-tab-btn${activeTab === "encounters" ? " active" : ""}`}
              onClick={() => setActiveTab("encounters")}
            >
              📅 Clinical Encounters & Notes ({encounters.length})
            </button>
            <button
              type="button"
              className={`chart-tab-btn${activeTab === "medications" ? " active" : ""}`}
              onClick={() => setActiveTab("medications")}
            >
              💊 Active Medications ({medications.length})
            </button>
          </div>

          <div className="chart-content">
            {isLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "1.5rem", color: "var(--text-muted)" }}>
                <span className="spinner" style={{ borderColor: "rgba(2, 132, 199, 0.2)", borderTopColor: "#0284c7" }} />
                <span>Loading EHR chart from hospital database...</span>
              </div>
            )}

            {error && (
              <div style={{ color: "#dc2626", padding: "1rem", fontSize: "0.84rem" }}>
                Failed to load patient record: {error}
              </div>
            )}

            {/* TAB: Encounters Timeline */}
            {!isLoading && activeTab === "encounters" && (
              <div className="encounters-timeline">
                {encounters.map((enc, idx) => {
                  const key = enc.source_label || enc.date || String(idx);
                  const isHighlighted =
                    highlightSource &&
                    (highlightSource.toLowerCase().includes(enc.source_label?.toLowerCase() || "___") ||
                     (enc.source_label && highlightSource.toLowerCase().includes(enc.source_label.toLowerCase())));

                  return (
                    <div
                      key={idx}
                      ref={(el) => (encounterRefs.current[enc.source_label || key] = el)}
                      className={`encounter-card${isHighlighted ? " highlighted" : ""}`}
                    >
                      <div className="encounter-meta-row">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span className="encounter-type-badge">{enc.type || "Clinical Visit"}</span>
                          {enc.source_label && (
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                              {enc.source_label}
                            </span>
                          )}
                        </div>
                        <span className="encounter-date">{enc.date}</span>
                      </div>

                      <div className="encounter-attending">
                        👨‍⚕️ Attending: <strong>{enc.attending || "Clinician on duty"}</strong>
                      </div>

                      <div className="encounter-notes">{enc.notes}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB: Medications */}
            {!isLoading && activeTab === "medications" && (
              <div className="meds-grid">
                {medications.map((med, idx) => (
                  <div key={idx} className="med-card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span className="med-name">{med.name}</span>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.4rem",
                          borderRadius: 4,
                          background: med.end_date ? "#f1f5f9" : "#dcfce7",
                          color: med.end_date ? "#64748b" : "#166534",
                        }}
                      >
                        {med.end_date ? "Discontinued" : "Active"}
                      </span>
                    </div>
                    <div className="med-date">
                      Started: {med.start_date || "—"} {med.end_date ? `· Stopped: ${med.end_date}` : ""}
                    </div>
                    {med.indication && (
                      <div className="med-indication">
                        Indication: <strong>{med.indication}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
