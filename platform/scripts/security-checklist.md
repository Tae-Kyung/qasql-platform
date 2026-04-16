# QA-SQL Platform 보안/배포 수동 확인 체크리스트

> 자동화 스크립트(`e2e-curl.sh`)로 검증할 수 없는 항목들을 단계별로 확인한다.
> 확인 완료 시 각 항목 앞의 `[ ]`를 `[x]`로 변경한다.

---

## T-091: 보안 점검

### T-091-1: INTERNAL_API_SECRET 환경변수 노출 여부 확인

**목적**: `INTERNAL_API_SECRET`이 클라이언트 번들이나 공개 API 응답에 노출되지 않는지 확인한다.

**확인 방법**:
1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
   - `INTERNAL_API_SECRET`이 **Server-only** 또는 **Preview/Production** 환경에만 설정되어 있는지 확인
   - `NEXT_PUBLIC_` 접두어가 붙지 않았는지 확인 (붙어 있으면 즉시 수정)
2. 브라우저 개발자 도구 → Network 탭 → 임의 페이지 로드 후 JS 번들 파일 검색
   - `Ctrl+F`로 `INTERNAL_API_SECRET` 또는 시크릿 값 일부를 검색
   - 번들 내에 값이 포함되어 있으면 즉시 교체 필요

**체크 항목**:
- [ ] Vercel에서 `INTERNAL_API_SECRET`이 Server-only 변수로 설정됨
- [ ] `NEXT_PUBLIC_INTERNAL_API_SECRET` 형태의 변수가 없음
- [ ] 클라이언트 JS 번들에 시크릿 값이 포함되지 않음

---

### T-091-2: Supabase Row Level Security (RLS) 정책 확인

**목적**: `qasql_projects`, `qasql_project_configs`, `qasql_api_keys`, `qasql_query_logs` 테이블에 RLS가 활성화되어 있고 올바른 정책이 적용되어 있는지 확인한다.

**확인 방법**:
1. Supabase 대시보드 → Authentication → Policies
2. 각 테이블에서 아래 사항 확인:
   - **qasql_projects**: `user_id = auth.uid()` 조건으로 본인 소유 프로젝트만 접근 가능
   - **qasql_project_configs**: 프로젝트 소유자만 읽기/쓰기 가능
   - **qasql_api_keys**: 프로젝트 소유자만 읽기/쓰기 가능 (key_hash는 절대 SELECT 불가해야 함)
   - **qasql_query_logs**: 프로젝트 소유자만 읽기 가능
