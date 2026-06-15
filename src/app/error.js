"use client";

export default function Error({ error, reset }) {
  console.error("ErrorBoundary caught:", error);
  return (
    <div style={{ padding: 40, color: "#f1f5f9", background: "#030712", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <span style={{ fontSize: 40 }}>⚠️</span>
      <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Erro inesperado</h1>
      <p style={{ color: "#94a3b8", fontSize: 13, maxWidth: 400, textAlign: "center", margin: 0 }}>
        Ocorreu um erro ao carregar a página. Verifique o console para detalhes (F12).
      </p>
      <button
        onClick={() => reset()}
        style={{
          padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(59,130,246,0.3)",
          background: "rgba(59,130,246,0.15)", color: "#93c5fd", fontSize: 13,
          fontWeight: 600, cursor: "pointer", marginTop: 8,
        }}
      >
        Recarregar
      </button>
    </div>
  );
}
