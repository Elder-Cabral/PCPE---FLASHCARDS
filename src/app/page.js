"use client";
/** @typedef {import('../types').Flashcard} Flashcard */
/** @typedef {import('../types').Materia} Materia */
/** @typedef {import('../types').AppUser} AppUser */
/** @typedef {import('../types').SM2State} SM2State */
/** @typedef {import('../types').SRSData} SRSData */
/** @typedef {import('../types').AnswerEntry} AnswerEntry */
/** @typedef {import('../types').UserSettings} UserSettings */
/** @typedef {import('../types').UserMeta} UserMeta */
/** @typedef {import('../types').AppStats} AppStats */
/** @typedef {import('../types').MateriaStats} MateriaStats */
/** @typedef {import('../types').PomodoroTick} PomodoroTick */
import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useAsyncError } from "../hooks/useAsyncError";
import { safeCall } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";
import { createClient } from '@supabase/supabase-js';
import BANCO from "../data/banco.json";
import { supabase } from "../lib/supabase";
import PomodoroBar from "./PomodoroBar";
import Shell from "../components/Shell";
import BackButton from "../components/BackButton";
import StatCard from "../components/StatCard";
import { getLocalDateString, getTodayLocalStr, calculateStreak, isConsecutiveDay, parseLocalDate } from "../lib/streak";
const SESSION_COOKIE = 'pcpe_session';

// Cache for a runtime-created Supabase client, so we never lose the auth session
// (which is held in-memory by the client instance after signInWithPassword).
let _runtimeSupabaseClient = null;

// Helper to obtain a Supabase client at runtime.
// Priority: dynamic client from localStorage config (cached) -> env-exported client -> stub.
// We try the localStorage config FIRST because the env-exported client might be a stub
// when NEXT_PUBLIC_* vars are absent during build, whereas runtime config always works.
function getSupabase() {
  if (typeof window === 'undefined') return supabase;

  // Reuse cached runtime client (preserves auth session)
  if (_runtimeSupabaseClient) return _runtimeSupabaseClient;

  // Use the module-level client if it's a real Supabase instance (not a stub)
  if (supabase && !supabase.__isStub) {
    _runtimeSupabaseClient = supabase;
    return supabase;
  }

  // Fallback: try creating from localStorage config (for runtime-configured projects)
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || localStorage.getItem('pcpe_supabase_url');
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || localStorage.getItem('pcpe_supabase_anon_key');
    if (url && key) {
      _runtimeSupabaseClient = createClient(url, key);
      return _runtimeSupabaseClient;
    }
  } catch (e) {
    console.warn('Could not create Supabase client at runtime:', e);
  }

  return supabase;
}
// Local users authentication is handled server-side via POST /api/auth/login.

// ── CONFIGURAÇÃO DE MATÉRIAS ───────────────────────────────────────────────
const MATERIAS = [
  { id: "leg_estadual",   label: "Legislação Estadual",   emoji: "📋",  color: "#ef4444" },
  { id: "dir_const",      label: "Dir. Constitucional",   emoji: "📜",  color: "#3b82f6" },
  { id: "dir_adm",        label: "Dir. Administrativo",   emoji: "🏛️",  color: "#10b981" },
  { id: "dir_penal",      label: "Dir. Penal",            emoji: "⚠️",  color: "#8b5cf6" },
  { id: "dir_proc_penal", label: "Dir. Processual Penal", emoji: "🔍",  color: "#f97316" },
  { id: "portugues",      label: "Língua Portuguesa",     emoji: "📝",  color: "#06b6d4" },
  { id: "informatica",    label: "Informática",           emoji: "💻",  color: "#14b8a6" },
  { id: "raciocinio",     label: "Raciocínio Lógico",     emoji: "🧠",  color: "#eab308" },
  { id: "contabilidade",  label: "Contabilidade Geral",   emoji: "📊",  color: "#ec4899" },
  { id: "estatistica",    label: "Estatística",           emoji: "📈",  color: "#6366f1" },
  { id: "jurisprudencias", label: "Jurisprudências",       emoji: "⚖️",  color: "#f43f5e" },
];

// ── UTILS: HIGHLIGHT FALSO / VERDADEIRO ──────────────────────────────────────
/**
 * @param {string|null|undefined} text
 * @returns {Array<string|React.ReactElement>|null|undefined}
 */
function highlightFalso(text) {
  if (!text) return text;
  const parts = text.split(/\b(FALSO|VERDADEIRO|SIM|NÃO)\b/);
  return parts.map((part, i) => {
    if (part === "FALSO") return <span key={i} style={{ color: "#f87171", fontWeight: 600 }}>FALSO</span>;
    if (part === "VERDADEIRO") return <span key={i} style={{ color: "#4ade80", fontWeight: 600 }}>VERDADEIRO</span>;
    if (part === "SIM") return <span key={i} style={{ color: "#4ade80", fontWeight: 600 }}>SIM</span>;
    if (part === "NÃO") return <span key={i} style={{ color: "#f87171", fontWeight: 600 }}>NÃO</span>;
    return part;
  });
}

// ── UTILS: ALGORITMO SM-2 ──────────────────────────────────────────────────
/**
 * Algoritmo SM-2 original (1987) com escala 0-5.
 * @param {0|1|2|3} q    0=errei, 1=difícil, 2=bom, 3=fácil
 *                         Mapeamento interno: 0→SM2 0, 1→SM2 2, 2→SM2 4, 3→SM2 5
 * @param {number} [interval=1]    Dias desde último review
 * @param {number} [repetition=0]  Repetições consecutivas com q≥3
 * @param {number} [ef=2.5]        Fator de facilidade (1.3 – 3.0)
 * @returns {SM2State}
 */
function calculateSM2(q, interval = 1, repetition = 0, ef = 2.5) {
  // Mapeia escala 0-3 dos botões para escala SM-2 0-5
  const Q_MAP = { 0: 0, 1: 2, 2: 4, 3: 5 };
  const quality = Q_MAP[q] ?? q;

  // Fórmula original do EF: EF' = EF + (0.1 - (5-q) × (0.08 + (5-q) × 0.02))
  let newEf = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEf = Math.max(1.3, Math.min(3.0, newEf));

  let newInterval;
  let newRepetition;

  if (quality < 3) {
    // q < 3 → não lembra → reset completo
    newInterval = 1;
    newRepetition = 0;
  } else {
    // q >= 3 → lembrou → progride
    newRepetition = repetition + 1;
    if (newRepetition === 1) {
      newInterval = 1;
    } else if (newRepetition === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * ef);
    }
  }

  // Vencimento à meia-noite (00:00:00) de newInterval dias a partir de hoje
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + newInterval);
  targetDate.setHours(0, 0, 0, 0);

  return {
    interval: newInterval,
    repetition: newRepetition,
    ef: newEf,
    dueDate: targetDate.getTime(),
    lastReviewed: Date.now()
  };
}

// ── UTILS: STORAGE, STREAK & DATA ────────────────────────────────────────────
function getLocalJSON(key, fallback = "null") {
  try { return JSON.parse(localStorage.getItem(key) || fallback); }
  catch { return JSON.parse(fallback); }
}


/** @returns {string} "YYYY-MM-DD" no fuso local (alias) */
const getTodayStr = getTodayLocalStr;

async function safeSupabaseCall(fn) {
  const result = await safeCall(fn);
  if (result?.error) throw result.error;
  return result;
}

function normalizeUserMeta(meta, today) {
  const normalized = { ...meta };
  let changed = false;

  if (normalized.current_streak === 0 && (normalized.shields_available ?? 2) < 2) {
    normalized.shields_available = 2;
    normalized.shields_exhausted_at = null;
    changed = true;
  }

  if ((normalized.current_streak ?? 0) > 0 && (normalized.shields_available ?? 2) <= 0 && !normalized.shields_exhausted_at) {
    normalized.shields_available = 0;
    normalized.shields_exhausted_at = today;
    changed = true;
  }

  return { meta: normalized, changed };
}

/**
 * Merge bidirecional de SRS: local sobrescreve remote se tiver lastReviewed mais recente.
 * @param {SRSData} local
 * @param {SRSData} remote
 * @returns {SRSData}
 */
function mergeSRSData(local, remote) {
  const merged = { ...remote };
  for (const id in local) {
    const localCard = local[id];
    const remoteCard = remote[id];
    if (localCard) {
      if (!remoteCard || localCard.lastReviewed > (remoteCard.lastReviewed || 0)) {
        merged[id] = localCard;
      }
    }
  }
  return merged;
}

/**
 * @param {string[]|undefined} local
 * @param {string[]|undefined} remote
 * @returns {string[]}
 */
function mergeFavorites(local, remote) {
  if (!local?.length) return remote || [];
  if (!remote?.length) return local || [];
  const set = new Set([...local, ...remote]);
  return Array.from(set);
}

/**
 * @param {number|undefined} timestamp  ms
 * @returns {boolean}
 */
