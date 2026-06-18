/**
 * @file Arquivo central de tipos JSDoc para o projeto Flashcards PC-PE.
 * Uso: importar com `/** @typedef {import('../types').Nome} Nome *​/` no topo de cada arquivo.
 */

/**
 * Flashcard individual do banco.json
 * @typedef {Object} Flashcard
 * @property {string} id        Ex: "leg_estadual_0"
 * @property {string} pergunta
 * @property {string} resposta
 * @property {string} dica
 * @property {string} topico
 * @property {string} codigo_topico
 * @property {"facil"|"media"|"dificil"} dificuldade
 */

/**
 * Matéria (disciplina)
 * @typedef {Object} Materia
 * @property {string} id    Ex: "leg_estadual"
 * @property {string} label Ex: "Legislação Estadual"
 * @property {string} emoji Ex: "📋"
 * @property {string} color Ex: "#ef4444"
 */

/**
 * Usuário autenticado
 * @typedef {Object} AppUser
 * @property {string}  username
 * @property {"user"|"admin"} role
 * @property {string}  name
 * @property {number}  [expiresAt]  Timestamp ms para validar sessão
 */

/**
 * Estado SM-2 de um card (Spaced Repetition)
 * @typedef {Object} SM2State
 * @property {number} interval       Dias até próximo review
 * @property {number} repetition     Repetições consecutivas corretas
 * @property {number} ef             Fator de facilidade (1.3 – 3.0)
 * @property {number} dueDate        Timestamp ms do vencimento
 * @property {number} lastReviewed   Timestamp ms da última revisão
 */

/**
 * Dicionário de cardId → SM2State
 * @typedef {Object<string, SM2State>} SRSData
 */

/**
 * Resposta registrada no histórico
 * @typedef {Object} AnswerEntry
 * @property {string}   cardId
 * @property {string}   materia
 * @property {0|1|2|3}  resultado  0=erro, 1=difícil, 2=bom, 3=fácil
 * @property {number}   timestamp   ms
 */

/**
 * Configurações persistidas do usuário
 * @typedef {Object} UserSettings
 * @property {"random"|"easy_first"|"hard_first"} reviewOrder
 * @property {string[]} favorites  cardIds favoritados
 */

/**
 * Meta-dados do usuário (streak + escudos + carência)
 * @typedef {Object} UserMeta
 * @property {string}  username
 * @property {number}  current_streak
 * @property {string|null} last_study_date       "YYYY-MM-DD"
 * @property {number}  shields_available
 * @property {string|null} shields_exhausted_at  "YYYY-MM-DD" quando o 2º escudo acabou (início da carência de 7 dias)
 * @property {string}  [updated_at]               ISO string
 */

/**
 * Linha do pomodoro_log no Supabase
 * @typedef {Object} PomodoroLog
 * @property {string} username
 * @property {string} log_date   "YYYY-MM-DD"
 * @property {number} count
 * @property {string} [updated_at]
 */

/**
 * Estatísticas computadas (derivadas do SRS)
 * @typedef {Object} AppStats
 * @property {number} totalCards
 * @property {number} totalStudied
 * @property {number} dueCount
 * @property {number} newCount
 * @property {number} studiedToday
 * @property {number} streak
 * @property {Object<string, MateriaStats>} materiaStats
 */

/**
 * Estatísticas por matéria
 * @typedef {Object} MateriaStats
 * @property {number} total
 * @property {number} studied
 * @property {number} due
 * @property {number} new
 */

/**
 * Tick do Pomodoro (retornado pelo callback onTick)
 * @typedef {Object} PomodoroTick
 * @property {number}  timeLeft
 * @property {"idle"|"running"|"paused"} status
 * @property {number}  duration  Minutos configurados
 * @property {string}  formatted "MM:SS"
 */

/**
 * Payload retornado por POST /api/auth/login
 * @typedef {Object} LoginResponse
 * @property {boolean}  success
 * @property {AppUser}  user
 * @property {number}   expiresAt  Timestamp ms
 */

/**
 * Payload retornado por GET /api/auth/me
 * @typedef {Object} MeResponse
 * @property {boolean}  authenticated
 * @property {AppUser}  [user]
 */

/**
 * Usuário local do arquivo users.local.json
 * @typedef {Object} LocalUser
 * @property {string}  username
 * @property {string}  passwordHash  Hash bcrypt
 * @property {"user"|"admin"} role
 * @property {string}  name
 */

export default {};
