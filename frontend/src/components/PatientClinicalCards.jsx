import { useState, useEffect } from "react";
import { fetchFullRecord } from "../api";

const PATIENT_CLINICAL_DATA = {
  patient_001: {
    active_medications: [
      { name: "Amlodipine 5mg", schedule: "Once daily", started: "2022-11-08", notes: "For essential hypertension. Well tolerated." },
      { name: "Rosuvastatin 10mg", schedule: "At night", started: "2023-01-20", notes: "For dyslipidaemia. Lipids monitored." },
    ],
    past_medications: [
      { name: "Loratadine 10mg", duration: "Jun 2021 – Jul 2021", notes: "4-week course for seasonal allergic rhinitis. Discontinued." },
      { name: "Amoxicillin", duration: "Mar 2022", notes: "Discontinued immediately upon noting childhood penicillin rash history. Switched to Azithromycin." },
    ],
    allergies_and_conditions: {
      allergies: [
        { item: "Penicillin Hypersensitivity", severity: "Moderate (rash/itching)", notes: "Childhood reaction (torso rash). Buried in March 2022 note; omitted on pre-op intake." }
      ],
      conditions: [
        { name: "Essential Hypertension", diagnosed: "Nov 2022", status: "Controlled on Amlodipine" },
        { name: "Dyslipidaemia", diagnosed: "Jan 2023", status: "Managed on Rosuvastatin" }
      ]
    },
    current_problem: {
      title: "Elective Inguinal Hernia Repair",
      status: "Scheduled Surgery (Pre-op Assessment 22 Jul 2024)",
      clinician: "Dr. P. Menon, Anaesthesiologist",
      details: "Patient scheduled for hernia repair. Pre-op evaluation: ASA Class II. Needs strict verification of antibiotic prophylaxis safety (beta-lactam avoidance)."
    }
  },
  patient_002: {
    active_medications: [
      { name: "Warfarin (Coumadin)", schedule: "Daily (monitored)", started: "2024-01-15", notes: "Indefinite anticoagulation for recurrent DVT. Target INR 2.0–3.0." },
      { name: "Paracetamol 500mg", schedule: "Up to 4x daily PRN", started: "2025-08-30", notes: "For bilateral knee osteoarthritis pain." },
    ],
    past_medications: [
      { name: "Enoxaparin (LMWH) 60mg SC", duration: "Sep 2021", notes: "Acute LMWH bridging for initial right popliteal DVT. Completed." },
      { name: "Warfarin (First Course)", duration: "Sep 2021 – Feb 2023", notes: "15-month anticoagulation course following first provoked DVT. Discontinued after resolution." },
    ],
    allergies_and_conditions: {
      allergies: [],
      conditions: [
        { name: "Recurrent Deep Vein Thrombosis", diagnosed: "Sep 2021 & Jan 2024", status: "Active long-term Warfarin" },
        { name: "Bilateral Knee Osteoarthritis", diagnosed: "Aug 2025", status: "Active pain management" },
        { name: "Borderline Low Protein C (62%)", diagnosed: "Feb 2024", status: "Laboratory risk factor" }
      ]
    },
    current_problem: {
      title: "Bilateral Knee Pain & NSAID Contraindication",
      status: "Active GP Evaluation (30 Aug 2025)",
      clinician: "Dr. L. Gupta, General Practitioner",
      details: "Patient experiencing progressive knee pain (6/10). Inquiring about ibuprofen. Strict contraindication: concurrent Warfarin carries severe GI bleeding risk."
    }
  },
  patient_003: {
    active_medications: [
      { name: "Metformin 500mg BD", schedule: "Twice daily with meals", started: "2024-03-18", notes: "Restarted at reduced dose due to CKD Stage 3a." },
      { name: "Lisinopril 10mg", schedule: "Once daily", started: "2023-01-30", notes: "ACE inhibitor for cardiorenal protection and hypertension." },
      { name: "Empagliflozin 10mg", schedule: "Once daily", started: "2024-03-18", notes: "SGLT2 inhibitor for glycemic control and renal protection in T2DM." }
    ],
    past_medications: [
      { name: "Metformin 1000mg BD", duration: "Jul 2021 – Nov 2023", notes: "Higher initial dose; self-discontinued for 4 months by patient before re-evaluation." }
    ],
    allergies_and_conditions: {
      allergies: [],
      conditions: [
        { name: "Type 2 Diabetes Mellitus (Decompensated)", diagnosed: "Apr 2021", status: "Critically high HbA1c 11.2%" },
        { name: "Chronic Kidney Disease (Stage 3a)", diagnosed: "Jul 2021 (progressed Mar 2024)", status: "eGFR 59, overt proteinuria" },
        { name: "Hypertension", diagnosed: "2021", status: "Treated with Lisinopril" }
      ]
    },
    current_problem: {
      title: "Severe Glycaemic Decompensation & Renal Decline",
      status: "Urgent Diabetology Follow-up (18 Mar 2024)",
      clinician: "Dr. B. Krishnan, Diabetologist",
      details: "Severe lapse in diabetes management with HbA1c at 11.2% and declining renal filtration. High risk for hyperosmolar state, DKA, or cardiovascular events."
    }
  },
  patient_004: {
    active_medications: [
      { name: "Lithium Carbonate 300mg BD", schedule: "Twice daily", started: "2022-05-30", notes: "Mood stabilizer for Bipolar I. Dose lowered from 400mg due to drug interaction." },
      { name: "Ramipril 2.5mg", schedule: "Once daily", started: "2021-11-22", notes: "ACE inhibitor for hypertension. Reduces renal Lithium clearance." }
    ],
    past_medications: [
      { name: "Lithium Carbonate 400mg BD", duration: "Jun 2020 – May 2022", notes: "Adjusted downward after serum Lithium spiked to 1.08 mEq/L." }
    ],
    allergies_and_conditions: {
      allergies: [],
      conditions: [
        { name: "Bipolar I Disorder", diagnosed: "Jun 2020", status: "Maintenance Lithium therapy" },
        { name: "Essential Hypertension", diagnosed: "Nov 2021", status: "Managed on Ramipril" }
      ]
    },
    current_problem: {
      title: "Suspected Acute Lithium Toxicity & Dehydration",
      status: "Emergency Department Referral (8 Sep 2025)",
      clinician: "Dr. M. Das, General Practitioner",
      details: "5 days of increasing hand tremor, confusion, nausea, and lethargy following gastroenteritis. Serum Lithium has not been monitored in >3 years."
    }
  },
  patient_005: {
    active_medications: [
      { name: "Amlodipine 5mg", schedule: "Once daily", started: "2021-01-01", notes: "For hypertension. Well-controlled BP." },
      { name: "Celecoxib 200mg", schedule: "Once daily", started: "2023-10-12", notes: "COX-2 inhibitor for knee osteoarthritis. Carries potential VTE risk." }
    ],
    past_medications: [
      { name: "Warfarin (Coumadin)", duration: "Feb 2020 – Aug 2020", notes: "6-month anticoagulation course post-flight provoked DVT. Discontinued Aug 2020." }
    ],
    allergies_and_conditions: {
      allergies: [],
      conditions: [
        { name: "Prior Extensive DVT (Left Femoral/Popliteal)", diagnosed: "Feb 2020", status: "Provoked by 16h flight; elevated recurrence risk" },
        { name: "Essential Hypertension", diagnosed: "2021", status: "Controlled on Amlodipine" },
        { name: "Right Knee Osteoarthritis", diagnosed: "Oct 2023", status: "Treated with Celecoxib" }
      ]
    },
    current_problem: {
      title: "Unassessed VTE Risk for Upcoming 14-Hour Flight",
      status: "Travel Clearance Consultation (5 Sep 2025)",
      clinician: "Dr. T. Varma, General Practitioner",
      details: "Patient requesting clearance for long-haul flight. History of flight-provoked extensive DVT and current Celecoxib use requires thromboprophylaxis consideration."
    }
  }
};

