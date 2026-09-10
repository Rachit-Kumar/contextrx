import { useState, useEffect } from "react";
import { fetchFullRecord } from "../api";

const PATIENT_DETAILS_FALLBACK = {
  patient_001: { dob: "1971-04-12", emergency_contact: "Sunita Mehta (spouse) — 9845001234" },
  patient_002: { dob: "1947-09-18", emergency_contact: "David Thorne (son) — 9876543210" },
  patient_003: { dob: "1963-11-04", emergency_contact: "Grace Chen (wife) — 9812345678" },
  patient_004: { dob: "1984-07-29", emergency_contact: "Tariq Al-Hassan (brother) — 9823456789" },
  patient_005: { dob: "1958-03-15", emergency_contact: "Meera Patel (daughter) — 9834567890" },
};

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function PatientHeader({ patient }) {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (!patient?.patient_id) return;
    const fallback = PATIENT_DETAILS_FALLBACK[patient.patient_id] || {};
    setDetails(fallback);

    let isCurrent = true;
    fetchFullRecord(patient.patient_id)
      .then((record) => {
        if (isCurrent && record?.demographics) {
          setDetails({
            dob: record.demographics.dob || fallback.dob,
            emergency_contact: record.demographics.emergency_contact || fallback.emergency_contact,
          });
        }
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [patient?.patient_id]);

  if (!patient) return null;

  const initials = getInitials(patient.name);
  const dob = patient.dob || details?.dob || "—";
  const emergencyContact = patient.emergency_contact || details?.emergency_contact || "—";

  return (
    <div className="patient-header-sticky" role="region" aria-label="Active Patient Information">
      <div className="p-header-t3">
        <div className="t3-badge-card">
          <div className="t3-card-left">
            <div className="t3-avatar-wrapper">
              <div className="t3-avatar">{initials}</div>
              <span className="t3-status-dot" title="Active EHR Record" />
            </div>
            <div className="t3-info-main">
              <div className="t3-name-row">
                <h2 className="t3-name">{patient.name}</h2>
                <span className="t3-blood-tag">Blood Group: {patient.blood_group || "—"}</span>
              </div>
              <div className="t3-demographics-row">
                <span className="t3-demo-item">MRN: <strong>{patient.patient_id}</strong></span>
                <span className="t3-sep">|</span>
                <span className="t3-demo-item">Age: <strong>{patient.age} yrs</strong></span>
                <span className="t3-sep">|</span>
                <span className="t3-demo-item">Sex: <strong>{patient.sex}</strong></span>
              </div>
            </div>
          </div>

          <div className="t3-card-right">
            <div className="t3-card-stat-box">
              <div className="t3-box-header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>DATE OF BIRTH</span>
              </div>
              <div className="t3-box-val">{dob}</div>
            </div>

            <div className="t3-card-stat-box contact-box">
              <div className="t3-box-header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>EMERGENCY CONTACT</span>
              </div>
              <div className="t3-box-val emergency" title={emergencyContact}>{emergencyContact}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
