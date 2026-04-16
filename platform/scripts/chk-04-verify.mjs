/**
 * CHK-04 검증 스크립트 — Phase 4 내부 API
 * npm run dev 실행 후 실행: node scripts/chk-04-verify.mjs
 */
const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const { createClient } = await import("@supabase/supabase-js");
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let passed = 0; let failed = 0;
function ok(label) { console.log(`  ✅ ${label}`); passed++; }
function fail(label, d = "") { console.log(`  ❌ ${label}${d ? " — " + d : ""}`); failed++; }

// 테스트용 유저 생성 + 세션 획득
async function createTestUser(suffix = "") {
  const email = `chk04-${suffix}-${Date.now()}@example.com`;
  const pw = "Password123!";
  const { data } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: false });
  await admin.auth.admin.updateUserById(data.user.id, { email_confirm: true });

  const anonClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session } = await anonClient.auth.signInWithPassword({ email, password: pw });
  return { userId: data.user.id, token: session.session?.access_token, anonClient };
}

async function api(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

console.log(`=== CHK-04 Phase 4 검증 (${BASE}) ===\n`);

// 유저 A, B 생성
const userA = await createTestUser("a");
const userB = await createTestUser("b");

let projectId = null;

// CHK-04-1: 미인증 → 401
console.log("[CHK-04-1] 미인증 GET /api/projects → 401");
const r1 = await api("GET", "/api/projects", null, null);
r1.status === 401 ? ok("401 반환") : fail("401 아님", r1.status);

// CHK-04-2: 프로젝트 생성
console.log("\n[CHK-04-2] POST /api/projects → 생성 성공");
const r2 = await api("POST", "/api/projects", { name: "CHK-04 Test" }, userA.token);
if (r2.status === 201 && r2.body.data?.id) {
  projectId = r2.body.data.id;
  ok(`프로젝트 생성 (id: ${projectId})`);
} else {
  fail("생성 실패", JSON.stringify(r2.body));
}

// CHK-04-3: Free 플랜 2번째 생성 → 403
console.log("\n[CHK-04-3] Free 플랜 2번째 프로젝트 생성 → 403");
const r3 = await api("POST", "/api/projects", { name: "2nd Project" }, userA.token);
r3.status === 403 ? ok("403 플랜 초과") : fail("403 아님", `status=${r3.status} ${JSON.stringify(r3.body)}`);

// CHK-04-4: 유저 B가 유저 A 프로젝트 조회 → 404
console.log("\n[CHK-04-4] 유저 B가 유저 A 프로젝트 GET → 404");
if (projectId) {
  const r4 = await api("GET", `/api/projects/${projectId}`, null, userB.token);
  r4.status === 404 ? ok("404 반환 (RLS 동작)") : fail("404 아님", r4.status);
}

// CHK-04-5: PUT config (PostgreSQL) → 비밀번호 암호화 저장
console.log("\n[CHK-04-5] PUT /api/projects/:id/config → 비밀번호 암호화 저장 확인");
if (projectId) {
  const r5 = await api("PUT", `/api/projects/${projectId}/config`, {
    db: { db_type: "postgresql", db_host: "localhost", db_name: "test", db_user: "user", db_password: "secret123" },
  }, userA.token);
  if (r5.status === 200) {
    // DB에서 직접 확인
    const { data: cfg } = await admin.from("qasql_project_configs").select("db_password_enc").eq("project_id", projectId).single();
    const isEncrypted = cfg?.db_password_enc && cfg.db_password_enc !== "secret123";
    isEncrypted ? ok("비밀번호 암호화 저장됨 (평문 불일치)") : fail("암호화 안 됨", cfg?.db_password_enc);
  } else {
    fail("config 저장 실패", JSON.stringify(r5.body));
  }
}

// CHK-04-6: GET config → 비밀번호 **** 마스킹
console.log("\n[CHK-04-6] GET /api/projects/:id/config → 비밀번호 **** 마스킹");
if (projectId) {
  const r6 = await api("GET", `/api/projects/${projectId}/config`, null, userA.token);
  const masked = r6.body.data?.db_password_enc === "****";
  masked ? ok('db_password_enc = "****" 마스킹') : fail("마스킹 안 됨", r6.body.data?.db_password_enc);
}

// CHK-04-10: API Key 발급 → raw key 1회 반환
console.log("\n[CHK-04-10] POST /api/projects/:id/api-keys → raw_key 1회 반환");
let keyId = null;
if (projectId) {
  const r10a = await api("POST", `/api/projects/${projectId}/api-keys`, {}, userA.token);
  if (r10a.status === 201 && r10a.body.data?.raw_key) {
    keyId = r10a.body.data.id;
    ok(`raw_key 반환: ${r10a.body.data.raw_key.slice(0, 24)}...`);
    // GET 재조회 시 raw_key 없음
    const r10b = await api("GET", `/api/projects/${projectId}/api-keys`, null, userA.token);
    const noRaw = r10b.body.data?.every(k => !k.raw_key);
    noRaw ? ok("재조회 시 raw_key 없음 (prefix만 표시)") : fail("재조회에서 raw_key 노출");
  } else {
    fail("API Key 생성 실패", JSON.stringify(r10a.body));
  }
}

// CHK-04-11: DELETE 프로젝트 → cascade 삭제
console.log("\n[CHK-04-11] DELETE /api/projects/:id → cascade 삭제");
if (projectId) {
  const r11 = await api("DELETE", `/api/projects/${projectId}`, null, userA.token);
  if (r11.status === 200) {
    const { data: chk } = await admin.from("qasql_projects").select("id").eq("id", projectId).single();
    const { data: cfgChk } = await admin.from("qasql_project_configs").select("id").eq("project_id", projectId).single();
    const { data: keyChk } = await admin.from("qasql_api_keys").select("id").eq("project_id", projectId);
    !chk ? ok("프로젝트 삭제됨") : fail("프로젝트 미삭제");
    !cfgChk ? ok("config cascade 삭제됨") : fail("config 미삭제");
    (!keyChk || keyChk.length === 0) ? ok("api_keys cascade 삭제됨") : fail("api_keys 미삭제");
  } else {
    fail("DELETE 실패", JSON.stringify(r11.body));
  }
}

// 정리
await admin.auth.admin.deleteUser(userA.userId);
await admin.auth.admin.deleteUser(userB.userId);

console.log(`\n${"=".repeat(40)}`);
console.log(`결과: ${passed} 통과 / ${failed} 실패`);
console.log("⏭ CHK-04-7~9 (test-db, test-llm): 실제 DB/LLM 환경 필요 — 별도 확인");
if (failed === 0) {
  console.log("✅ CHK-04 자동화 항목 전체 통과 — Phase 5 진행 가능");
} else {
  console.log("❌ 일부 실패");
  process.exit(1);
}
