const PATIENT_TAGS = {
  patient_001: { tag: "Hidden Allergy Risk", isCritical: true },
  patient_002: { tag: "Multi-Drug Rx", isCritical: false },
  patient_003: { tag: "Cardio & Anticoag", isCritical: false },
  patient_004: { tag: "Travel Health", isCritical: false },
  patient_005: { tag: "Acute Delirium", isCritical: false },
};

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function PatientCard({ patient, isSelected, onClick }) {
  const metaTag = PATIENT_TAGS[patient.patient_id];
  const initials = getInitials(patient.name);

  return (
    <div
      className={`patient-card${isSelected ? " selected" : ""}`}
      onClick={onClick}
      role="option"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      aria-selected={isSelected}
      aria-label={`Select patient ${patient.name}`}
    >
      <div className="patient-avatar">{initials}</div>
      <div className="patient-info">
        <div className="patient-name-row">
          <span className="patient-card-name">{patient.name}</span>
          <span className="patient-blood-badge">{patient.blood_group || "—"}</span>
        </div>
        <div className="patient-card-meta">
          <span>{patient.age}y · {patient.sex}</span>
        </div>
        {metaTag && (
          <span className={`patient-challenge-tag${metaTag.isCritical ? " critical-tag" : ""}`}>
            {metaTag.tag}
          </span>
        )}
      </div>
    </div>
  );
}
