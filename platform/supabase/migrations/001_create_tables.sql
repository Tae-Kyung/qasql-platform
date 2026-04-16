-- ============================================================
-- 001_create_tables.sql
-- QA-SQL Platform 테이블 생성, 인덱스, 트리거
-- ============================================================

-- ── qasql_profiles ──────────────────────────────────────────
-- 신규 유저 가입 시 트리거로 자동 생성됨 (수동 INSERT 불필요)
CREATE TABLE qasql_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan       TEXT NOT NULL DEFAULT 'free'
               CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── qasql_projects ──────────────────────────────────────────
CREATE TABLE qasql_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description TEXT CHECK (char_length(description) <= 500),
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'active', 'error')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── qasql_project_configs ───────────────────────────────────
CREATE TABLE qasql_project_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES qasql_projects(id) ON DELETE CASCADE,
  db_type           TEXT CHECK (db_type IN ('sqlite', 'postgresql', 'mysql', 'supabase')),
  db_host           TEXT,
  db_port           INTEGER CHECK (db_port BETWEEN 1 AND 65535),
  db_name           TEXT,
  db_user           TEXT,
  db_password_enc   TEXT,
  supabase_url      TEXT,
  supabase_key_enc  TEXT,
  llm_provider      TEXT CHECK (llm_provider IN ('ollama', 'anthropic', 'openai')),
  llm_model         TEXT,
  llm_api_key_enc   TEXT,
  llm_base_url      TEXT,
  options           JSONB NOT NULL DEFAULT '{}',
  readable_names    JSONB NOT NULL DEFAULT '{}',
  schema_cache_path TEXT,
  schema_status     TEXT NOT NULL DEFAULT 'none'
                      CHECK (schema_status IN ('none', 'running', 'done', 'error')),
  schema_updated_at TIMESTAMPTZ,
  UNIQUE (project_id)
);

-- ── qasql_api_keys ──────────────────────────────────────────
CREATE TABLE qasql_api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES qasql_projects(id) ON DELETE CASCADE,
  key_hash     TEXT NOT NULL UNIQUE,
  key_prefix   TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at   TIMESTAMPTZ,
  ip_whitelist TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── qasql_query_logs ────────────────────────────────────────
CREATE TABLE qasql_query_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES qasql_projects(id) ON DELETE CASCADE,
  question             TEXT,
  hint                 TEXT,
  generated_sql        TEXT,
  confidence           FLOAT CHECK (confidence BETWEEN 0 AND 1),
  reasoning            TEXT,
  candidates_tried     INTEGER,
  candidates_succeeded INTEGER,
  executed             BOOLEAN NOT NULL DEFAULT FALSE,
  row_count            INTEGER,
  latency_ms           INTEGER,
  llm_tokens_used      INTEGER,
  success              BOOLEAN NOT NULL DEFAULT FALSE,
  error_code           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 인덱스 ──────────────────────────────────────────────────
CREATE INDEX idx_qasql_projects_user_id
  ON qasql_projects(user_id);

CREATE INDEX idx_qasql_project_configs_project_id
  ON qasql_project_configs(project_id);

CREATE INDEX idx_qasql_api_keys_project_id
  ON qasql_api_keys(project_id);

CREATE INDEX idx_qasql_api_keys_key_hash
  ON qasql_api_keys(key_hash);

CREATE INDEX idx_qasql_query_logs_project_id
  ON qasql_query_logs(project_id);

CREATE INDEX idx_qasql_query_logs_created_at
  ON qasql_query_logs(created_at DESC);

-- ── updated_at 자동 갱신 트리거 ─────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_qasql_profiles_updated_at
  BEFORE UPDATE ON qasql_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_qasql_projects_updated_at
  BEFORE UPDATE ON qasql_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 신규 유저 가입 시 qasql_profiles 자동 생성 ───────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO qasql_profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