const isReviewedToday = (timestamp) => {
  if (!timestamp) return false;
  return getLocalDateString(new Date(timestamp)) === getLocalDateString(new Date());
};

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────
export default function App() {
  /** @type {AppUser|null} */
  const [currentUser, setCurrentUser] = useState(null);
  /** @type {SRSData} */
  const [srsData, setSrsData] = useState({});
  /** @type {string|null} */
  const [selectedMateria, setSelectedMateria] = useState(null);
  /** @type {boolean} */
  const [showTopicSelector, setShowTopicSelector] = useState(false);
  /** @type {boolean} */
  const [showFavoritesMateriaSelector, setShowFavoritesMateriaSelector] = useState(false);
  /** @type {string[]} */
  const [selectedTopics, setSelectedTopics] = useState([]);
  /** @type {'srs'|'all'|'topic'|'favorites'|null} */
  const [studyMode, setStudyMode] = useState(null);
  /** @type {Flashcard[]} */
  const [studyQueue, setStudyQueue] = useState([]);
  /** @type {number} */
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  /** @type {boolean} */
  const [sessionCompleted, setSessionCompleted] = useState(false);
  /** @type {{studied:number, gotWrong:number, gotEasy:number}} */
  const [sessionStats, setSessionStats] = useState({ studied: 0, gotWrong: 0, gotEasy: 0 });
  /** @type {'random'|'easy_first'|'hard_first'} */
  const [reviewOrder, setReviewOrder] = useState("random");
  /** @type {string} */
  const [globalReviewMessage, setGlobalReviewMessage] = useState("");
  /** @type {string[]} */
  const [favorites, setFavorites] = useState([]);
  /** @type {Set<string>} */
  const [answeredSessionIds, setAnsweredSessionIds] = useState(new Set());
  /** @type {string} */
  const [toastMessage, setToastMessage] = useState("");
  /** @type {AnswerEntry[]} */
  const [answerHistory, setAnswerHistory] = useState([]);
  /** @type {boolean} */
  const [showDesempenho, setShowDesempenho] = useState(false);
  /** @type {boolean} */
  const [showAdmin, setShowAdmin] = useState(false);
  if (typeof window !== 'undefined') window.__setShowAdmin = setShowAdmin;
  /** @type {string} */
  const [graphPeriod, setGraphPeriod] = useState("30d");
  /** @type {string} */
  const [graphCustomStart, setGraphCustomStart] = useState("");
  /** @type {string} */
  const [graphCustomEnd, setGraphCustomEnd] = useState("");
  /** @type {Object<string,number>} */
  const [cardSnapshot, setCardSnapshot] = useState({});
  /** @type {UserMeta|null} */
  const [userMeta, setUserMeta] = useState(null);
  /** @type {boolean} */
  const [showShieldBanner, setShowShieldBanner] = useState(false);
  /** @type {boolean} */
  const [challengeActive, setChallengeActive] = useState(false);
  /** @type {Flashcard[]} */
  const [challengeCards, setChallengeCards] = useState([]);
  /** @type {boolean} */
  const [challengeStarted, setChallengeStarted] = useState(false);
  /** @type {string|null} */
  const [challengeBanner, setChallengeBanner] = useState(null);
  const feedbackInProgressCardId = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const isSavingRef = useRef(false);
  const toggleFavTimeoutRef = useRef(null);
  const srsDataRef = useRef(srsData);
  const userMetaRef = useRef(userMeta);
  const { setError, ErrorToast } = useAsyncError();

  const updateUserMetaState = useCallback((meta) => {
    userMetaRef.current = meta;
    setUserMeta(meta);
  }, []);

  const resetSessionState = useCallback(() => {
    setSessionCompleted(false);
    setSessionStats({ studied: 0, gotWrong: 0, gotEasy: 0 });
    setAnsweredSessionIds(new Set());
  }, []);

  // Estilos globais e de responsividade injetados
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
      
      * {
        box-sizing: border-box;
      }

      html, body {
        margin: 0;
        padding: 0;
        background-color: #030712;
        max-width: 100vw;
        width: 100%;
        overflow-x: hidden;
      }

      body {
        font-family: 'Outfit', sans-serif;
      }

      /* Animação suave de entrada do login */
      @keyframes loginFadeIn {
        from { opacity: 0; transform: translateY(20px) scale(0.96); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      .login-fade-in {
        animation: loginFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes toastFadeIn {
        from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      .toast-fade-in {
        animation: toastFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes modalFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes modalContentIn {
        from { opacity: 0; transform: translateY(20px) scale(0.96); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      .modal-overlay {
        animation: modalFadeIn 0.2s ease forwards;
      }
      .modal-content {
        animation: modalContentIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .card-hover {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .card-hover:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px rgba(59, 130, 246, 0.1);
        border-color: rgba(255, 255, 255, 0.15) !important;
        background: rgba(255, 255, 255, 0.04) !important;
      }
      .btn-hover {
        transition: all 0.15s ease;
      }
      .btn-hover:hover {
        transform: translateY(-1px);
        filter: brightness(1.1);
      }
      .btn-hover:active {
        transform: scale(0.97);
        filter: brightness(0.9);
      }
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.06);
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(59,130,246,0.35);
        border-radius: 4px;
        border: 2px solid transparent;
        background-clip: content-box;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(59,130,246,0.55);
        border: 2px solid transparent;
        background-clip: content-box;
      }
      .custom-scrollbar {
        scrollbar-width: auto;
        scrollbar-color: rgba(59,130,246,0.35) rgba(255,255,255,0.06);
      }

      /* Classes Responsivas e Estilos de Otimização Mobile */
      .srs-buttons-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }
      .materia-stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      .flashcard-box {
        position: absolute;
        inset: 0;
        backface-visibility: hidden;
        border-radius: 24px;
        padding: 42px 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
      }
      .flashcard-front-style {
        background: linear-gradient(135deg, #0e1726, #090d16);
        border: 1px solid rgba(255,255,255,0.06);
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      }
      .flashcard-back-style {
        background: linear-gradient(135deg, #0f162a, #0b0f19);
        box-shadow: 0 20px 45px rgba(0,0,0,0.4);
        overflow: hidden;
        transform: rotateY(180deg);
      }

      .flashcard-question-text,
      .flashcard-answer-text,
      .card-dica-text {
        font-variant-numeric: tabular-nums;
      }

      /* Composite hero: banner + overlay + subtle grid on top */
      .login-hero-composite {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background-color: #030712;
        background-image:
          linear-gradient(rgba(59,130,246,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.02) 1px, transparent 1px),
          linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.75)),
          url('/banner-pc.jpeg');
        background-size: 40px 40px, 40px 40px, cover, cover;
        background-position: center, center, center, center;
        background-repeat: repeat, repeat, no-repeat, no-repeat;
      }

      .shell-hero-composite {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background-color: #030712;
        background-image:
          linear-gradient(rgba(59,130,246,0.01) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.01) 1px, transparent 1px),
          linear-gradient(rgba(0,0,0,0.80), rgba(0,0,0,0.80)),
          url('/banner-pc.jpeg');
        background-size: 40px 40px, 40px 40px, cover, cover;
        background-position: center, center, center, center;
        background-repeat: repeat, repeat, no-repeat, no-repeat;
      }

      /* Dashboard content container */
      .dashboard-content {
        padding: 12px 24px;
      }

      @media (max-width: 640px) {
        .dashboard-content {
          padding: 8px 4px !important;
        }
      }

      @media (max-width: 768px) {
        .login-hero-composite {
          background-image:
            linear-gradient(rgba(59,130,246,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.02) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.80), rgba(0,0,0,0.80)),
            url('/banner-mobile.jpeg');
          background-position: center, center, center top, center top;
          background-size: 40px 40px, 40px 40px, cover, cover;
        }
        .shell-hero-composite {
          background-image:
            linear-gradient(rgba(59,130,246,0.01) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.01) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.80), rgba(0,0,0,0.80)),
            url('/banner-mobile.jpeg');
          background-position: center, center, center top, center top;
          background-size: 40px 40px, 40px 40px, cover, cover;
        }
      }

      @media (max-width: 640px) {
        .srs-buttons-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 12px !important;
        }
        .materia-stats-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 10px !important;
        }
        .materia-stats-grid > div:last-child {
          grid-column: span 2 !important;
        }
        .flashcard-box {
          padding: 32px 20px !important;
          border-radius: 20px !important;
        }
        .flashcard-question-text {
          font-size: 16px !important;
          line-height: 1.6 !important;
        }
        .flashcard-answer-text {
          font-size: 14px !important;
          line-height: 1.6 !important;
        }
        .materia-title {
          font-size: 20px !important;
        }
        .dashboard-metrics-grid {
          grid-template-columns: 1fr !important;
          gap: 10px !important;
        }
      }

      @media (max-width: 380px) {
        .flashcard-box {
          padding: 28px 16px !important;
          border-radius: 16px !important;
        }
        .flashcard-question-text {
          font-size: 15px !important;
          line-height: 1.55 !important;
        }
        .flashcard-answer-text {
          font-size: 13px !important;
          line-height: 1.55 !important;
        }
      }

      @media (min-width: 641px) {
        .flashcard-box {
          padding: 32px 34px !important;
        }
      }

      /* Botão flutuante do Pomodoro */
      .pomodoro-floating-btn {
        bottom: 20px; right: 20px;
        padding: 10px 16px;
        border-radius: 24px;
      }
      @media (max-width: 640px) {
        .pomodoro-floating-btn {
          top: 12px !important;
          bottom: auto !important;
          right: 12px !important;
          padding: 8px 12px !important;
          border-radius: 20px !important;
          font-size: 14px !important;
        }
      }

      /* Safe area insets for notched mobile devices */
      @supports (padding: env(safe-area-inset-bottom)) {
        .shell-padding-top {
          padding-top: env(safe-area-inset-top, 0px);
        }
        .shell-padding-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        @media (max-width: 640px) {
          .pomodoro-floating-btn {
            padding-top: calc(env(safe-area-inset-top) + 8px) !important;
          }
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    feedbackInProgressCardId.current = null;
  }, [currentQueueIndex]);

  // Manter ref do srsData sempre atualizada
  useEffect(() => { srsDataRef.current = srsData; }, [srsData]);
  useEffect(() => { userMetaRef.current = userMeta; }, [userMeta]);

  // Salvar progresso no Supabase com mesclagem inteligente
  // ── HISTÓRICO DE RESPOSTAS ────────────────────────────────────────────────
  /**
   * @param {AnswerEntry[]} local
   * @param {AnswerEntry[]} remote
   * @returns {AnswerEntry[]}
   */
  const mergeAnswerHistory = (local, remote) => {
    if (!local?.length) return remote || [];
    if (!remote?.length) return local || [];
    const localMap = new Map();
    for (const entry of local) localMap.set(entry.cardId + "_" + entry.timestamp, entry);
    for (const entry of remote) {
      const key = entry.cardId + "_" + entry.timestamp;
      if (!localMap.has(key)) localMap.set(key, entry);
    }
    return Array.from(localMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  };

  // useAsyncError hook already defined above

  /**
   * @param {string} username
   * @param {AnswerEntry[]} history
   */
  const saveAnswerHistoryLocally = (username, history) => {
    try {
      localStorage.setItem("pcpe_history_" + username, JSON.stringify(history));
    } catch {}
  };

  /**
   * @param {string} cardId
   * @param {string} materia
   * @param {0|1|2|3} resultado
   */
  const recordAnswer = (cardId, materia, resultado) => {
    const entry = { cardId, materia, resultado, timestamp: Date.now() };
    setAnswerHistory(prev => {
      const updated = [...prev, entry];
      if (currentUser) {
        saveAnswerHistoryLocally(currentUser.username, updated);
      }
      return updated;
    });
  };

  /**
   * Persiste SRS + settings + answer_history no Supabase e localStorage.
   * @param {string} username
   * @param {SRSData} srs
   * @param {UserSettings} currentSettings
   * @returns {Promise<void>}
   */
  const saveSRSData = async (username, srs, currentSettings) => {
    const doSave = async () => {
      isSavingRef.current = true;
      try {
        const client = getSupabase();

        const currentHistory = getLocalJSON("pcpe_history_" + username, "[]");
        const localSRSFromStorage = getLocalJSON("pcpe_srs_" + username, "{}");

          const { data, error } = await safeCall(() =>
            client
              .from("user_progress")
              .select("srs_data, settings, answer_history")
              .eq("username", username)
          );

        let latestSRS = {};
        let latestSettings = currentSettings;
        let remoteHistory = [];

        if (!error && data && data.length > 0) {
          latestSRS = data[0].srs_data || {};
          latestSettings = {
            ...data[0].settings,
            ...currentSettings,
            favorites: mergeFavorites(data[0].settings?.favorites, currentSettings.favorites || [])
          };
          remoteHistory = data[0].answer_history || [];
        }

        const localSRS = mergeSRSData(srs, localSRSFromStorage);
        const mergedSRS = mergeSRSData(localSRS, latestSRS);
        const mergedHistory = mergeAnswerHistory(currentHistory, remoteHistory);

          await safeCall(() => client.from("user_progress").upsert({
            username,
            srs_data: mergedSRS,
            settings: latestSettings,
            answer_history: mergedHistory,
            updated_at: new Date().toISOString(),
          }));

        setSrsData(mergedSRS);
        setAnswerHistory(mergedHistory);
        localStorage.setItem("pcpe_srs_" + username, JSON.stringify(mergedSRS));
        localStorage.setItem("pcpe_history_" + username, JSON.stringify(mergedHistory));
        if (latestSettings.reviewOrder) {
          setReviewOrder(latestSettings.reviewOrder);
        }
        if (latestSettings.favorites) {
          setFavorites(latestSettings.favorites);
        }
        localStorage.setItem("pcpe_settings_" + username, JSON.stringify(latestSettings));
        } catch (e) {
          console.error("Erro ao salvar no Supabase:", e);
          setError("Falha ao salvar progresso. Tente novamente.");
        } finally {
        isSavingRef.current = false;
      }
    };

    const result = saveQueueRef.current.then(doSave);
    saveQueueRef.current = result.catch(() => {});
    return result;
  };

  /**
   * Carrega streak + shields do Supabase.
   * @param {string} username
   * @returns {Promise<void>}
   */
  const loadUserMeta = useCallback(async (username) => {
    if (!username) return;
    const client = getSupabase();
    const storageKey = "pcpe_meta_" + username;
    let localFallback = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) localFallback = JSON.parse(raw);
    } catch (_) {}

    // UX: Carrega o fallback local imediatamente para evitar flash de "2" escudos
    if (localFallback) {
      updateUserMetaState(localFallback);
    }

    try {
          const { data } = await safeSupabaseCall(() => client
            .from("user_meta")
            .select("*")
            .eq("username", username)
            .maybeSingle());

      const today = getTodayStr();

      // Se nao existir registro, semear streak do localStorage ou SRS
      if (!data) {
        const seedStreak = localFallback?.current_streak || calculateStreak(srsDataRef.current);
        let meta = {
          username,
          current_streak: seedStreak,
          last_study_date: localFallback?.last_study_date || (seedStreak > 0 ? today : null),
          shields_available: localFallback?.shields_available ?? 2,
          shields_exhausted_at: localFallback?.shields_exhausted_at || null,
          updated_at: new Date().toISOString(),
        };
          // Safety: mesmo no seed, streak zerado = escudos restaurados
          if (meta.current_streak === 0 && meta.shields_available < 2) {
            meta.shields_available = 2;
            meta.shields_exhausted_at = null;
          }
          meta = normalizeUserMeta(meta, today).meta;
          await safeSupabaseCall(() => client.from("user_meta").upsert(meta));
        localStorage.setItem(storageKey, JSON.stringify(meta));
        updateUserMetaState(meta);
        return;
      }

      let needsUpdate = false;
      let shieldActivated = false;
      const meta = { ...data };

      // Reset semanal de escudos (segunda-feira)
      if (new Date().getDay() === 1 && meta.shields_available < 2) {
        meta.shields_available = 2;
        meta.shields_exhausted_at = null;
        needsUpdate = true;
      }

      // Verificar dias perdidos + período de graça
      if (meta.last_study_date) {
        const lastDate = parseLocalDate(meta.last_study_date);
        const todayDate = parseLocalDate(today);
        if (lastDate && todayDate) {
          const diffDays = Math.floor((todayDate - lastDate) / 86400000);

          if (diffDays >= 2) {
            if (meta.shields_available > 0) {
              // Consome 1 escudo
              meta.shields_available -= 1;
              shieldActivated = true;
              needsUpdate = true;
              // Marca a falha como processada. Sem isso, cada reload/login
              // consumiria outro escudo pelo mesmo intervalo de ausência.
              meta.last_study_date = getLocalDateString(new Date(Date.now() - 86400000));
              // Se era o último escudo, marca início da carência
              if (meta.shields_available === 0) {
                meta.shields_exhausted_at = today;
              }
            } else {
              // Escudos esgotados: verifica período de graça de 7 dias
              if (meta.shields_exhausted_at) {
                const exhaustDate = parseLocalDate(meta.shields_exhausted_at);
                if (exhaustDate) {
                  const daysSinceExhaust = Math.floor((todayDate - exhaustDate) / 86400000);
                  if (daysSinceExhaust >= 7) {
                    // Carência expirada: perde a ofensiva e restaura escudos
                    meta.current_streak = 0;
                    meta.last_study_date = null;
                    meta.shields_available = 2;
                    meta.shields_exhausted_at = null;
                    needsUpdate = true;
                  }
                }
                // senão: mantém streak (dentro da carência)
              } else {
                // shields=0 sem exhausted_at: marca agora
                meta.shields_exhausted_at = today;
                needsUpdate = true;
              }
            }
          } else if (diffDays <= 1) {
            // Limpa carência apenas se ainda houver escudos. Com 0 escudos,
            // shields_exhausted_at é necessário para o desafio/contagem de risco.
            if (meta.shields_exhausted_at && meta.shields_available > 0) {
              meta.shields_exhausted_at = null;
              needsUpdate = true;
            }
          }
        }
      }

      const normalized = normalizeUserMeta(meta, today);
      Object.assign(meta, normalized.meta);
      needsUpdate = needsUpdate || normalized.changed;

      // ── Safety: streak zerou, escudos devem voltar a 2 ──
      if (meta.current_streak === 0 && meta.shields_available < 2) {
        meta.shields_available = 2;
        meta.shields_exhausted_at = null;
        shieldActivated = false; // streak já é 0, nada a proteger
        needsUpdate = true;
      }

      if (needsUpdate) {
          const persistedMeta = {
            ...meta,
            updated_at: new Date().toISOString(),
          };
          await safeSupabaseCall(() => client.from("user_meta").upsert(persistedMeta));
          Object.assign(meta, persistedMeta);
      }

      localStorage.setItem(storageKey, JSON.stringify(meta));
      updateUserMetaState(meta);
      if (shieldActivated) setShowShieldBanner(true);
    } catch (e) {
      console.error("Erro ao carregar user_meta:", e);
      setError("Erro ao carregar metas do usuário.");
      // Fallback: localStorage ou SRS
      if (localFallback) {
          // Safety: mesmo no fallback, streak zerado = escudos restaurados
          if (localFallback.current_streak === 0 && localFallback.shields_available < 2) {
            localFallback.shields_available = 2;
            localFallback.shields_exhausted_at = null;
          }
        localFallback = normalizeUserMeta(localFallback, getTodayStr()).meta;
        updateUserMetaState(localFallback);
      } else {
        updateUserMetaState({ current_streak: calculateStreak(srsDataRef.current), shields_available: 2 });
      }
    }
  }, [updateUserMetaState]);

  // Carregar progresso do Supabase com mesclagem inteligente
  /**
   * Carrega SRS + settings + answer_history do Supabase e localStorage, faz merge.
   * @param {string} username
   * @returns {Promise<void>}
   */
  const loadUserData = async (username) => {
    try {
      const client = getSupabase();
      let emailKey = null;

      // If username is not an email, look up the mapped auth email
      // from username_map so we query by the canonical key.
      if (!username.includes("@")) {
        try {
          const { data: email, error: rpcErr } = await client
            .rpc("get_email_by_username", { p_username: username });
          if (!rpcErr && email) emailKey = email;
        } catch (e) {
          console.warn("get_email_by_username RPC failed:", e);
        }
      }

      // Query all relevant keys (email first, then typed username as legacy)
      const queryKeys = emailKey ? [emailKey, username] : [username];
      let combinedSRS = {};
      let combinedSettings = {};
      let combinedHistory = [];

      for (const key of queryKeys) {
        const { data, error } = await client
          .from("user_progress")
          .select("srs_data, settings, answer_history")
          .eq("username", key);
        if (!error && data && data.length > 0) {
          const row = data[0];
          const rowSettings = row.settings || {};
          combinedSRS = mergeSRSData(combinedSRS, row.srs_data || {});
          combinedSettings = {
            ...combinedSettings,
            ...rowSettings,
            favorites: mergeFavorites(combinedSettings.favorites || [], rowSettings.favorites || [])
          };
          combinedHistory = mergeAnswerHistory(combinedHistory, row.answer_history || []);
        }
      }

      const resolvedUsername = emailKey || username;

      // Read localStorage for the original typed username (legacy local data)
      const savedSRS = localStorage.getItem("pcpe_srs_" + username);
      const savedSettings = localStorage.getItem("pcpe_settings_" + username);
      const savedHistory = localStorage.getItem("pcpe_history_" + username);
      const localSRS = savedSRS ? JSON.parse(savedSRS) : {};
      const localSettings = savedSettings ? JSON.parse(savedSettings) : { reviewOrder: "random", favorites: [] };
      const localHistory = savedHistory ? JSON.parse(savedHistory) : [];

      // Merge remote data with local: remote (Supabase) fills the base,
      // local overwrites any cards with newer timestamps.
      const mergedSRS = mergeSRSData(localSRS, combinedSRS);
      // Preserve in-memory state (most recent user answers) that hasn't been flushed yet
      const finalSRS = mergeSRSData(srsDataRef.current, mergedSRS);
      const mergedSettings = {
        ...localSettings,
        ...combinedSettings,
        favorites: mergeFavorites(localSettings.favorites || [], combinedSettings.favorites || [])
      };
      const mergedHistory = mergeAnswerHistory(localHistory, combinedHistory);

      setSrsData(finalSRS);
      setAnswerHistory(mergedHistory);
      if (mergedSettings.reviewOrder) setReviewOrder(mergedSettings.reviewOrder);
      if (mergedSettings.favorites) setFavorites(mergedSettings.favorites || []);

      if (!isSavingRef.current) {
        localStorage.setItem("pcpe_srs_" + resolvedUsername, JSON.stringify(finalSRS));
        localStorage.setItem("pcpe_settings_" + resolvedUsername, JSON.stringify(mergedSettings));
        localStorage.setItem("pcpe_history_" + resolvedUsername, JSON.stringify(mergedHistory));

          await safeCall(() => client.from("user_progress").upsert({
            username: resolvedUsername,
            srs_data: finalSRS,
            settings: mergedSettings,
            answer_history: mergedHistory,
            updated_at: new Date().toISOString(),
          }));
      }

      // Clean up legacy rows that have been merged
      for (const key of queryKeys) {
        if (key !== resolvedUsername) {
          try {
            await safeCall(() => client.from("user_progress").delete().eq("username", key));
          } catch (e) { /* ignore cleanup errors */ }
        }
      }

      // Update the stored session to use the canonical key
      if (emailKey) {
        try {
          const session = getLocalJSON(SESSION_COOKIE, "{}");
          session.username = emailKey;
          localStorage.setItem(SESSION_COOKIE, JSON.stringify(session));
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.error("Erro no loadUserData:", e);
      setError("Erro ao carregar dados do usuário.");
    }
  };

  // Carregar sessão e SRS do localStorage e Supabase
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(SESSION_COOKIE);
      if (savedSession) {
        const user = JSON.parse(savedSession);
        if (user && user.username) {
          // Validar expiração da sessão
          if (user.expiresAt && Date.now() > user.expiresAt) {
            localStorage.removeItem(SESSION_COOKIE);
            fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
            return;
          }
          setCurrentUser(user);
          loadUserData(user.username);
        }
      }
    } catch (e) {
      console.error(e);
      setError("Erro ao restaurar sessão do usuário.");
    }
  }, []);

  // Verificar expiração ao retornar à aba (tab focus)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const savedSession = localStorage.getItem(SESSION_COOKIE);
        if (savedSession) {
          try {
            const user = JSON.parse(savedSession);
            if (user && user.expiresAt && Date.now() > user.expiresAt) {
              localStorage.removeItem(SESSION_COOKIE);
              fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
              setCurrentUser(null);
            }
          } catch {}
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Carregar user_meta (streak/shields) quando o usuario logar
  useEffect(() => {
    if (currentUser?.username) {
      loadUserMeta(currentUser.username);
    }
  }, [currentUser?.username, loadUserMeta]);

  // Restaurar estado do Desafio do localStorage (se ainda válido no mesmo dia)
  useEffect(() => {
    if (!currentUser) return;
    const storageKey = "pcpe_challenge_" + currentUser.username;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.startedDate === getTodayStr()) {
          // Reconstruir os cards a partir dos IDs salvos
          const cards = parsed.cards.map(id => {
            for (const mat of MATERIAS) {
              const found = (BANCO[mat.id] || []).find(c => c.id === id);
              if (found) return found;
            }
            return null;
          }).filter(Boolean);
          if (cards.length > 0) {
            setChallengeCards(cards);
            setChallengeActive(true);
            setChallengeStarted(true);
            setStudyQueue(cards);
            setCurrentQueueIndex(0);
            setStudyMode("challenge");
            setSelectedMateria(null);
          }
        } else {
          // Desafio expirado (outro dia)
          localStorage.removeItem(storageKey);
        }
      }
    } catch (_) {}
  }, [currentUser]);

  // Inicializar snapshot de cards para detectar "Novas" questões adicionadas
  useEffect(() => {
    if (!currentUser) return;
    try {
      const key = "pcpe_card_snapshot_" + currentUser.username;
      const saved = localStorage.getItem(key);
      const current = {};
      for (const mat of MATERIAS) {
        current[mat.id] = (BANCO[mat.id] || []).length;
      }
      if (!saved) {
        localStorage.setItem(key, JSON.stringify(current));
        setCardSnapshot(current);
      } else {
        const old = JSON.parse(saved);
        if (JSON.stringify(old) !== JSON.stringify(current)) {
          setCardSnapshot(current);
        } else {
          setCardSnapshot(old);
        }
      }
    } catch {}
  }, [currentUser]);

  // Sincronizar ao focar a aba/janela novamente (ex: alternar entre celular e PC)
  useEffect(() => {
    if (!currentUser) return;
    const handleFocus = () => {
      loadUserData(currentUser.username);
      loadUserMeta(currentUser.username);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadUserData(currentUser.username);
        loadUserMeta(currentUser.username);
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser, loadUserMeta]);

  // Sincronizar dados a cada 30s (cards revisados em outro dispositivo, virada do dia, etc)
  useEffect(() => {
    if (!currentUser) return;
    let lastDateStr = getLocalDateString(new Date());

    const interval = setInterval(() => {
      if (isSavingRef.current) return;
      const todayStr = getLocalDateString(new Date());
      if (todayStr !== lastDateStr) {
        lastDateStr = todayStr;
      }
      loadUserData(currentUser.username);
      loadUserMeta(currentUser.username);
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser, loadUserMeta]);

  // Atualizar streak ao finalizar sessao de estudo (ou desafio)
  useEffect(() => {
    if (!sessionCompleted || !currentUser || answeredSessionIds.size < 1) return;
    const updateMeta = async () => {
      const today = getTodayStr();
      const prev = userMetaRef.current || { current_streak: 0, last_study_date: null, shields_available: 2, shields_exhausted_at: null };
      let newStreak = prev.current_streak || 0;
      if (prev.last_study_date !== today) {
        const gap = prev.last_study_date !== null && !isConsecutiveDay(prev.last_study_date, today);
        const shieldProtected = gap && (
          prev.shields_available < 2 ||
          prev.shields_exhausted_at !== null
        );
        if (!gap || shieldProtected) {
          newStreak += 1;
        }
      }
      // Detecta se foi um Desafio concluído (52 cards respondidos)
      const isChallengeDone = challengeActive && answeredSessionIds.size >= challengeCards.length;

      // Se shields_exhausted_at ainda existe e NÃO é desafio, mantém (carência continua)
      // Se for desafio: restaura 2 escudos e limpa carência
      const shieldsWereLost = prev.current_streak === 0 && (prev.shields_available ?? 2) < 2;
      let updated = {
        username: currentUser.username,
        current_streak: newStreak,
        last_study_date: today,
        shields_available: isChallengeDone ? 2 : shieldsWereLost ? 2 : (prev.shields_available ?? 2),
        shields_exhausted_at: isChallengeDone ? null : shieldsWereLost ? null : (prev.shields_exhausted_at ?? null),
        updated_at: new Date().toISOString(),
      };
      updated = normalizeUserMeta(updated, today).meta;
      try {
        const client = getSupabase();
        await safeSupabaseCall(() => client.from("user_meta").upsert(updated));
        localStorage.setItem("pcpe_meta_" + currentUser.username, JSON.stringify(updated));
        updateUserMetaState(updated);
        if (isChallengeDone) {
          setChallengeActive(false);
          setChallengeCards([]);
          setChallengeStarted(false);
          setChallengeBanner(null);
          localStorage.removeItem("pcpe_challenge_" + currentUser.username);
        }
        } catch (e) {
          console.error("Erro ao atualizar streak:", e);
          setError("Erro ao atualizar sua sequência.");
        }
    };
    updateMeta();
  }, [sessionCompleted]);

  /**
   * @param {AppUser} user
   * @returns {Promise<void>}
   */
  const handleLogin = async (user) => {
    try {
      localStorage.setItem(SESSION_COOKIE, JSON.stringify(user));
      setCurrentUser(user);
      loadUserData(user.username);
    } catch {}
  };

  /** @returns {Promise<void>} */
  const handleLogout = async () => {
    try {
      localStorage.removeItem(SESSION_COOKIE);
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {}
    } catch {}
    setCurrentUser(null);
    setSelectedMateria(null);
    setStudyMode(null);
    setShowTopicSelector(false);
    setSrsData({});
    setChallengeActive(false);
    setChallengeCards([]);
    setChallengeStarted(false);
    setChallengeBanner(null);
    updateUserMetaState(null);
  };

  const updateReviewOrder = (order) => {
    setReviewOrder(order);
    if (currentUser) {
      try {
        localStorage.setItem(
          "pcpe_settings_" + currentUser.username,
          JSON.stringify({ reviewOrder: order, favorites })
        );
        } catch (e) {
          console.error(e);
          setError("Erro ao salvar preferências de revisão.");
        }
      saveSRSData(currentUser.username, srsData, { reviewOrder: order, favorites });
    }
  };

  const toggleFavorite = (cardId) => {
    if (!currentUser) return;
    setFavorites(prev => {
      const updated = prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId];

      try {
        localStorage.setItem("pcpe_settings_" + currentUser.username, JSON.stringify({ reviewOrder, favorites: updated }));
        } catch (e) { console.error(e); setError("Erro ao atualizar favoritos."); }

      if (toggleFavTimeoutRef.current) clearTimeout(toggleFavTimeoutRef.current);
      toggleFavTimeoutRef.current = setTimeout(() => {
        saveSRSData(currentUser.username, srsData, { reviewOrder, favorites: updated });
      }, 500);
      return updated;
    });
  };

  const startFavoritesSession = (materiaId) => {
    if (favorites.length === 0) return;
    
    let queue = [];
    const materiasToSearch = materiaId ? MATERIAS.filter(mat => mat.id === materiaId) : MATERIAS;
    for (const mat of materiasToSearch) {
      const cards = BANCO[mat.id] || [];
      const favs = cards.filter(c => favorites.includes(c.id));
      queue = [...queue, ...favs];
    }

    if (queue.length === 0) return;

    const sortedQueue = sortQueue(queue);
    setStudyQueue(sortedQueue);
    setCurrentQueueIndex(0);
    setStudyMode("favorites");
    setSelectedMateria(materiaId || null);
    setShowFavoritesMateriaSelector(false);
    resetSessionState();
  };

  const goToNextCard = () => {
    if (currentQueueIndex + 1 < studyQueue.length) {
      setTimeout(() => {
        setCurrentQueueIndex(prev => prev + 1);
      }, 200);
    } else {
      if (studyMode !== "favorites" && studyMode !== "all") {
        setSessionCompleted(true);
      }
    }
  };

  const goToPrevCard = () => {
    if (currentQueueIndex > 0) {
      setTimeout(() => {
        setCurrentQueueIndex(prev => prev - 1);
      }, 200);
    }
  };

  const dificuldadeRank = { facil: 0, media: 1, dificil: 2 };

  /** Embaralha um array in-place (Fisher-Yates) */
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // ── ORDENAÇÃO DA FILA ─────────────────────────────────────────────────
  /**
   * Constrói fila SRS de exatamente maxTotal cards:
   * vencidos primeiro (urgência), depois novos para completar.
   * @param {Flashcard[]} cards  Cards da matéria
   * @param {SRSData} srs        Estado SRS atual
   * @param {number} maxTotal    Tamanho exato da fila (padrão 15)
   * @returns {Flashcard[]}
   */
  const buildPriorityQueue = (cards, srs, maxTotal = 15) => {
    const due = cards.filter(c => srs[c.id] && srs[c.id].dueDate <= Date.now());
    const unseen = cards.filter(c => !srs[c.id]);

    // Vencidos: mais atrasados primeiro
    due.sort((a, b) => (srs[a.id]?.dueDate ?? 0) - (srs[b.id]?.dueDate ?? 0));

    // Preenche até maxTotal: vencidos primeiro, novos depois
    const dueCount = Math.min(due.length, maxTotal);
    const newCount = Math.min(unseen.length, maxTotal - dueCount);
    const shuffledNew = [...unseen].sort(() => Math.random() - 0.5).slice(0, newCount);

    return [...due.slice(0, dueCount), ...shuffledNew];
  };

  const sortQueue = (queueToSort) => {
    if (reviewOrder === "random") {
      return shuffle([...queueToSort]);
    }
    // Agrupar por dificuldade, embaralhar dentro de cada grupo, concatenar
    const grupos = { facil: [], media: [], dificil: [] };
    for (const card of queueToSort) {
      const d = card.dificuldade || "media";
      if (grupos[d]) grupos[d].push(card);
      else grupos.media.push(card);
    }
    shuffle(grupos.facil);
    shuffle(grupos.media);
    shuffle(grupos.dificil);
    if (reviewOrder === "easy_first") {
      return [...grupos.facil, ...grupos.media, ...grupos.dificil];
    }
    if (reviewOrder === "hard_first") {
      return [...grupos.dificil, ...grupos.media, ...grupos.facil];
    }
    return shuffle([...queueToSort]);
  };

  const startGlobalReviewSession = () => {
    let allDue = [];
    for (const mat of MATERIAS) {
      const cards = BANCO[mat.id] || [];
      const due = cards.filter(c => srsData[c.id] && srsData[c.id].dueDate <= Date.now());
      allDue = [...allDue, ...due];
    }
    
    // Vencidos ordenados por urgência (mais atrasados primeiro)
    allDue.sort((a, b) => (srsData[a.id]?.dueDate ?? 0) - (srsData[b.id]?.dueDate ?? 0));
    const selectedDue = allDue.slice(0, 30);

    const sortedQueue = sortQueue(selectedDue);
    setStudyQueue(sortedQueue);
    setCurrentQueueIndex(0);
    setStudyMode("global_srs");
    setSelectedMateria(null);
    resetSessionState();
  };

  const handleGlobalReviewClick = () => {
    if (stats.dueCount > 0) {
      startGlobalReviewSession();
    } else {
      setGlobalReviewMessage("Você não tem Flashcards para revisar hoje, volte amanhã.");
      setTimeout(() => setGlobalReviewMessage(""), 5000);
    }
  };

  // Cálculo de estatísticas gerais
  const stats = useMemo(() => {
    const result = {
      totalCards: 0,
      totalStudied: 0,
      dueCount: 0,
      newCount: 0,
      studiedToday: 0,
      streak: 0,
      materiaStats: {}
    };

    result.streak = calculateStreak(srsData);

    for (const mat of MATERIAS) {
      const cards = BANCO[mat.id] || [];
      result.totalCards += cards.length;

      let matStudied = 0;
      let matDue = 0;
      let matNew = 0;

      for (const card of cards) {
        const state = srsData[card.id];
        if (state) {
          matStudied++;
          result.totalStudied++;
          if (state.dueDate <= Date.now()) {
            matDue++;
            result.dueCount++;
          }
          if (isReviewedToday(state.lastReviewed)) {
            result.studiedToday++;
          }
        } else {
          matNew++;
          result.newCount++;
        }
      }

      result.materiaStats[mat.id] = {
        total: cards.length,
        studied: matStudied,
        due: matDue,
        new: matNew
      };
    }

    return result;
  }, [srsData]);

  // Ofensiva em risco? (escudos=0, carência ativa)
  const streakAtRisk = useMemo(() => {
    if (!userMeta) return false;
    if (userMeta.shields_available > 0) return false;
    if (!userMeta.shields_exhausted_at) return false;
    const exhaustDate = parseLocalDate(userMeta.shields_exhausted_at);
    const todayDate = parseLocalDate(getTodayStr());
    if (!exhaustDate || !todayDate) return false;
    const daysSinceExhaust = Math.floor((todayDate - exhaustDate) / 86400000);
    return daysSinceExhaust < 7;
  }, [userMeta]);

  const graceDaysLeft = useMemo(() => {
    if (!userMeta || !userMeta.shields_exhausted_at) return 0;
    const exhaustDate = parseLocalDate(userMeta.shields_exhausted_at);
    const todayDate = parseLocalDate(getTodayStr());
    if (!exhaustDate || !todayDate) return 0;
    return Math.max(0, 7 - daysSinceExhaust);
  }, [userMeta]);

  // Forçar retorno à home e fechar seletores se o streak estiver em risco
  useEffect(() => {
    if (streakAtRisk) {
      setSelectedMateria(null);
      setShowTopicSelector(false);
      setStudyMode(prev => {
        if (prev !== "challenge" && prev !== "favorites") {
          return null;
        }
        return prev;
      });
    }
  }, [streakAtRisk]);

  // Preparar fila de estudos padrão (Todos / SRS)
  const startStudySession = (materiaId, mode) => {
    const cards = BANCO[materiaId] || [];

    if (mode === "all") {
      const queue = [...cards].sort(() => Math.random() - 0.5);
      setStudyQueue(queue);
    } else {
      const queue = buildPriorityQueue(cards, srsData, 15);
      setStudyQueue(queue);
    }

    setCurrentQueueIndex(0);
    setStudyMode(mode);
    setSelectedMateria(materiaId);
    resetSessionState();
  };

  // Preparar fila de estudos por Tópicos
  const startTopicStudySession = (topicsToStudy) => {
    const cards = BANCO[selectedMateria] || [];
    const matched = cards.filter(c => topicsToStudy.includes(c.topico));

    const queue = buildPriorityQueue(matched, srsData, 15);

    setStudyQueue(queue);
    setCurrentQueueIndex(0);
    setStudyMode("topic");
    resetSessionState();
    setShowTopicSelector(false);
  };

  // ── DESAFIO: Construir fila de 52 cards (5 de cada matéria + 2 jurisprudências) ──
  const buildChallengeQueue = () => {
    const mainSubjects = MATERIAS.filter(m => m.id !== 'jurisprudencias');
    let queue = [];
    for (const mat of mainSubjects) {
      const cards = BANCO[mat.id] || [];
      const shuffled = [...cards].sort(() => Math.random() - 0.5);
      queue = [...queue, ...shuffled.slice(0, 5)];
    }
    const jurisCards = BANCO['jurisprudencias'] || [];
    const shuffledJuris = [...jurisCards].sort(() => Math.random() - 0.5);
    queue = [...queue, ...shuffledJuris.slice(0, 2)];
    return shuffle(queue);
  };

  const startChallenge = () => {
    const cards = buildChallengeQueue();
    const storageKey = "pcpe_challenge_" + currentUser.username;
    setChallengeCards(cards);
    setChallengeActive(true);
    setChallengeStarted(false);
    setChallengeBanner(null);
    setStudyQueue(cards);
    setCurrentQueueIndex(0);
    setStudyMode("challenge");
    setSelectedMateria(null);
    resetSessionState();
    // Persistir estado do desafio
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        cards: cards.map(c => c.id),
        startedDate: getTodayStr(),
      }));
    } catch (_) {}
  };

  // Responder a um card no modo SRS / Tópicos
  const handleCardFeedback = (q) => {
    const currentCard = studyQueue[currentQueueIndex];
    if (!currentCard) return;

    if (answeredSessionIds.has(currentCard.id) || feedbackInProgressCardId.current === currentCard.id) {
      setToastMessage("Opção foi selecionada anteriormente.");
      setTimeout(() => setToastMessage(""), 2000);
      return;
    }

    feedbackInProgressCardId.current = currentCard.id;

    setSessionStats(prev => ({
      studied: prev.studied + 1,
      gotWrong: prev.gotWrong + (q === 0 ? 1 : 0),
      gotEasy: prev.gotEasy + (q === 3 ? 1 : 0)
    }));

    const cardMateriaId = currentCard.id.substring(0, currentCard.id.lastIndexOf("_"));
    recordAnswer(currentCard.id, cardMateriaId, q);

    if (studyMode === "srs" || studyMode === "topic" || studyMode === "global_srs" || studyMode === "all" || studyMode === "challenge") {
      const currentState = srsData[currentCard.id] || { interval: 1, repetition: 0, ef: 2.5 };
      const nextState = calculateSM2(q, currentState.interval, currentState.repetition, currentState.ef);

      const updatedSRS = {
        ...srsData,
        [currentCard.id]: nextState
      };

      setSrsData(updatedSRS);
      saveSRSData(currentUser.username, updatedSRS, { reviewOrder, favorites });
      
      setAnsweredSessionIds(prev => {
        const next = new Set(prev);
        next.add(currentCard.id);
        return next;
      });
    }

    goToNextCard();
  };

  if (!currentUser) {
    return <TelaLogin onLogin={handleLogin} />;
  }

  if (showAdmin) {
    return (
      <AdminPanel
        user={currentUser}
        onBack={() => setShowAdmin(false)}
        onLogout={handleLogout}
        stats={stats}
        userMeta={userMeta}
        showShieldBanner={showShieldBanner}
        setShowShieldBanner={setShowShieldBanner}
        srsData={srsData}
      />
    );
  }

  if (showDesempenho) {
    return (
      <TelaDesempenho
        user={currentUser}
        stats={stats}
        srsData={srsData}
        answerHistory={answerHistory}
        BANCO={BANCO}
        MATERIAS={MATERIAS}
        graphPeriod={graphPeriod}
        setGraphPeriod={setGraphPeriod}
        graphCustomStart={graphCustomStart}
        setGraphCustomStart={setGraphCustomStart}
        graphCustomEnd={graphCustomEnd}
        setGraphCustomEnd={setGraphCustomEnd}
        onBack={() => setShowDesempenho(false)}
        onLogout={handleLogout}
        userMeta={userMeta}
        showShieldBanner={showShieldBanner}
        setShowShieldBanner={setShowShieldBanner}
        startWeakStudy={(cards) => {
          setStudyQueue(cards);
          setCurrentQueueIndex(0);
          setStudyMode("topic");
          resetSessionState();
          setShowDesempenho(false);
        }}
      />
    );
  }

  // ── TELA DE INSTRUÇÕES DO DESAFIO ────────────────
  if (challengeActive && !challengeStarted) {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const hoursLeft = Math.ceil((endOfDay - now) / 3600000);
    return (
      <Shell user={currentUser} stats={stats} onLogout={handleLogout} centered userMeta={userMeta} showShieldBanner={showShieldBanner} onDismissShield={() => setShowShieldBanner(false)} srsData={srsData}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "32px 20px", width: "100%", maxWidth: 480, margin: "0 auto", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24, boxSizing: "border-box" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 600, margin: 0 }}>
            Desafio — Salve sua Ofensiva!
          </h2>
          <div style={{ marginTop: 16, textAlign: "left", color: "#94a3b8", fontSize: 13, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0 }}>⚡ Sua ofensiva de <strong style={{ color: "#f97316" }}>{stats.streak} dias</strong> está em risco.</p>
            <p style={{ margin: 0 }}>📚 Responda <strong>52 flashcards</strong> (5 de cada matéria + 2 de Jurisprudências) para recuperá-la.</p>
            <p style={{ margin: 0 }}>⏰ Você tem até <strong style={{ color: "#f59e0b" }}>{hoursLeft}h</strong> para concluir o desafio hoje.</p>
            <p style={{ margin: 0 }}>🔄 Pode pausar e voltar — seu progresso será salvo.</p>
            <p style={{ margin: 0 }}>🏆 Ao completar: sua ofensiva é mantida e <strong style={{ color: "#3b82f6" }}>2 escudos são restaurados</strong>!</p>
          </div>
          <button
            onClick={() => {
              setChallengeStarted(true);
              setChallengeBanner(`Boa Sorte! Você tem ${hoursLeft}h para completar o desafio.`);
              setTimeout(() => setChallengeBanner(null), 4000);
            }}
            className="btn-hover"
            style={{
              marginTop: 24, width: "100%",
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#fff", border: "none", borderRadius: 14,
              padding: "14px", cursor: "pointer", fontWeight: 700, fontSize: 15, letterSpacing: 1,
            }}
          >
            🔥 Iniciar o Desafio
          </button>
        </div>
      </Shell>
    );
  }

  // Se estiver estudando
  if (studyMode && studyQueue.length > 0 && !sessionCompleted) {
    return (
      <StudySession
        studyQueue={studyQueue}
        currentQueueIndex={currentQueueIndex}
        studyMode={studyMode}
        selectedMateria={selectedMateria}
        favorites={favorites}
        toastMessage={toastMessage}
        currentUser={currentUser}
        stats={stats}
        userMeta={userMeta}
        showShieldBanner={showShieldBanner}
        srsData={srsData}
        MATERIAS={MATERIAS}
        answeredSessionIds={answeredSessionIds}
        onBack={() => {
          setStudyMode(null);
          setShowTopicSelector(false);
          setShowFavoritesMateriaSelector(false);
          if (challengeActive) {
            setChallengeActive(false);
            setChallengeCards([]);
            setChallengeStarted(false);
            setChallengeBanner(null);
            localStorage.removeItem("pcpe_challenge_" + currentUser?.username);
          }
        }}
        onCardFeedback={handleCardFeedback}
        onToggleFav={toggleFavorite}
        onNextCard={goToNextCard}
        onPrevCard={goToPrevCard}
        onDismissShield={() => setShowShieldBanner(false)}
        onLogout={handleLogout}
        challengeBanner={challengeBanner}
        challengeActive={challengeActive}
      />
    );
  }

  // Sessão de Estudos Completada (ou Desafio Concluído)
  if (sessionCompleted) {
    const isGlobal = studyMode === "global_srs";
    const isChallenge = studyMode === "challenge";
    const matInfo = !isGlobal && !isChallenge ? MATERIAS.find(m => m.id === selectedMateria) : null;
    return (
      <Shell user={currentUser} stats={stats} onLogout={handleLogout} centered userMeta={userMeta} showShieldBanner={showShieldBanner} onDismissShield={() => setShowShieldBanner(false)} srsData={srsData}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "32px 20px", width: "100%", maxWidth: 480, margin: "0 auto", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24, boxSizing: "border-box" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>
            {isChallenge ? "🎯" : "🏆"}
          </div>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 600, margin: 0 }}>
            {isChallenge
              ? "🎉 Desafio Completo!"
              : isGlobal
                ? "Você mandou bem, por hoje, amanhã tem mais."
                : "Meta Diária Concluída!"}
          </h2>
          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5, marginTop: 8, marginBottom: 24 }}>
            {isChallenge
              ? <span>Sua ofensiva de <strong style={{ color: "#10b981" }}>{stats.streak} dias</strong> foi preservada! <strong style={{ color: "#3b82f6" }}>2 escudos</strong> foram restaurados. Continue assim! 💪</span>
              : isGlobal
                ? "Sua rodada de revisões diárias foi concluída. Todas as respostas foram computadas e seu plano foi atualizado."
                : <span>Você revisou os cards programados de <strong>{matInfo?.label}</strong>. O progresso foi computado no algoritmo de repetição.</span>
            }
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%", marginBottom: 24 }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "14px 10px" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>{sessionStats.studied}</div>
              <div style={{ fontSize: 9, color: "#64748b", marginTop: 4, fontWeight: 600, letterSpacing: 0.5 }}>CARDS ESTUDADOS</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "14px 10px" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>{stats.streak} dias</div>
              <div style={{ fontSize: 9, color: "#64748b", marginTop: 4, fontWeight: 600, letterSpacing: 0.5 }}>OFENSIVA ATUAL</div>
            </div>
          </div>

          {isChallenge && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 12, padding: "10px 16px", marginBottom: 20, width: "100%", boxSizing: "border-box" }}>
              <span style={{ fontSize: 18 }}>🛡️</span>
              <span style={{ color: "#6ee7b7", fontSize: 12, fontWeight: 600 }}>2 escudos restaurados — sua ofensiva está protegida!</span>
            </div>
          )}

          <button
            onClick={() => {
              setStudyMode(null);
              setSelectedMateria(null);
              setShowFavoritesMateriaSelector(false);
              setSessionCompleted(false);
              if (isChallenge) {
                setChallengeActive(false);
                setChallengeCards([]);
                setChallengeStarted(false);
                setChallengeBanner(null);
                localStorage.removeItem("pcpe_challenge_" + currentUser?.username);
              }
            }}
            className="btn-hover"
            style={{
              width: "100%",
              background: isChallenge
                ? "linear-gradient(135deg, #f97316, #ea580c)"
                : "linear-gradient(135deg, #3b82f6, #2563eb)",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: "14px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14
            }}
          >
            {isChallenge ? "🎉 Voltar ao Painel" : "Voltar ao Painel"}
          </button>
        </div>
      </Shell>
    );
  }

  if (showFavoritesMateriaSelector) {
    const favoriteMaterias = MATERIAS.map(mat => {
      const count = (BANCO[mat.id] || []).filter(card => favorites.includes(card.id)).length;
      return { ...mat, count };
    }).filter(mat => mat.count > 0);

    return (
      <Shell user={currentUser} stats={stats} onLogout={handleLogout} userMeta={userMeta} showShieldBanner={showShieldBanner} onDismissShield={() => setShowShieldBanner(false)} srsData={srsData}>
        <div style={{ width: "100%", maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20, boxSizing: "border-box" }}>
          <BackButton onClick={() => setShowFavoritesMateriaSelector(false)} />

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>⭐</div>
            <h2 className="materia-title" style={{ color: "#fff", fontSize: 22, fontWeight: 600, margin: 0 }}>Favoritos por Matéria</h2>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
              Escolha a matéria dos flashcards favoritados que deseja revisar.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {favoriteMaterias.map(mat => (
              <button
                key={mat.id}
                onClick={() => startFavoritesSession(mat.id)}
                className="card-hover"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${mat.color}33`,
                  borderRadius: 18,
                  padding: "16px 18px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  textAlign: "left",
                  outline: "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 26 }}>{mat.emoji}</div>
                  <div>
                    <div style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 600 }}>{mat.label}</div>
                    <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 3 }}>Abrir favoritos desta matéria</div>
                  </div>
                </div>
                <span style={{ color: mat.color, background: `${mat.color}14`, borderRadius: 10, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
                  {mat.count} {mat.count === 1 ? "card" : "cards"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  // Dashboard / Seleção de Matéria
  if (selectedMateria) {
    const mat = MATERIAS.find(m => m.id === selectedMateria);
    const mStats = stats.materiaStats[selectedMateria] || { total: 0, studied: 0, due: 0, new: 0 };
    const cards = BANCO[selectedMateria] || [];

    // TELA DE SELEÇÃO DE TÓPICOS
    if (showTopicSelector) {
      const uniqueTopics = [...new Set(cards.map(c => c.topico))].filter(Boolean);

      const handleToggleTopic = (t) => {
        setSelectedTopics(prev => {
          if (prev.includes(t)) return prev.filter(x => x !== t);
          return [...prev, t];
        });
      };

      const handleSelectAll = () => setSelectedTopics(uniqueTopics);
      const handleClearAll = () => setSelectedTopics([]);

      const selectedCardsCount = cards.filter(c => selectedTopics.includes(c.topico)).length;

      return (
        <Shell user={currentUser} stats={stats} onLogout={handleLogout} userMeta={userMeta} showShieldBanner={showShieldBanner} onDismissShield={() => setShowShieldBanner(false)} srsData={srsData}>
          <div style={{ width: "100%", maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20, boxSizing: "border-box" }}>
            <BackButton onClick={() => setShowTopicSelector(false)} />

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>🔍</div>
              <h2 className="materia-title" style={{ color: "#fff", fontSize: 22, fontWeight: 600, margin: 0 }}>Estudar por Tópicos</h2>
              <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                Selecione os assuntos de <strong>{mat.label}</strong> para estudar:
              </p>
            </div>

            {/* Seleção Rápida */}
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={handleSelectAll}
                className="btn-hover"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#f1f5f9",
                  borderRadius: 10,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                ✓ Todos
              </button>
              <button
                onClick={handleClearAll}
                className="btn-hover"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#f1f5f9",
                  borderRadius: 10,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                ✗ Limpar
              </button>
            </div>

            {/* Lista de Tópicos */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 280, overflowY: "auto", paddingRight: 4 }} className="custom-scrollbar">
              {uniqueTopics.length > 6 && (
                <div style={{ textAlign: "center", color: "#64748b", fontSize: 10, padding: "4px 0", fontWeight: 500, letterSpacing: 0.5 }}>
                  ↓ Role para ver mais tópicos
                </div>
              )}
              {uniqueTopics.map(t => {
                const count = cards.filter(c => c.topico === t).length;
                const isChecked = selectedTopics.includes(t);
                return (
                  <div
                    key={t}
                    onClick={() => handleToggleTopic(t)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: isChecked ? "rgba(59,130,246,0.06)" : "rgba(255,255,255,0.01)",
                      border: isChecked ? "1px solid rgba(59,130,246,0.25)" : "1px solid rgba(255,255,255,0.04)",
                      borderRadius: 14,
                      padding: "12px 16px",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, paddingRight: 6 }}>
                      <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: 5,
                        border: isChecked ? "2px solid #3b82f6" : "2px solid rgba(255,255,255,0.2)",
                        background: isChecked ? "#3b82f6" : "transparent",
                        display: "flex",
                        alignItems: "center",
                    justifyContent: isExpanded ? "center" : "flex-start",
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: "bold",
                        flexShrink: 0
                      }}>
                        {isChecked && "✓"}
                      </div>
                      <span style={{ color: isChecked ? "#f1f5f9" : "#94a3b8", fontSize: 13, fontWeight: 500, textAlign: "left", lineHeight: 1.4 }}>
                        {t}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: isChecked ? "#3b82f6" : "#64748b", background: isChecked ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.02)", borderRadius: 8, padding: "3px 8px", flexShrink: 0 }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Iniciar Estudo */}
            <button
              onClick={() => selectedCardsCount > 0 && startTopicStudySession(selectedTopics)}
              className="btn-hover"
              disabled={selectedCardsCount === 0}
              style={{
                width: "100%",
                background: selectedCardsCount > 0 ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.03)",
                border: "none",
                borderRadius: 14,
                padding: "16px",
                color: selectedCardsCount > 0 ? "#fff" : "#475569",
                cursor: selectedCardsCount > 0 ? "pointer" : "default",
                fontWeight: 600,
                fontSize: 14,
                boxShadow: selectedCardsCount > 0 ? "0 4px 15px rgba(16,185,129,0.2)" : "none"
              }}
            >
              ⚡ Iniciar Estudo por Tópicos ({selectedCardsCount} cards)
            </button>
          </div>
      <ErrorToast />
    </Shell>
      );
    }

    return (
      <Shell user={currentUser} stats={stats} onLogout={handleLogout} userMeta={userMeta} showShieldBanner={showShieldBanner} onDismissShield={() => setShowShieldBanner(false)} srsData={srsData}>
        <div style={{ width: "100%", maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24, boxSizing: "border-box" }}>
          <BackButton onClick={() => setSelectedMateria(null)} />

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>{mat.emoji}</div>
            <h2 className="materia-title" style={{ color: "#fff", fontSize: 24, fontWeight: 600, margin: 0 }}>{mat.label}</h2>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
              {mStats.total} cards carregados
            </div>
          </div>

          {/* Cards de Status - Utiliza classe responsiva */}
          <div className="materia-stats-grid">
            <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 16, padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>{mStats.due}</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, fontWeight: 600, letterSpacing: 0.5 }}>A REVISAR</div>
            </div>
            <div style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 16, padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#3b82f6" }}>{mStats.new}</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, fontWeight: 600, letterSpacing: 0.5 }}>NOVOS</div>
            </div>
            <div style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 16, padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981" }}>{mStats.studied}</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, fontWeight: 600, letterSpacing: 0.5 }}>ESTUDADOS</div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={() => startStudySession(selectedMateria, "srs")}
              className="btn-hover"
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: "16px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                boxShadow: "0 4px 15px rgba(59,130,246,0.2)"
              }}
            >
              ⚡ Iniciar Estudo Inteligente (SM-2)
            </button>
            
            <button
              onClick={() => {
                const uniqueTopics = [...new Set(cards.map(c => c.topico))].filter(Boolean);
                setSelectedTopics(uniqueTopics);
                setShowTopicSelector(true);
              }}
              className="btn-hover"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff",
                borderRadius: 14,
                padding: "16px",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: 14
              }}
            >
              🔍 Estudar por Tópicos
            </button>

            <button
              onClick={() => startStudySession(selectedMateria, "all")}
              className="btn-hover"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.01)",
                border: "1px solid rgba(255,255,255,0.05)",
                color: "#94a3b8",
                borderRadius: 14,
                padding: "16px",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: 14
              }}
            >
              📖 Estudar Todo o Conteúdo ({mStats.total} cards)
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // Página Inicial - Lista de Matérias
  return (
    <Shell user={currentUser} stats={stats} onLogout={handleLogout} userMeta={userMeta} showShieldBanner={showShieldBanner} onDismissShield={() => setShowShieldBanner(false)} srsData={srsData}>
      {/* Barra de Preferências */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "12px 18px", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>⚙️</span>
          <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>Ordem de Estudo / Revisão:</span>
        </div>
        <select
          value={reviewOrder}
          onChange={(e) => updateReviewOrder(e.target.value)}
          style={{
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "8px 12px",
            color: "#f1f5f9",
            fontSize: 13,
            fontWeight: 500,
            outline: "none",
            cursor: "pointer"
          }}
        >
          <option value="random">🎲 Aleatório (Padrão)</option>
          <option value="easy_first">🟢 Fácil → Difícil (Fácil primeiro)</option>
          <option value="hard_first">🔴 Difícil → Fácil (Difícil primeiro)</option>
        </select>
      </div>

      {/* Cards de Métricas Gerais - Utiliza classe responsiva */}
      <div className="dashboard-metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        <div style={{ background: streakAtRisk ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.02)", border: streakAtRisk ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 24, padding: 10, background: streakAtRisk ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.1)", borderRadius: 14, color: streakAtRisk ? "#f59e0b" : "#ef4444" }}>{streakAtRisk ? "⚠️" : "🔥"}</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: streakAtRisk ? "#f59e0b" : "#fff" }}>{stats.streak} {stats.streak === 1 ? 'dia' : 'dias'}</div>
            <div style={{ fontSize: 10, color: streakAtRisk ? "#f59e0b" : "#64748b", fontWeight: 600, letterSpacing: 0.5, marginTop: 2 }}>{streakAtRisk ? "⚠️ OFENSIVA EM RISCO" : "OFENSIVA DE ESTUDOS"}</div>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: 18, display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 24, padding: 10, background: "rgba(59,130,246,0.1)", borderRadius: 14, color: "#3b82f6" }}>⚡</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{stats.dueCount}</div>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, marginTop: 2 }}>CARDS A REVISAR HOJE</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              onClick={handleGlobalReviewClick}
              disabled={streakAtRisk}
              className={streakAtRisk ? "" : "btn-hover"}
              style={{
                width: "100%",
                background: streakAtRisk ? "rgba(255,255,255,0.02)" : (stats.dueCount > 0 ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "rgba(255,255,255,0.04)"),
                border: streakAtRisk ? "1px solid rgba(255,255,255,0.05)" : (stats.dueCount > 0 ? "none" : "1px solid rgba(255,255,255,0.08)"),
                borderRadius: 10,
                padding: "8px 12px",
                color: streakAtRisk ? "#475569" : (stats.dueCount > 0 ? "#fff" : "#64748b"),
                fontSize: 12,
                fontWeight: 600,
                cursor: streakAtRisk ? "not-allowed" : "pointer",
                textAlign: "center"
              }}
            >
              Revisar ⚡
            </button>
            {globalReviewMessage && (
              <div style={{ color: "#f59e0b", fontSize: 10, fontWeight: 500, textAlign: "center", lineHeight: 1.4 }}>
                {globalReviewMessage}
              </div>
            )}
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 24, padding: 10, background: "rgba(16,185,129,0.1)", borderRadius: 14, color: "#10b981" }}>✅</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{stats.studiedToday}</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, marginTop: 2 }}>REVISADOS HOJE</div>
          </div>
        </div>
      </div>

      {/* Banner de Ofensiva em Risco + Botão Desafio */}
      {streakAtRisk && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
            borderRadius: 20, padding: "18px 20px", display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 14, flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 28 }}>⚠️</div>
              <div>
                <div style={{ color: "#f59e0b", fontSize: 14, fontWeight: 700 }}>Sua ofensiva está em risco!</div>
                <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                  Faltam <strong style={{ color: "#f59e0b" }}>{graceDaysLeft} {graceDaysLeft === 1 ? 'dia' : 'dias'}</strong> para perder tudo. Complete o Desafio e salve sua sequência!
                </div>
              </div>
            </div>
            <button
              onClick={startChallenge}
              className="btn-hover"
              style={{
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                color: "#fff", border: "none", borderRadius: 14,
                padding: "12px 20px", cursor: "pointer", fontWeight: 700,
                fontSize: 13, whiteSpace: "nowrap", letterSpacing: 0.5,
                boxShadow: "0 4px 15px rgba(249,115,22,0.25)"
              }}
            >
              🎯 Fazer Desafio (52 cards)
            </button>
          </div>
        </div>
      )}

      {/* Seção de Favoritos */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => setShowFavoritesMateriaSelector(true)}
          disabled={favorites.length === 0}
          className={favorites.length > 0 ? "card-hover" : ""}
          style={{
            width: "100%",
            background: favorites.length > 0
              ? "linear-gradient(135deg, rgba(234, 179, 8, 0.08), rgba(234, 179, 8, 0.02))"
              : "rgba(255,255,255,0.01)",
            border: favorites.length > 0
              ? "1px solid rgba(234, 179, 8, 0.2)"
              : "1px solid rgba(255,255,255,0.03)",
            borderRadius: 20,
            padding: "20px 18px",
            textAlign: "left",
            cursor: favorites.length > 0 ? "pointer" : "default",
            position: "relative",
            overflow: "hidden",
            outline: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: favorites.length > 0 ? 1 : 0.5
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 28 }}>⭐</div>
            <div>
              <div style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 600 }}>Meus Flashcards Favoritos</div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>
                {favorites.length > 0
                  ? "Banco de consulta rápida para revisão livre"
                  : "Adicione estrelas nos flashcards para salvá-los aqui"
                }
              </div>
            </div>
          </div>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: favorites.length > 0 ? "#eab308" : "#475569",
            background: favorites.length > 0 ? "rgba(234,179,8,0.1)" : "rgba(255,255,255,0.04)",
            borderRadius: 10,
            padding: "4px 10px"
          }}>
            {favorites.length} {favorites.length === 1 ? 'card' : 'cards'}
          </span>
        </button>
      </div>

      {/* Desempenho */}
      <button
        onClick={() => setShowDesempenho(true)}
        className="card-hover"
        style={{
          width: "100%",
          background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.02))",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 20,
          padding: "20px 18px",
          textAlign: "left",
          cursor: "pointer",
          outline: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 28 }}>📊</div>
          <div>
            <div style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 600 }}>Meu Desempenho</div>
            <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>
              Progresso, estatísticas e gráficos de evolução
            </div>
          </div>
        </div>
        <span style={{
          fontSize: 16,
          color: "#a5b4fc"
        }}>
          →
        </span>
      </button>

      {/* Grid de Matérias */}
      <h3 style={{ color: "#fff", fontSize: 16, fontWeight: 600, letterSpacing: 1, marginBottom: 16, marginTop: 0 }}>MATÉRIAS DO EDITAL</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {MATERIAS.map(m => {
          const mStats = stats.materiaStats[m.id] || { total: 0, studied: 0, due: 0, new: 0 };
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMateria(m.id)}
              disabled={streakAtRisk}
              className={streakAtRisk ? "" : "card-hover"}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 20,
                padding: "20px 18px",
                textAlign: "center",
                cursor: streakAtRisk ? "not-allowed" : "pointer",
                width: "100%",
                outline: "none",
                opacity: streakAtRisk ? 0.4 : 1
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>{m.emoji}</div>
              
              <div style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
                {m.label}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "3px 8px" }}>
                  {mStats.total} cards
                </span>
                {(() => {
                  const isNew = cardSnapshot[m.id] !== undefined && mStats.total > cardSnapshot[m.id];
                  if (mStats.due > 0) {
                    return (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.1)", borderRadius: 8, padding: "3px 8px" }}>
                        🔥 {mStats.due} revisar
                      </span>
                    );
                  }
                  if (isNew) {
                    return (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#06b6d4", background: "rgba(6,182,212,0.1)", borderRadius: 8, padding: "3px 8px" }}>
                        🆕 {mStats.total - cardSnapshot[m.id]} novas
                      </span>
                    );
                  }
                  if (mStats.studied < mStats.total) {
                    return (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "3px 8px" }}>
                        {mStats.studied} estudados
                      </span>
                    );
                  }
                  return (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#10b981", background: "rgba(16,185,129,0.1)", borderRadius: 8, padding: "3px 8px" }}>
                      ✓ Concluído
                    </span>
                  );
                })()}
              </div>
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

// ── COMPONENTE: SESSÃO DE ESTUDO ──────────────────────────────────────────
/**
 * @param {{
 *   studyQueue: Flashcard[],
 *   currentQueueIndex: number,
 *   studyMode: string,
 *   selectedMateria: string,
 *   favorites: string[],
 *   toastMessage: string,
 *   currentUser: AppUser,
 *   stats: AppStats,
 *   userMeta: any,
 *   showShieldBanner: boolean,
 *   srsData: SRSData,
 *   MATERIAS: { id: string, label: string, color: string, emoji: string }[],
 *   answeredSessionIds: Set<string>,
 *   onBack: () => void,
 *   onCardFeedback: (q: number) => void,
 *   onToggleFav: (id: string) => void,
 *   onNextCard: () => void,
 *   onPrevCard: () => void,
 *   onDismissShield: () => void,
 *   onLogout: () => void
 * }} props
 */
const SRS_BUTTONS = [
  { label: "\u274C Errei",   value: 0, bg: "#ef4444" },
  { label: "\u26A0\uFE0F Dif\u00EDcil", value: 1, bg: "#f59e0b" },
  { label: "\u{1F44D} Bom",  value: 2, bg: "#3b82f6" },
  { label: "\u26A1 F\u00E1cil", value: 3, bg: "#10b981" },
];

function StudySession({
  studyQueue,
  currentQueueIndex,
  studyMode,
  selectedMateria,
  favorites,
  toastMessage,
  currentUser,
  stats,
  userMeta,
  showShieldBanner,
  srsData,
  MATERIAS,
  answeredSessionIds,
  onBack,
  onCardFeedback,
  onToggleFav,
  onNextCard,
  onPrevCard,
  onDismissShield,
  onLogout,
  challengeBanner = null,
  challengeActive = false
}) {
  const currentCard = studyQueue[currentQueueIndex];
  const currentCardWasAnswered = answeredSessionIds.has(currentCard.id);
  const isChallenge = studyMode === "challenge";
  const isGlobal = studyMode === "global_srs";
  const matInfo = !isGlobal ? MATERIAS.find(m => m.id === selectedMateria) : null;
  const themeColor = isChallenge ? "#f97316" : (isGlobal ? "#3b82f6" : (matInfo?.color || "#3b82f6"));
  const labelText = isChallenge ? "Desafio" : (isGlobal ? "Revisão Geral" : (matInfo?.label || ""));
  const emojiText = isChallenge ? "🎯" : (isGlobal ? "⚡" : (matInfo?.emoji || ""));

  const [isFlipped, setIsFlipped] = useState(false);
  const [needsScroll, setNeedsScroll] = useState(false);
  const [showLayersModal, setShowLayersModal] = useState(false);
  const isStats = selectedMateria === "estatistica";
  const hasLayers = !!(isStats && currentCard && (currentCard.camada_visual || currentCard.camada_aplicacao));
  const backContentRef = useRef(null);
  const backContainerRef = useRef(null);
  const cardOuterRef = useRef(null);

  function measureAndClamp() {
    if (!backContentRef.current || !cardOuterRef.current || !backContainerRef.current) return;
    const cs = window.getComputedStyle(backContainerRef.current);
    const padTop = parseFloat(cs.paddingTop);
    const padBot = parseFloat(cs.paddingBottom);
    const overhead = padTop + padBot + 24;
    const neededH = backContentRef.current.scrollHeight + overhead;
    const cardTop = cardOuterRef.current.getBoundingClientRect().top;
    const reserve = window.innerWidth <= 640 ? 200 : 155;
    const maxH = window.innerHeight - cardTop - reserve;
    const finalH = Math.max(Math.min(neededH, maxH), 200);
    cardOuterRef.current.style.height = `${finalH}px`;
    setNeedsScroll(neededH > maxH + 15);
  }

  useEffect(() => {
    setIsFlipped(false);
    setNeedsScroll(false);
    if (cardOuterRef.current) cardOuterRef.current.style.height = "";
  }, [currentQueueIndex]);

  useLayoutEffect(() => {
    if (isFlipped) {
      measureAndClamp();
    } else {
      setNeedsScroll(false);
      if (cardOuterRef.current) cardOuterRef.current.style.height = "";
    }
  }, [isFlipped]);

  useEffect(() => {
    if (!isFlipped) return;
    const onResize = () => measureAndClamp();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isFlipped]);

  return (
    <Shell user={currentUser} stats={stats} onLogout={onLogout} centered userMeta={userMeta} showShieldBanner={showShieldBanner} onDismissShield={onDismissShield} srsData={srsData} hidePomodoro={true}>
      {challengeBanner && (
        <div style={{
          position: "fixed",
          top: 24,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(249,115,22,0.95)",
          border: "1px solid rgba(249,115,22,0.2)",
          color: "#fff",
          padding: "16px 28px",
          borderRadius: 16,
          fontSize: 15,
          fontWeight: 700,
          boxShadow: "0 10px 25px rgba(249,115,22,0.3)",
          zIndex: 9999,
          backdropFilter: "blur(4px)",
          transition: "all 0.3s ease",
          textAlign: "center",
          letterSpacing: 0.5,
        }}>
          🎯 {challengeBanner}
        </div>
      )}
      {toastMessage && (
        <div className="toast-fade-in" style={{
          position: "fixed",
          top: 80,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(239,68,68,0.95)",
          border: "1px solid rgba(239,68,68,0.2)",
          color: "#fff",
          padding: "12px 24px",
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: "0 10px 25px rgba(239,68,68,0.2)",
          zIndex: 9999,
          backdropFilter: "blur(4px)",
        }}>
          ⚠️ {toastMessage}
        </div>
      )}
      <div className="study-container" style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", maxWidth: 640, margin: "0 auto", boxSizing: "border-box", flex: 1, minHeight: 0, padding: "0 4px" }}>
        {/* Header do Estudo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, padding: "0 8px" }}>
          <BackButton onClick={onBack} />
          <div style={{ textAlign: "center", padding: "0 8px" }}>
            <span style={{ color: themeColor, fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
              {emojiText} {labelText}
            </span>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500, marginTop: 2 }}>
              {studyMode === "challenge"
                ? "🎯 DESAFIO — SALVE SUA OFENSIVA"
                : studyMode === "global_srs"
                  ? "REVISÃO DIÁRIA GLOBAL"
                  : studyMode === "srs"
                    ? "ESTUDO INTELIGENTE (SM-2)"
                    : studyMode === "topic"
                      ? "ESTUDO POR TÓPICOS"
                      : studyMode === "favorites"
                        ? "CONSULTA DE FAVORITOS"
                        : "MODO COMPLETO"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#64748b", fontFamily: "monospace" }}>
              {currentQueueIndex + 1}/{studyQueue.length}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFav(currentCard.id); }}
              style={{
                background: "transparent", border: "none",
                color: favorites.includes(currentCard.id) ? "#eab308" : "#475569",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", padding: "8px", outline: "none",
                fontSize: 16, minWidth: 44, minHeight: 44,
                borderRadius: 12
              }}
              title={favorites.includes(currentCard.id) ? "Remover dos favoritos" : "Favoritar"}
            >
              {favorites.includes(currentCard.id) ? "★" : "☆"}
            </button>
            {hasLayers && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowLayersModal(true); }}
                style={{
                  background: "transparent", border: "none",
                  color: "#3b82f6", cursor: "pointer",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", padding: "8px", outline: "none",
                  fontSize: 16, minWidth: 44, minHeight: 44,
                  borderRadius: 12
                }}
                title="Camadas de aprendizado"
              >
                🧠
              </button>
            )}
          </div>
        </div>

        {/* Barra de Progresso */}
        <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.03)", borderRadius: 3, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
          <div
            style={{
              width: `${((currentQueueIndex + 1) / studyQueue.length) * 100}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${themeColor}, ${themeColor}88)`,
              transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          />
        </div>

        {/* Flashcard 3D */}
        <div ref={cardOuterRef} style={{
          width: "100%",
          flex: isFlipped ? "none" : 1,
          minHeight: 200,
          position: "relative",
          transition: "height 0.2s ease"
        }}>
          <div
            onClick={() => setIsFlipped(prev => !prev)}
            style={{
              width: "100%",
              height: "100%",
              cursor: "pointer",
              perspective: 1000
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                transformStyle: "preserve-3d",
                transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                willChange: "transform"
              }}
            >
              {/* Frente */}
              <div className="flashcard-box flashcard-front-style">
                <div style={{ fontSize: 10, color: "#3b82f6", fontWeight: 600, letterSpacing: 3, marginBottom: 20 }}>✦ PERGUNTA ✦</div>
                <p className="flashcard-question-text" style={{ color: "#f1f5f9", fontSize: 18, lineHeight: 1.65, textAlign: "center", margin: 0, fontWeight: 400, fontFamily: "Merriweather, Georgia, serif" }}>
                  {currentCard?.pergunta}
                </p>
                <div style={{ marginTop: 28, color: "rgba(255,255,255,0.2)", fontSize: 11, letterSpacing: 1, fontWeight: 500 }}>
                  Clique para revelar a resposta
                </div>
              </div>

              {/* Verso */}
              <div
                ref={backContainerRef}
                className="custom-scrollbar flashcard-box flashcard-back-style"
                style={{
                  border: `1px solid ${themeColor}40`,
                  justifyContent: "flex-start",
                  alignItems: "center",
                  overflow: needsScroll ? "hidden auto" : "hidden"
                }}
              >
                <div style={{ fontSize: 10, color: themeColor, fontWeight: 600, letterSpacing: 3, marginBottom: 14, flexShrink: 0 }}>
                  ✦ RESPOSTA ✦
                </div>

                <div ref={backContentRef} style={{
                  width: "100%",
                  flex: "1 1 auto",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                }}>
                  <p className="flashcard-answer-text" style={{ color: "#e2e8f0", fontSize: 15, lineHeight: 1.65, textAlign: "center", margin: "0 0 16px 0", fontFamily: "Merriweather, Georgia, serif" }}>
                    {currentCard?.resposta}
                  </p>

                  {currentCard?.dica && (
                    <div style={{
                      background: "rgba(234,179,8,0.04)",
                      border: "1px solid rgba(234,179,8,0.12)",
                      borderRadius: 14,
                      padding: "12px 16px",
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: 12
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#eab308", fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>
                        <span>🎓</span> DICA DO PROFESSOR (CEBRASPE)
                      </div>
                      <p className="card-dica-text" style={{ color: "#d1d5db", fontSize: 11, lineHeight: 1.5, margin: 0 }}>
                        {highlightFalso(currentCard?.dica)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Botões movidos para o header acima */}
        </div>

        {/* Botões de Ação */}
        <div style={{ minHeight: 70, flexShrink: 0 }}>
          {isFlipped ? (
            studyMode === "srs" || studyMode === "topic" || studyMode === "global_srs" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {currentCardWasAnswered && (
                <div style={{ color: "#fbbf24", fontSize: 12, fontWeight: 600, textAlign: "center" }}>
                  Opção foi selecionada anteriormente.
                </div>
              )}
              <div className="srs-buttons-grid">
                {SRS_BUTTONS.map(btn => (
                  <button
                    key={btn.value}
                    onClick={() => onCardFeedback(btn.value)}
                    disabled={currentCardWasAnswered}
                    className="btn-hover"
                    style={{ background: btn.bg, color: "#fff", border: "none", borderRadius: 14, padding: "14px 10px", cursor: currentCardWasAnswered ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 12, opacity: currentCardWasAnswered ? 0.55 : 1 }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              </div>
            ) : (
              <button
                onClick={onNextCard}
                className="btn-hover"
                style={{
                  width: "100%",
                  background: studyMode === "favorites"
                    ? "linear-gradient(135deg, #eab308, #ca8a04)"
                    : "linear-gradient(135deg, #3b82f6, #2563eb)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 14,
                  padding: "16px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14
                }}
              >
                PRÓXIMO CARD →
              </button>
            )
          ) : (
            <button
              onClick={() => setIsFlipped(true)}
              className="btn-hover"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f1f5f9",
                borderRadius: 14,
                padding: "16px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14
              }}
            >
              REVELAR RESPOSTA
            </button>
          )}
        </div>

        {/* Navegação Manual Inferior */}
        <div className="nav-wrapper" style={{ flexShrink: 0 }}>
          <NavButtons
            onPrev={onPrevCard}
            onNext={onNextCard}
            hasPrev={currentQueueIndex > 0}
            hasNext={currentQueueIndex < studyQueue.length - 1}
          />
        </div>
      </div>

      {/* Modal de Camadas (apenas Estatística) */}
      {showLayersModal && currentCard && (
        <div
          onClick={() => setShowLayersModal(false)}
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-content"
            style={{
              background: "linear-gradient(135deg, #0e1726, #090d16)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: "32px 28px",
              maxWidth: 520,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              position: "relative",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)"
            }}
          >
            <button
              onClick={() => setShowLayersModal(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "transparent",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                fontSize: 20,
                lineHeight: 1,
                zIndex: 1
              }}
            >
              ✕
            </button>

            {/* Camada 1 — Intuição */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>💡</span>
                <span style={{ color: "#3b82f6", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>
                  INTUIÇÃO
                </span>
              </div>
              <p style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.7, margin: 0, fontFamily: "Georgia, serif" }}>
                {currentCard.camada_visual}
              </p>
            </div>

            {/* Camada 2 — Padrão CESPE */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>🔍</span>
                <span style={{ color: "#eab308", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>
                  PADRÃO CESPE
                </span>
              </div>
              <p style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.7, margin: 0, fontFamily: "Georgia, serif" }}>
                {currentCard.camada_aplicacao}
              </p>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

// ── COMPONENTE: TELA DE LOGIN ──────────────────────────────────────────────
/**
 * @param {{ onLogin: (user: AppUser) => void }} props
 */
function TelaLogin({ onLogin }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [erro, setErro] = useState("");
  const [sbUrl, setSbUrl] = useState("");
  const [sbKey, setSbKey] = useState("");

  const handleFormSubmit = () => {
    (async () => {
      try {
        const uname = username.toLowerCase().trim();

        // 1) Try Supabase Auth first (primary auth provider)
        try {
          const client = getSupabase();
          if (client && client.auth) {
            let loginEmail = uname;
            if (!uname.includes("@")) {
              try {
                const result = await client
                  .rpc("get_email_by_username", { p_username: uname });
                if (result.error) {
                  setErro("Erro de conexão. Verifique sua internet e tente novamente.");
                  return;
                }
                const raw = result.data;
                let resolvedEmail = null;
                if (typeof raw === "string") {
                  resolvedEmail = raw;
                } else if (Array.isArray(raw) && raw.length > 0) {
                  resolvedEmail = typeof raw[0] === "string" ? raw[0] : (raw[0]?.email || null);
                } else if (raw && typeof raw === "object") {
                  resolvedEmail = raw.email || null;
                }
                if (!resolvedEmail) {
                  setErro("Usuário não encontrado.");
                  return;
                }
                loginEmail = resolvedEmail;
              } catch (e) {
                setErro("Erro de conexão. Verifique sua internet e tente novamente.");
                return;
              }
            }

            const { data, error } = await client.auth.signInWithPassword({
              email: loginEmail,
              password
            });

            if (!error && data && data.user) {
              const u = data.user;
              const name = (u.user_metadata && u.user_metadata.name) || u.email || uname;
              // Sign JWT cookie server-side
              let expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
              try {
                const loginRes = await fetch('/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    username: u.email || uname,
                    typedUsername: uname,
                    name,
                    loginMethod: 'supabase',
                    accessToken: data.session?.access_token
                  }),
                });
                const loginData = await loginRes.json();
                if (loginData?.user) {
                  const u2 = loginData.user;
                  expiresAt = loginData.expiresAt || expiresAt;
                  setErro("");
                  onLogin({ username: u2.username, role: u2.role, name: u2.name, expiresAt });
                } else {
                  setErro("Falha ao criar sessão.");
                }
              } catch {}
              return;
            }
          }
        } catch (e) {
          console.warn('Supabase auth failed, trying local auth.', e);
        }

        // 2) Local auth via server-side API (bcrypt verified on server)
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uname, password, loginMethod: 'local' }),
          });
          const data = await res.json();
          if (res.ok && data.user) {
            setErro("");
            onLogin({ username: data.user.username, role: data.user.role, name: data.user.name, expiresAt: data.expiresAt || (Date.now() + 30 * 24 * 60 * 60 * 1000) });
            return;
          }
          if (res.status === 429) {
            setErro("Muitas tentativas. Aguarde alguns minutos.");
            return;
          }
        } catch (e) {
          console.warn('Local auth API call failed:', e);
        }

        setErro("Usuário ou senha incorretos.");
      } catch (e) {
        console.error(e);
        setErro("Erro durante a autenticação.");
      }
    })();
  };

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px", boxSizing: "border-box", width: "100%", overflow: "hidden" }}>
      {/* Composite background (hero + grid) placed as a single fixed element to ensure images show */}
      <div className="login-hero-composite" />
      <div style={{ ...RADIAL_GLOW_BASE, background: "radial-gradient(ellipse,rgba(59,130,246,0.05) 0%,transparent 70%)" }} />

      <div className="login-fade-in" style={{ position: "relative", zIndex: 1, background: "rgba(17,24,39,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24, width: "100%", maxWidth: 360, boxShadow: "0 24px 64px rgba(0,0,0,0.6)", boxSizing: "border-box", padding: "28px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <LoginBadge />
          <h1 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: 0.5 }}>Flashcards PC-PE</h1>
          <p style={{ color: "#64748b", fontSize: 11, fontWeight: 600, marginTop: 6, letterSpacing: 2 }}>AGENTE DE POLÍCIA · PE</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div>
            <LoginInput
              type="text"
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Usuário"
              onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.08)" }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none" }}
            />
          </div>
          <div>
            <LoginInput
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Senha"
              onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.08)" }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none" }}
            />
          </div>

          {/* Optional: runtime Supabase connection (for local dev without NEXT_PUBLIC_ envs) */}
          {process.env.NODE_ENV !== 'production' && (
            <details style={{ marginTop: 4 }}>
              <summary style={{ color: "#64748b", fontSize: 10, fontWeight: 500, cursor: "pointer", letterSpacing: 0.5 }}>Configurar Supabase (opcional)</summary>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="text"
                  value={sbUrl}
                  onChange={e => { setSbUrl(e.target.value); try { localStorage.setItem('pcpe_supabase_url', e.target.value) } catch {} }}
                  placeholder="URL do Supabase"
                  style={{ width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 10px", color: "#94a3b8", fontSize: 11, boxSizing: "border-box", outline: "none" }}
                />
                <input
                  type="password"
                  value={sbKey}
                  onChange={e => { setSbKey(e.target.value); try { localStorage.setItem('pcpe_supabase_anon_key', e.target.value) } catch {} }}
                  placeholder="Anon Key"
                  style={{ width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 10px", color: "#94a3b8", fontSize: 11, boxSizing: "border-box", outline: "none" }}
                />
              </div>
            </details>
          )}

          {erro && <p style={{ color: "#ef4444", fontSize: 11, fontWeight: 500, margin: 0, textAlign: "center" }}>{erro}</p>}

          <button
            type="submit"
            className="btn-hover"
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              border: "none",
              borderRadius: 12,
              padding: "14px",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: 0.5,
              boxShadow: "0 4px 12px rgba(37,99,235,0.2)"
            }}
          >
            ENTRAR
          </button>
        </form>
      </div>
    </div>
  );
}

// Small component that renders a minimal police officer emoji icon
function LoginBadge() {
  const [failed, setFailed] = useState(false);
  
  return (
    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
      <img
        src="/mira.png"
        alt="Policial Civil"
        onError={() => setFailed(true)}
        style={{ 
          width: 48, 
          height: 48, 
          objectFit: 'contain',
          opacity: failed ? 0 : 1
        }}
      />
      {failed && <div style={{ fontSize: 40 }}>👮</div>}
    </div>
  );
}

// ── COMPONENTE: TELA DESEMPENHO ─────────────────────────────────────────────
/**
 * @param {{
 *   user: AppUser|null,
 *   stats: AppStats,
 *   srsData: SRSData,
 *   answerHistory: AnswerEntry[],
 *   BANCO: Object<string, Flashcard[]>,
 *   MATERIAS: Materia[],
 *   graphPeriod: string, setGraphPeriod: (p:string)=>void,
 *   graphCustomStart: string, setGraphCustomStart: (s:string)=>void,
 *   graphCustomEnd: string, setGraphCustomEnd: (s:string)=>void,
 *   onBack: ()=>void, onLogout: ()=>void,
 *   startWeakStudy: (matId:string)=>void,
 *   userMeta: UserMeta|null,
 *   showShieldBanner: boolean, setShowShieldBanner: (v:boolean)=>void
 * }} props
 */
function TelaDesempenho({ user, stats, srsData, answerHistory, BANCO, MATERIAS, graphPeriod, setGraphPeriod, graphCustomStart, setGraphCustomStart, graphCustomEnd, setGraphCustomEnd, onBack, onLogout, startWeakStudy, userMeta, showShieldBanner, setShowShieldBanner }) {

  const filteredHistory = useMemo(() => {
    const now = Date.now();
    let startMs = 0;
    if (graphPeriod === "7d") startMs = now - 7 * 86400000;
    else if (graphPeriod === "15d") startMs = now - 15 * 86400000;
    else if (graphPeriod === "30d") startMs = now - 30 * 86400000;
    else if (graphPeriod === "custom") {
      if (graphCustomStart) startMs = new Date(graphCustomStart).getTime();
      else startMs = 0;
    }
    return answerHistory.filter(e => e.timestamp >= startMs);
  }, [answerHistory, graphPeriod, graphCustomStart]);
  const allCardsTotal = MATERIAS.reduce((sum, m) => sum + ((BANCO[m.id] || []).length), 0);
  const totalStudiedCards = Object.keys(srsData).length;

  const percentStudied = allCardsTotal > 0 ? Math.round((totalStudiedCards / allCardsTotal) * 100) : 0;

  const cardsDominados = Object.values(srsData).filter(s => s.repetition >= 3 && s.ef >= 2.0).length;
  const percentDominados = totalStudiedCards > 0 ? Math.round((cardsDominados / totalStudiedCards) * 100) : 0;

  const uniqueStudyDays = new Set();
  let totalSessions = 0;
  if (answerHistory.length > 0) {
    const sorted = [...answerHistory].sort((a, b) => a.timestamp - b.timestamp);
    const SESSION_GAP_MS = 15 * 60 * 1000;
    uniqueStudyDays.add(getLocalDateString(new Date(sorted[0].timestamp)));
    totalSessions = 1;
    let lastTs = sorted[0].timestamp;
    for (let i = 1; i < sorted.length; i++) {
      const entry = sorted[i];
      uniqueStudyDays.add(getLocalDateString(new Date(entry.timestamp)));
      if (entry.timestamp - lastTs >= SESSION_GAP_MS) {
        totalSessions++;
      }
      lastTs = entry.timestamp;
    }
  }

  const materiaData = useMemo(() => {
    return MATERIAS.map(mat => {
      const cards = BANCO[mat.id] || [];
      const total = cards.length;
      const studied = cards.filter(c => srsData[c.id]).length;
      const progressPct = total > 0 ? Math.round((studied / total) * 100) : 0;

      const matHistory = filteredHistory.filter(e => e.materia === mat.id);
      const totalAnswers = matHistory.length;
      const acertoAnswers = matHistory.filter(e => e.resultado >= 2).length;
      const alertaAnswers = matHistory.filter(e => e.resultado === 1).length;
      const erroAnswers = matHistory.filter(e => e.resultado === 0).length;
      const accuracy = (acertoAnswers + erroAnswers) > 0 ? Math.round((acertoAnswers / (acertoAnswers + erroAnswers)) * 100) : 0;

      const matSrsValues = cards.filter(c => srsData[c.id]).map(c => srsData[c.id]);
      const hardCards = matSrsValues.filter(s => s.interval <= 3 && s.repetition < 2).length;

      return { ...mat, total, studied, progressPct, accuracy, hardCards, totalAnswers, acertoAnswers, alertaAnswers, erroAnswers };
    });
  }, [MATERIAS, BANCO, srsData, filteredHistory]);

  const weakCards = useMemo(() => {
    const cardErrorMap = {};
    for (const entry of answerHistory) {
      if (!cardErrorMap[entry.cardId]) cardErrorMap[entry.cardId] = { total: 0, errors: 0, materia: entry.materia };
      cardErrorMap[entry.cardId].total++;
      if (entry.resultado === 0) cardErrorMap[entry.cardId].errors++;
    }
    return Object.entries(cardErrorMap)
      .filter(([, v]) => v.total >= 2)
      .map(([cardId, v]) => ({ cardId, errorRate: Math.round((v.errors / v.total) * 100), ...v }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 10);
  }, [answerHistory]);

  const weakCardsFull = useMemo(() => {
    return weakCards.map(w => {
      for (const mat of MATERIAS) {
        const card = (BANCO[mat.id] || []).find(c => c.id === w.cardId);
        if (card) return { ...w, card, materiaLabel: mat.label, materiaColor: mat.color, materiaId: mat.id };
      }
      return w;
    }).filter(w => w.card);
  }, [weakCards, MATERIAS, BANCO]);

  const chartData = useMemo(() => {
    const dayMap = {};
    const now = Date.now();
    let startMs = 0;
    let days = 30;
    if (graphPeriod === "7d") { startMs = now - 7 * 86400000; days = 7; }
    else if (graphPeriod === "15d") { startMs = now - 15 * 86400000; days = 15; }
    else if (graphPeriod === "30d") { startMs = now - 30 * 86400000; days = 30; }
    else if (graphPeriod === "custom") {
      if (graphCustomStart) startMs = new Date(graphCustomStart).getTime();
      if (graphCustomEnd) {
        days = Math.ceil((new Date(graphCustomEnd).getTime() - startMs) / 86400000);
      }
    }

    for (const entry of answerHistory) {
      if (entry.timestamp < startMs) continue;
      if (graphPeriod === "custom" && graphCustomEnd && entry.timestamp > new Date(graphCustomEnd).getTime()) continue;
      const dayStr = getLocalDateString(new Date(entry.timestamp));
      if (!dayMap[dayStr]) dayMap[dayStr] = { date: dayStr, total: 0, acertos: 0, alertas: 0, erros: 0 };
      dayMap[dayStr].total++;
      if (entry.resultado >= 2) dayMap[dayStr].acertos++;
      else if (entry.resultado === 1) dayMap[dayStr].alertas++;
      else dayMap[dayStr].erros++;
    }

    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(now - (days - 1 - i) * 86400000);
      const dayStr = getLocalDateString(d);
      const existing = dayMap[dayStr];
      result.push(existing || { date: dayStr, total: 0, acertos: 0, alertas: 0, erros: 0 });
    }
    return result;
  }, [answerHistory, graphPeriod, graphCustomStart, graphCustomEnd]);

  const weakMaterias = materiaData.filter(m => (m.accuracy < 60 && m.totalAnswers >= 3) || m.hardCards > 5);

  const handleStartWeakReview = () => {
    const cards = weakCardsFull.map(w => w.card).filter(Boolean);
    if (cards.length > 0) startWeakStudy(cards);
  };

  return (
    <Shell user={user} stats={stats} onLogout={onLogout} userMeta={userMeta} showShieldBanner={showShieldBanner} onDismissShield={() => setShowShieldBanner(false)} srsData={srsData}>
      <div style={{ width: "100%", maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20, boxSizing: "border-box" }}>
        <BackButton onClick={onBack} />

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 4 }}>📊</div>
          <h2 className="materia-title" style={{ color: "#fff", fontSize: 22, fontWeight: 600, margin: 0 }}>Meu Desempenho</h2>
          <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            Acompanhe seu progresso nos estudos
          </p>
        </div>

        {/* 1. VISÃO GERAL */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "16px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>{totalStudiedCards}</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, marginTop: 2 }}>CARDS ESTUDADOS</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{percentStudied}% do total ({allCardsTotal})</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "16px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>{percentDominados}%</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, marginTop: 2 }}>DOMINADOS</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{cardsDominados} cards ({totalStudiedCards > 0 ? Math.round((cardsDominados/totalStudiedCards)*100) : 0}%)</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "16px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#f97316" }}>{stats.streak}</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, marginTop: 2 }}>SEQUÊNCIA (DIAS)</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{uniqueStudyDays.size} dias no total</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "16px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#a78bfa" }}>{totalSessions}</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, marginTop: 2 }}>SESSÕES</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>sessões de estudo</div>
          </div>
        </div>

        {/* 2. DESEMPENHO POR MATÉRIA */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "18px 16px" }}>
          <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: "0 0 12px 0" }}>📚 Desempenho por Matéria</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {materiaData.map(m => {
              const isWeak = m.totalAnswers >= 3 && m.accuracy < 60;
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{m.emoji}</span>
                      <span style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 500 }}>{m.label}</span>
                      {isWeak && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>⚠️</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: m.accuracy >= 60 ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                        {m.totalAnswers > 0 ? `${m.accuracy}%` : "-"}
                      </span>
                      <span style={{ fontSize: 10, color: "#64748b" }}>{m.studied}/{m.total}</span>
                    </div>
                  </div>
                  <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${m.progressPct}%`, height: "100%", background: m.progressPct === 100 ? "#10b981" : m.color, borderRadius: 2, transition: "width 0.3s" }} />
                  </div>
                  {isWeak && (
                    <div style={{ fontSize: 9, color: "#ef4444", marginTop: 2 }}>
                      Pontos fracos: {m.hardCards} cards difíceis · {m.acertoAnswers + m.erroAnswers > 0 ? `${100-m.accuracy}%` : ""} de erro
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. PONTOS FRACOS */}
        {weakCardsFull.length > 0 && (
          <div style={{ background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 16, padding: "18px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: 0 }}>⚠️ Pontos Fracos</h3>
              <button
                onClick={handleStartWeakReview}
                className="btn-hover"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 8,
                  padding: "5px 10px",
                  color: "#ef4444",
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Revisar pontos fracos
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {weakCardsFull.map((w, i) => (
                <div key={w.cardId} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "10px 12px" }}>
                  <span style={{ color: "#64748b", fontSize: 10, fontWeight: 700, width: 16 }}>{i+1}.</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#f1f5f9", fontSize: 11, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {w.card?.pergunta || w.cardId}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 9, marginTop: 2 }}>
                      {w.materiaLabel} · {w.total} tentativas
                    </div>
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: w.errorRate >= 70 ? "#ef4444" : "#f97316",
                    background: w.errorRate >= 70 ? "rgba(239,68,68,0.1)" : "rgba(249,115,22,0.1)",
                    borderRadius: 6, padding: "2px 6px", whiteSpace: "nowrap"
                  }}>
                    {w.errorRate}% erro
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. GRÁFICO DE EVOLUÇÃO */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "18px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: 0 }}>📈 Evolução Temporal</h3>
            <div style={{ display: "flex", gap: 6 }}>
              {["7d", "15d", "30d", "custom"].map(p => (
                <button
                  key={p}
                  onClick={() => setGraphPeriod(p)}
                  className="btn-hover"
                  style={{
                    background: graphPeriod === p ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                    border: graphPeriod === p ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8,
                    padding: "4px 10px",
                    color: graphPeriod === p ? "#818cf8" : "#64748b",
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {p === "7d" ? "7 dias" : p === "15d" ? "15 dias" : p === "30d" ? "30 dias" : "Personalizado"}
                </button>
              ))}
            </div>
          </div>

          {graphPeriod === "custom" && (
            <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
              <input
                type="date"
                value={graphCustomStart}
                onChange={e => setGraphCustomStart(e.target.value)}
                style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#f1f5f9", fontSize: 11, outline: "none" }}
              />
              <span style={{ color: "#64748b", fontSize: 11 }}>até</span>
              <input
                type="date"
                value={graphCustomEnd}
                onChange={e => setGraphCustomEnd(e.target.value)}
                style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#f1f5f9", fontSize: 11, outline: "none" }}
              />
            </div>
          )}

          {chartData.length > 0 && chartData.some(d => d.total > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barCategoryGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748b", fontSize: 9 }}
                  tickFormatter={v => v.slice(5)}
                  stroke="rgba(255,255,255,0.06)"
                />
                <YAxis tick={{ fill: "#64748b", fontSize: 9 }} stroke="rgba(255,255,255,0.06)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 11,
                    color: "#f1f5f9"
                  }}
                  formatter={(value, name) => [
                    value,
                    name === "acertos" ? "Acertos" : name === "alertas" ? "Alertas" : name === "erros" ? "Erros" : "Total"
                  ]}
                  labelFormatter={label => `Data: ${label}`}
                />
                <Bar dataKey="acertos" fill="#10b981" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="alertas" fill="#f59e0b" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="erros" fill="#ef4444" radius={[2, 2, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b", fontSize: 12 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <p>Nenhum dado no período selecionado.</p>
              <p style={{ fontSize: 11 }}>Os gráficos começarão a aparecer conforme você estudar.</p>
            </div>
          )}

          {chartData.length > 0 && chartData.some(d => d.total > 0) && (
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 12, fontSize: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "#10b981" }} />
                <span style={{ color: "#94a3b8" }}>Acertos</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b" }} />
                <span style={{ color: "#94a3b8" }}>Alertas</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "#ef4444" }} />
                <span style={{ color: "#94a3b8" }}>Erros</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#64748b", fontWeight: 500 }}>
                  Total: {chartData.reduce((s, d) => s + d.total, 0)} cards
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Instruções */}
        <details style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "14px 16px", cursor: "pointer" }}>
          <summary style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>📖 Como funciona cada métrica</summary>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12, cursor: "default" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
              <strong style={{ color: "#f1f5f9" }}>Cards Estudados</strong> — Total de flashcards que você já respondeu pelo menos uma vez (de {allCardsTotal} disponíveis).
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
              <strong style={{ color: "#f1f5f9" }}>Dominados</strong> — Cards que você acertou 3+ vezes seguidas (repetições "Bom" ou "Fácil") sem errar no meio do caminho. Quanto maior esse número, mais perto da revisão final você está.
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
              <strong style={{ color: "#f1f5f9" }}>Sequência (dias)</strong> — Dias consecutivos com pelo menos um flashcard estudado. Se você pular um dia, a contagem volta a zero, igual "ofensiva" do Duolingo.
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
              <strong style={{ color: "#f1f5f9" }}>Sessões</strong> — Cada vez que você senta pra estudar conta como 1 sessão. Se você parar por <strong style={{ color: "#e2e8f0" }}>mais de 15 minutos</strong> e depois voltar a responder, é uma nova sessão. Ex: estudou de manhã e depois à noite = 2 sessões.
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
              <strong style={{ color: "#f1f5f9" }}>Taxa de Acerto</strong> — Porcentagem de respostas "Bom" ou "Fácil" em relação ao total de acertos + erros (respostas "Difícil" são contabilizadas como alerta e não entram no cálculo). O filtro de período (7/15/30 dias) altera esse número para mostrar apenas o período selecionado.
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
              <strong style={{ color: "#f1f5f9" }}>Gráfico</strong> — Barras verdes = acertos (Bom/Fácil). Barras amarelas = alertas (Difícil). Barras vermelhas = erros (Errei). Use os filtros para ver sua evolução nos últimos 7, 15 ou 30 dias, ou escolha um período personalizado.
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
              <strong style={{ color: "#f1f5f9" }}>Alertas (Difícil)</strong> — Respostas marcadas como "Difícil" formam uma categoria neutra: não são acerto nem erro. Elas indicam cards que você acertou, mas com dificuldade, e servem como sinal de atenção para revisão futura.
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
              ⚠️ Dados passados não existem: o histórico começou a ser registrado a partir da implementação desta tela. Os números e gráficos refletem apenas o período a partir de agora.
            </div>
          </div>
        </details>

        {/* Dados zerados */}
        {answerHistory.length === 0 && (
          <div style={{ background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.12)", borderRadius: 16, padding: "18px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🆕</div>
            <p style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 500, margin: 0 }}>
              Seus dados de desempenho começarão a ser registrados agora!
            </p>
            <p style={{ color: "#94a3b8", fontSize: 11, marginTop: 6 }}>
              Estatísticas e gráficos ficarão disponíveis conforme você responder flashcards.
            </p>
          </div>
        )}
      </div>
    </Shell>
  );
}

