/**
 * 트리거 상세 진단
 * Supabase Management API로 함수 정의 확인
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// project ref 추출 (https://xxxxx.supabase.co → xxxxx)
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];

// Supabase Management API로 pg_proc 조회 (직접 DB 쿼리)
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/rpc/`,
  { method: "GET" }
);

// service_role로 직접 쿼리 테스트
const { createClient } = await import("@supabase/supabase-js");
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 현재 트리거 함수 존재 여부 확인
// qasql_profiles에 임시 ID로 직접 INSERT → 트리거 없이 service_role만으로 동작하는지 확인
console.log("=== 트리거 진단 ===\n");

// 1) service_role로 qasql_profiles 직접 INSERT 테스트 (auth.users에 없는 ID)
//    FK 위반이 나와야 정상
const fakeUUID = "11111111-1111-1111-1111-111111111111";
const { error: e1 } = await admin.from("qasql_profiles").insert({ id: fakeUUID });
console.log("1) service_role + 존재하지 않는 UUID INSERT:", e1?.message ?? "성공(예상치 못한 결과)");

// 2) auth 에러 상세 확인 — 더 단순한 이메일로 시도
const { data, error: authErr } = await admin.auth.admin.createUser({
  email: `test-${Date.now()}@example.com`,
  password: "Password123!",
  email_confirm: true,
});
console.log("\n2) createUser 결과:");
console.log("   data:", data?.user?.id ?? null);
console.log("   error code:", authErr?.code ?? null);
console.log("   error message:", authErr?.message ?? null);
console.log("   error status:", authErr?.status ?? null);

// 3) 만약 성공했다면 profiles 자동 생성 확인 후 삭제
if (data?.user) {
  await new Promise(r => setTimeout(r, 500));
  const { data: profile } = await admin.from("qasql_profiles").select().eq("id", data.user.id).single();
  console.log("\n3) qasql_profiles 자동 생성:", profile ? `✅ plan=${profile.plan}` : "❌ 없음");
  await admin.auth.admin.deleteUser(data.user.id);
  console.log("   테스트 유저 삭제 완료");
}
