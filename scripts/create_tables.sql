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

-- ── RLS: user_meta ──────────────────────────────────────────
ALTER TABLE user_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_meta_select" ON user_meta
  FOR SELECT USING (username = auth.jwt() ->> 'email');

CREATE POLICY "user_meta_insert" ON user_meta
  FOR INSERT WITH CHECK (username = auth.jwt() ->> 'email');

CREATE POLICY "user_meta_update" ON user_meta
  FOR UPDATE USING (username = auth.jwt() ->> 'email')
  WITH CHECK (username = auth.jwt() ->> 'email');

-- ── RLS: pomodoro_log ───────────────────────────────────────
ALTER TABLE pomodoro_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pomodoro_log_select" ON pomodoro_log
  FOR SELECT USING (username = auth.jwt() ->> 'email');

CREATE POLICY "pomodoro_log_insert" ON pomodoro_log
  FOR INSERT WITH CHECK (username = auth.jwt() ->> 'email');

CREATE POLICY "pomodoro_log_update" ON pomodoro_log
  FOR UPDATE USING (username = auth.jwt() ->> 'email')
  WITH CHECK (username = auth.jwt() ->> 'email');
