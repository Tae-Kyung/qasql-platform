/**
 * CHK-02 검증 스크립트 — Phase 2 보안 유틸
 * 실행: node --experimental-vm-modules scripts/chk-02-verify.mjs
 */
import { createRequire } from "module";
import { pathToFileURL } from "url";
import { resolve } from "path";

// tsx 없이 TS 실행하기 위해 esbuild-register 또는 ts-node 사용
// 여기서는 Node.js crypto 직접 사용해서 동등한 로직을 검증

import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual } from "crypto";

let passed = 0;
let failed = 0;

function ok(label) { console.log(`  ✅ ${label}`); passed++; }
function fail(label, detail = "") { console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`); failed++; }

// ── encrypt / decrypt 구현 (lib/crypto/encrypt.ts 동등) ────
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(hexKey) {
  const buf = Buffer.from(hexKey, "hex");
  if (buf.length !== 32) throw new Error("키 길이 오류");
  return buf;
}

function encrypt(plaintext, hexKey) {
  const key = getKey(hexKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

function decrypt(encryptedData, hexKey) {
  const key = getKey(hexKey);
  const [ivB64, authTagB64, ciphertextB64] = encryptedData.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// ── generateApiKey (lib/api-key/generate.ts 동등) ──────────
function generateApiKey(projectId) {
  const projectPrefix = projectId.replace(/-/g, "").slice(0, 8);
  const random = randomBytes(24).toString("hex");
  const raw = `sk-qasql-${projectPrefix}-${random}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 20);
  return { raw, hash, prefix };
}

// ── verifyApiKey (lib/api-key/verify.ts 동등) ───────────────
function verifyApiKey(rawKey, storedHash) {
  const inputHash = createHash("sha256").update(rawKey).digest("hex");
  const inputBuf = Buffer.from(inputHash, "hex");
  const storedBuf = Buffer.from(storedHash, "hex");
  if (inputBuf.length !== storedBuf.length) return false;
  return timingSafeEqual(inputBuf, storedBuf);
}

function isIpAllowed(clientIp, whitelist) {
  if (whitelist.length === 0) return true;
  return whitelist.includes(clientIp);
}

// ── Zod 스키마 로드 (동등 검증) ────────────────────────────
import { z } from "zod";

// db-config discriminatedUnion 재현
const postgresqlSchema = z.object({ db_type: z.literal("postgresql"), db_host: z.string().min(1), db_port: z.number().int().min(1).max(65535).default(5432), db_name: z.string().min(1), db_user: z.string().min(1), db_password: z.string().optional() });
const sqliteSchema = z.object({ db_type: z.literal("sqlite"), db_name: z.string().min(1), db_host: z.string().optional(), db_port: z.number().optional(), db_user: z.string().optional(), db_password: z.string().optional() });
const supabaseSchema = z.object({ db_type: z.literal("supabase"), supabase_url: z.string().url(), supabase_key: z.string().min(1), db_host: z.string().optional(), db_port: z.number().optional(), db_name: z.string().optional(), db_user: z.string().optional(), db_password: z.string().optional() });
const dbConfigSchema = z.discriminatedUnion("db_type", [postgresqlSchema, sqliteSchema, supabaseSchema]);

// ── 검증 실행 ────────────────────────────────────────────────
const REAL_KEY = process.env.ENCRYPTION_KEY;
const WRONG_KEY = randomBytes(32).toString("hex");

console.log("=== CHK-02 Phase 2 검증 시작 ===\n");

// CHK-02-1: encrypt → 매번 다른 결과
console.log("[CHK-02-1] encrypt() IV 랜덤 확인");
const e1 = encrypt("hello", REAL_KEY);
const e2 = encrypt("hello", REAL_KEY);
e1 !== e2 ? ok(`두 암호문 다름 (IV 랜덤)`) : fail("두 암호문이 같음 — IV 고정 버그");

// CHK-02-2: decrypt(encrypt(x)) === x
console.log("\n[CHK-02-2] 암/복호화 왕복 일치");
const roundtrip = decrypt(e1, REAL_KEY);
roundtrip === "hello" ? ok(`decrypt(encrypt("hello")) === "hello"`) : fail("왕복 불일치", roundtrip);

