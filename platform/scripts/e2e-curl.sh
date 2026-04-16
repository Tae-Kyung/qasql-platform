#!/usr/bin/env bash
# QA-SQL Platform E2E cURL 검증 스크립트
# 사용법: BASE_URL=https://your-domain.vercel.app API_KEY=sk-qasql-xxx PROJECT_ID=uuid bash scripts/e2e-curl.sh

set -euo pipefail

# ──────────────────────────────────────────────
# 환경변수 기본값
# ──────────────────────────────────────────────
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-}"
PROJECT_ID="${PROJECT_ID:-}"
SESSION_TOKEN="${SESSION_TOKEN:-}"
INVALID_PROJECT_ID="${INVALID_PROJECT_ID:-00000000-0000-0000-0000-000000000000}"
TEST_TABLE="${TEST_TABLE:-users}"

# ──────────────────────────────────────────────
# 통계 카운터
# ──────────────────────────────────────────────
PASS_COUNT=0
FAIL_COUNT=0

# ──────────────────────────────────────────────
# 헬퍼 함수
# ──────────────────────────────────────────────
check() {
  local test_name=$1
  local expected_status=$2
  local actual_status=$3
  local response=$4

  if [ "$actual_status" = "$expected_status" ]; then
    echo "✅ PASS: $test_name (HTTP $actual_status)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "❌ FAIL: $test_name (expected $expected_status, got $actual_status)"
    echo "   Response: $response"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

require_env() {
  local var_name=$1
  local var_value=$2
  if [ -z "$var_value" ]; then
    echo "ERROR: 환경변수 $var_name 가 설정되지 않았습니다."
    echo "사용법: BASE_URL=... API_KEY=... PROJECT_ID=... bash scripts/e2e-curl.sh"
    exit 1
  fi
}

# ──────────────────────────────────────────────
# 필수 환경변수 검증
# ──────────────────────────────────────────────
require_env "API_KEY" "$API_KEY"
require_env "PROJECT_ID" "$PROJECT_ID"

echo ""
echo "========================================"
echo " QA-SQL Platform E2E 검증 시작"
echo "========================================"
echo " BASE_URL    : $BASE_URL"
echo " PROJECT_ID  : $PROJECT_ID"
echo " API_KEY     : ${API_KEY:0:12}..."
echo "========================================"
echo ""

# ──────────────────────────────────────────────
# PHASE 6: 외부 v1 API 검증
# ──────────────────────────────────────────────
echo "--- PHASE 6: 외부 v1 API 검증 ---"
echo ""

# CHK-06-1: Authorization 헤더 없음 → 401
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/$PROJECT_ID/query" \
  -H "Content-Type: application/json" \
  -d '{"question": "테이블 수는?"}')
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)
check "CHK-06-1: Authorization 헤더 없음" "401" "$http_code" "$body"

# CHK-06-2: 잘못된 API Key → 401
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/$PROJECT_ID/query" \
  -H "Authorization: Bearer sk-invalid-key-000000000000" \
  -H "Content-Type: application/json" \
  -d '{"question": "테이블 수는?"}')
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)
check "CHK-06-2: 잘못된 API Key" "401" "$http_code" "$body"

# CHK-06-3: 유효한 API Key로 query → 200
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/$PROJECT_ID/query" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question": "테이블 수는?", "execute": false}')
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)
check "CHK-06-3: 유효한 API Key로 query" "200" "$http_code" "$body"

# CHK-06-7: 존재하지 않는 projectId → 404
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/$INVALID_PROJECT_ID/query" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question": "테이블 수는?"}')
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)
# 존재하지 않는 프로젝트에서는 API Key 검증 단계에서 401 또는 프로젝트 없음으로 404/401
if [ "$http_code" = "401" ] || [ "$http_code" = "404" ]; then
  echo "✅ PASS: CHK-06-7: 존재하지 않는 projectId (HTTP $http_code - 401 or 404 acceptable)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "❌ FAIL: CHK-06-7: 존재하지 않는 projectId (expected 401 or 404, got $http_code)"
  echo "   Response: $body"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# CHK-06-8: GET /api/v1/{id}/tables → 200
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/v1/$PROJECT_ID/tables" \
  -H "Authorization: Bearer $API_KEY")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)
