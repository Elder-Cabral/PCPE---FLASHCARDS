"use client";
export default function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="btn-hover"
      style={{
        alignSelf: "flex-start",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#94a3b8",
        borderRadius: 12,
        padding: "8px 16px",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 500
      }}
    >
      ← Voltar
    </button>
  );
}
