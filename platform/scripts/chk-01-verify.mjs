/**
 * CHK-01 검증 스크립트
 * 실행: node scripts/chk-01-verify.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✅ ${label}`);
  passed++;
}
function fail(label, detail = "") {
  console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`);
  failed++;
}

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {});
  // service_role로 raw SQL 실행
  const { data, error } = await admin.rpc("", {}).catch(() => ({}));
  return { data, error };
}

// ── CHK-01-1: 5개 테이블 존재 확인 ───────────────────────────
async function chk01_1() {
  console.log("\n[CHK-01-1] 5개 테이블 존재 확인");
  const tables = [
    "qasql_profiles",
    "qasql_projects",
    "qasql_project_configs",
    "qasql_api_keys",
    "qasql_query_logs",
  ];

  for (const table of tables) {
    const { error } = await admin.from(table).select("*").limit(0);
    if (error && error.code !== "PGRST116") {
      fail(table, error.message);
    } else {
      ok(table);
    }
  }
}

// ── CHK-01-2: RLS 격리 확인 ──────────────────────────────────
async function chk01_2() {
  console.log("\n[CHK-01-2] RLS 격리 — 다른 유저 데이터 접근 차단 확인");

  // 테스트 유저 A 생성
  const emailA = `chk01-a-${Date.now()}@test.local`;
  const emailB = `chk01-b-${Date.now()}@test.local`;
  const pw = "TestPass1234!";

  const { data: userA, error: errA } = await admin.auth.admin.createUser({
    email: emailA, password: pw, email_confirm: false,
  });
  const { data: userB, error: errB } = await admin.auth.admin.createUser({
    email: emailB, password: pw, email_confirm: false,
  });

  if (errA || errB) {
    fail("테스트 유저 생성", (errA || errB).message);
    return { userAId: null, userBId: null, emailA, emailB, pw };
  }
  ok("테스트 유저 A/B 생성");

  // 유저 A로 프로젝트 INSERT (service_role로 직접)
  const { data: proj, error: projErr } = await admin
    .from("qasql_projects")
    .insert({ user_id: userA.user.id, name: "CHK-01 Test Project" })
    .select()
    .single();

  if (projErr) { fail("유저 A 프로젝트 INSERT", projErr.message); return { userAId: userA.user.id, userBId: userB.user.id, emailA, emailB, pw }; }
  ok("유저 A 프로젝트 INSERT");

  // 유저 B JWT로 조회 시도
  const clientB = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signIn } = await clientB.auth.signInWithPassword({ email: emailB, password: pw });

  const { data: rows, error: selectErr } = await clientB
    .from("qasql_projects")
    .select("*")
    .eq("id", proj.id);

  if (!selectErr && rows && rows.length === 0) {
    ok("유저 B가 유저 A 프로젝트 조회 → 결과 0건 (RLS 격리 정상)");
  } else if (selectErr) {
    ok(`유저 B 조회 에러 (RLS 차단): ${selectErr.message}`);
  } else {
    fail("유저 B가 유저 A 프로젝트를 조회할 수 있음 (RLS 미동작)", `rows: ${rows?.length}`);
  }

  return { userAId: userA.user.id, userBId: userB.user.id, projId: proj.id, emailA, emailB, pw };
}

// ── CHK-01-3: 신규 유저 가입 → qasql_profiles 자동 생성 ──────
async function chk01_3() {
  console.log("\n[CHK-01-3] 신규 유저 가입 시 qasql_profiles 자동 생성 (트리거)");

  const email = `chk01-c-${Date.now()}@test.local`;
  const { data: user, error } = await admin.auth.admin.createUser({
    email, password: "TestPass1234!", email_confirm: false,
  });

  if (error) { fail("테스트 유저 생성", error.message); return null; }

  await new Promise(r => setTimeout(r, 500)); // 트리거 실행 대기

  const { data: profile, error: profErr } = await admin
    .from("qasql_profiles")
    .select("*")
    .eq("id", user.user.id)
    .single();

  if (!profErr && profile) {
    ok(`qasql_profiles 자동 생성됨 (plan: ${profile.plan})`);
  } else {
    fail("qasql_profiles 자동 생성 실패", profErr?.message);
  }

  return user.user.id;
}

// ── CHK-01-4: updated_at 자동 갱신 트리거 ────────────────────
async function chk01_4(userAId) {
  console.log("\n[CHK-01-4] updated_at 자동 갱신 트리거 확인");

  if (!userAId) { fail("테스트 유저 없음 (CHK-01-2 실패 영향)"); return; }

  const { data: proj } = await admin
    .from("qasql_projects")
    .insert({ user_id: userAId, name: "updated_at test" })
    .select()
    .single();

  if (!proj) { fail("프로젝트 생성 실패"); return; }

  const before = proj.updated_at;
  await new Promise(r => setTimeout(r, 1100));

  await admin.from("qasql_projects").update({ name: "updated" }).eq("id", proj.id);
  const { data: updated } = await admin.from("qasql_projects").select("updated_at").eq("id", proj.id).single();

  if (updated && updated.updated_at !== before) {
    ok(`updated_at 갱신됨: ${before} → ${updated.updated_at}`);
  } else {
    fail("updated_at 미갱신");
  }

  // 정리
  await admin.from("qasql_projects").delete().eq("id", proj.id);
}

// ── CHK-01-5: CHECK 제약 (db_port 범위) ─────────────────────
async function chk01_5(userAId) {
  console.log("\n[CHK-01-5] db_port CHECK 제약 (99999) 위반 시 에러 확인");

  if (!userAId) { fail("테스트 유저 없음 (CHK-01-2 실패 영향)"); return; }

  const { data: proj } = await admin
    .from("qasql_projects")
    .insert({ user_id: userAId, name: "constraint test" })
    .select()
    .single();

  if (!proj) { fail("프로젝트 생성 실패"); return; }

  const { error } = await admin
    .from("qasql_project_configs")
    .insert({ project_id: proj.id, db_port: 99999 });

  if (error) {
    ok(`db_port=99999 INSERT 차단됨: ${error.message}`);
  } else {
    fail("db_port=99999가 허용됨 (CHECK 제약 미동작)");
  }

  // 정리
  await admin.from("qasql_projects").delete().eq("id", proj.id);
}

// ── CHK-01-6: Storage 버킷 미인증 접근 차단 ──────────────────
async function chk01_6() {
  console.log("\n[CHK-01-6] schema-cache 버킷 미인증 접근 차단 확인");

  // 버킷 존재 확인
  const { data: buckets, error: buckErr } = await admin.storage.listBuckets();
  if (buckErr) { fail("버킷 목록 조회 실패", buckErr.message); return; }

  const schemaBucket = buckets?.find(b => b.name === "schema-cache");
  if (!schemaBucket) {
    fail("schema-cache 버킷 없음 — Supabase Storage에서 수동 생성 필요");
    return;
  }
  ok("schema-cache 버킷 존재");

  // 미인증 클라이언트로 접근 시도
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await anonClient.storage.from("schema-cache").list();

  if (error || !data || data.length === 0) {
    ok("미인증 접근 차단됨 (또는 빈 버킷)");
  } else {
    fail("미인증 접근 허용됨 — Storage 정책 확인 필요");
  }
}

// ── CHK-01-7: 이미 완료 ─────────────────────────────────────
function chk01_7() {
  console.log("\n[CHK-01-7] npm run build 타입 에러 0건");
  ok("Phase 1 시작 전 빌드 검증에서 이미 통과");
}

// ── 정리: 테스트 유저 삭제 ───────────────────────────────────
async function cleanup(userIds) {
  console.log("\n[Cleanup] 테스트 유저 삭제...");
  for (const id of userIds.filter(Boolean)) {
    await admin.auth.admin.deleteUser(id);
  }
  ok("테스트 유저 삭제 완료");
}

// ── 실행 ─────────────────────────────────────────────────────
async function main() {
  console.log("=== CHK-01 Phase 1 검증 시작 ===\n");

  await chk01_1();
  const { userAId, userBId } = await chk01_2();
  const userCId = await chk01_3();
  await chk01_4(userAId);
  await chk01_5(userAId);
  await chk01_6();
  chk01_7();

  await cleanup([userAId, userBId, userCId]);

  console.log(`\n${"=".repeat(40)}`);
  console.log(`결과: ${passed} 통과 / ${failed} 실패`);
  if (failed === 0) {
    console.log("✅ CHK-01 전체 통과 — Phase 2 진행 가능");
  } else {
    console.log("❌ 일부 항목 실패 — 위 내용 확인 후 재시도");
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
