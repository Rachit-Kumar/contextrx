import { useState, useEffect } from "react";
import PatientClinicalCards from "./PatientClinicalCards";
import SupportingFindingsSection from "./SupportingFindingsSection";

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line wide" style={{ height: 14, width: "35%", marginBottom: 12 }} />
      <div className="skeleton-line wide" style={{ height: 16 }} />
      <div className="skeleton-line medium" style={{ height: 13 }} />
      <div className="skeleton-line narrow" style={{ height: 12, marginTop: 8 }} />
    </div>
  );
}

function DiscrepancyBanner({ discrepancies, onSelectSource }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  // Auto-expand rule:
  // If only 1 discrepancy on page -> expanded by default
  // If > 1 discrepancy -> index 0 expanded by default, rest collapsed
  const [expandedMap, setExpandedMap] = useState(() => {
    const initial = {};
    if (discrepancies && discrepancies.length > 0) {
      discrepancies.forEach((_, idx) => {
        initial[idx] = idx === 0;
      });
    }
    return initial;
  });

  useEffect(() => {
    const next = {};
    if (discrepancies && discrepancies.length > 0) {
      discrepancies.forEach((_, idx) => {
        next[idx] = idx === 0;
      });
    }
    setExpandedMap(next);
  }, [discrepancies]);

  if (!discrepancies || discrepancies.length === 0) return null;

  function toggleExpand(idx) {
    setExpandedMap((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  }

  function handleCopyHazard(disc, idx) {
    const text = `[CLINICAL ALERT - DISCREPANCY CAUGHT]\nType: ${disc.type || "Omitted History"}\nIntake Claim: ${disc.current_intake_claim}\nHistorical Fact: ${disc.historical_truth}\nImmediate Hazard: ${disc.clinical_hazard || "Action required"}`;
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2500);
  }

  // Helper to find date or encounter keywords for quick chart jumping
  function handleJumpHistorical(truthText) {
    if (!onSelectSource) return;
    const dateMatch =
      truthText.match(/\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/) ||
      truthText.match(/\b([A-Za-z]{3,9}\s+\d{4})\b/);
    if (dateMatch) {
      onSelectSource(dateMatch[0]);
    } else {
      onSelectSource("Penicillin");
    }
  }

  return (
    <div className="discrepancy-card-refined" role="region" aria-label="EHR Discrepancies">
      {discrepancies.map((disc, idx) => {
        const isExpanded = !!expandedMap[idx];
        const isCopied = copiedIdx === idx;

        return (
          <div key={idx} className={`discrepancy-item ${isExpanded ? "expanded" : "collapsed"}`}>
            {/* Collapsible Header */}
            <div
              className={`discrepancy-header-clean ${isExpanded ? "expanded" : "collapsed"}`}
              onClick={() => toggleExpand(idx)}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse discrepancy details" : "Expand discrepancy details"}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleExpand(idx);
                }
              }}
            >
              {isExpanded ? (
                /* Two-Row Layout when Expanded */
                <div className="discrepancy-header-expanded-stack">
                  {/* Row 1: Icon + Concise Title + Expand/Collapse Button */}
                  <div className="discrepancy-header-top-row">
                    <div className="discrepancy-title-group">
                      <svg
                        className="discrepancy-alert-icon"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="2.4"
                      >
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span className="discrepancy-title-text">
                        Critical EHR Discrepancy Caught
                      </span>
                    </div>

                    <button
                      type="button"
                      className="discrepancy-toggle-chevron-btn"
                      aria-label="Collapse discrepancy"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(idx);
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{ transform: "rotate(180deg)", transition: "transform 140ms ease" }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>

                  {/* Row 2: Severity Badge + Time Gap (plain gray text) + Far-Right Icon-Only Copy Button */}
                  <div className="discrepancy-header-muted-row">
                    <div className="discrepancy-muted-meta">
                      <span className="discrepancy-type-badge">
                        {disc.type || "Omitted History"}
                      </span>

                      {disc.temporal_gap && (
                        <span className="discrepancy-gap-text">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>{disc.temporal_gap} gap</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="discrepancy-copy-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyHazard(disc, idx);
                      }}
                      title={isCopied ? "Copied alert to clipboard!" : "Copy formatted alert to clipboard"}
                      aria-label="Copy alert"
                    >
                      {isCopied ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Single Compact Row when Collapsed */
                <div className="discrepancy-header-collapsed-row">
                  <div className="discrepancy-collapsed-left">
                    <svg
                      className="discrepancy-alert-icon"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="2.4"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span className="discrepancy-title-text">
                      Critical EHR Discrepancy Caught
                    </span>
                    <span className="discrepancy-type-badge">
                      {disc.type || "Omitted History"}
                    </span>
                    {disc.temporal_gap && (
                      <span className="discrepancy-gap-text">
                        <span>•</span>
                        <span>{disc.temporal_gap} gap</span>
                      </span>
                    )}
                  </div>

                  <div className="discrepancy-collapsed-right">
                    <button
                      type="button"
                      className="discrepancy-copy-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyHazard(disc, idx);
                      }}
                      title={isCopied ? "Copied alert to clipboard!" : "Copy formatted alert to clipboard"}
                      aria-label="Copy alert"
                    >
                      {isCopied ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      className="discrepancy-toggle-chevron-btn"
                      aria-label="Expand discrepancy"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(idx);
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Expandable Body: Contradiction Cards + Lightweight Connector + Hazard Banner */}
            {isExpanded && (
              <div className="discrepancy-body-expanded">
                {/* Side-by-Side Comparison Panels */}
                <div className="discrepancy-compare-grid">
                  {/* Recent Intake Claim Card (White bg, thin red left-accent) */}
                  <div className="compare-col claim-col">
                    <div className="compare-col-header">
                      <span className="compare-icon red">✕</span>
                      <span className="compare-col-label">Recent Intake Form Claim</span>
                    </div>
                    <div className="compare-col-body">
                      {disc.current_intake_claim}
                    </div>
                    <div className="compare-col-footnote">
                      Documented on recent pre-op intake
                    </div>
                  </div>

                  {/* Lightweight Connector (Thin dashed line + micro-text) */}
                  <div className="compare-connector" aria-hidden="true">
                    <span className="connector-line" />
                    <div className="connector-text-group">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" />
                      </svg>
                      <span>CONTRADICTS</span>
                    </div>
                    <span className="connector-line" />
                  </div>

                  {/* Buried Historical Record Card (White bg, thin green left-accent) */}
                  <div className="compare-col truth-col">
                    <div className="compare-col-header">
                      <span className="compare-icon green">✓</span>
                      <span className="compare-col-label">Buried Historical Record</span>
                    </div>
                    <div className="compare-col-body">
                      {disc.historical_truth}
                    </div>
                    <div className="compare-col-actions">
                      <button
                        type="button"
                        className="compare-verify-btn"
                        onClick={() => handleJumpHistorical(disc.historical_truth)}
                        title="Highlight and verify this note in the patient's EHR timeline below"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span>Verify in Patient EHR Chart ➔</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Immediate Clinical Hazard Row (Plain light-gray row, no red band) */}
                {disc.clinical_hazard && (
                  <div className="discrepancy-hazard-row">
                    <svg
                      className="hazard-icon"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2.2"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <div className="hazard-text-wrapper">
                      <strong className="hazard-lead">Clinical hazard:</strong>
                      <span className="hazard-body">{disc.clinical_hazard}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}



export default function ContextOutput({ result, isLoading, error, onSelectSource, patient }) {

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="output-section">
        <PatientClinicalCards patient={patient} patientId={result?.patient_id} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.2rem" }}>
          <span className="spinner" style={{ borderColor: "rgba(2, 132, 199, 0.2)", borderTopColor: "#0284c7" }} />
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--primary)" }}>
            Scanning clinical encounters & resolving missing context...
          </span>
        </div>
        <div className="skeleton-list">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="output-section">
        <PatientClinicalCards patient={patient} patientId={result?.patient_id} />
        <div className="error-block">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <div style={{ fontWeight: 600, color: "#991b1b", marginBottom: 2 }}>Context Reconstruction Error</div>
            <div className="error-block-text">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!result) {
    return (
      <div className="output-section">
        <PatientClinicalCards patient={patient} />
        <div className="empty-state">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <path d="M7 8h10" />
            <path d="M7 12h10" />
            <path d="M7 16h6" />
          </svg>
          <h3>Ready for Clinical Analysis</h3>
          <p>Select a patient and clinical scenario above, then click <strong>Analyze Patient History</strong> to filter out EHR noise, catch omitted history, and surface critical findings.</p>
        </div>
      </div>
    );
  }

  const totalCount = result.relevant_context?.length || 0;
  const metrics = result.cognitive_metrics || {};

  return (
    <div className="output-section">
      {/* 4-Card Clinical Overview Row (Replaces old telemetry strip in neutral gray/white styling) */}
      <PatientClinicalCards patient={patient} patientId={result?.patient_id} />

      {/* Refined Discrepancy Callout (The Missing Context core showcase) */}
      <DiscrepancyBanner
        discrepancies={result.discrepancies}
        onSelectSource={onSelectSource}
      />

      {/* 4-Template Supporting Clinical Findings Section */}
      <SupportingFindingsSection
        items={result.relevant_context || []}
        totalCount={totalCount}
        patientName={result.patient_name}
        metrics={metrics}
        onSelectSource={onSelectSource}
        excludedSummary={result.excluded_summary}
      />
    </div>
  );
}
