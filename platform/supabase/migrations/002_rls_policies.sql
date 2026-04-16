-- ============================================================
-- 002_rls_policies.sql
-- QA-SQL Platform Row Level Security 정책
-- ============================================================

-- ── RLS 활성화 ───────────────────────────────────────────────
ALTER TABLE qasql_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE qasql_projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE qasql_project_configs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE qasql_api_keys         ENABLE ROW LEVEL SECURITY;
ALTER TABLE qasql_query_logs       ENABLE ROW LEVEL SECURITY;

-- ── qasql_profiles ──────────────────────────────────────────
-- 본인 프로필만 조회/수정 (INSERT는 트리거가 처리)
CREATE POLICY "profiles_select_own" ON qasql_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON qasql_profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── qasql_projects ──────────────────────────────────────────
CREATE POLICY "projects_select_own" ON qasql_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_own" ON qasql_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_own" ON qasql_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "projects_delete_own" ON qasql_projects
  FOR DELETE USING (auth.uid() = user_id);

-- ── qasql_project_configs ───────────────────────────────────
-- 프로젝트 소유자 여부를 qasql_projects 테이블에서 간접 확인
CREATE POLICY "configs_select_own" ON qasql_project_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM qasql_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "configs_insert_own" ON qasql_project_configs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM qasql_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "configs_update_own" ON qasql_project_configs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM qasql_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "configs_delete_own" ON qasql_project_configs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM qasql_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

-- ── qasql_api_keys ──────────────────────────────────────────
CREATE POLICY "api_keys_select_own" ON qasql_api_keys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM qasql_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "api_keys_insert_own" ON qasql_api_keys
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM qasql_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "api_keys_update_own" ON qasql_api_keys
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM qasql_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "api_keys_delete_own" ON qasql_api_keys
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM qasql_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

-- ── qasql_query_logs ────────────────────────────────────────
CREATE POLICY "query_logs_select_own" ON qasql_query_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM qasql_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "query_logs_insert_own" ON qasql_query_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM qasql_projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

-- query_logs는 UPDATE/DELETE 없음 (로그는 불변)
