import { createContext, useContext, useState, useCallback } from "react";

// ─── Demo Users (hardcoded for hackathon prototype) ───────────────────────────
// No real hashing, no real sessions. Pure in-memory/sessionStorage mock.
const DEMO_USERS = [
  { username: "dr.menon",    password: "doctor123",  role: "doctor",  displayName: "Dr. P. Menon",    specialty: "Anaesthesiologist" },
  { username: "dr.gupta",    password: "doctor123",  role: "doctor",  displayName: "Dr. L. Gupta",    specialty: "General Practitioner" },
  { username: "arjun.mehta", password: "patient123", role: "patient", displayName: "Arjun Mehta",     patientId: "patient_001" },
  { username: "priya.sharma",password: "patient123", role: "patient", displayName: "Priya Sharma",    patientId: "patient_002" },
  { username: "kavya.nair",  password: "patient123", role: "patient", displayName: "Kavya Nair",      patientId: "patient_003" },
];

export { DEMO_USERS };

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Load persisted session (survives page refresh during demo) ───────────────
function loadSession() {
  try {
    const raw = sessionStorage.getItem("contextrx_auth_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(user) {
  try {
    if (user) {
      sessionStorage.setItem("contextrx_auth_user", JSON.stringify(user));
    } else {
      sessionStorage.removeItem("contextrx_auth_user");
    }
  } catch {
    // sessionStorage unavailable — degrade gracefully
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadSession());

  /**
   * Attempt login with username + password.
   * Returns { ok: true } on success or { ok: false, error: string } on failure.
   */
  const login = useCallback((username, password) => {
    const found = DEMO_USERS.find(
      (u) =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        u.password === password
    );
    if (!found) {
      return { ok: false, error: "Invalid credentials. Please try again." };
    }
    // Strip the raw password before storing
    const { password: _pw, ...safeUser } = found;
    setUser(safeUser);
    saveSession(safeUser);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    saveSession(null);
    // Also clear other session data so the next user starts fresh
    try {
      sessionStorage.removeItem("contextrx_patient_tabs");
      sessionStorage.removeItem("contextrx_sidebar_open");
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
