export const C = {
  bg: "var(--bg)", card: "var(--card)", cardAlt: "var(--card-alt)",
  accent: "var(--accent)", accentLight: "var(--accent-light)",
  blue: "var(--blue)", blueLight: "var(--blue-light)",
  coral: "var(--coral)", coralLight: "var(--coral-light)",
  amber: "var(--amber)", amberLight: "var(--amber-light)",
  text: "var(--text)", textMed: "var(--text-med)", textLight: "var(--text-light)",
  border: "var(--border)",
  shadow: "var(--shadow)",
  shadowHover: "var(--shadow-hover)",
};

export const statusColor = {
  normal: C.accent, abnormal: C.amber, critical: C.coral,
};

export const sevColor = {
  critical: C.coral, high: C.amber, medium: C.blue, low: C.accent,
};

export const roleColor = {
  doctor: C.blue, radiologist: C.accent, admin: C.coral,
  lab_tech: C.amber, receptionist: "#8b5cf6", patient: C.textLight,
};

// All API calls go through the platform ingress at REACT_APP_BACKEND_URL + /api
const BACKEND = (typeof process !== "undefined" && process.env && process.env.REACT_APP_BACKEND_URL) || "";
export const API_BASE = `${BACKEND}/api`;
