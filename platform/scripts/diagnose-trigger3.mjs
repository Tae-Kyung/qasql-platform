/**
 * 트리거 우회 테스트 — 트리거 vs DB 문제 분리
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const { createClient } = await import("@supabase/supabase-js");
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("=== 트리거 우회 테스트 ===\n");

// email_confirm: false로 시도 — 동일하게 auth.users에 INSERT됨
const { data, error } = await admin.auth.admin.createUser({
  email: `bypass-${Date.now()}@example.com`,
  password: "Password123!",
  email_confirm: false,
});

console.log("email_confirm:false 결과:");
console.log("  user id:", data?.user?.id ?? null);
console.log("  error:", error?.message ?? null);

if (data?.user) {
  await new Promise(r => setTimeout(r, 800));
  const { data: profile } = await admin.from("qasql_profiles").select().eq("id", data.user.id).single();
  console.log("  qasql_profiles 생성:", profile ? `✅ (plan=${profile.plan})` : "❌ 없음");
  await admin.auth.admin.deleteUser(data.user.id);
  console.log("  정리 완료");
}

// phone 방식도 시도 (트리거 분리 확인)
console.log("\n=== 직접 auth.users 스타일 체크 ===");
console.log("Supabase project ref:", new URL(SUPABASE_URL).hostname.split(".")[0]);
