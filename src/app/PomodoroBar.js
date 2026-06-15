"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

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

export default function PomodoroBar({ username }) {
  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [status, setStatus] = useState("idle");
  const intervalRef = useRef(null);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  useEffect(() => {
    if (status === "running") {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setStatus("idle");
            playBeep();
            logPomodoro();
            return durationRef.current * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [status]);

  const logPomodoro = async () => {
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
        {
          username,
          log_date: today,
          count: newCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "username, log_date" }
      );
    } catch (e) {
      console.error("Erro ao salvar pomodoro:", e);
    }
  };

  const handleDurationChange = (e) => {
    const val = parseInt(e.target.value);
    setDuration(val);
    setTimeLeft(val * 60);
    setStatus("idle");
    clearInterval(intervalRef.current);
  };

  const handleStart = () => setStatus("running");
  const handlePause = () => {
    setStatus("paused");
    clearInterval(intervalRef.current);
  };
  const handleReset = () => {
    setStatus("idle");
    clearInterval(intervalRef.current);
    setTimeLeft(duration * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: "7px 14px",
        marginBottom: 16,
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          color: "#94a3b8",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1,
        }}
      >
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

      <span
        style={{
          color: "#f1f5f9",
          fontSize: 17,
          fontWeight: 700,
          fontFamily: "monospace",
          minWidth: 52,
          textAlign: "center",
        }}
      >
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>

      {status === "idle" && (
        <button
          onClick={handleStart}
          className="btn-hover"
          style={{
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            outline: "none",
            whiteSpace: "nowrap",
            background: "rgba(34,197,94,0.12)",
            color: "#4ade80",
          }}
        >
          ▶ Iniciar
        </button>
      )}
      {status === "running" && (
        <button
          onClick={handlePause}
          className="btn-hover"
          style={{
            border: "1px solid rgba(234,179,8,0.25)",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            outline: "none",
            whiteSpace: "nowrap",
            background: "rgba(234,179,8,0.12)",
            color: "#eab308",
          }}
        >
          ⏸ Pausar
        </button>
      )}
      {status === "paused" && (
        <button
          onClick={handleStart}
          className="btn-hover"
          style={{
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            outline: "none",
            whiteSpace: "nowrap",
            background: "rgba(34,197,94,0.12)",
            color: "#4ade80",
          }}
        >
          ▶ Continuar
        </button>
      )}
      <button
        onClick={handleReset}
        className="btn-hover"
        style={{
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 8,
          padding: "4px 10px",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          outline: "none",
          whiteSpace: "nowrap",
          background: "rgba(239,68,68,0.1)",
          color: "#f87171",
        }}
      >
        ↺ Reset
      </button>

      {status === "running" && (
        <span
          style={{
            color: "#22c55e",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 0.5,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          ● EM ANDAMENTO
        </span>
      )}
    </div>
  );
}