3. Supabase SQL Editor에서 RLS 활성화 여부 직접 확인:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename LIKE 'qasql_%';
   ```
   - `rowsecurity` 컬럼이 모두 `true`이어야 함

**체크 항목**:
- [ ] `qasql_projects` RLS 활성화 및 `user_id = auth.uid()` 정책 존재
- [ ] `qasql_project_configs` RLS 활성화 및 소유자 전용 접근 정책 존재
- [ ] `qasql_api_keys` RLS 활성화 및 `key_hash` 컬럼 외부 노출 차단
- [ ] `qasql_query_logs` RLS 활성화 및 소유자 전용 읽기 정책 존재
- [ ] Service Role Key는 서버 환경에서만 사용 (클라이언트에 노출 없음)

---

### T-091-3: question 필드 인젝션 차단 (자동 검증 보완)

**목적**: `question` 필드에 SQL 인젝션 또는 악의적인 문자열을 입력해도 직접 DB 실행이 이루어지지 않는지 확인한다.

**확인 방법**:
1. `e2e-curl.sh`의 T-091-3 테스트 결과에서 HTTP 200 응답 확인
2. 응답 body의 `sql` 필드에 LLM이 생성한 SQL이 있는지 확인 (있어도 정상 — execute=false)
3. `execute: true`로 재요청 시 DML이 포함된 SQL이 실행되는지 확인:
   ```bash
   curl -s -X POST "$BASE_URL/api/v1/$PROJECT_ID/query" \
     -H "Authorization: Bearer $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"question": "DROP TABLE users", "execute": true}'
   ```
   - LLM이 SELECT 문을 생성해야 하며, DROP 문이 실행되어서는 안 됨
4. Supabase 대시보드 → Table Editor에서 실제 테이블이 삭제되지 않았는지 확인

**체크 항목**:
- [ ] `execute: false`로 질문 전송 시 SQL만 반환되고 실행되지 않음
- [ ] `execute: true`여도 LLM이 SELECT 문만 생성
- [ ] 실제 DB 테이블이 손상되지 않음

---

### T-091-4: /internal/engine/setup 외부 접근 차단 (자동 검증 보완)

**목적**: 내부 엔진 엔드포인트가 `INTERNAL_API_SECRET` 없이는 절대 접근이 불가능한지 확인한다.

**확인 방법**:
1. `e2e-curl.sh`의 T-091-4 결과에서 HTTP 403 확인
2. 다양한 헤더로 우회 시도 확인:
   ```bash
   # x-internal-secret 헤더를 빈 값으로 전송
   curl -s -o /dev/null -w "%{http_code}" \
     -X POST "$BASE_URL/internal/engine/setup" \
     -H "x-internal-secret: " \
     -H "Content-Type: application/json" \
     -d "{\"project_id\": \"$PROJECT_ID\"}"
   # 예상: 403

   # x-internal-secret 헤더를 'null' 문자열로 전송
   curl -s -o /dev/null -w "%{http_code}" \
     -X POST "$BASE_URL/internal/engine/setup" \
     -H "x-internal-secret: null" \
     -H "Content-Type: application/json" \
     -d "{\"project_id\": \"$PROJECT_ID\"}"
   # 예상: 403
   ```
3. Vercel 대시보드 → Functions 로그에서 403 응답 기록 확인

**체크 항목**:
- [ ] 헤더 없이 호출 시 HTTP 403 반환
- [ ] 빈 헤더 값으로 호출 시 HTTP 403 반환
- [ ] 잘못된 시크릿으로 호출 시 HTTP 403 반환

---

### T-091-5: API Key 해시 저장 확인

**목적**: DB에 API Key 평문이 아닌 SHA-256 해시만 저장되어 있는지 확인한다.

**확인 방법**:
1. Supabase 대시보드 → Table Editor → `qasql_api_keys` 테이블
2. `key_hash` 컬럼 값이 64자리 hex 문자열인지 확인 (SHA-256 해시)
3. `key_hash` 값이 `sk-qasql-`로 시작하지 않는지 확인
4. Supabase SQL Editor에서:
   ```sql
   SELECT id, project_id, name, is_active, expires_at, created_at
   -- key_hash는 의도적으로 제외 (노출 최소화)
   FROM qasql_api_keys
   LIMIT 5;
   ```
   - RLS 정책으로 인해 서비스 계정이 아니면 조회 불가여야 함

**체크 항목**:
- [ ] `key_hash` 컬럼에 64자리 hex 문자열이 저장됨 (평문 없음)
- [ ] API Key 생성 응답에서 평문 키는 1회만 반환되고 이후 조회 불가
- [ ] RLS로 인해 다른 사용자의 API Key 조회 불가

---

## T-092: 배포 환경 점검

### T-092-1: Vercel 환경변수 누락 확인

**목적**: 배포 환경에서 필수 환경변수가 모두 올바르게 설정되어 있는지 확인한다.

**확인 방법**:
1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. 아래 변수가 **Production** 환경에 설정되어 있는지 확인:

| 변수명 | 용도 | 확인 방법 |
|--------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | `https://<project>.supabase.co` 형식인지 확인 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | `eyJ...` JWT 형식인지 확인 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 | Server-only 변수로 설정됨 |
| `INTERNAL_API_SECRET` | 내부 엔진 API 시크릿 | Server-only, 최소 32자 이상 |
| `NEXT_PUBLIC_APP_URL` | 앱 배포 URL | 실제 Vercel 도메인 (예: `https://qasql.vercel.app`) |
| `ENCRYPTION_KEY` | DB 자격증명 암호화 키 | Server-only, 32바이트 hex |

3. Vercel 배포 로그에서 환경변수 관련 오류 확인:
   - Vercel 대시보드 → Deployments → 최신 배포 → Build Logs

