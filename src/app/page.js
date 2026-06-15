"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";
import { createClient } from '@supabase/supabase-js';
import BANCO from "../data/banco.json";
import { supabase } from "../lib/supabase";
import PomodoroBar from "./PomodoroBar";

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

  // If env-exported client is a real Supabase client (not the stub), use it.
  try {
    if (supabase && !supabase.__isStub) {
      return supabase;
    }
  } catch (e) {
    // fallthrough
  }

  return supabase;
}
// Local users fixture is optional and intentionally not required in production builds.
// If you need local users for development, create src/data/users.local.json (ignored by git).
// Local users fixture, when present, is loaded lazily inside the login component
// (so production builds don't require the file).
import bcrypt from "bcryptjs";

// Usuários locais agora são carregados de src/data/users.local.json (IGNORADO no git)
// Por segurança armazenamos apenas hashes de senha (SHA-256) no arquivo local.

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
function highlightFalso(text) {
  if (!text) return text;
  const parts = text.split(/\b(FALSO|VERDADEIRO)\b/);
  return parts.map((part, i) => {
    if (part === "FALSO") return <span key={i} style={{ color: "#f87171", fontWeight: 600 }}>FALSO</span>;
    if (part === "VERDADEIRO") return <span key={i} style={{ color: "#4ade80", fontWeight: 600 }}>VERDADEIRO</span>;
    return part;
  });
}

