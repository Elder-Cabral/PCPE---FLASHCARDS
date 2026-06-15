-- Tabela para streak + escudos de ofensiva
CREATE TABLE IF NOT EXISTS user_meta (
  username TEXT PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  last_study_date DATE,
  shields_available INTEGER NOT NULL DEFAULT 2,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para registro de pomodoros concluidos
CREATE TABLE IF NOT EXISTS pomodoro_log (
  username TEXT NOT NULL,
  log_date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (username, log_date)
);