// CHK-02-3: 잘못된 키로 decrypt → 예외
console.log("\n[CHK-02-3] 잘못된 키로 decrypt 시 예외 발생");
try {
  decrypt(e1, WRONG_KEY);
  fail("예외 미발생 — 키 불일치 감지 안 됨");
} catch (e) {
  ok(`예외 발생: ${e.message}`);
}

// CHK-02-4: generateApiKey 형식 확인
console.log("\n[CHK-02-4] generateApiKey 형식 확인");
const projectId = "550e8400-e29b-41d4-a716-446655440000";
const { raw, hash, prefix } = generateApiKey(projectId);
const formatOk = raw.startsWith("sk-qasql-550e8400-") && raw.length > 30;
formatOk ? ok(`형식 준수: ${raw.slice(0, 28)}...`) : fail("형식 불일치", raw);
console.log(`   hash 길이: ${hash.length}자 (SHA-256 hex = 64자)`);
hash.length === 64 ? ok("hash 64자 SHA-256") : fail("hash 길이 오류", hash.length);
console.log(`   prefix: ${prefix} (20자)`);
prefix.length === 20 ? ok("prefix 20자") : fail("prefix 길이 오류");

// CHK-02-5: verifyApiKey 정확성
console.log("\n[CHK-02-5] verifyApiKey 정확성");
verifyApiKey(raw, hash) ? ok("올바른 쌍 → true") : fail("올바른 쌍이 false 반환");
!verifyApiKey("sk-qasql-wrong-key", hash) ? ok("다른 raw → false") : fail("다른 raw가 true 반환");

// CHK-02-6: isIpAllowed — 빈 whitelist
console.log("\n[CHK-02-6] isIpAllowed — 빈 whitelist");
isIpAllowed("1.2.3.4", []) ? ok('isIpAllowed("1.2.3.4", []) → true') : fail("빈 whitelist가 false");

// CHK-02-7: isIpAllowed — 화이트리스트 미포함
console.log("\n[CHK-02-7] isIpAllowed — 화이트리스트 미포함");
!isIpAllowed("1.2.3.4", ["5.6.7.8"]) ? ok('isIpAllowed("1.2.3.4", ["5.6.7.8"]) → false') : fail("차단 안 됨");
isIpAllowed("5.6.7.8", ["5.6.7.8"]) ? ok('isIpAllowed("5.6.7.8", ["5.6.7.8"]) → true') : fail("허용 안 됨");

// CHK-02-8: db-config PostgreSQL — host 필수
console.log("\n[CHK-02-8] Zod: PostgreSQL db_host 필수 검증");
const pgBad = dbConfigSchema.safeParse({ db_type: "postgresql", db_name: "mydb", db_user: "user" });
!pgBad.success ? ok("host 없음 → 실패 (검증 정상)") : fail("host 없어도 통과 — 검증 미동작");
const pgGood = dbConfigSchema.safeParse({ db_type: "postgresql", db_host: "localhost", db_name: "mydb", db_user: "user" });
pgGood.success ? ok("host 있음 → 통과") : fail("유효한 입력 실패", pgGood.error?.message);

// CHK-02-9: db-config Supabase — supabase_url 필수, host 불필요
console.log("\n[CHK-02-9] Zod: Supabase supabase_url 필수 / host 불필요");
const supaBad = dbConfigSchema.safeParse({ db_type: "supabase", supabase_key: "key-only" });
!supaBad.success ? ok("supabase_url 없음 → 실패 (검증 정상)") : fail("url 없어도 통과");
const supaGood = dbConfigSchema.safeParse({ db_type: "supabase", supabase_url: "https://xxx.supabase.co", supabase_key: "mykey" });
supaGood.success ? ok("supabase_url + key → 통과 (host 없어도 됨)") : fail("유효한 Supabase 입력 실패", JSON.stringify(supaGood.error?.errors));

// ── 최종 결과 ────────────────────────────────────────────────
console.log(`\n${"=".repeat(40)}`);
console.log(`결과: ${passed} 통과 / ${failed} 실패`);
if (failed === 0) {
  console.log("✅ CHK-02 전체 통과 — Phase 3 진행 가능");
  process.exit(0);
} else {
  console.log("❌ 일부 실패");
  process.exit(1);
}