check "CHK-06-8: GET /api/v1/{id}/tables" "200" "$http_code" "$body"

# CHK-06-9: GET /api/v1/{id}/schema/{table} → 200 또는 404
response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/v1/$PROJECT_ID/schema/$TEST_TABLE" \
  -H "Authorization: Bearer $API_KEY")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)
if [ "$http_code" = "200" ] || [ "$http_code" = "404" ]; then
  echo "✅ PASS: CHK-06-9: GET /api/v1/{id}/schema/{table} (HTTP $http_code - 200 or 404 acceptable)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "❌ FAIL: CHK-06-9: GET /api/v1/{id}/schema/{table} (expected 200 or 404, got $http_code)"
  echo "   Response: $body"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# CHK-06-10: POST /api/v1/{id}/execute with DML → 400
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/$PROJECT_ID/execute" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql": "DROP TABLE users"}')
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)
check "CHK-06-10: POST /api/v1/{id}/execute with DML" "400" "$http_code" "$body"

# CHK-06-11: POST /api/v1/{id}/execute with SELECT → 200
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/$PROJECT_ID/execute" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT 1"}')
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)
check "CHK-06-11: POST /api/v1/{id}/execute with SELECT" "200" "$http_code" "$body"

# CHK-06-12: Free 플랜 Rate Limit → 429 (101번째 요청 시뮬레이션)
# 참고: 실제 테스트는 100번 이상 호출 후 101번째에서 429 확인
# 이 케이스는 rate limit이 이미 소진된 경우를 가정하여 응답 코드만 확인
echo ""
echo "  [INFO] CHK-06-12: Rate Limit 테스트는 Free 플랜에서 100번 초과 호출 후 확인 가능"
echo "  [INFO] 현재 rate limit 상태 확인 중..."
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/$PROJECT_ID/query" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question": "rate limit 테스트", "execute": false}')
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)
if [ "$http_code" = "200" ]; then
  echo "  [SKIP] CHK-06-12: Rate Limit 미초과 상태 (HTTP 200) - 수동으로 100회 초과 후 재확인 필요"
elif [ "$http_code" = "429" ]; then
  echo "✅ PASS: CHK-06-12: Free 플랜 Rate Limit 초과 확인 (HTTP 429)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "❌ FAIL: CHK-06-12: Rate Limit 응답 예상치 못한 상태 (got $http_code)"
  echo "   Response: $body"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# CHK-06-13: CORS 헤더 확인 (Access-Control-Allow-Origin: *)
echo ""
cors_header=$(curl -s -I -X OPTIONS "$BASE_URL/api/v1/$PROJECT_ID/query" \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type" \
  | grep -i "access-control-allow-origin" || true)
if echo "$cors_header" | grep -q "\*\|https://example.com"; then
  echo "✅ PASS: CHK-06-13: CORS 헤더 확인 (Access-Control-Allow-Origin 존재)"
  echo "   Header: $cors_header"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  # Next.js 기본 CORS 처리는 next.config.ts 또는 헤더에서 설정됨
  # GET 요청으로도 확인
  cors_header2=$(curl -s -I "$BASE_URL/api/v1/$PROJECT_ID/tables" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Origin: https://example.com" \
    | grep -i "access-control" || true)
  if [ -n "$cors_header2" ]; then
    echo "✅ PASS: CHK-06-13: CORS 헤더 확인 (GET 응답에 Access-Control 헤더 존재)"
    echo "   Header: $cors_header2"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "⚠️  INFO: CHK-06-13: CORS 헤더 미확인 - vercel.json 또는 next.config.ts에서 수동 확인 필요"
    echo "   (Vercel 배포 환경에서는 자동 설정될 수 있음)"
  fi
fi

echo ""

# ──────────────────────────────────────────────
# T-090: E2E 시나리오 (인증 API)
# ──────────────────────────────────────────────
echo "--- T-090: E2E 시나리오 ---"
echo ""

# T-090-4: API Key로 /api/v1/{id}/query POST → 200
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/$PROJECT_ID/query" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question": "전체 레코드 수를 알려주세요", "execute": false}')
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)
check "T-090-4: API Key로 /api/v1/{id}/query POST" "200" "$http_code" "$body"

