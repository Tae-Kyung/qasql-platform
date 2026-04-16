-- ============================================================
-- 003_storage_policies.sql
-- QA-SQL Platform Supabase Storage 정책
-- schema-cache 버킷: 인증된 사용자만 접근 가능
-- ============================================================

-- 주의: 이 SQL은 Supabase Dashboard → Storage → Policies 에서 실행하거나
--       Supabase SQL Editor에서 직접 실행한다.
--       schema-cache 버킷이 먼저 생성되어 있어야 한다.

-- ── schema-cache 버킷 읽기 ──────────────────────────────────
CREATE POLICY "storage_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'schema-cache'
    AND auth.uid() IS NOT NULL
  );

-- ── schema-cache 버킷 쓰기 ──────────────────────────────────
CREATE POLICY "storage_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'schema-cache'
    AND auth.uid() IS NOT NULL
  );

-- ── schema-cache 버킷 덮어쓰기 ─────────────────────────────
CREATE POLICY "storage_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'schema-cache'
    AND auth.uid() IS NOT NULL
  );

-- ── schema-cache 버킷 삭제 ──────────────────────────────────
CREATE POLICY "storage_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'schema-cache'
    AND auth.uid() IS NOT NULL
  );
