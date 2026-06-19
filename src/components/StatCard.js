"use client";
export default function StatCard({ value, label, color, icon, style: extStyle }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.05)",
      borderRadius: 16,
      padding: "16px 14px",
      textAlign: "center",
      ...extStyle
    }}>
      {icon && <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>}
      <div style={{ fontSize: 22, fontWeight: 700, color: color || "#fff" }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, fontWeight: 600, letterSpacing: 0.5 }}>
        {label}
      </div>
    </div>
  );
}
