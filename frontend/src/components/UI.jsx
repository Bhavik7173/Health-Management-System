import { useState } from "react";
import { C } from "../constants";

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ initials, color, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color + "22", border: `2px solid ${color}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.32, fontWeight: 700, color, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, color }) {
  return (
    <span style={{
      background: color + "18", color,
      border: `1px solid ${color}33`,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 11, fontWeight: 700, letterSpacing: "0.03em",
      textTransform: "uppercase",
    }}>
      {label}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, onClick, hover = false }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background: C.card, borderRadius: 20, padding: "20px 22px",
        boxShadow: hov ? C.shadowHover : C.shadow,
        border: `1px solid ${C.border}`,
        transition: "all 0.22s",
        cursor: onClick ? "pointer" : "default",
        transform: hov ? "translateY(-2px)" : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Btn ───────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = "primary", style = {}, disabled, type = "button" }) {
  const variants = {
    primary: { background: C.accent,      color: "#fff",    border: "none" },
    outline: { background: "transparent", color: C.accent,  border: `1.5px solid ${C.accent}` },
    ghost:   { background: C.accentLight, color: C.accent,  border: "none" },
    blue:    { background: C.blue,        color: "#fff",    border: "none" },
    coral:   { background: C.coral,       color: "#fff",    border: "none" },
    danger:  { background: C.coralLight,  color: C.coral,   border: `1px solid ${C.coral}44` },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        borderRadius: 12, padding: "10px 22px",
        fontSize: 13, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.18s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, type = "text", value, onChange, placeholder, icon, required, style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label style={{ fontSize: 12, color: C.textLight, fontWeight: 600, letterSpacing: "0.05em" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {icon && (
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          style={{
            width: "100%", background: C.cardAlt,
            border: `1.5px solid ${C.border}`, borderRadius: 14,
            padding: icon ? "12px 14px 12px 42px" : "12px 16px",
            fontSize: 14, color: C.text, outline: "none",
          }}
        />
      </div>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, color, bg }) {
  return (
    <Card hover>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: C.textLight, fontWeight: 600, marginBottom: 8 }}>{label}</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: C.text, fontWeight: 700 }}>{value}</div>
        </div>
        <div style={{ width: 44, height: 44, background: bg, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ── TabBar ────────────────────────────────────────────────────────────────────
export function TabBar({ tabs, active, onChange, activeColor = C.accent }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
      {tabs.map(([id, label]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{
            padding: "9px 20px", borderRadius: 20,
            border: `1.5px solid ${active === id ? activeColor : C.border}`,
            background: active === id ? activeColor : "#fff",
            color: active === id ? "#fff" : C.textMed,
            fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: C.text }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: C.textLight, marginTop: 4 }}>{subtitle}</p>}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 24 }) {
  return (
    <div style={{
      width: size, height: size, border: `3px solid ${C.border}`,
      borderTop: `3px solid ${C.accent}`, borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
  );
}