// ── COMPONENTE: SHELL / LAYOUT ──────────────────────────────────────────────
/**
 * @param {{
 *   children: React.ReactNode,
 *   user: AppUser|null,
 *   stats?: AppStats,
 *   onLogout: ()=>void,
 *   centered?: boolean,
 *   userMeta?: UserMeta|null,
 *   showShieldBanner?: boolean,
 *   onDismissShield?: ()=>void,
 *   srsData?: SRSData,
 *   hidePomodoro?: boolean
 * }} props
 */
// ── PAINEL ADMIN ───────────────────────────────────────────────────────────

function AdminPanel({ user, onBack, onLogout, stats, userMeta, showShieldBanner, setShowShieldBanner, srsData }) {
  const [tab, setTab] = useState("overview");
  const [adminData, setAdminData] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sugMessage, setSugMessage] = useState("");
  const [sugSent, setSugSent] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, sugRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/suggestions'),
      ]);
      if (statsRes.ok) {
        const d = await statsRes.json();
        setAdminData(d);
      }
      if (sugRes.ok) {
        const d = await sugRes.json();
        setSuggestions(d.suggestions || []);
      }
    } catch (e) {
      console.error('Admin fetch error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkReviewed = async (id) => {
    try {
      const res = await fetch('/api/admin/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'reviewed' }),
      });
      if (res.ok) {
        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'reviewed' } : s));
      }
    } catch (e) {
      console.error('Mark reviewed error:', e);
    }
  };

  const handleSendSuggestion = async () => {
    if (!sugMessage.trim()) return;
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sugMessage.trim() }),
      });
      if (res.ok) {
        setSugSent(true);
        setSugMessage("");
        setTimeout(() => setSugSent(false), 3000);
      }
    } catch (e) {
      console.error('Suggestion send error:', e);
    }
  };

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: "📊" },
    { id: "users", label: "Usuários", icon: "👥" },
    { id: "suggestions", label: "Sugestões", icon: "💡" },
  ];

  const totalStudiedToday = adminData?.users?.reduce((sum, u) => sum + (u.studiedToday || 0), 0) || 0;
  const totalCards = adminData?.users?.reduce((sum, u) => sum + (u.totalCards || 0), 0) || 0;
  const activeStreaks = adminData?.users?.filter(u => (u.current_streak || 0) > 0).length || 0;

  return (
    <Shell user={user} stats={stats} onLogout={onLogout} userMeta={userMeta} showShieldBanner={showShieldBanner} onDismissShield={() => setShowShieldBanner(false)} srsData={srsData}>
      <div style={{ width: "100%", maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20, boxSizing: "border-box" }}>
        <BackButton onClick={onBack} />

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>👑</div>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 600, margin: 0 }}>Painel Administrativo</h2>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Monitoramento e gerenciamento do sistema</p>
        </div>

        {/* Abas */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="btn-hover"
              style={{
                background: tab === t.id ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)",
                border: tab === t.id ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
                padding: "8px 16px",
                cursor: "pointer",
                color: tab === t.id ? "#a78bfa" : "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* CONTEÚDO DAS ABAS */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {loading ? (
              <p style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>Carregando...</p>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                  <StatCard value={adminData?.totalUsers ?? 0} label="USUÁRIOS" icon="👥" color="#a78bfa" />
                  <StatCard value={activeStreaks} label="STREAKS ATIVAS" icon="🔥" color="#f97316" />
                  <StatCard value={totalStudiedToday} label="CARDS HOJE" icon="✅" color="#10b981" />
                  <StatCard value={totalCards} label="TOTAL CARDS" icon="📚" color="#3b82f6" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                  <StatCard value={adminData?.pendingSuggestions ?? 0} label="SUGESTÕES PENDENTES" icon="💡" color="#eab308" />
                  <StatCard value="Em breve" label="NOVOS REGISTROS" icon="📝" color="#64748b" />
                </div>
              </>
            )}
          </div>
        )}

        {tab === "users" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {loading ? (
              <p style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>Carregando...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(adminData?.users || []).map(u => (
                  <div key={u.username} style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 14,
                    padding: "14px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 20 }}>{u.username === user?.username ? "👑" : "👤"}</div>
                      <div>
                        <div style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 600 }}>{u.username}</div>
                        <div style={{ color: "#64748b", fontSize: 10 }}>
                          {u.last_study_date ? `Último estudo: ${u.last_study_date}` : "Nunca estudou"}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <span style={{ color: "#f97316", fontSize: 12, fontWeight: 600 }}>🔥 {u.current_streak}d</span>
                      <span style={{ color: "#3b82f6", fontSize: 12, fontWeight: 600 }}>🛡️ {u.shields_available}</span>
                      <span style={{ color: "#10b981", fontSize: 12, fontWeight: 600 }}>✅ {u.studiedToday}</span>
                      <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>📚 {u.totalCards}</span>
                    </div>
                  </div>
                ))}
                {(!adminData?.users || adminData.users.length === 0) && (
                  <p style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>Nenhum usuário encontrado.</p>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "suggestions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Formulário de sugestão (qualquer user pode enviar) */}
            <div style={{
              background: "rgba(139,92,246,0.04)",
              border: "1px solid rgba(139,92,246,0.12)",
              borderRadius: 14,
              padding: "14px 16px",
            }}>
              <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>
                💡 ENVIAR SUGESTÃO
              </div>
              <textarea
                value={sugMessage}
                onChange={e => setSugMessage(e.target.value)}
                placeholder="Compartilhe sua ideia para melhorar o app..."
                maxLength={2000}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#f1f5f9",
                  fontSize: 12,
                  lineHeight: 1.5,
                  resize: "vertical",
                  minHeight: 60,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ color: "#64748b", fontSize: 10 }}>{sugMessage.length}/2000</span>
                <button
                  onClick={handleSendSuggestion}
                  disabled={!sugMessage.trim()}
                  className="btn-hover"
                  style={{
                    background: sugMessage.trim() ? "linear-gradient(135deg, #8b5cf6, #7c3aed)" : "rgba(255,255,255,0.04)",
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 16px",
                    color: sugMessage.trim() ? "#fff" : "#64748b",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: sugMessage.trim() ? "pointer" : "default",
                  }}
                >
                  {sugSent ? "✓ Enviada!" : "Enviar Sugestão"}
                </button>
              </div>
            </div>

            {/* Lista de sugestões (admin vê todas) */}
            {user?.role === "admin" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>
                  📋 SUGESTÕES RECEBIDAS
                </div>
                {loading ? (
                  <p style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>Carregando...</p>
                ) : suggestions.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>Nenhuma sugestão ainda.</p>
                ) : (
                  suggestions.map(s => (
                    <div key={s.id} style={{
                      background: "rgba(255,255,255,0.02)",
                      border: s.status === "pending" ? "1px solid rgba(234,179,8,0.15)" : "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 12,
                      padding: "12px 14px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>{s.username}</span>
                            <span style={{
                              fontSize: 9,
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: 6,
                              background: s.status === "pending" ? "rgba(234,179,8,0.1)" : "rgba(16,185,129,0.1)",
                              color: s.status === "pending" ? "#eab308" : "#10b981",
                            }}>
                              {s.status === "pending" ? "pendente" : "revisado"}
                            </span>
                          </div>
                          <p style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                            {s.message}
                          </p>
                          <div style={{ color: "#475569", fontSize: 9, marginTop: 4 }}>
                            {new Date(s.created_at).toLocaleString("pt-BR")}
                          </div>
                        </div>
                        {s.status === "pending" && (
                          <button
                            onClick={() => handleMarkReviewed(s.id)}
                            className="btn-hover"
                            style={{
                              background: "rgba(16,185,129,0.08)",
                              border: "1px solid rgba(16,185,129,0.15)",
                              borderRadius: 8,
                              padding: "4px 10px",
                              fontSize: 10,
                              fontWeight: 600,
                              color: "#10b981",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            ✓ Revisado
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

// ── COMPONENTES REUTILIZÁVEIS ──────────────────────────────────────────────

function NavButtons({ onPrev, onNext, hasPrev, hasNext }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, width: "100%", flexShrink: 0 }}>
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        disabled={!hasPrev}
        className="btn-hover"
        style={{
          flex: 1,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14,
          padding: "12px 14px",
          color: hasPrev ? "#94a3b8" : "#475569",
          fontSize: 12,
          fontWeight: 600,
          cursor: hasPrev ? "pointer" : "default",
          opacity: hasPrev ? 1 : 0.35,
          outline: "none"
        }}
      >
        ← Card Anterior
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        disabled={!hasNext}
        className="btn-hover"
        style={{
          flex: 1,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14,
          padding: "12px 14px",
          color: hasNext ? "#94a3b8" : "#475569",
          fontSize: 12,
          fontWeight: 600,
          cursor: hasNext ? "pointer" : "default",
          opacity: hasNext ? 1 : 0.35,
          outline: "none"
        }}
      >
        Card Seguinte →
      </button>
    </div>
  );
}

function LoginInput(props) {
  return (
    <input
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        padding: "10px 12px",
        color: "#f1f5f9",
        fontSize: 14,
        boxSizing: "border-box",
        outline: "none",
        transition: "border 0.2s, box-shadow 0.2s",
        fontFamily: "inherit"
      }}
      {...props}
    />
  );
}

// ── CONSTANTES DE ESTILO ────────────────────────────────────────────────────
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
