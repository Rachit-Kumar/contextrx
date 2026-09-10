import { useState, useCallback, useEffect, useRef } from "react";

const PRESETS = [
  {
    icon: "🩺",
    label: "Pre-surgery prep",
    value: "Patient is being prepped for elective surgery. What does the surgical and anaesthesia team need to know right now to ensure patient safety?",
  },
  {
    icon: "💊",
    label: "New medication Rx",
    value: "The clinician is about to prescribe a new medication. What information in this patient's history is critical to review before prescribing?",
  },
  {
    icon: "🚨",
    label: "ER admission",
    value: "Patient has just been admitted to the Emergency Department. What does the ER team need to know immediately from this patient's history?",
  },
  {
    icon: "✈️",
    label: "Long-haul travel",
    value: "Patient is requesting clearance for a long-haul international flight (14+ hours). What from this patient's history is relevant to this travel health decision?",
  },
  {
    icon: "🧠",
    label: "Acute confusion",
    value: "Patient presents with acute confusion, lethargy and possible altered consciousness. What from this patient's medical history could explain or complicate this presentation?",
  },
];

export default function ScenarioInput({
  selectedPatient,
  onSubmit,
  isLoading,
  forcedScenario,
}) {
  const [scenario, setScenario] = useState("");
  const [activePreset, setActivePreset] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported] = useState(() => {
    return typeof window !== "undefined" &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  });
  const recognitionRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setScenario((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setActivePreset(null);
        } else {
          interim += transcript;
        }
      }
    };

    recognition.onerror = (e) => {
      console.warn("Speech recognition error:", e.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  function toggleDictation() {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Could not start recognition:", err);
      }
    }
  }

  // Allow external triggers (like Quick Pitch Demo) to populate the scenario
  useEffect(() => {
    if (forcedScenario) {
      setScenario(forcedScenario);
      const match = PRESETS.find((p) => p.value === forcedScenario);
      if (match) setActivePreset(match.label);
    }
  }, [forcedScenario]);

  function handlePreset(preset) {
    setScenario(preset.value);
    setActivePreset(preset.label);
  }

  function handleTextChange(e) {
    setScenario(e.target.value);
    setActivePreset(null);
  }

  const handleSubmit = useCallback(() => {
    if (scenario.trim() && selectedPatient) {
      onSubmit(scenario.trim());
    }
  }, [scenario, selectedPatient, onSubmit]);

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  const canSubmit = !!selectedPatient && scenario.trim().length > 0 && !isLoading;

  return (
    <div className="scenario-section">
      <div className="scenario-header-row">
        <span className="section-label">Clinical Scenario & Intent</span>
      </div>

      {!selectedPatient ? (
        <div className="select-prompt">
          👈 Please select a patient record from the roster on the left to begin context reconstruction.
        </div>
      ) : (
        <>
          <div className="preset-chips">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`chip${activePreset === p.label ? " active" : ""}`}
                onClick={() => handlePreset(p)}
                aria-pressed={activePreset === p.label}
              >
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          <div className="notched-scenario-container">
            <textarea
              id="scenario-input"
              className={`scenario-textarea-notched${isListening ? " dictating" : ""}`}
              placeholder={
                isListening
                  ? "Listening to clinician dictation... (speak clearly into your microphone)"
                  : "Describe the clinical scenario, or click the mic icon to speak..."
              }
              value={scenario}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              rows={3}
              aria-label="Clinical scenario description"
            />

            {/* Standard right-aligned mic icon inside text box */}
            {speechSupported && (
              <button
                type="button"
                className={`btn-mic-inside${isListening ? " listening" : ""}`}
                onClick={toggleDictation}
                title={isListening ? "Listening... click to stop dictation" : "Voice Dictation (click to speak)"}
                aria-label="Voice Dictation"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                {isListening && <span className="mic-pulse-ring" />}
              </button>
            )}

            {/* Grounding hint on bottom-left */}
            <div className="scenario-bottom-left-hint">
              AI grounds findings exclusively in {selectedPatient.name}&apos;s history. Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to submit.
            </div>

            {/* Bottom-right notch cutout dock with inverted curves */}
            <div className="notch-cutout-dock">
              {/* Inverted curve fillet top */}
              <svg className="notch-fillet-top" viewBox="0 0 14 14" style={{ overflow: "visible" }} aria-hidden="true">
                <path d="M 0 14 A 14 14 0 0 0 14 0 L 15 0 L 15 15 L 0 15 Z" fill="#ffffff" />
                <path className="fillet-stroke" d="M 0 14 A 14 14 0 0 0 14 0" />
              </svg>

              {/* Inverted curve fillet left */}
              <svg className="notch-fillet-left" viewBox="0 0 14 14" style={{ overflow: "visible" }} aria-hidden="true">
                <path d="M 14 0 A 14 14 0 0 0 0 14 L 0 15 L 15 15 L 15 0 Z" fill="#ffffff" />
                <path className="fillet-stroke" d="M 14 0 A 14 14 0 0 0 0 14" />
              </svg>

              {/* Royal Blue Analyze button */}
              <button
                id="reconstruct-btn"
                type="button"
                className="btn-royal-submit"
                onClick={handleSubmit}
                disabled={!canSubmit}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="submit-spinner" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Analyze</span>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
