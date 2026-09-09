function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line wide" style={{ height: 13, width: "40%", marginBottom: 10 }} />
      <div className="skeleton-line wide" style={{ height: 14 }} />
      <div className="skeleton-line medium" style={{ height: 12 }} />
      <div className="skeleton-line narrow" style={{ height: 11 }} />
    </div>
  );
}

function ContextCard({ item, index }) {
  const isCritical = item.critical === true;
  const isWarning = !isCritical && item.relevance_reason?.toLowerCase().includes("risk");
  const cardClass = isCritical ? "critical" : isWarning ? "warning" : "info";
  const badgeClass = isCritical ? "critical" : isWarning ? "warning" : "info";
  const badgeLabel = isCritical ? "⚠ Critical" : isWarning ? "⚠ Caution" : "ℹ Relevant";

  return (
    <div
      className={`context-card ${cardClass}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="card-badge-row">
        <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
      </div>

      <div className="card-point">{item.point}</div>

      <div className="card-source">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        {item.source}
      </div>

      {item.relevance_reason && (
        <div className="card-relevance">
          <strong>Why this matters: </strong>{item.relevance_reason}
        </div>
      )}
    </div>
  );
}

export default function ContextOutput({ result, isLoading, error }) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="output-section">
        <div className="section-label" style={{ marginBottom: "1rem" }}>Reconstructing context...</div>
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
        <div className="error-block">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff7070" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="error-block-text">{error}</div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!result) {
    return (
      <div className="output-section">
        <div className="empty-state">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <h3>No context yet</h3>
          <p>Select a patient, choose a clinical scenario, and hit Reconstruct Context.</p>
        </div>
      </div>
    );
  }

  const criticalCount = result.relevant_context?.filter(i => i.critical).length || 0;

  return (
    <div className="output-section">
      <div className="context-header">
        <div className="section-label" style={{ margin: 0 }}>
          Relevant Context — {result.patient_name}
        </div>
        <div className="context-count">
          {result.relevant_context?.length || 0} points
          {criticalCount > 0 && (
            <span style={{ color: "var(--critical)", marginLeft: "0.5rem" }}>
              · {criticalCount} critical
            </span>
          )}
        </div>
      </div>

      <div className="context-list">
        {(result.relevant_context || []).map((item, i) => (
          <ContextCard key={i} item={item} index={i} />
        ))}
      </div>

      {result.excluded_summary && (
        <div className="excluded-block">
          <div className="excluded-label">Excluded from this context</div>
          <div className="excluded-text">{result.excluded_summary}</div>
        </div>
      )}
    </div>
  );
}
