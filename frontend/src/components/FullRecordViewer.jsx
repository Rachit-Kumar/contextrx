import { useState, useEffect } from "react";
import { fetchFullRecord } from "../api";

export default function FullRecordViewer({ patientId, patientName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [record, setRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset when patient changes
  useEffect(() => {
    setIsOpen(false);
    setRecord(null);
    setError(null);
  }, [patientId]);

  async function handleToggle() {
    if (!isOpen && !record && patientId) {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchFullRecord(patientId);
        setRecord(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    setIsOpen((v) => !v);
  }

  if (!patientId) return null;

  return (
    <div style={{ marginTop: "1.25rem" }}>
      <button
        id="full-record-toggle"
        className={`record-viewer-toggle${isOpen ? " open" : ""}`}
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.4rem", verticalAlign: "middle" }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          View Full Record — {patientName}
        </span>
        <svg className="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {isOpen && (
        <div className="record-viewer-content">
          {isLoading && (
            <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", padding: "0.5rem" }}>
              Loading record...
            </div>
          )}
          {error && (
            <div style={{ color: "#ff9090", fontSize: "0.82rem", padding: "0.5rem" }}>
              {error}
            </div>
          )}
          {record && (
            <pre className="record-json">
              {JSON.stringify(record, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