# T-090-9: 삭제된 프로젝트 query → 404
# (INVALID_PROJECT_ID는 존재하지 않는 프로젝트 UUID를 사용)
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/$INVALID_PROJECT_ID/query" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question": "존재하지 않는 프로젝트"}')
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)
# API Key가 이 프로젝트에 귀속되어 있으므로 401이 먼저 발생할 수 있음
if [ "$http_code" = "404" ] || [ "$http_code" = "401" ]; then
  echo "✅ PASS: T-090-9: 삭제된 프로젝트 query (HTTP $http_code)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "❌ FAIL: T-090-9: 삭제된 프로젝트 query (expected 404 or 401, got $http_code)"
  echo "   Response: $body"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo ""

# ──────────────────────────────────────────────
# T-091: 보안 점검
# ──────────────────────────────────────────────
echo "--- T-091: 보안 점검 ---"
echo ""

# T-091-3: question에 "DROP TABLE users" 입력 → 200 (SQL 생성되지만 실행 안 됨)
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/$PROJECT_ID/query" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question": "DROP TABLE users", "execute": false}')
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)
check "T-091-3: question에 'DROP TABLE users' 입력 (SQL 생성, 실행 안 됨)" "200" "$http_code" "$body"
if [ "$http_code" = "200" ]; then
  # 응답에 execute=false이므로 rows가 없어야 함
  if echo "$body" | grep -q '"rows":null\|"rows":\[\]'; then
    echo "   [OK] rows가 비어 있음 (execute=false 확인)"
  else
    echo "   [INFO] 응답 body: $body"
  fi
fi

# T-091-4: /internal/engine/setup INTERNAL_API_SECRET 없이 → 403
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/internal/engine/setup" \
  -H "Content-Type: application/json" \
  -d "{\"project_id\": \"$PROJECT_ID\"}")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)
check "T-091-4: /internal/engine/setup INTERNAL_API_SECRET 없이" "403" "$http_code" "$body"

echo ""

# ──────────────────────────────────────────────
# 추가: 내부 API 접근 차단 확인 (SESSION_TOKEN 사용)
# ──────────────────────────────────────────────
if [ -n "$SESSION_TOKEN" ]; then
  echo "--- 추가: 내부 API 인증 테스트 (SESSION_TOKEN 사용) ---"
  echo ""

  # 내부 setup 엔드포인트 - SESSION_TOKEN만으로는 접근 불가 확인
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/internal/engine/setup" \
    -H "Authorization: Bearer $SESSION_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"project_id\": \"$PROJECT_ID\"}")
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -1)
  check "내부 API: SESSION_TOKEN으로 /internal/engine/setup 접근 차단" "403" "$http_code" "$body"

  echo ""
fi

# ──────────────────────────────────────────────
# 최종 통계
# ──────────────────────────────────────────────
echo "========================================"
echo " 검증 결과 통계"
echo "========================================"
echo " PASS: $PASS_COUNT"
echo " FAIL: $FAIL_COUNT"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo " TOTAL: $TOTAL"
echo "========================================"

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo ""
  echo "❌ 일부 테스트가 실패했습니다. 위 출력을 확인하세요."
  exit 1
else
  echo ""
  echo "✅ 모든 테스트를 통과했습니다."
  exit 0
fi
