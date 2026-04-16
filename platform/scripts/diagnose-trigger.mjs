import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Supabase REST RPC로 SQL 직접 실행
async function sql(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

// pg_trigger 확인
const triggers = await sql(`
  SELECT tgname, tgenabled, proname
  FROM pg_trigger t
  JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE tgname IN ('on_auth_user_created', 'trg_qasql_profiles_updated_at', 'trg_qasql_projects_updated_at')
`);
console.log("트리거 목록:", JSON.stringify(triggers, null, 2));

// handle_new_user 함수 소스 확인
const fn = await sql(`
  SELECT prosrc, prosecdef FROM pg_proc WHERE proname = 'handle_new_user'
`);
console.log("handle_new_user 함수:", JSON.stringify(fn, null, 2));

// RLS 상태 확인
const rls = await sql(`
  SELECT relname, relrowsecurity
  FROM pg_class
  WHERE relname IN ('qasql_profiles', 'qasql_projects', 'qasql_project_configs', 'qasql_api_keys', 'qasql_query_logs')
`);
console.log("RLS 상태:", JSON.stringify(rls, null, 2));

// service_role로 프로필 직접 INSERT 테스트
const testId = "00000000-0000-0000-0000-000000000001";
const { error: insertErr } = await admin.from("qasql_profiles").insert({ id: testId });
console.log("직접 INSERT 결과:", insertErr?.message ?? "성공");
if (!insertErr) await admin.from("qasql_profiles").delete().eq("id", testId);
