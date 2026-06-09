"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import BANCO from "../data/banco.json";

// ── CONFIGURAÇÕES DOS USUÁRIOS ─────────────────────────────────────────────
const USERS = [
  { username: "elder",   password: "passei", role: "admin", name: "Elder" },
  { username: "helo",    password: "passei", role: "user",  name: "Helo" },
  { username: "dannilo", password: "passei", role: "user",  name: "Dannilo" },
];

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

  if (q > 0) {
    if (repetition === 0) {
      newInterval = 1;
    } else if (repetition === 1) {
      newInterval = q === 1 ? 2 : (q === 2 ? 4 : 6);
    } else {
      newInterval = Math.round(interval * ef);
    }
    newRepetition = repetition + 1;
  } else {
    newInterval = 1;
    newRepetition = 0;
  }

  // Ajuste do Fator de Facilidade (Ease Factor)
  if (q === 3) {
    newEf = Math.min(3.0, ef + 0.15);
  } else if (q === 1) {
    newEf = Math.max(1.3, ef - 0.15);
  } else if (q === 0) {
    newEf = Math.max(1.3, ef - 0.2);
  }

  return {
    interval: newInterval,
    repetition: newRepetition,
    ef: newEf,
    dueDate: Date.now() + newInterval * 24 * 60 * 60 * 1000,
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

const isReviewedToday = (timestamp) => {
  if (!timestamp) return false;
  return getLocalDateString(new Date(timestamp)) === getLocalDateString(new Date());
};

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [srsData, setSrsData] = useState({});
  const [selectedMateria, setSelectedMateria] = useState(null);
  const [showTopicSelector, setShowTopicSelector] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [studyMode, setStudyMode] = useState(null); // 'srs', 'all' ou 'topic'
  const [studyQueue, setStudyQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState({ studied: 0, gotWrong: 0, gotEasy: 0 });

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
        padding: 48px 36px;
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
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Carregar sessão e SRS do localStorage
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("pcpe_session");
      if (savedSession) {
        const user = JSON.parse(savedSession);
        if (USERS.find(u => u.username === user.username)) {
          setCurrentUser(user);
          const savedSRS = localStorage.getItem("pcpe_srs_" + user.username);
          if (savedSRS) setSrsData(JSON.parse(savedSRS));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleLogin = (user) => {
    try {
      localStorage.setItem("pcpe_session", JSON.stringify(user));
      const savedSRS = localStorage.getItem("pcpe_srs_" + user.username);
      setSrsData(savedSRS ? JSON.parse(savedSRS) : {});
      setCurrentUser(user);
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
      const dueCards = cards.filter(c => srsData[c.id] && srsData[c.id].dueDate <= Date.now());
      const newCards = cards.filter(c => !srsData[c.id]).slice(0, 15);
      queue = [...dueCards, ...newCards];
    }

    queue.sort(() => Math.random() - 0.5);

    setStudyQueue(queue);
    setCurrentQueueIndex(0);
    setIsFlipped(false);
    setStudyMode(mode);
    setSelectedMateria(materiaId);
    setSessionCompleted(false);
    setSessionStats({ studied: 0, gotWrong: 0, gotEasy: 0 });
  };

  // Preparar fila de estudos por Tópicos
  const startTopicStudySession = (topicsToStudy) => {
    const cards = BANCO[selectedMateria] || [];
    let queue = cards.filter(c => topicsToStudy.includes(c.topico));

    queue.sort(() => Math.random() - 0.5);

    setStudyQueue(queue);
    setCurrentQueueIndex(0);
    setIsFlipped(false);
    setStudyMode("topic");
    setSessionCompleted(false);
    setSessionStats({ studied: 0, gotWrong: 0, gotEasy: 0 });
    setShowTopicSelector(false);
  };

  // Responder a um card no modo SRS / Tópicos
  const handleCardFeedback = (q) => {
    const currentCard = studyQueue[currentQueueIndex];
    if (!currentCard) return;

    setSessionStats(prev => ({
      studied: prev.studied + 1,
      gotWrong: prev.gotWrong + (q === 0 ? 1 : 0),
      gotEasy: prev.gotEasy + (q === 3 ? 1 : 0)
    }));

    if (studyMode === "srs" || studyMode === "topic") {
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
    }

    if (currentQueueIndex + 1 < studyQueue.length) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentQueueIndex(prev => prev + 1);
      }, 200);
    } else {
      setSessionCompleted(true);
    }
  };

  if (!currentUser) {
    return <TelaLogin onLogin={handleLogin} />;
  }

  // Se estiver estudando
  if (studyMode && studyQueue.length > 0 && !sessionCompleted) {
    const currentCard = studyQueue[currentQueueIndex];
    const matInfo = MATERIAS.find(m => m.id === selectedMateria);

    return (
      <Shell user={currentUser} stats={stats} onLogout={handleLogout}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", maxWidth: 640, margin: "0 auto", boxSizing: "border-box" }}>
          {/* Header do Estudo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={() => {
                setStudyMode(null);
                setShowTopicSelector(false);
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
              <span style={{ color: matInfo?.color, fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
                {matInfo?.emoji} {matInfo?.label}
              </span>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500, marginTop: 2 }}>
                {studyMode === "srs" ? "ESTUDO INTELIGENTE (SM-2)" : studyMode === "topic" ? "ESTUDO POR TÓPICOS" : "MODO COMPLETO"}
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
                background: `linear-gradient(90deg, ${matInfo?.color}, #ffffff)`,
                transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            />
          </div>

          {/* Flashcard 3D */}
          <div
            onClick={() => !isFlipped && setIsFlipped(true)}
            style={{
              width: "100%",
              height: 320,
              cursor: isFlipped ? "default" : "pointer",
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
              <div className="custom-scrollbar flashcard-box flashcard-back-style" style={{ border: `1px solid ${matInfo?.color}40` }}>
                <div style={{ fontSize: 10, color: matInfo?.color, fontWeight: 600, letterSpacing: 3, marginBottom: 14 }}>✦ RESPOSTA ✦</div>
                
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
              studyMode === "srs" || studyMode === "topic" ? (
                // 4 Botões SM-2 com classe responsiva
                <div className="srs-buttons-grid">
                  <button
                    onClick={() => handleCardFeedback(0)}
                    className="btn-hover"
                    style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 14, padding: "14px 10px", cursor: "pointer", fontWeight: 600, fontSize: 12 }}
                  >
                    ❌ Errei
                  </button>
                  <button
                    onClick={() => handleCardFeedback(1)}
                    className="btn-hover"
                    style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 14, padding: "14px 10px", cursor: "pointer", fontWeight: 600, fontSize: 12 }}
                  >
                    ⚠️ Difícil
                  </button>
                  <button
                    onClick={() => handleCardFeedback(2)}
                    className="btn-hover"
                    style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 14, padding: "14px 10px", cursor: "pointer", fontWeight: 600, fontSize: 12 }}
                  >
                    👍 Bom
                  </button>
                  <button
                    onClick={() => handleCardFeedback(3)}
                    className="btn-hover"
                    style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 14, padding: "14px 10px", cursor: "pointer", fontWeight: 600, fontSize: 12 }}
                  >
                    ⚡ Fácil
                  </button>
                </div>
              ) : (
                // Botão Próximo Simples
                <button
                  onClick={() => {
                    if (currentQueueIndex + 1 < studyQueue.length) {
                      setIsFlipped(false);
                      setTimeout(() => setCurrentQueueIndex(prev => prev + 1), 200);
                    } else {
                      setSessionCompleted(true);
                    }
                  }}
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
        </div>
      </Shell>
    );
  }

  // Sessão de Estudos Completada
  if (sessionCompleted) {
    const matInfo = MATERIAS.find(m => m.id === selectedMateria);
    return (
      <Shell user={currentUser} stats={stats} onLogout={handleLogout}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "32px 20px", width: "100%", maxWidth: 480, margin: "0 auto", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24, boxSizing: "border-box" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏆</div>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 600, margin: 0 }}>Meta Diária Concluída!</h2>
          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5, marginTop: 8, marginBottom: 24 }}>
            Você revisou os cards programados de <strong>{matInfo?.label}</strong>. O progresso foi computado no algoritmo de repetição.
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
      {/* Cards de Métricas Gerais - Utiliza classe responsiva */}
      <div className="dashboard-metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 24, padding: 10, background: "rgba(239,68,68,0.1)", borderRadius: 14, color: "#ef4444" }}>🔥</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{stats.streak} {stats.streak === 1 ? 'dia' : 'dias'}</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, marginTop: 2 }}>OFENSIVA DE ESTUDOS</div>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 24, padding: 10, background: "rgba(59,130,246,0.1)", borderRadius: 14, color: "#3b82f6" }}>⚡</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{stats.dueCount}</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, letterSpacing: 0.5, marginTop: 2 }}>CARDS A REVISAR HOJE</div>
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

  const handleFormSubmit = () => {
    const user = USERS.find(
      u => u.username === username.toLowerCase().trim() && u.password === password
    );
    if (user) {
      setErro("");
      onLogin(user);
    } else {
      setErro("Usuário ou senha incorretos.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px", boxSizing: "border-box", width: "100%", maxWidth: "100vw", overflowX: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(59,130,246,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.02) 1px,transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(59,130,246,0.05) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div className="login-card" style={{ position: "relative", zIndex: 1, background: "rgba(17,24,39,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24, width: "100%", maxWidth: 380, boxShadow: "0 24px 64px rgba(0,0,0,0.6)", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
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
