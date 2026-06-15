"use client";
/** @typedef {import('../types').PomodoroTick} PomodoroTick */
/** @typedef {import('../types').PomodoroLog} PomodoroLog */
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import AmbientSound from "./AmbientSound";

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0.3, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.4);
    }, 200);
  } catch (e) {
    // fallback silencioso
  }
}

// Persistent global state for Pomodoro
let globalDuration = 25;
let globalTimeLeft = 25 * 60;
let globalStatus = "idle";
let globalInterval = null;
let globalUsername = null;

const activeInstances = new Set();

function registerInstance(inst) {
  activeInstances.add(inst);
}

function unregisterInstance(inst) {
  activeInstances.delete(inst);
}

function notifyInstances() {
  activeInstances.forEach((inst) => {
    inst.setTimeLeft(globalTimeLeft);
    inst.setStatus(globalStatus);
    inst.setDuration(globalDuration);
  });
}

function startGlobalTimer() {
  if (globalInterval) return;
  globalInterval = setInterval(() => {
    if (globalStatus === "running") {
      if (globalTimeLeft <= 1) {
        globalStatus = "idle";
        globalTimeLeft = globalDuration * 60;
        if (globalInterval) {
          clearInterval(globalInterval);
          globalInterval = null;
        }
        playBeep();
        logPomodoroGlobal();
        notifyInstances();
      } else {
        globalTimeLeft -= 1;
        notifyInstances();
      }
    }
  }, 1000);
}

function pauseGlobalTimer() {
  globalStatus = "paused";
  if (globalInterval) {
    clearInterval(globalInterval);
    globalInterval = null;
  }
  notifyInstances();
}

function resetGlobalTimer() {
  globalStatus = "idle";
  globalTimeLeft = globalDuration * 60;
  if (globalInterval) {
    clearInterval(globalInterval);
    globalInterval = null;
  }
  notifyInstances();
}

async function logPomodoroGlobal() {
  const username = globalUsername;
  if (!username || !supabase?.from) return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("pomodoro_log")
      .select("count")
      .eq("username", username)
      .eq("log_date", today)
      .maybeSingle();
    const newCount = (existing?.count || 0) + 1;
    await supabase.from("pomodoro_log").upsert(
      { username, log_date: today, count: newCount, updated_at: new Date().toISOString() },
      { onConflict: "username, log_date" }
    );
  } catch (e) {
    console.error("Erro ao salvar pomodoro:", e);
  }
}

/**
 * @param {{
 *   username?: string,
 *   onHide?: ()=>void,
 *   onTick?: (tick: PomodoroTick)=>void,
 *   isMobile?: boolean
 * }} props
 */
export default function PomodoroBar({ username, onHide, onTick, isMobile }) {
  const [duration, setDuration] = useState(globalDuration);
  const [timeLeft, setTimeLeft] = useState(globalTimeLeft);
  const [status, setStatus] = useState(globalStatus);

  useEffect(() => {
    if (username) globalUsername = username;
  }, [username]);

  useEffect(() => {
    const inst = { setDuration, setTimeLeft, setStatus };
    registerInstance(inst);
    // If it was already running, resume standard tick updates
    if (globalStatus === "running" && !globalInterval) {
      startGlobalTimer();
    }
    return () => {
      unregisterInstance(inst);
    };
  }, []);

  useEffect(() => {
    if (onTick) {
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      onTick({
        timeLeft,
        status,
        duration,
        formatted: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      });
    }
  }, [timeLeft, status, duration, onTick]);

  const handleDurationChange = (e) => {
    const val = parseInt(e.target.value);
    globalDuration = val;
    globalTimeLeft = val * 60;
    globalStatus = "idle";
    if (globalInterval) {
      clearInterval(globalInterval);
      globalInterval = null;
    }
    notifyInstances();
  };

  const handleStart = () => {
    globalStatus = "running";
    notifyInstances();
    startGlobalTimer();
  };

  const handlePause = () => {
    pauseGlobalTimer();
  };

  const handleReset = () => {
    resetGlobalTimer();
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "0",
        flexShrink: 0,
      }}
    >
      {/* ── Linha 1: Pomodoro ── */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, flexWrap: "wrap" }}>
        <span style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>
          🍅 POMODORO
        </span>

        <select
          value={duration}
          onChange={handleDurationChange}
          style={{
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "4px 6px",
            color: "#f1f5f9",
            fontSize: 11,
            fontWeight: 500,
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value={10}>10 min</option>
          <option value={25}>25 min</option>
        </select>

        <span style={{ color: "#f1f5f9", fontSize: isMobile ? 15 : 17, fontWeight: 700, fontFamily: "monospace", minWidth: 48, textAlign: "center" }}>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>

        {status === "idle" && (
          <button onClick={handleStart} className="btn-hover pomodoro-btn" style={{ border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, padding: isMobile ? "2px 7px" : "4px 10px", fontSize: isMobile ? 10 : 11, fontWeight: 600, cursor: "pointer", outline: "none", whiteSpace: "nowrap", background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
            ▶ Iniciar
          </button>
        )}
        {status === "running" && (
          <button onClick={handlePause} className="btn-hover pomodoro-btn" style={{ border: "1px solid rgba(234,179,8,0.25)", borderRadius: 8, padding: isMobile ? "2px 7px" : "4px 10px", fontSize: isMobile ? 10 : 11, fontWeight: 600, cursor: "pointer", outline: "none", whiteSpace: "nowrap", background: "rgba(234,179,8,0.12)", color: "#eab308" }}>
            ⏸ Pausar
          </button>
        )}
        {status === "paused" && (
          <button onClick={handleStart} className="btn-hover pomodoro-btn" style={{ border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, padding: isMobile ? "2px 7px" : "4px 10px", fontSize: isMobile ? 10 : 11, fontWeight: 600, cursor: "pointer", outline: "none", whiteSpace: "nowrap", background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
            ▶ Continuar
          </button>
        )}
        <button onClick={handleReset} className="btn-hover pomodoro-btn" style={{ border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: isMobile ? "2px 7px" : "4px 10px", fontSize: isMobile ? 10 : 11, fontWeight: 600, cursor: "pointer", outline: "none", whiteSpace: "nowrap", background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
          ↺ {isMobile ? "" : "Reset"}
        </button>

        {status === "running" && !isMobile && (
          <span style={{ color: "#22c55e", fontSize: 9, fontWeight: 600, letterSpacing: 0.5, animation: "pulse 1.5s ease-in-out infinite" }}>
            ● EM ANDAMENTO
          </span>
        )}

        {onHide && (
          <button
            onClick={onHide}
            className="btn-hover"
            style={{
              border: "none", borderRadius: 8, padding: isMobile ? "2px 6px" : "4px 8px", fontSize: 11, fontWeight: 600,
              cursor: "pointer", outline: "none", background: "rgba(255,255,255,0.04)", color: "#64748b",
              marginLeft: "auto",
            }}
            title="Minimizar"
          >
            ─
          </button>
        )}
      </div>

      <hr style={{ width: "100%", border: "none", borderTop: "1px solid rgba(255,255,255,0.05)", margin: 0 }} />

      <AmbientSound isMobile={isMobile} />
    </div>
  );
}
