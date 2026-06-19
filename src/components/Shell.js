"use client";
/** @typedef {import('../types').SRSData} SRSData */
/** @typedef {import('../types').AppUser} AppUser */
/** @typedef {import('../types').AppStats} AppStats */
/** @typedef {import('../types').UserMeta} UserMeta */
/** @typedef {import('../types').PomodoroTick} PomodoroTick */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import PomodoroBar from "../app/PomodoroBar";

/**
 * @param {Date} date
 * @returns {string} "YYYY-MM-DD"
 */
function getLocalDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** @returns {string} "YYYY-MM-DD" */
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Calcula streak de dias consecutivos de estudo.
 * @param {SRSData} srsData
 * @returns {number}
 */
function calculateStreak(srsData) {
  const dates = new Set();
  for (const id in srsData) {
    if (srsData[id] && srsData[id].lastReviewed) {
      const d = new Date(srsData[id].lastReviewed);
      dates.add(getLocalDateString(d));
    }
  }
  if (dates.size === 0) return 0;

  const todayStr = getLocalDateString(new Date());
  const yesterdayStr = getLocalDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));

  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) {
    return 0;
  }

  let streak = 0;
  let current = dates.has(todayStr) ? new Date() : new Date(Date.now() - 24 * 60 * 60 * 1000);

  while (true) {
    const currentStr = getLocalDateString(current);
    if (dates.has(currentStr)) {
      streak++;
      current = new Date(current.getTime() - 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }
  return streak;
}

const RADIAL_GLOW_BASE = {
  position: "fixed",
  top: -200,
  left: "50%",
  transform: "translateX(-50%)",
  width: 600,
  height: 400,
  borderRadius: "50%",
  pointerEvents: "none",
  zIndex: 0
};

const Shell = React.memo(function Shell({ children, user, stats, onLogout, centered, userMeta = null, showShieldBanner = false, onDismissShield = () => {}, srsData = {}, hidePomodoro = false }) {
  const [showPomodoro, setShowPomodoro] = useState(!hidePomodoro);
  const [pomodoroInfo, setPomodoroInfo] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setShowPomodoro(!hidePomodoro); }, [hidePomodoro]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handlePomodoroTick = useCallback((info) => {
    setPomodoroInfo(info);
  }, []);

  const shellStreakAtRisk = useMemo(() => {
    if (!userMeta) return false;
    if (userMeta.shields_available > 0) return false;
    if (!userMeta.shields_exhausted_at) return false;
    const exhaustDate = new Date(userMeta.shields_exhausted_at + "T00:00:00");
    const todayDate = new Date(getTodayStr() + "T00:00:00");
    const daysSinceExhaust = Math.floor((todayDate - exhaustDate) / 86400000);
    return daysSinceExhaust < 7;
  }, [userMeta]);

  return (
      <div style={{ height: "100vh", overflow: "hidden", background: "#030712", boxSizing: "border-box", position: "relative", width: "100%", display: "flex", flexDirection: "column" }}>
      <div className="shell-hero-composite" />
      <div style={{ ...RADIAL_GLOW_BASE, background: "radial-gradient(ellipse,rgba(59,130,246,0.03) 0%,transparent 70%)" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 800, margin: "0 auto", boxSizing: "border-box", flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: isMobile ? "0 10px" : "0 16px" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0f172a", borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)", minHeight: 0, padding: isMobile ? "12px 16px" : "14px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexDirection: "row", flexShrink: 0, flexWrap: "wrap", gap: isMobile ? 6 : 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "inline-block", background: "linear-gradient(135deg,#e11d48,#be123c)", borderRadius: 10, padding: "6px 14px" }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 9, letterSpacing: 2, fontFamily: "monospace" }}>PC-PE · AGENTE</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: shellStreakAtRisk ? "#f59e0b" : "#f97316", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }} title={shellStreakAtRisk ? "Ofensiva em risco! Faça o Desafio." : "Dias de ofensiva"}>
                  {shellStreakAtRisk ? "⚠️" : "🔥"} {calculateStreak(srsData)} <span style={{ color: "#94a3b8", fontSize: 10, fontWeight: 400 }}>dias</span>
                </span>
                <span style={{ color: "#334155", fontSize: 11, fontWeight: 300 }}>|</span>
                <span style={{ color: "#3b82f6", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }} title="Escudos disponíveis">
                  🛡️ {userMeta?.shields_available ?? 2} <span style={{ color: "#94a3b8", fontSize: 10, fontWeight: 400 }}>escudos</span>
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14 }}>
              <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>
                {user?.role === "admin" ? "👑" : "👤"} {user?.name}
              </span>
              {user?.role === "admin" && (
                <button
                  onClick={() => window.__setShowAdmin?.(true)}
                  style={{
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.15)",
                    borderRadius: 10,
                    padding: "6px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#a78bfa",
                    cursor: "pointer"
                  }}
                  className="btn-hover"
                >
                  👑 Admin
                </button>
              )}
              <button
                onClick={onLogout}
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  borderRadius: 10,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#ef4444",
                  cursor: "pointer"
                }}
                className="btn-hover"
              >
                Sair
              </button>
            </div>
          </div>

          <hr style={{ width: "100%", border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", margin: "12px 0", flexShrink: 0 }} />

          {showShieldBanner && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: 12, padding: "10px 16px", marginBottom: 12, flexShrink: 0,
            }}>
              <span style={{ fontSize: 18 }}>🛡️</span>
              <p style={{ color: "#93c5fd", fontSize: 12, fontWeight: 500, margin: 0, flex: 1, lineHeight: 1.4 }}>
                Você perdeu um dia, mas seu Escudo de Ofensiva foi ativado e salvou sua sequência! ({userMeta?.shields_available || 0} escudo(s) restante(s))
              </p>
              <button
                onClick={onDismissShield}
                style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                  color: "#94a3b8", cursor: "pointer", outline: "none", whiteSpace: "nowrap",
                }}
                className="btn-hover"
              >
                OK
              </button>
            </div>
          )}

          <div style={{ display: showPomodoro ? 'block' : 'none', flexShrink: 0 }}>
            <PomodoroBar username={user?.username} onHide={hidePomodoro ? () => setShowPomodoro(false) : undefined} onTick={handlePomodoroTick} isMobile={isMobile} />
          </div>

          {showPomodoro && (
            <hr style={{ width: "100%", border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", margin: "12px 0", flexShrink: 0 }} />
          )}

          {centered ? (
            <div style={{ flex: 1, overflow: "hidden", minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {children}
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }} className="custom-scrollbar">
              <div className="dashboard-content">
                {children}
              </div>
            </div>
          )}
        </div>

        {!showPomodoro && hidePomodoro && (
          <button
            onClick={() => setShowPomodoro(true)}
            className="pomodoro-floating-btn btn-hover"
            style={{
              position: 'fixed', zIndex: 100,
              display: 'flex', alignItems: 'center', gap: 6,
              background: pomodoroInfo?.status === "running" ? 'rgba(34,197,94,0.15)' : pomodoroInfo?.status === "paused" ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.04)',
              border: pomodoroInfo?.status === "running" ? '1px solid rgba(34,197,94,0.25)' : pomodoroInfo?.status === "paused" ? '1px solid rgba(234,179,8,0.25)' : '1px solid rgba(255,255,255,0.08)',
              color: pomodoroInfo?.status === "running" ? '#4ade80' : pomodoroInfo?.status === "paused" ? '#eab308' : '#94a3b8',
              fontSize: 16, cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
              outline: 'none',
            }}
          >
            🍅
            {pomodoroInfo != null && pomodoroInfo.status !== "idle" && (
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'monospace' }}>
                {pomodoroInfo.formatted}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
});

export default Shell;
