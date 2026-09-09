export default function PatientCard({ patient, isSelected, onClick }) {
  const initials = patient.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`patient-card${isSelected ? " selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-pressed={isSelected}
      aria-label={`Select patient ${patient.name}`}
    >
      <span className="patient-card-badge">{patient.blood_group || "—"}</span>
      <div className="patient-card-name">{patient.name}</div>
      <div className="patient-card-meta">
        {patient.age}y · {patient.sex}
      </div>
    </div>
  );
}
