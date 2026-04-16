-- ============================================================
-- 004_fix_trigger_search_path.sql
-- handle_new_user 트리거 함수에 search_path 명시
-- SECURITY DEFINER 함수는 search_path를 설정하지 않으면
-- auth 스키마 컨텍스트에서 public 테이블을 찾지 못함
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.qasql_profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