// ── UTILS: ALGORITMO SM-2 ──────────────────────────────────────────────────
function calculateSM2(q, interval = 1, repetition = 0, ef = 2.5) {
  let newInterval = 1;
  let newRepetition = 0;
  let newEf = ef;

  if (q === 0) { // Errei
    newInterval = 1;
    newRepetition = 0;
    newEf = Math.max(1.3, ef - 0.2);
  } else if (q === 1) { // Difícil
    newInterval = 3;
    newRepetition = repetition + 1;
    newEf = Math.max(1.3, ef - 0.15);
  } else if (q === 2) { // Bom
    newInterval = 6;
    newRepetition = repetition + 1;
    newEf = ef;
  } else if (q === 3) { // Fácil
    newInterval = 10;
    newRepetition = repetition + 1;
    newEf = Math.min(3.0, ef + 0.15);
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

// ── UTILS: STREAK & DATA ────────────────────────────────────────────────────
function getLocalDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

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

function mergeFavorites(local, remote) {
  if (!local?.length) return remote || [];
  if (!remote?.length) return local || [];
  const set = new Set([...local, ...remote]);
  return Array.from(set);
}

const isReviewedToday = (timestamp) => {
  if (!timestamp) return false;
  return getLocalDateString(new Date(timestamp)) === getLocalDateString(new Date());
};

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────
export default function App() {
  // Keep a client-only local users array. We will load the optional fixture inside
  // the login component when in development, so server-side builds remain unaffected.
  const [usersLocal, setUsersLocal] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [srsData, setSrsData] = useState({});
  const [selectedMateria, setSelectedMateria] = useState(null);
  const [showTopicSelector, setShowTopicSelector] = useState(false);
  const [showFavoritesMateriaSelector, setShowFavoritesMateriaSelector] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [studyMode, setStudyMode] = useState(null); // 'srs', 'all', 'topic' ou 'favorites'
  const [studyQueue, setStudyQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState({ studied: 0, gotWrong: 0, gotEasy: 0 });
  const [reviewOrder, setReviewOrder] = useState("random"); // 'random', 'easy_first', 'hard_first'
  const [globalReviewMessage, setGlobalReviewMessage] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [answeredSessionIds, setAnsweredSessionIds] = useState(new Set());
  const [toastMessage, setToastMessage] = useState("");
  const [answerHistory, setAnswerHistory] = useState([]);
  const [showDesempenho, setShowDesempenho] = useState(false);
  const [graphPeriod, setGraphPeriod] = useState("30d");
  const [graphCustomStart, setGraphCustomStart] = useState("");
  const [graphCustomEnd, setGraphCustomEnd] = useState("");
  const [cardSnapshot, setCardSnapshot] = useState({});
  const [userMeta, setUserMeta] = useState(null);
  const [showShieldBanner, setShowShieldBanner] = useState(false);
  const feedbackInProgressCardId = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const isSavingRef = useRef(false);
  const toggleFavTimeoutRef = useRef(null);
  const srsDataRef = useRef(srsData);

  // Estilos globais e de responsividade injetados
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
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
        transition: all 0.2s ease;
      }
      .btn-hover:hover {
        transform: translateY(-1px);
        filter: brightness(1.1);
      }
      .btn-hover:active {
        transform: translateY(0);
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
        overflow-y: auto;
        transform: rotateY(180deg);
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
          padding: 8px 0 !important;
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

  // Salvar progresso no Supabase com mesclagem inteligente
  // ── HISTÓRICO DE RESPOSTAS ────────────────────────────────────────────────
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

  const loadAnswerHistory = (username) => {
    try {
      return JSON.parse(localStorage.getItem("pcpe_history_" + username) || "[]");
    } catch { return []; }
  };

  const saveAnswerHistoryLocally = (username, history) => {
    try {
      localStorage.setItem("pcpe_history_" + username, JSON.stringify(history));
    } catch {}
  };

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

  const saveSRSData = async (username, srs, currentSettings) => {
    const doSave = async () => {
      isSavingRef.current = true;
      try {
        const client = getSupabase();

        const currentHistory = (() => {
          try { return JSON.parse(localStorage.getItem("pcpe_history_" + username) || "[]"); }
          catch { return []; }
        })();

        const localSRSFromStorage = (() => {
          try { return JSON.parse(localStorage.getItem("pcpe_srs_" + username) || "{}"); }
          catch { return {}; }
        })();

        const { data, error } = await client
          .from("user_progress")
          .select("srs_data, settings, answer_history")
          .eq("username", username);

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

        await client.from("user_progress").upsert({
          username,
          srs_data: mergedSRS,
          settings: latestSettings,
          answer_history: mergedHistory,
          updated_at: new Date().toISOString(),
        });

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
      } finally {
        isSavingRef.current = false;
      }
    };

    const result = saveQueueRef.current.then(doSave);
    saveQueueRef.current = result.catch(() => {});
    return result;
  };

  const loadUserMeta = useCallback(async (username) => {
    if (!username) return;
    const client = getSupabase();
    try {
      const { data, error } = await client
        .from("user_meta")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      const today = getTodayStr();

      // Se nao existir registro, semear streak do SRS existente
      if (!data) {
        const seedStreak = calculateStreak(srsDataRef.current);
        const meta = {
          username,
          current_streak: seedStreak,
          last_study_date: seedStreak > 0 ? today : null,
          shields_available: 2,
          updated_at: new Date().toISOString(),
        };
        await client.from("user_meta").upsert(meta);
        setUserMeta(meta);
        return;
      }

      let needsUpdate = false;
      let shieldActivated = false;
      const meta = { ...data };

      // Reset semanal de escudos (segunda-feira)
      if (new Date().getDay() === 1 && meta.shields_available < 2) {
        meta.shields_available = 2;
        needsUpdate = true;
      }

      // Verificar dias perdidos
      if (meta.last_study_date) {
        const lastDate = new Date(meta.last_study_date + "T00:00:00");
        const todayDate = new Date(today + "T00:00:00");
        const diffDays = Math.floor((todayDate - lastDate) / 86400000);
        if (diffDays >= 2) {
          if (meta.shields_available > 0) {
            meta.shields_available -= 1;
            shieldActivated = true;
            needsUpdate = true;
          } else {
            meta.current_streak = 0;
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        await client.from("user_meta").upsert({
          ...meta,
          updated_at: new Date().toISOString(),
        });
      }

      setUserMeta(meta);
      if (shieldActivated) setShowShieldBanner(true);
    } catch (e) {
      console.error("Erro ao carregar user_meta:", e);
      // Fallback: usa streak calculado do SRS
      setUserMeta({ current_streak: calculateStreak(srsDataRef.current), shields_available: 2 });
    }
  }, []);

  // Carregar progresso do Supabase com mesclagem inteligente
  const loadUserData = async (username) => {
    try {
      const client = getSupabase();
      let emailKey = null;

      // If username is not an email, look up the mapped auth email
      // from username_map so we query by the canonical key.
      if (!username.includes("@")) {
        try {
          const { data: mapData } = await client
            .from("username_map")
            .select("email")
            .eq("username", username)
            .maybeSingle();
          if (mapData && mapData.email) emailKey = mapData.email;
        } catch (e) {
          console.warn("username_map lookup failed:", e);
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
      const mergedSettings = {
        ...localSettings,
        ...combinedSettings,
        favorites: mergeFavorites(localSettings.favorites || [], combinedSettings.favorites || [])
      };
      const mergedHistory = mergeAnswerHistory(localHistory, combinedHistory);

      setSrsData(mergedSRS);
      setAnswerHistory(mergedHistory);
      if (mergedSettings.reviewOrder) setReviewOrder(mergedSettings.reviewOrder);
      if (mergedSettings.favorites) setFavorites(mergedSettings.favorites || []);

      if (!isSavingRef.current) {
        localStorage.setItem("pcpe_srs_" + resolvedUsername, JSON.stringify(mergedSRS));
        localStorage.setItem("pcpe_settings_" + resolvedUsername, JSON.stringify(mergedSettings));
        localStorage.setItem("pcpe_history_" + resolvedUsername, JSON.stringify(mergedHistory));

        await client.from("user_progress").upsert({
          username: resolvedUsername,
          srs_data: mergedSRS,
          settings: mergedSettings,
          answer_history: mergedHistory,
          updated_at: new Date().toISOString(),
        });
      }

      // Clean up legacy rows that have been merged
      for (const key of queryKeys) {
        if (key !== resolvedUsername) {
          try {
            await client.from("user_progress").delete().eq("username", key);
          } catch (e) { /* ignore cleanup errors */ }
        }
      }

      // Update the stored session to use the canonical key
      if (emailKey) {
        try {
          const session = JSON.parse(localStorage.getItem("pcpe_session") || "{}");
          session.username = emailKey;
          localStorage.setItem("pcpe_session", JSON.stringify(session));
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.error("Erro no loadUserData:", e);
    }
  };

  // Carregar sessão e SRS do localStorage e Supabase
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("pcpe_session");
      if (savedSession) {
        const user = JSON.parse(savedSession);
        const localUsers = (typeof window !== 'undefined' && window.__PCPE_LOCAL_USERS) ? window.__PCPE_LOCAL_USERS : [];
        if (localUsers.find(u => u.username === user.username) || user.username) {
          setCurrentUser(user);
          loadUserData(user.username);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Carregar user_meta (streak/shields) quando o usuario logar
  useEffect(() => {
    if (currentUser?.username) {
      loadUserMeta(currentUser.username);
    }
  }, [currentUser?.username, loadUserMeta]);

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
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadUserData(currentUser.username);
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser]);

  // Sincronizar dados a cada 30s (cards revisados em outro dispositivo, virada do dia, etc)
  useEffect(() => {
    if (!currentUser) return;
    let lastDateStr = getLocalDateString(new Date());

    const interval = setInterval(() => {
      const todayStr = getLocalDateString(new Date());
      if (todayStr !== lastDateStr) {
        lastDateStr = todayStr;
      }
      loadUserData(currentUser.username);
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Atualizar streak ao finalizar sessao de estudo
  useEffect(() => {
    if (!sessionCompleted || !currentUser || answeredSessionIds.size < 1) return;
    const updateMeta = async () => {
      const today = getTodayStr();
      const prev = userMeta || { current_streak: 0, last_study_date: null, shields_available: 2 };
      let newStreak = prev.current_streak || 0;
      if (prev.last_study_date !== today) {
        newStreak += 1;
      }
      const updated = {
        username: currentUser.username,
        current_streak: newStreak,
        last_study_date: today,
        shields_available: prev.shields_available ?? 2,
        updated_at: new Date().toISOString(),
      };
      try {
        const client = getSupabase();
        await client.from("user_meta").upsert(updated);
        setUserMeta(updated);
      } catch (e) {
        console.error("Erro ao atualizar streak:", e);
      }
    };
    updateMeta();
  }, [sessionCompleted]);

  const handleLogin = async (user) => {
    try {
      localStorage.setItem("pcpe_session", JSON.stringify(user));
      setCurrentUser(user);
      loadUserData(user.username);
      try {
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
      } catch {}
    } catch {}
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("pcpe_session");
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {}
    } catch {}
    setCurrentUser(null);
    setSelectedMateria(null);
    setStudyMode(null);
    setShowTopicSelector(false);
    setSrsData({});
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
      } catch (e) { console.error(e); }

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
    setIsFlipped(false);
    setStudyMode("favorites");
    setSelectedMateria(materiaId || null);
    setShowFavoritesMateriaSelector(false);
    setSessionCompleted(false);
    setSessionStats({ studied: 0, gotWrong: 0, gotEasy: 0 });
    setAnsweredSessionIds(new Set());
  };

  const goToNextCard = () => {
    if (currentQueueIndex + 1 < studyQueue.length) {
      setIsFlipped(false);
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
      setIsFlipped(false);
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
    
    // Seleciona até 30 cards vencidos aleatoriamente para evitar repetições
    const selectedDue = [...allDue].sort(() => Math.random() - 0.5).slice(0, 30);
    
    const sortedQueue = sortQueue(selectedDue);
    setStudyQueue(sortedQueue);
    setCurrentQueueIndex(0);
    setIsFlipped(false);
    setStudyMode("global_srs");
    setSelectedMateria(null);
    setSessionCompleted(false);
    setSessionStats({ studied: 0, gotWrong: 0, gotEasy: 0 });
    setAnsweredSessionIds(new Set());
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

    result.streak = userMeta?.current_streak ?? calculateStreak(srsData);

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
  }, [srsData, userMeta?.current_streak]);

  // Preparar fila de estudos padrão (Todos / SRS)
  const startStudySession = (materiaId, mode) => {
    const cards = BANCO[materiaId] || [];
    let queue = [];

    if (mode === "all") {
      queue = [...cards];
    } else {
      const allDueCards = cards.filter(c => srsData[c.id] && srsData[c.id].dueDate <= Date.now());
      const allNewCards = cards.filter(c => !srsData[c.id]);
      
      // Seleciona aleatoriamente até 20 vencidos e até 15 novos para não repetir
      const dueCards = [...allDueCards].sort(() => Math.random() - 0.5).slice(0, 20);
      const newCards = [...allNewCards].sort(() => Math.random() - 0.5).slice(0, 15);
      
      queue = [...dueCards, ...newCards];
    }

    const sortedQueue = sortQueue(queue);

    setStudyQueue(sortedQueue);
    setCurrentQueueIndex(0);
    setIsFlipped(false);
    setStudyMode(mode);
    setSelectedMateria(materiaId);
    setSessionCompleted(false);
    setSessionStats({ studied: 0, gotWrong: 0, gotEasy: 0 });
    setAnsweredSessionIds(new Set());
  };

  // Preparar fila de estudos por Tópicos
  const startTopicStudySession = (topicsToStudy) => {
    const cards = BANCO[selectedMateria] || [];
    let queue = cards.filter(c => topicsToStudy.includes(c.topico));

    const sortedQueue = sortQueue(queue);

    setStudyQueue(sortedQueue);
    setCurrentQueueIndex(0);
    setIsFlipped(false);
    setStudyMode("topic");
    setSessionCompleted(false);
    setSessionStats({ studied: 0, gotWrong: 0, gotEasy: 0 });
    setShowTopicSelector(false);
    setAnsweredSessionIds(new Set());
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

    if (studyMode === "srs" || studyMode === "topic" || studyMode === "global_srs" || studyMode === "all") {
      const currentState = srsData[currentCard.id] || { interval: 1, repetition: 0, ef: 2.5 };
      const nextState = calculateSM2(q, currentState.interval, currentState.repetition, currentState.ef);

      const updatedSRS = {
        ...srsData,
        [currentCard.id]: nextState
      };

      setSrsData(updatedSRS);
      try {
        localStorage.setItem("pcpe_srs_" + currentUser.username, JSON.stringify(updatedSRS));
      } catch (e) {
        console.error(e);
      }
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
          setIsFlipped(false);
          setStudyMode("topic");
          setSessionCompleted(false);
          setSessionStats({ studied: 0, gotWrong: 0, gotEasy: 0 });
          setAnsweredSessionIds(new Set());
          setShowDesempenho(false);
        }}
      />
    );
  }

  // Se estiver estudando
  if (studyMode && studyQueue.length > 0 && !sessionCompleted) {
    const currentCard = studyQueue[currentQueueIndex];
    const currentCardWasAnswered = answeredSessionIds.has(currentCard.id);
    const isGlobal = studyMode === "global_srs";
    const matInfo = !isGlobal ? MATERIAS.find(m => m.id === selectedMateria) : null;
    const themeColor = isGlobal ? "#3b82f6" : (matInfo?.color || "#3b82f6");
    const labelText = isGlobal ? "Revisão Geral" : (matInfo?.label || "");
    const emojiText = isGlobal ? "⚡" : (matInfo?.emoji || "");

    return (
      <Shell user={currentUser} stats={stats} onLogout={handleLogout} centered userMeta={userMeta} showShieldBanner={showShieldBanner} onDismissShield={() => setShowShieldBanner(false)} srsData={srsData} hidePomodoro={true}>
        {toastMessage && (
          <div style={{
            position: "fixed",
            top: 24,
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
            transition: "all 0.3s ease"
          }}>
            ⚠️ {toastMessage}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", maxWidth: 640, margin: "0 auto", boxSizing: "border-box", flex: 1, minHeight: 0, padding: "0 4px" }}>
          {/* Header do Estudo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, padding: "0 8px" }}>
            <button
              onClick={() => {
                setStudyMode(null);
                setShowTopicSelector(false);
                setShowFavoritesMateriaSelector(false);
              }}
              className="btn-hover"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#94a3b8",
                borderRadius: 12,
                padding: "8px 14px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                outline: "none"
              }}
            >
              ← Voltar
            </button>
            <div style={{ textAlign: "center", padding: "0 8px" }}>
              <span style={{ color: themeColor, fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
                {emojiText} {labelText}
              </span>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500, marginTop: 2 }}>
                {studyMode === "global_srs"
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
            <div style={{ fontSize: 13, color: "#64748b", fontFamily: "monospace" }}>
              {currentQueueIndex + 1}/{studyQueue.length}
            </div>
          </div>

          {/* Barra de Progresso */}
          <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.03)", borderRadius: 3, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
            <div
              style={{
                width: `${((currentQueueIndex + 1) / studyQueue.length) * 100}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${themeColor}, #ffffff)`,
                transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            />
          </div>

          {/* Flashcard 3D */}
          <div
            style={{
              width: "100%",
              flex: 1,
              minHeight: 200,
              position: "relative"
            }}
          >
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
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                }}
              >
                {/* Frente */}
                <div className="flashcard-box flashcard-front-style">
                  <div style={{ fontSize: 10, color: "#3b82f6", fontWeight: 600, letterSpacing: 3, marginBottom: 20 }}>✦ PERGUNTA ✦</div>
                  <p className="flashcard-question-text" style={{ color: "#f1f5f9", fontSize: 18, lineHeight: 1.65, textAlign: "center", margin: 0, fontWeight: 400, fontFamily: "Georgia, serif" }}>
                    {currentCard?.pergunta}
                  </p>
                  <div style={{ marginTop: 28, color: "rgba(255,255,255,0.2)", fontSize: 11, letterSpacing: 1, fontWeight: 500 }}>
                    Clique para revelar a resposta
                  </div>
                </div>

                {/* Verso */}
                <div className="custom-scrollbar flashcard-box flashcard-back-style" style={{ border: `1px solid ${themeColor}40` }}>
                  <div style={{ fontSize: 10, color: themeColor, fontWeight: 600, letterSpacing: 3, marginBottom: 14 }}>✦ RESPOSTA ✦</div>
                  
                  <p className="flashcard-answer-text" style={{ color: "#e2e8f0", fontSize: 15, lineHeight: 1.65, textAlign: "center", margin: "0 0 16px 0", fontFamily: "Georgia, serif" }}>
                    {currentCard?.resposta}
                  </p>

                  {/* Dica do Professor */}
                  {currentCard?.dica && (
                    <div style={{
                      background: "rgba(234,179,8,0.04)",
                      border: "1px solid rgba(234,179,8,0.12)",
                      borderRadius: 14,
                      padding: "12px 16px",
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: "auto"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#eab308", fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>
                        <span>🎓</span> DICA DO PROFESSOR (CEBRASPE)
                      </div>
                      <p style={{ color: "#d1d5db", fontSize: 11, lineHeight: 1.5, margin: 0 }}>
                        {highlightFalso(currentCard?.dica)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botão Favoritar ÚNICO — fora do flip container, sempre no canto superior direito */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(currentCard.id);
              }}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "transparent",
                border: "none",
                color: favorites.includes(currentCard.id) ? "#eab308" : "#475569",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                zIndex: 20,
                outline: "none",
                pointerEvents: "auto"
              }}
            >
              <span style={{ fontSize: 18 }}>{favorites.includes(currentCard.id) ? "★" : "☆"}</span>
              <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.6, letterSpacing: 0.5, color: "#94a3b8" }}>
                {favorites.includes(currentCard.id) ? "favoritado" : "favoritar"}
              </span>
            </button>
          </div>

          {/* Botões de Ação */}
          <div style={{ minHeight: 70, flexShrink: 0 }}>
            {isFlipped ? (
              studyMode === "srs" || studyMode === "topic" || studyMode === "global_srs" ? (
                // 4 Botões SM-2 com classe responsiva
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {currentCardWasAnswered && (
                  <div style={{ color: "#fbbf24", fontSize: 12, fontWeight: 600, textAlign: "center" }}>
                    Opção foi selecionada anteriormente.
                  </div>
                )}
                <div className="srs-buttons-grid">
                  <button
                    onClick={() => handleCardFeedback(0)}
                    disabled={currentCardWasAnswered}
                    className="btn-hover"
                    style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 14, padding: "14px 10px", cursor: currentCardWasAnswered ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 12, opacity: currentCardWasAnswered ? 0.55 : 1 }}
                  >
                    ❌ Errei
                  </button>
                  <button
                    onClick={() => handleCardFeedback(1)}
                    disabled={currentCardWasAnswered}
                    className="btn-hover"
                    style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 14, padding: "14px 10px", cursor: currentCardWasAnswered ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 12, opacity: currentCardWasAnswered ? 0.55 : 1 }}
                  >
                    ⚠️ Difícil
                  </button>
                  <button
                    onClick={() => handleCardFeedback(2)}
                    disabled={currentCardWasAnswered}
                    className="btn-hover"
                    style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 14, padding: "14px 10px", cursor: currentCardWasAnswered ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 12, opacity: currentCardWasAnswered ? 0.55 : 1 }}
                  >
                    👍 Bom
                  </button>
                  <button
                    onClick={() => handleCardFeedback(3)}
                    disabled={currentCardWasAnswered}
                    className="btn-hover"
                    style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 14, padding: "14px 10px", cursor: currentCardWasAnswered ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 12, opacity: currentCardWasAnswered ? 0.55 : 1 }}
                  >
                    ⚡ Fácil
                  </button>
                </div>
                </div>
              ) : (
                // Botão Próximo Simples para favoritos ou outros modos
                <button
                  onClick={goToNextCard}
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
              // Botão Revelar
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
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, width: "100%", flexShrink: 0 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevCard();
              }}
              disabled={currentQueueIndex === 0}
              className="btn-hover"
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
                padding: "12px 14px",
                color: currentQueueIndex === 0 ? "#475569" : "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
                cursor: currentQueueIndex === 0 ? "default" : "pointer",
                outline: "none"
              }}
            >
              ← Card Anterior
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNextCard();
              }}
              disabled={currentQueueIndex === studyQueue.length - 1}
              className="btn-hover"
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
                padding: "12px 14px",
                color: currentQueueIndex === studyQueue.length - 1 ? "#475569" : "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
                cursor: currentQueueIndex === studyQueue.length - 1 ? "default" : "pointer",
                outline: "none"
              }}
            >
              Card Seguinte →
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // Sessão de Estudos Completada
  if (sessionCompleted) {
    const isGlobal = studyMode === "global_srs";
    const matInfo = !isGlobal ? MATERIAS.find(m => m.id === selectedMateria) : null;
    return (
      <Shell user={currentUser} stats={stats} onLogout={handleLogout} centered userMeta={userMeta} showShieldBanner={showShieldBanner} onDismissShield={() => setShowShieldBanner(false)} srsData={srsData}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "32px 20px", width: "100%", maxWidth: 480, margin: "0 auto", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24, boxSizing: "border-box" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏆</div>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 600, margin: 0 }}>
            {isGlobal ? "Você mandou bem, por hoje, amanhã tem mais." : "Meta Diária Concluída!"}
          </h2>
          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5, marginTop: 8, marginBottom: 24 }}>
            {isGlobal
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

          <button
            onClick={() => {
              setStudyMode(null);
              setSelectedMateria(null);
              setShowFavoritesMateriaSelector(false);
              setSessionCompleted(false);
            }}
            className="btn-hover"
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: "14px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14
            }}
          >
            Voltar ao Painel
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
          <button
            onClick={() => setShowFavoritesMateriaSelector(false)}
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
            <button
              onClick={() => setShowTopicSelector(false)}
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
                        justifyContent: "center",
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
        </Shell>
      );
    }

    return (
      <Shell user={currentUser} stats={stats} onLogout={handleLogout} userMeta={userMeta} showShieldBanner={showShieldBanner} onDismissShield={() => setShowShieldBanner(false)} srsData={srsData}>
        <div style={{ width: "100%", maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24, boxSizing: "border-box" }}>
          <button
            onClick={() => setSelectedMateria(null)}
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
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 24, padding: 10, background: "rgba(239,68,68,0.1)", borderRadius: 14, color: "#ef4444" }}>🔥</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{stats.streak} {stats.streak === 1 ? 'dia' : 'dias'}</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, marginTop: 2 }}>OFENSIVA DE ESTUDOS</div>
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
              className="btn-hover"
              style={{
                width: "100%",
                background: stats.dueCount > 0 ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "rgba(255,255,255,0.04)",
                border: stats.dueCount > 0 ? "none" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "8px 12px",
                color: stats.dueCount > 0 ? "#fff" : "#64748b",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
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
          position: "relative",
          overflow: "hidden",
          outline: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24
        }}
      >
        <div style={{ position: "absolute", top: 0, right: 0, width: 70, height: 70, borderRadius: "0 20px 0 100%", background: "rgba(99,102,241,0.08)" }} />
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
          color: "#818cf8"
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
              className="card-hover"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 20,
                padding: "20px 18px",
                textAlign: "center",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                width: "100%",
                outline: "none"
              }}
            >
              <div style={{ position: "absolute", top: 0, right: 0, width: 70, height: 70, borderRadius: "0 20px 0 100%", background: `${m.color}08` }} />
              
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

