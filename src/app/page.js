"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from '@supabase/supabase-js';
import BANCO from "../data/banco.json";
import { supabase } from "../lib/supabase";

// Helper to obtain a Supabase client at runtime.
// Priority: environment-exported client (imported supabase) -> dynamic client created
// from stored localStorage values (pcpe_supabase_url / pcpe_supabase_anon_key) -> stub.
function getSupabase() {
  // If server-side or supabase already configured via lib, use it.
  try {
    if (supabase && supabase.auth) return supabase;
  } catch (e) {
    // fallthrough
  }

  if (typeof window === 'undefined') return supabase;

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || localStorage.getItem('pcpe_supabase_url');
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || localStorage.getItem('pcpe_supabase_anon_key');
    if (url && key) {
      return createClient(url, key);
    }
  } catch (e) {
    console.warn('Could not create Supabase client at runtime:', e);
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
  { id: "leg_estadual",   label: "Legislação Estadual",   emoji: "⚖️",  color: "#ef4444" },
  { id: "dir_const",      label: "Dir. Constitucional",   emoji: "📜",  color: "#3b82f6" },
  { id: "dir_adm",        label: "Dir. Administrativo",   emoji: "🏛️",  color: "#10b981" },
  { id: "dir_penal",      label: "Dir. Penal",            emoji: "⚠️",  color: "#8b5cf6" },
  { id: "dir_proc_penal", label: "Dir. Processual Penal", emoji: "🔍",  color: "#f97316" },
  { id: "portugues",      label: "Língua Portuguesa",     emoji: "📝",  color: "#06b6d4" },
  { id: "informatica",    label: "Informática",           emoji: "💻",  color: "#14b8a6" },
  { id: "raciocinio",     label: "Raciocínio Lógico",     emoji: "🧠",  color: "#eab308" },
  { id: "contabilidade",  label: "Contabilidade Geral",   emoji: "📊",  color: "#ec4899" },
  { id: "estatistica",    label: "Estatística",           emoji: "📈",  color: "#6366f1" },
];

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
  const feedbackInProgressCardId = useRef(null);

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
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(0,0,0,0.1);
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
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
        padding: 36px;
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
      .login-card {
        /* Fix size / padding to avoid layout shift on font/image load */
        padding: 48px 36px;
        min-width: 320px;
        max-width: 380px;
        box-sizing: border-box;
      }

      /* Smooth transitions to avoid abrupt jumps when breakpoint changes */
      .landing-container {
        transition: padding-right 360ms cubic-bezier(.2,.8,.2,1), justify-content 360ms cubic-bezier(.2,.8,.2,1);
      }

      .login-box {
        transition: transform 300ms cubic-bezier(.2,.8,.2,1), opacity 220ms ease;
        will-change: transform, opacity;
        box-shadow: 0 18px 50px rgba(2,6,23,0.6);
      }

      /* --- REGRA PARA O TELEMÓVEL (O padrão) --- */
      .landing-container {
        background-image: url('/banner-mobile.webp');
        background-size: cover;
        background-position: center;

        min-height: 100vh;
        width: 100%;

        display: flex;
        justify-content: center;
        align-items: center;

        /* Este 'padding-top' cria uma barreira invisível no topo (ocupando 30% da tela), empurrando a caixa de login para baixo */
        padding-top: 30vh;

        /* Margens laterais para a caixa não colar nas bordas do telemóvel */
        padding-left: 24px;
        padding-right: 24px;
      }

      .login-box {
        width: 100%;
        max-width: 400px;
        padding: 32px;
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.7);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);

        /* Como já empurrámos tudo com o padding acima, aqui pode ficar zero */
        margin-top: 0;
      }

      /* Composite hero: banner + overlay + subtle grid on top. Placed in the same fixed element
         as the existing grid so layering is preserved and images are visible. */
      .login-hero-composite {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background-color: #030712; /* fallback */
        background-image:
          linear-gradient(rgba(59,130,246,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.02) 1px, transparent 1px),
          linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)),
          url('/banner-pc.webp');
        background-size: 40px 40px, 40px 40px, cover, cover;
        background-position: center, center, center, center;
        background-repeat: repeat, repeat, no-repeat, no-repeat;
      }

      @media (max-width: 768px) {
        .login-hero-composite {
          background-image:
            linear-gradient(rgba(59,130,246,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.02) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)),
            url('/banner-mobile.webp');
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
          padding: 24px 16px !important;
        }
        .flashcard-question-text {
          font-size: 16px !important;
        }
        .flashcard-answer-text {
          font-size: 14px !important;
        }
        .materia-title {
          font-size: 20px !important;
        }
        .dashboard-metrics-grid {
          grid-template-columns: 1fr !important;
          gap: 10px !important;
        }
      .login-card {
        padding: 32px 20px !important;
      }

      /* --- A MAGIA ACONTECE AQUI (Para PC) --- */
      @media (min-width: 768px) {
        .landing-container {
          background-image: url('/banner-pc.webp');
          /* Mantém a imagem alinhada à esquerda para o logo não sumir */
          background-position: left center;
          /* MUDE ISTO: Empurra a caixa de login para o lado direito */
          justify-content: flex-end;
          /* Dá um espaço para a caixa não colar no canto da tela */
          padding-right: 12%;
        }

        .login-box {
          margin-top: 0;
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

  // Salvar progresso no Supabase com mesclagem inteligente
  const saveSRSData = async (username, srs, currentSettings) => {
    try {
      const client = getSupabase();
      const { data, error } = await client
        .from("user_progress")
        .select("srs_data, settings")
        .eq("username", username);

      let latestSRS = {};
      let latestSettings = currentSettings;

      if (!error && data && data.length > 0) {
        latestSRS = data[0].srs_data || {};
        latestSettings = { ...data[0].settings, ...currentSettings };
      }

      const mergedSRS = mergeSRSData(srs, latestSRS);

      await client.from("user_progress").upsert({
        username,
        srs_data: mergedSRS,
        settings: latestSettings,
        updated_at: new Date().toISOString(),
      });

      setSrsData(mergedSRS);
      localStorage.setItem("pcpe_srs_" + username, JSON.stringify(mergedSRS));
      if (latestSettings.reviewOrder) {
        setReviewOrder(latestSettings.reviewOrder);
      }
      if (latestSettings.favorites) {
        setFavorites(latestSettings.favorites);
      }
      localStorage.setItem("pcpe_settings_" + username, JSON.stringify(latestSettings));
    } catch (e) {
      console.error("Erro ao salvar no Supabase:", e);
    }
  };

  // Carregar progresso do Supabase com mesclagem inteligente
  const loadUserData = async (username) => {
    try {
      const client = getSupabase();
      const { data, error } = await client
        .from("user_progress")
        .select("srs_data, settings")
        .eq("username", username);

      const savedSRS = localStorage.getItem("pcpe_srs_" + username);
      const savedSettings = localStorage.getItem("pcpe_settings_" + username);
      const localSRS = savedSRS ? JSON.parse(savedSRS) : {};
      const localSettings = savedSettings ? JSON.parse(savedSettings) : { reviewOrder: "random", favorites: [] };

      if (error) {
        console.warn("Erro ao buscar do Supabase, usando local:", error);
        setSrsData(localSRS);
        if (localSettings.reviewOrder) setReviewOrder(localSettings.reviewOrder);
        if (localSettings.favorites) setFavorites(localSettings.favorites);
        return;
      }

      if (data && data.length > 0) {
        const row = data[0];
        const remoteSRS = row.srs_data || {};
        const remoteSettings = row.settings || {};

        const mergedSRS = mergeSRSData(localSRS, remoteSRS);
        const mergedSettings = { ...localSettings, ...remoteSettings };

        setSrsData(mergedSRS);
        if (mergedSettings.reviewOrder) setReviewOrder(mergedSettings.reviewOrder);
        if (mergedSettings.favorites) setFavorites(mergedSettings.favorites || []);

        localStorage.setItem("pcpe_srs_" + username, JSON.stringify(mergedSRS));
        localStorage.setItem("pcpe_settings_" + username, JSON.stringify(mergedSettings));

        await client.from("user_progress").upsert({
          username,
          srs_data: mergedSRS,
          settings: mergedSettings,
          updated_at: new Date().toISOString(),
        });
      } else {
        console.log("Nenhum dado no Supabase para", username, "- Migrando localStorage local.");
        setSrsData(localSRS);
        if (localSettings.reviewOrder) setReviewOrder(localSettings.reviewOrder);
        if (localSettings.favorites) setFavorites(localSettings.favorites || []);

        await client.from("user_progress").upsert({
          username,
          srs_data: localSRS,
          settings: localSettings,
          updated_at: new Date().toISOString(),
        });
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

  // Sincronizar ao focar a aba/janela novamente (ex: alternar entre celular e PC)
  useEffect(() => {
    if (!currentUser) return;
    const handleFocus = () => {
      loadUserData(currentUser.username);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [currentUser]);

  // Monitorar a virada do dia para liberar cards às 00:00 automaticamente
  useEffect(() => {
    if (!currentUser) return;
    let lastDateStr = getLocalDateString(new Date());

    const interval = setInterval(() => {
      const todayStr = getLocalDateString(new Date());
      if (todayStr !== lastDateStr) {
        lastDateStr = todayStr;
        loadUserData(currentUser.username);
      }
    }, 30000); // Verifica a cada 30 segundos

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogin = (user) => {
    try {
      localStorage.setItem("pcpe_session", JSON.stringify(user));
      setCurrentUser(user);
      loadUserData(user.username);
    } catch {}
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("pcpe_session");
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
      
      // Sincroniza as alterações no Supabase e local
      setTimeout(() => {
        saveSRSData(currentUser.username, srsData, { reviewOrder, favorites: updated });
      }, 50);
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

  const sortQueue = (queueToSort) => {
    const sorted = [...queueToSort];
    if (reviewOrder === "random") {
      sorted.sort(() => Math.random() - 0.5);
    } else if (reviewOrder === "easy_first") {
      sorted.sort((a, b) => {
        const intervalA = srsData[a.id] ? srsData[a.id].interval : 4;
        const intervalB = srsData[b.id] ? srsData[b.id].interval : 4;
        if (intervalA === intervalB) {
          return Math.random() - 0.5;
        }
        return intervalB - intervalA;
      });
    } else if (reviewOrder === "hard_first") {
      sorted.sort((a, b) => {
        const intervalA = srsData[a.id] ? srsData[a.id].interval : 4;
        const intervalB = srsData[b.id] ? srsData[b.id].interval : 4;
        if (intervalA === intervalB) {
          return Math.random() - 0.5;
        }
        return intervalA - intervalB;
      });
    }
    return sorted;
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

    if (studyMode === "srs" || studyMode === "topic" || studyMode === "global_srs") {
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
      <Shell user={currentUser} stats={stats} onLogout={handleLogout}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", maxWidth: 640, margin: "0 auto", boxSizing: "border-box" }}>
          {/* Header do Estudo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
          <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.03)", borderRadius: 3, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
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
            onClick={() => setIsFlipped(prev => !prev)}
            style={{
              width: "100%",
              height: 320,
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
                {/* Botão Favoritar */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Evita virar o card
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
                    zIndex: 10,
                    outline: "none"
                  }}
                >
                  <span style={{ fontSize: 18 }}>{favorites.includes(currentCard.id) ? "★" : "☆"}</span>
                  <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.6, letterSpacing: 0.5, color: "#94a3b8" }}>
                    {favorites.includes(currentCard.id) ? "favoritado" : "favoritar"}
                  </span>
                </button>

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
                {/* Botão Favoritar */}
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
                    zIndex: 10,
                    outline: "none"
                  }}
                >
                  <span style={{ fontSize: 18 }}>{favorites.includes(currentCard.id) ? "★" : "☆"}</span>
                  <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.6, letterSpacing: 0.5, color: "#94a3b8" }}>
                    {favorites.includes(currentCard.id) ? "favoritado" : "favoritar"}
                  </span>
                </button>

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
                      {currentCard?.dica}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div style={{ minHeight: 70 }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, width: "100%" }}>
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
      <Shell user={currentUser} stats={stats} onLogout={handleLogout}>
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
      <Shell user={currentUser} stats={stats} onLogout={handleLogout}>
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
        <Shell user={currentUser} stats={stats} onLogout={handleLogout}>
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
      <Shell user={currentUser} stats={stats} onLogout={handleLogout}>
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
    <Shell user={currentUser} stats={stats} onLogout={handleLogout}>
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
          <option value="easy_first">📈 Fáceis Primeiro (Dificuldade Ascendente)</option>
          <option value="hard_first">📉 Difíceis Primeiro (Dificuldade Descendente)</option>
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
                textAlign: "left",
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

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "3px 8px" }}>
                  {mStats.total} cards
                </span>
                {mStats.due > 0 ? (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.1)", borderRadius: 8, padding: "3px 8px" }}>
                    🔥 {mStats.due} revisar
                  </span>
                ) : mStats.new > 0 ? (
                  <span style={{ fontSize: 10, fontWeight: 600, color: m.color, background: `${m.color}15`, borderRadius: 8, padding: "3px 8px" }}>
                    Novas
                  </span>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#10b981", background: "rgba(16,185,129,0.1)", borderRadius: 8, padding: "3px 8px" }}>
                    ✓ Concluído
                  </span>
                )}
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

            // Temporary debug log: capture Supabase auth response to help debugging login issues.
            if (error) {
              console.warn('Supabase signInWithPassword error for', loginEmail, error);
            } else if (!data || !data.user) {
              console.warn('Supabase signInWithPassword no user returned for', loginEmail, { data });
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

        // Development helper: allow plaintext match when running locally
        if (process.env.NODE_ENV !== 'production') {
          const plainUser = localUsers.find(u => u.username === uname && u.passwordPlain && u.passwordPlain === password);
          if (plainUser) {
            setErro("");
            onLogin({ username: plainUser.username, role: plainUser.role, name: plainUser.name });
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
    <div className="landing-container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px", boxSizing: "border-box", width: "100%", maxWidth: "100vw", overflowX: "hidden" }}>
      {/* Composite background (hero + grid) placed as a single fixed element to ensure images show */}
      <div className="login-hero-composite" />
      <div style={{ position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(59,130,246,0.05) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div className="login-card login-box" style={{ position: "relative", zIndex: 1, background: "rgba(17,24,39,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24, width: "100%", maxWidth: 380, boxShadow: "0 24px 64px rgba(0,0,0,0.6)", boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
          {/* Badge image replaces the lock emoji. Place badge-small.png into /public */}
          <LoginBadge />
          <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: 0.5 }}>Flashcards PC-PE</h1>
          <p style={{ color: "#64748b", fontSize: 11, fontWeight: 600, marginTop: 8, letterSpacing: 2 }}>AGENTE DE POLÍCIA · PE</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, letterSpacing: 1.5, display: "block", marginBottom: 6 }}>USUÁRIO</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleFormSubmit()}
              placeholder="Digite seu usuário"
              style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px", color: "#f1f5f9", fontSize: 16, boxSizing: "border-box", outline: "none", transition: "border 0.2s", fontFamily: "inherit" }}
            />
          </div>
          <div>
            <label style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, letterSpacing: 1.5, display: "block", marginBottom: 6 }}>SENHA</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleFormSubmit()}
              placeholder="••••"
              style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px", color: "#f1f5f9", fontSize: 16, boxSizing: "border-box", outline: "none", transition: "border 0.2s", fontFamily: "inherit" }}
            />
          </div>

          {/* Optional: runtime Supabase connection (for local dev without NEXT_PUBLIC_ envs) */}
          {process.env.NODE_ENV !== 'production' && (
            <>
              <div style={{ marginTop: 6 }}>
                <label style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, letterSpacing: 1.5, display: "block", marginBottom: 6 }}>SUPABASE URL (opcional)</label>
                <input
                  type="text"
                  value={sbUrl}
                  onChange={e => { setSbUrl(e.target.value); try { localStorage.setItem('pcpe_supabase_url', e.target.value) } catch {} }}
                  placeholder="https://xyzcompany.supabase.co"
                  style={{ width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "8px 10px", color: "#94a3b8", fontSize: 12, boxSizing: "border-box", outline: "none" }}
                />
              </div>
              <div style={{ marginTop: 6 }}>
                <label style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, letterSpacing: 1.5, display: "block", marginBottom: 6 }}>SUPABASE ANON KEY (opcional)</label>
                <input
                  type="password"
                  value={sbKey}
                  onChange={e => { setSbKey(e.target.value); try { localStorage.setItem('pcpe_supabase_anon_key', e.target.value) } catch {} }}
                  placeholder="anon key"
                  style={{ width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "8px 10px", color: "#94a3b8", fontSize: 12, boxSizing: "border-box", outline: "none" }}
                />
              </div>
            </>
          )}

          {erro && <p style={{ color: "#ef4444", fontSize: 12, fontWeight: 500, margin: 0, textAlign: "center" }}>{erro}</p>}

          <button
            onClick={handleFormSubmit}
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
              marginTop: 6,
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