**체크 항목**:
- [ ] 모든 필수 환경변수가 Production 환경에 설정됨
- [ ] `NEXT_PUBLIC_` 변수는 클라이언트 노출이 허용된 값만 포함
- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 클라이언트 번들에 포함되지 않음
- [ ] `ENCRYPTION_KEY`가 `NEXT_PUBLIC_` 접두어 없이 설정됨

---

### T-092-2: Supabase Storage 버킷 접근 정책 확인

**목적**: `schema-cache` 스토리지 버킷이 공개 접근을 차단하고 서비스 롤로만 접근 가능한지 확인한다.

**확인 방법**:
1. Supabase 대시보드 → Storage → Buckets
2. `schema-cache` 버킷 설정 확인:
   - **Public bucket** 설정이 **OFF** (비공개)인지 확인
3. Storage Policies 탭에서:
   - Service Role만 읽기/쓰기 가능한 정책 확인
   - 익명 사용자(anon) 접근 정책이 없는지 확인
4. 직접 URL 접근 차단 확인:
   ```bash
   # 공개 URL로 직접 접근 시도 (403 또는 404 예상)
   curl -s -o /dev/null -w "%{http_code}" \
     "https://<project>.supabase.co/storage/v1/object/public/schema-cache/projects/<id>/qasql_output/schema.json"
   # 예상: 400 또는 403 (public 버킷 아님)
   ```

**체크 항목**:
- [ ] `schema-cache` 버킷이 비공개(Private) 설정
- [ ] 익명 사용자의 직접 URL 접근 차단됨
- [ ] Service Role Key를 통한 서버사이드 접근만 허용

---

### T-092-3: Vercel 함수 타임아웃 설정 확인

**목적**: Python 엔진 함수(Serverless Function)의 타임아웃이 적절하게 설정되어 있는지 확인한다.

**확인 방법**:
1. 프로젝트의 `vercel.json` 파일 확인:
   - `functions` 섹션에서 `/engine/handlers/*.py`의 `maxDuration` 값 확인
   - 권장값: 60초 (무거운 스키마 탐색 시) 또는 120초 (Pro 플랜 이상)
2. Vercel 대시보드 → Functions 탭에서 실제 실행 시간 모니터링
3. 타임아웃 발생 시 `e2e-curl.sh` 결과에서 503 응답 확인

**체크 항목**:
- [ ] `vercel.json`에 엔진 함수의 `maxDuration` 설정됨
- [ ] Free 플랜(10초) 한도 초과 시 Pro 플랜으로 업그레이드 또는 로직 최적화
- [ ] 클라이언트 타임아웃(60초)이 서버 타임아웃보다 짧게 설정됨

---

### T-092-4: 배포 후 헬스체크 확인

**목적**: 배포 완료 후 서비스가 정상적으로 동작하는지 기본 헬스체크를 수행한다.

**확인 방법**:
1. 배포 URL 접근 가능 여부:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" "$BASE_URL"
   # 예상: 200 또는 308 (리다이렉트)
   ```
2. API 기본 응답 확인:
   ```bash
   # 인증 없이 v1 API 접근 시 401 반환 확인 (서버 동작 중)
   curl -s -o /dev/null -w "%{http_code}" \
     -X POST "$BASE_URL/api/v1/health-check/query" \
     -H "Content-Type: application/json" \
     -d '{"question": "test"}'
   # 예상: 401
   ```
3. Vercel 대시보드 → Deployments에서 배포 상태 확인 (Ready 상태)
4. Vercel Analytics 또는 로그에서 첫 요청 에러 없는지 확인

**체크 항목**:
- [ ] 배포 URL 접근 시 200/308 응답
- [ ] API 엔드포인트 인증 없이 접근 시 401 응답 (서버 동작 확인)
- [ ] Vercel 대시보드에서 배포 상태 "Ready" 확인
- [ ] 첫 실제 사용자 요청 후 로그에 에러 없음

---

## 확인 완료 서명

| 항목 | 확인자 | 확인일 | 비고 |
|------|--------|--------|------|
| T-091-1 | | | |
| T-091-2 | | | |
| T-091-3 | | | |
| T-091-4 | | | |
| T-091-5 | | | |
| T-092-1 | | | |
| T-092-2 | | | |
| T-092-3 | | | |
| T-092-4 | | | |
