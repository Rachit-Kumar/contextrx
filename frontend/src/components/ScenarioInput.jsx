import { useState, useEffect } from "react";

const PRESETS = [
  { label: "Pre-surgery prep", value: "Patient is being prepped for elective surgery. What does the surgical and anaesthesia team need to know right now to ensure patient safety?" },
  { label: "New medication Rx", value: "The clinician is about to prescribe a new medication. What information in this patient's history is critical to review before prescribing?" },
  { label: "ER admission", value: "Patient has just been admitted to the Emergency Department. What does the ER team need to know immediately from this patient's history?" },
  { label: "Long-haul travel clearance", value: "Patient is requesting clearance for a long-haul international flight (14+ hours). What from this patient's history is relevant to this travel health decision?" },
  { label: "Acute confusion / altered state", value: "Patient presents with acute confusion, lethargy and possible altered consciousness. What from this patient's medical history could explain or complicate this presentation?" },
];

export default function ScenarioInput({ selectedPatient, onSubmit, isLoading }) {
  const [scenario, setScenario] = useState("");
  const [activePreset, setActivePreset] = useState(null);

  // Reset when patient changes
  useEffect(() => {
    setScenario("");
    setActivePreset(null);
  }, [selectedPatient?.patient_id]);

  function handlePreset(preset) {
    setScenario(preset.value);
    setActivePreset(preset.label);
  }

  function handleTextChange(e) {
    setScenario(e.target.value);
    setActivePreset(null);
  }

  function handleSubmit() {
    if (scenario.trim() && selectedPatient) {
      onSubmit(scenario.trim());
    }
  }

  const canSubmit = !!selectedPatient && scenario.trim().length > 0 && !isLoading;

  return (
    <div className="scenario-section">
      <div className="section-label">Clinical Scenario</div>

      {!selectedPatient && (
        <div className="select-prompt">← Select a patient first</div>
      )}

      {selectedPatient && (
        <>
          <div className="preset-chips">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                className={`chip${activePreset === p.label ? " active" : ""}`}
                onClick={() => handlePreset(p)}
                aria-pressed={activePreset === p.label}
              >
                {p.label}
              </button>
            ))}
          </div>

          <textarea
            id="scenario-input"
            className="scenario-textarea"
            placeholder="Or describe the clinical scenario in your own words..."
            value={scenario}
            onChange={handleTextChange}
            rows={3}
            aria-label="Clinical scenario description"
          />

          <div className="scenario-footer">
            <span className="scenario-hint">
              AI will extract only information present in {selectedPatient.name}'s record.
            </span>
            <button
              id="reconstruct-btn"
              className="btn-reconstruct"
              onClick={handleSubmit}
              disabled={!canSubmit}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  Analysing...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Reconstruct Context
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