// ── COMPONENTE: TELA DE LOGIN ──────────────────────────────────────────────
function TelaLogin({ onLogin }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [erro, setErro] = useState("");
  const [sbUrl, setSbUrl] = useState("");
  const [sbKey, setSbKey] = useState("");
  const [usersLocalLoaded, setUsersLocalLoaded] = useState(false);

  const handleFormSubmit = () => {
    (async () => {
      try {
        const uname = username.toLowerCase().trim();

        // 1) If Supabase env is configured, try to sign in through Supabase first.
        // Attempt Supabase auth if we can create a client. The client may come
        // from environment (lib) or from runtime values saved in localStorage
        // (pcpe_supabase_url / pcpe_supabase_anon_key). This lets the app work
        // locally without NEXT_PUBLIC_* env vars.
        try {
          const client = getSupabase();
          if (client && client.auth) {
            // Support login by username -> email mapping via `username_map`.
            let loginEmail = uname;
            if (!uname.includes("@")) {
              try {
                const { data: mapData, error: mapErr } = await client
                  .from("username_map")
                  .select("email")
                  .eq("username", uname)
                  .maybeSingle();
                if (!mapErr && mapData && mapData.email) loginEmail = mapData.email;
              } catch (e) {
                // ignore mapping errors and continue
              }
            }

            const { data, error } = await client.auth.signInWithPassword({
              email: loginEmail,
              password
            });

            if (error) {
              console.warn('Supabase signInWithPassword failed');
            } else if (!data || !data.user) {
              console.warn('Supabase signInWithPassword returned no user');
            }

            if (!error && data && data.user) {
              const u = data.user;
              const name = (u.user_metadata && u.user_metadata.name) || u.email || uname;
              setErro("");
              // persist the supabase connection if it came from inputs
              onLogin({ username: u.email || uname, role: 'user', name });
              return;
            }
          }
        } catch (e) {
          console.warn('Supabase auth attempt failed, falling back to local auth.', e);
        }

        // 2) Local authentication: load optional fixture at runtime (development only)
        if (!usersLocalLoaded && typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
          try {
            const mod = await import("../data/users.local.json");
            // attach to component-level state so other auth flows can use it
            // NOTE: we don't set a top-level USERS variable to avoid bundling the file on build
            const data = mod.default || mod;
            // mutate the parent App's usersLocal via a custom event (minimal coupling)
            window.__PCPE_LOCAL_USERS = data;
          } catch (e) {
            // no-op if file missing
  }
          setUsersLocalLoaded(true);
        }

        const localUsers = (typeof window !== "undefined" && window.__PCPE_LOCAL_USERS) ? window.__PCPE_LOCAL_USERS : [];

        // bcrypt-based local users (preferred)
        const bcryptMatchUser = localUsers.find(u => u.username === uname && u.passwordHash && u.passwordHash.startsWith("$2a$"));
        if (bcryptMatchUser) {
          const ok = bcrypt.compareSync(password, bcryptMatchUser.passwordHash);
          if (ok) {
            setErro("");
            onLogin({ username: bcryptMatchUser.username, role: bcryptMatchUser.role, name: bcryptMatchUser.name });
            return;
          }
        }

        // Fallback: SHA-256 legacy hashes (compatibility)
        try {
          const crypto = await import("crypto");
          const sha = crypto.createHash("sha256").update(password).digest("hex");
          const user = localUsers.find(u => u.username === uname && u.passwordHash === sha);
          if (user) {
            setErro("");
            onLogin({ username: user.username, role: user.role, name: user.name });
            return;
          }
        } catch (e) {
          // In the browser environment, dynamic import('crypto') may fail. Ignore.
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
      <div style={{ position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(59,130,246,0.05) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div className="login-fade-in" style={{ position: "relative", zIndex: 1, background: "rgba(17,24,39,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24, width: "100%", maxWidth: 360, boxShadow: "0 24px 64px rgba(0,0,0,0.6)", boxSizing: "border-box", padding: "28px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <LoginBadge />
          <h1 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: 0.5 }}>Flashcards PC-PE</h1>
          <p style={{ color: "#64748b", fontSize: 11, fontWeight: 600, marginTop: 6, letterSpacing: 2 }}>AGENTE DE POLÍCIA · PE</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleFormSubmit()}
              placeholder="Usuário"
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px", color: "#f1f5f9", fontSize: 14, boxSizing: "border-box", outline: "none", transition: "border 0.2s, box-shadow 0.2s", fontFamily: "inherit" }}
              onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.08)" }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none" }}
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleFormSubmit()}
              placeholder="Senha"
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px", color: "#f1f5f9", fontSize: 14, boxSizing: "border-box", outline: "none", transition: "border 0.2s, box-shadow 0.2s", fontFamily: "inherit" }}
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
            onClick={handleFormSubmit}
            className="btn-hover"
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              border: "none",
              borderRadius: 10,
              padding: "11px",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: 0.5,
              boxShadow: "0 4px 12px rgba(37,99,235,0.2)"
            }}
          >
            ENTRAR
          </button>
        </div>
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
function TelaDesempenho({ user, stats, srsData, answerHistory, BANCO, MATERIAS, graphPeriod, setGraphPeriod, graphCustomStart, setGraphCustomStart, graphCustomEnd, setGraphCustomEnd, onBack, onLogout, startWeakStudy, userMeta, showShieldBanner, setShowShieldBanner }) {

  const getFilteredHistory = () => {
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
  };

  const filteredHistory = getFilteredHistory();
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
        <button
          onClick={onBack}
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
function Shell({ children, user, stats, onLogout, centered, userMeta = null, showShieldBanner = false, onDismissShield = () => {}, srsData = {}, hidePomodoro = false }) {
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

  return (
      <div style={{ height: "100vh", overflow: "hidden", background: "#030712", boxSizing: "border-box", position: "relative", width: "100%", display: "flex", flexDirection: "column" }}>
      <div className="shell-hero-composite" />
      <div style={{ position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(59,130,246,0.03) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 800, margin: "0 auto", boxSizing: "border-box", flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: isMobile ? "12px 10px 20px" : "16px 16px 24px" }}>
        {/* Topbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", flexDirection: isMobile ? "column" : "row", flexShrink: 0, flexWrap: "wrap", gap: isMobile ? 6 : 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "inline-block", background: "linear-gradient(135deg,#e11d48,#be123c)", borderRadius: 10, padding: "6px 14px" }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 9, letterSpacing: 2, fontFamily: "monospace" }}>PC-PE · AGENTE</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "#f97316", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }} title="Dias de ofensiva">
                🔥 {userMeta?.current_streak ?? calculateStreak(srsData)} <span style={{ color: "#94a3b8", fontSize: 10, fontWeight: 400 }}>dias</span>
              </span>
              <span style={{ color: "#334155", fontSize: 11, fontWeight: 300 }}>|</span>
              <span style={{ color: "#3b82f6", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }} title="Escudos disponíveis">
                🛡️ {userMeta?.shields_available ?? 2} <span style={{ color: "#94a3b8", fontSize: 10, fontWeight: 400 }}>escudos</span>
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: isMobile ? "flex-start" : "flex-end", gap: 14 }}>
            <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>
              {user?.role === "admin" ? "👑" : "👤"} {user?.name}
            </span>
            <button
              onClick={onLogout}
              className="btn-hover"
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
            >
              Sair
            </button>
          </div>
        </div>

        <hr style={{ width: "100%", border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", margin: "12px 0", flexShrink: 0 }} />

        {/* ── CARD PRINCIPAL (sólido, sem transparência) ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0f172a", borderRadius: isMobile ? 16 : 24, border: "1px solid rgba(255,255,255,0.06)", minHeight: 0, padding: isMobile ? "12px 16px" : "12px 20px" }}>

          {/* Banner de Escudo de Ofensiva */}
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
                className="btn-hover"
                style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                  color: "#94a3b8", cursor: "pointer", outline: "none", whiteSpace: "nowrap",
                }}
              >
                OK
              </button>
            </div>
          )}

          {/* Pomodoro Timer */}
          <div style={{ display: showPomodoro ? 'block' : 'none', flexShrink: 0 }}>
            <PomodoroBar username={user?.username} onHide={() => setShowPomodoro(false)} onTick={handlePomodoroTick} isMobile={isMobile} />
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

        {/* Botao flutuante quando oculto durante estudo */}
        {!showPomodoro && hidePomodoro && (
          <button
            onClick={() => setShowPomodoro(true)}
            className="pomodoro-floating-btn btn-hover"
            style={{
              position: 'fixed', zIndex: 100,
              display: 'flex', alignItems: 'center', gap: 6,
              background: pomodoroInfo?.status === "running" ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
              border: pomodoroInfo?.status === "running" ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.08)',
              color: pomodoroInfo?.status === "running" ? '#4ade80' : '#94a3b8',
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
}
