export const C = {
  bg: "#f0f4f0", card: "#ffffff", cardAlt: "#f7f9f7",
  accent: "#4CAF82", accentLight: "#e8f5ee",
  blue: "#5B8DEF", blueLight: "#EEF3FD",
  coral: "#F47B7B", coralLight: "#FEF0F0",
  amber: "#F5A623", amberLight: "#FEF9EE",
  text: "#1a1a2e", textMed: "#4a5568", textLight: "#94a3b8",
  border: "#e8eef0",
  shadow: "0 4px 24px rgba(0,0,0,0.06)",
  shadowHover: "0 8px 32px rgba(0,0,0,0.10)",
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