// Small component that renders the badge image with fallback to lock emoji
function LoginBadge() {
  // Note: put the badge image at public/badge-small.png
  const [failed, setFailed] = useState(false);
  if (failed) {
    // fallback to the emoji so the UI remains consistent even if the image is missing
    return <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>;
  }

  return (
    <img
      src="/icone-login.ico"
      alt="badge"
      onError={() => setFailed(true)}
      style={{ width: 56, height: 56, objectFit: 'contain', marginBottom: 12, display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
    />
  );
}

// ── COMPONENTE: SHELL / LAYOUT ──────────────────────────────────────────────
function Shell({ children, user, stats, onLogout }) {
  return (
    <div style={{ minHeight: "100vh", background: "#030712", padding: "24px 16px 48px", boxSizing: "border-box", position: "relative", width: "100%", maxWidth: "100vw", overflowX: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(59,130,246,0.01) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.01) 1px,transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(59,130,246,0.03) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 800, margin: "0 auto", boxSizing: "border-box" }}>
        {/* Topbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-block", background: "linear-gradient(135deg,#e11d48,#be123c)", borderRadius: 10, padding: "6px 14px" }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 9, letterSpacing: 2, fontFamily: "monospace" }}>PC-PE · AGENTE</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>
              {user.role === "admin" ? "👑" : "👤"} {user.name}
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

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
