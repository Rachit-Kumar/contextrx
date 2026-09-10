import { useState } from "react";
import { useAuth, DEMO_USERS } from "../auth/AuthContext";

const DOCTOR_USERS  = DEMO_USERS.filter((u) => u.role === "doctor");
const PATIENT_USERS = DEMO_USERS.filter((u) => u.role === "patient");

/* ── Shared quick-select chip ──────────────────────────────────────────────── */
function UserChip({ user, onSelect, accentClass }) {
  return (
    <button
      type="button"
      className={`login-user-chip ${accentClass || ""}`}
      onClick={() => onSelect(user)}
      title={`Log in as ${user.displayName}`}
    >
      <span className="login-chip-avatar">
        {user.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
      </span>
      <span className="login-chip-info">
        <span className="login-chip-name">{user.displayName}</span>
        <span className="login-chip-sub">
          {user.specialty || (user.role === "patient" ? "Patient Portal" : "")}
        </span>
      </span>
    </button>
  );
}

/* ── Shared login form logic ───────────────────────────────────────────────── */
function useLoginForm(allowedRole) {
  const { login } = useAuth();
  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [error, setError]             = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleQuickSelect(user) {
    setUsername(user.username);
    setPassword(user.role === "doctor" ? "doctor123" : "patient123");
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setIsLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 420));
    const result = login(username, password);
    if (!result.ok) {
      setError(result.error);
    } else if (allowedRole && result.role && result.role !== allowedRole) {
      // If someone logs in from the wrong portal, auth still works — routing handles it
    }
    setIsLoading(false);
  }

  return { username, setUsername, password, setPassword, error, setError,
           isLoading, showPassword, setShowPassword, handleQuickSelect, handleSubmit };
}

/* ── Shared form fields JSX ───────────────────────────────────────────────── */
function LoginFormFields({ form, submitLabel, submitId, inputPlaceholder }) {
  const { username, setUsername, password, setPassword, error, setError,
          isLoading, showPassword, setShowPassword, handleSubmit } = form;

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="login-field-group">
        <label htmlFor={`${submitId}-username`} className="login-field-label">Username</label>
        <div className="login-input-wrap">
          <svg className="login-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <input
            id={`${submitId}-username`}
            type="text"
            className="login-input"
            placeholder={inputPlaceholder || "Username"}
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            autoComplete="username"
            autoFocus
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="login-field-group">
        <label htmlFor={`${submitId}-password`} className="login-field-label">Password</label>
        <div className="login-input-wrap">
          <svg className="login-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <input
            id={`${submitId}-password`}
            type={showPassword ? "text" : "password"}
            className="login-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            autoComplete="current-password"
            disabled={isLoading}
          />
          <button type="button" className="login-eye-btn" onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"} tabIndex={-1}>
            {showPassword ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="login-error" role="alert" aria-live="assertive">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <button type="submit" id={submitId} className="login-submit-btn" disabled={isLoading}>
        {isLoading ? (
          <>
            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
            Signing in…
          </>
        ) : (
          <>
            {submitLabel}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 1 — DOCTOR LOGIN  (default landing)
   Blue / clinical theme
   ══════════════════════════════════════════════════════════════ */
export function DoctorLoginPage({ onSwitchToPatient }) {
  const form = useLoginForm("doctor");

  return (
    <div className="login-page login-page--doctor" role="main">
      <div className="login-bg-blob login-bg-blob-1" aria-hidden="true" />
      <div className="login-bg-blob login-bg-blob-2" aria-hidden="true" />
      <div className="login-bg-blob login-bg-blob-3" aria-hidden="true" />

      {/* Portal-switcher strip at very top */}
      <div className="login-portal-switcher">
        <span className="login-portal-switcher-active">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          Clinical Staff
        </span>
        <span className="login-portal-switcher-sep">·</span>
        <button type="button" className="login-portal-switch-link" onClick={onSwitchToPatient}>
          Patient Portal
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="login-card" role="region" aria-label="Clinical staff sign-in">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo-wrap">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="10" fill="url(#doctorLogoGrad)" />
              <path d="M8 16h4l2-6 4 12 2-6h4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="doctorLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0284c7" /><stop offset="1" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 className="login-logo-name">Context<span>Rx</span></h1>
            <p className="login-tagline">Clinical Dashboard · Physician Access</p>
          </div>
        </div>

        {/* Role badge */}
        <div className="login-role-badge login-role-badge--doctor">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          Doctor / Clinical Staff Login
        </div>

        <LoginFormFields
          form={form}
          submitLabel="Access Dashboard"
          submitId="doctor-login-submit"
          inputPlaceholder="e.g. dr.menon"
        />

        {/* Quick select */}
        <div className="login-quick-section">
          <div className="login-quick-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Quick Demo — Clinical Staff
          </div>
          <div className="login-chips-row">
            {DOCTOR_USERS.map((u) => (
              <UserChip key={u.username} user={u} onSelect={form.handleQuickSelect} accentClass="chip--doctor" />
            ))}
          </div>
        </div>

        <div className="login-footer-note">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Demo prototype — credentials are hardcoded for presentation only
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 2 — PATIENT LOGIN
   Teal / health theme
   ══════════════════════════════════════════════════════════════ */
export function PatientLoginPage({ onSwitchToDoctor }) {
  const form = useLoginForm("patient");

  return (
    <div className="login-page login-page--patient" role="main">
      <div className="login-bg-blob login-bg-blob-p1" aria-hidden="true" />
      <div className="login-bg-blob login-bg-blob-p2" aria-hidden="true" />
      <div className="login-bg-blob login-bg-blob-p3" aria-hidden="true" />

      {/* Portal-switcher strip */}
      <div className="login-portal-switcher">
        <button type="button" className="login-portal-switch-link login-portal-switch-link--teal" onClick={onSwitchToDoctor}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Clinical Staff
        </button>
        <span className="login-portal-switcher-sep">·</span>
        <span className="login-portal-switcher-active login-portal-switcher-active--teal">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Patient Portal
        </span>
      </div>

      <div className="login-card login-card--patient" role="region" aria-label="Patient portal sign-in">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo-wrap">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="10" fill="url(#patientLogoGrad)" />
              <path d="M8 16h4l2-6 4 12 2-6h4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="patientLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0891b2" /><stop offset="1" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 className="login-logo-name login-logo-name--teal">Context<span>Rx</span></h1>
            <p className="login-tagline">My Health Portal · Patient Access</p>
          </div>
        </div>

        {/* Role badge */}
        <div className="login-role-badge login-role-badge--patient">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Patient Health Portal Login
        </div>

        <LoginFormFields
          form={form}
          submitLabel="View My Health Record"
          submitId="patient-login-submit"
          inputPlaceholder="e.g. arjun.mehta"
        />

        {/* Quick select */}
        <div className="login-quick-section login-quick-section--patient">
          <div className="login-quick-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Quick Demo — Patient Accounts
          </div>
          <div className="login-chips-row">
            {PATIENT_USERS.map((u) => (
              <UserChip key={u.username} user={u} onSelect={form.handleQuickSelect} accentClass="chip--patient" />
            ))}
          </div>
        </div>

        <div className="login-footer-note">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Your data is only visible to you and your assigned physician
        </div>
      </div>
    </div>
  );
}

/* Default export kept for any legacy import */
export default DoctorLoginPage;