export default function PatientClinicalCards({ patient, patientId }) {
  const pid = patient?.patient_id || patientId || "patient_001";
  const [data, setData] = useState(() => PATIENT_CLINICAL_DATA[pid] || PATIENT_CLINICAL_DATA.patient_001);

  // Per-card expand state (collapsed by default per task 6 spec)
  const [expandedCard, setExpandedCard] = useState({
    activeMeds: false,
    pastMeds: false,
    allergies: false,
    problem: false,
  });

  // State to optionally hide the "Allergies & Conditions" card if no data or requested
  const [isAllergiesCardHidden, setIsAllergiesCardHidden] = useState(false);

  useEffect(() => {
    const fallback = PATIENT_CLINICAL_DATA[pid] || PATIENT_CLINICAL_DATA.patient_001;
    setData(fallback);
    setIsAllergiesCardHidden(false);

    let isCurrent = true;
    fetchFullRecord(pid)
      .then((record) => {
        if (!isCurrent || !record) return;
        if (record.medications && Array.isArray(record.medications)) {
          const liveActive = record.medications.filter((m) => m.status === "active");
          const livePast = record.medications.filter((m) => m.status !== "active");
          setData((prev) => ({
            ...prev,
            active_medications: liveActive.length > 0 ? liveActive : prev.active_medications,
            past_medications: livePast.length > 0 ? livePast : prev.past_medications,
          }));
        }
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [pid]);

  const toggleExpand = (cardKey) => {
    setExpandedCard((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  const activeMeds = data.active_medications || [];
  const pastMeds = data.past_medications || [];
  const allergiesList = data.allergies_and_conditions?.allergies || [];
  const conditionsList = data.allergies_and_conditions?.conditions || [];
  const problem = data.current_problem || {
    title: "Clinical Evaluation Pending",
    status: "Under Review",
    clinician: "Attending Physician",
    details: "No acute problem description documented.",
  };

  const totalAllergiesAndConditions = allergiesList.length + conditionsList.length;
  const hasAllergiesOrConditions = totalAllergiesAndConditions > 0;

  return (
    <div className="clinical-cards-container" role="region" aria-label="Patient Clinical Summary">
      {/* ── Locked-in Design: Template 3 (Clinical Dossier Cards) ── */}
      <div className="clinical-cards-grid t3-dossier-grid">
        {/* Card 1: Active Medications */}
        <div className={`t3-dossier-card ${expandedCard.activeMeds ? "expanded" : ""}`}>
          <div className="t3-top-accent-bar" />
          <div
            className="t3-card-inner"
            onClick={() => toggleExpand("activeMeds")}
            role="button"
            tabIndex={0}
            aria-expanded={expandedCard.activeMeds}
          >
            <div className="t3-head-row">
              <span className="t3-cat-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: -1 }}>
                  <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                  <path d="m8.5 8.5 7 7" />
                </svg>
                ACTIVE MEDICATIONS
              </span>
              <span className="t3-badge-pill">{activeMeds.length} Active</span>
            </div>
            <div className="t3-highlight-title">
              {activeMeds[0]?.name || "No Active Rx"}
            </div>
            <div className="t3-footer-row">
              <span className="t3-micro-caption">
                {activeMeds.length > 1 ? `+${activeMeds.length - 1} more in regimen` : "Prescription active"}
              </span>
              <button
                type="button"
                className="t3-text-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand("activeMeds");
                }}
                aria-label={expandedCard.activeMeds ? "Hide Active Medications details" : "View Active Medications details"}
              >
                {expandedCard.activeMeds ? "Hide Details ▲" : "View Details →"}
              </button>
            </div>
          </div>

          {/* Expandable Drawer (Collapsed by default) */}
          {expandedCard.activeMeds && (
            <div className="t3-dossier-drawer">
              {activeMeds.length === 0 ? (
                <div className="clinical-empty-note">No active medications recorded.</div>
              ) : (
                <ul className="clinical-detail-list">
                  {activeMeds.map((m, idx) => (
                    <li key={idx} className="clinical-detail-item">
                      <div className="clinical-item-main">
                        <span className="clinical-item-name">{m.name}</span>
                        {m.schedule && <span className="clinical-item-tag">{m.schedule}</span>}
                      </div>
                      <div className="clinical-item-meta">
                        {m.started && <span>Started: {m.started}</span>}
                        {m.notes && <span className="clinical-item-notes">{m.notes}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Card 2: Past Medications */}
        <div className={`t3-dossier-card ${expandedCard.pastMeds ? "expanded" : ""}`}>
          <div className="t3-top-accent-bar" />
          <div
            className="t3-card-inner"
            onClick={() => toggleExpand("pastMeds")}
            role="button"
            tabIndex={0}
            aria-expanded={expandedCard.pastMeds}
          >
            <div className="t3-head-row">
              <span className="t3-cat-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: -1 }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                PAST MEDICATIONS
              </span>
              <span className="t3-badge-pill">{pastMeds.length} Past</span>
            </div>
            <div className="t3-highlight-title">
              {pastMeds[0]?.name || "None Discontinued"}
            </div>
            <div className="t3-footer-row">
              <span className="t3-micro-caption">
                {pastMeds.length > 1 ? `+${pastMeds.length - 1} earlier prescriptions` : "Prior courses reviewed"}
              </span>
              <button
                type="button"
                className="t3-text-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand("pastMeds");
                }}
                aria-label={expandedCard.pastMeds ? "Hide Past Medications details" : "View Past Medications details"}
              >
                {expandedCard.pastMeds ? "Hide Details ▲" : "View Details →"}
              </button>
            </div>
          </div>

          {/* Expandable Drawer (Collapsed by default) */}
          {expandedCard.pastMeds && (
            <div className="t3-dossier-drawer">
              {pastMeds.length === 0 ? (
                <div className="clinical-empty-note">No discontinued medications on file.</div>
              ) : (
                <ul className="clinical-detail-list">
                  {pastMeds.map((m, idx) => (
                    <li key={idx} className="clinical-detail-item">
                      <div className="clinical-item-main">
                        <span className="clinical-item-name">{m.name}</span>
                        {m.duration && <span className="clinical-item-tag">{m.duration}</span>}
                      </div>
                      <div className="clinical-item-meta">
                        {m.notes && <span className="clinical-item-notes">{m.notes}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Card 3: Allergies & Conditions (Optional / Hideable if empty) */}
        {!isAllergiesCardHidden && (
          <div className={`t3-dossier-card ${expandedCard.allergies ? "expanded" : ""}`}>
            <div className="t3-top-accent-bar" />
            <div
              className="t3-card-inner"
              onClick={() => toggleExpand("allergies")}
              role="button"
              tabIndex={0}
              aria-expanded={expandedCard.allergies}
            >
              <div className="t3-head-row">
                <span className="t3-cat-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: -1 }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  ALLERGIES & COND.
                  {!hasAllergiesOrConditions && (
                    <span className="t3-opt-tag" title="No allergies on record. This card is optional.">
                      Optional
                    </span>
                  )}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <span className="t3-badge-pill">{totalAllergiesAndConditions} Total</span>
                  {!hasAllergiesOrConditions && (
                    <button
                      type="button"
                      className="clinical-hide-tag-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAllergiesCardHidden(true);
                      }}
                      title="Hide optional card"
                    >
                      Hide
                    </button>
                  )}
                </div>
              </div>
              <div className="t3-highlight-title">
                {allergiesList[0]?.item || conditionsList[0]?.name || "No Flagged Allergies"}
              </div>
              <div className="t3-footer-row">
                <span className="t3-micro-caption">
                  {hasAllergiesOrConditions ? `${allergiesList.length} allergy · ${conditionsList.length} condition` : "Chart verified clear"}
                </span>
                <button
                  type="button"
                  className="t3-text-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand("allergies");
                  }}
                  aria-label={expandedCard.allergies ? "Hide Allergies details" : "View Allergies details"}
                >
                  {expandedCard.allergies ? "Hide Details ▲" : "View Details →"}
                </button>
              </div>
            </div>

            {/* Expandable Drawer (Collapsed by default) */}
            {expandedCard.allergies && (
              <div className="t3-dossier-drawer">
                {!hasAllergiesOrConditions ? (
                  <div className="clinical-empty-note">
                    No documented allergies or active conditions found in medical chart.
                  </div>
                ) : (
                  <div className="clinical-subsections-wrap">
                    {allergiesList.length > 0 && (
                      <div className="clinical-drawer-section">
                        <div className="clinical-drawer-heading">Documented Drug Allergies</div>
                        <ul className="clinical-detail-list">
                          {allergiesList.map((a, idx) => (
                            <li key={idx} className="clinical-detail-item alert-item">
                              <div className="clinical-item-main">
                                <span className="clinical-item-name">{a.item}</span>
                                {a.severity && <span className="clinical-item-tag">{a.severity}</span>}
                              </div>
                              {a.notes && <div className="clinical-item-notes">{a.notes}</div>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {conditionsList.length > 0 && (
                      <div className="clinical-drawer-section">
                        <div className="clinical-drawer-heading">Chronic & Active Conditions</div>
                        <ul className="clinical-detail-list">
                          {conditionsList.map((c, idx) => (
                            <li key={idx} className="clinical-detail-item">
                              <div className="clinical-item-main">
                                <span className="clinical-item-name">{c.name}</span>
                                {c.status && <span className="clinical-item-tag">{c.status}</span>}
                              </div>
                              {c.diagnosed && <div className="clinical-item-notes">Diagnosed: {c.diagnosed}</div>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Card 4: Current Problem */}
        <div className={`t3-dossier-card ${expandedCard.problem ? "expanded" : ""}`}>
          <div className="t3-top-accent-bar" />
          <div
            className="t3-card-inner"
            onClick={() => toggleExpand("problem")}
            role="button"
            tabIndex={0}
            aria-expanded={expandedCard.problem}
          >
            <div className="t3-head-row">
              <span className="t3-cat-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: -1 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                CURRENT PROBLEM
              </span>
              <span className="t3-badge-pill">1 Active</span>
            </div>
            <div className="t3-highlight-title" title={problem.title}>
              {problem.title}
            </div>
            <div className="t3-footer-row">
              <span className="t3-micro-caption">
                {problem.status}
              </span>
              <button
                type="button"
                className="t3-text-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand("problem");
                }}
                aria-label={expandedCard.problem ? "Hide Current Problem details" : "View Current Problem details"}
              >
                {expandedCard.problem ? "Hide Details ▲" : "View Details →"}
              </button>
            </div>
          </div>

          {/* Expandable Drawer (Collapsed by default) */}
          {expandedCard.problem && (
            <div className="t3-dossier-drawer">
              <div className="clinical-problem-detail">
                <div className="clinical-problem-title">{problem.title}</div>
                <div className="clinical-problem-meta-row">
                  <span className="clinical-item-tag">{problem.status}</span>
                  {problem.clinician && <span className="clinical-problem-doc">Attending: {problem.clinician}</span>}
                </div>
                {problem.details && (
                  <p className="clinical-problem-text">{problem.details}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
