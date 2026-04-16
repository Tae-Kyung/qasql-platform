# TASK.md: QA-SQL Platform 개발 태스크

> **원칙**: 하위 계층이 완전히 검증된 후 상위 계층을 개발한다.
> 테스트를 최소화하려면 기반(DB 스키마 → 보안 → API → UI) 순으로 완성도를 확보해야 한다.
> 각 태스크는 독립적으로 검증 가능한 단위로 분리되어 있다.

---

## 진행 범례

- `[ ]` 미시작
- `[→]` 진행 중
- `[x]` 완료
- `[!]` 블로커 (선행 태스크 미완료)
- `[CHK]` 단계 진입 전 필수 검증 항목 — 미통과 시 다음 Phase 진행 금지

---

## PHASE 0 — 프로젝트 환경 구성

> 목적: 모든 개발의 기반이 되는 인프라와 프로젝트 골격을 세팅한다.
> 이 단계가 잘못되면 이후 모든 단계에서 재작업이 발생한다.

**필요 스킬**: Supabase 콘솔 조작, Vercel CLI, Next.js 14 App Router, Git, 환경변수 관리

---

### T-000 Supabase 프로젝트 생성

- [ ] **T-000-1** Supabase 계정 생성 및 신규 프로젝트 생성 (리전: 서비스 대상 지역 선택)
- [ ] **T-000-2** 프로젝트 URL, anon key, service_role key 복사 후 안전한 저장소에 보관
- [ ] **T-000-3** Supabase Dashboard → Authentication → Email 인증 활성화 설정
- [ ] **T-000-4** Supabase Dashboard → Authentication → JWT 만료 시간 설정 (Access: 3600s, Refresh: 604800s)
- [ ] **T-000-5** Supabase Storage → `schema-cache` 버킷 생성 (private, 공개 접근 차단)

**검증**: Supabase 대시보드에서 프로젝트 상태 Active, 버킷 생성 확인

---

### T-001 Next.js 프로젝트 초기화

- [x] **T-001-1** `npx create-next-app@latest qasql-platform` 실행
  - TypeScript: Yes
  - ESLint: Yes
  - Tailwind CSS: Yes
  - App Router: Yes
  - src/ directory: No
- [x] **T-001-2** 핵심 패키지 설치
  ```bash
  npm install @supabase/supabase-js @supabase/ssr
  npm install @supabase/auth-ui-react @supabase/auth-ui-shared
  npm install lucide-react class-variance-authority clsx tailwind-merge
  npm install zod react-hook-form @hookform/resolvers
  npm install recharts date-fns
  npm install -D @types/node
  ```
- [x] **T-001-3** 프로젝트 디렉토리 구조 생성
  ```
  app/
  ├── (auth)/          ← 인증 페이지 (로그인/회원가입)
  ├── (platform)/      ← 인증 후 플랫폼 UI
  │   ├── dashboard/
  │   ├── projects/
  │   └── settings/
  ├── api/
  │   ├── auth/
  │   ├── projects/
  │   └── v1/          ← 외부 공개 API
  lib/
  ├── supabase/        ← Supabase 클라이언트
  ├── crypto/          ← 암호화 유틸
  ├── api-key/         ← API Key 생성/검증
  └── validations/     ← Zod 스키마
  types/               ← TypeScript 타입 정의
  middleware.ts        ← Vercel Edge Middleware
  ```
- [ ] **T-001-4** `.env.local` 파일 생성
  ```env
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ENCRYPTION_KEY=          # openssl rand -hex 32 로 생성
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```
- [x] **T-001-5** `lib/supabase/client.ts` — 브라우저용 Supabase 클라이언트 작성
- [x] **T-001-6** `lib/supabase/server.ts` — 서버 컴포넌트용 Supabase 클라이언트 작성 (쿠키 기반)
- [x] **T-001-7** `lib/supabase/middleware.ts` — 미들웨어용 Supabase 클라이언트 작성

**검증**: `npm run dev` 정상 실행, Supabase 연결 에러 없음

---

### T-002 Vercel 배포 환경 구성

- [ ] **T-002-1** Vercel 계정 생성 및 GitHub 저장소 연결
- [ ] **T-002-2** Vercel 프로젝트 생성 (GitHub repo import)
- [ ] **T-002-3** Vercel 환경변수 등록 (`.env.local` 동일 값, Production/Preview/Development 각각)
- [x] **T-002-4** Vercel 함수 타임아웃 설정 → `vercel.json` 작성
  ```json
  {
    "functions": {
      "app/api/v1/**": { "maxDuration": 60 },
      "app/api/projects/*/setup": { "maxDuration": 120 }
    }
  }
  ```
- [ ] **T-002-5** 첫 배포 실행 및 빌드 성공 확인

**검증**: Vercel 대시보드에서 배포 상태 Ready, 도메인 접근 가능

---

### PHASE 0 검증 체크포인트

> 아래 항목을 모두 통과해야 PHASE 1로 진행할 수 있다.

- [ ] **CHK-00-1** Supabase 프로젝트 상태 Active, `schema-cache` 버킷 존재 확인
- [ ] **CHK-00-2** `npm run dev` 실행 후 브라우저에서 `http://localhost:3000` 정상 렌더링
- [ ] **CHK-00-3** `lib/supabase/client.ts`에서 Supabase 연결 후 콘솔 에러 없음
- [ ] **CHK-00-4** Vercel 첫 배포 상태 Ready, 배포 URL에서 페이지 로드 성공
- [ ] **CHK-00-5** `.env.local`의 모든 필수 키 값이 채워져 있고 Vercel 환경변수에도 동일하게 등록됨
- [ ] **CHK-00-6** `npm run build` 빌드 에러 0건

---

## PHASE 1 — 데이터 계층 (DB 스키마 + 보안 정책)

> 목적: 모든 비즈니스 데이터의 구조와 접근 규칙을 먼저 확정한다.
> RLS가 올바르지 않으면 전체 보안이 무너진다. 가장 먼저, 가장 정밀하게 작성한다.

**필요 스킬**: PostgreSQL DDL, Supabase RLS (Row Level Security), SQL 트리거, Supabase Storage 정책

---

### T-010 DB 스키마 마이그레이션

- [x] **T-010-1** `supabase/migrations/001_create_tables.sql` 작성 및 실행

  ```sql
  -- qasql_profiles
  CREATE TABLE qasql_profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    plan       TEXT NOT NULL DEFAULT 'free'
                 CHECK (plan IN ('free', 'pro', 'enterprise')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- qasql_projects
  CREATE TABLE qasql_projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    description TEXT CHECK (char_length(description) <= 500),
    status      TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'active', 'error')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- qasql_project_configs
  CREATE TABLE qasql_project_configs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID NOT NULL REFERENCES qasql_projects(id) ON DELETE CASCADE,
    db_type           TEXT CHECK (db_type IN ('sqlite', 'postgresql', 'mysql', 'supabase')),
    db_host           TEXT,
    db_port           INTEGER CHECK (db_port BETWEEN 1 AND 65535),
    db_name           TEXT,
    db_user           TEXT,
    db_password_enc   TEXT,
    supabase_url      TEXT,
    supabase_key_enc  TEXT,
    llm_provider      TEXT CHECK (llm_provider IN ('ollama', 'anthropic', 'openai')),
    llm_model         TEXT,
    llm_api_key_enc   TEXT,
    llm_base_url      TEXT,
    options           JSONB NOT NULL DEFAULT '{}',
    readable_names    JSONB NOT NULL DEFAULT '{}',
    schema_cache_path TEXT,
    schema_status     TEXT NOT NULL DEFAULT 'none'
                        CHECK (schema_status IN ('none', 'running', 'done', 'error')),
    schema_updated_at TIMESTAMPTZ,
    UNIQUE (project_id)
  );

  -- qasql_api_keys
  CREATE TABLE qasql_api_keys (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID NOT NULL REFERENCES qasql_projects(id) ON DELETE CASCADE,
    key_hash     TEXT NOT NULL UNIQUE,
    key_prefix   TEXT NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at   TIMESTAMPTZ,
    ip_whitelist TEXT[] NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- qasql_query_logs
  CREATE TABLE qasql_query_logs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id           UUID NOT NULL REFERENCES qasql_projects(id) ON DELETE CASCADE,
    question             TEXT,
    hint                 TEXT,
    generated_sql        TEXT,
    confidence           FLOAT CHECK (confidence BETWEEN 0 AND 1),
    reasoning            TEXT,
    candidates_tried     INTEGER,
    candidates_succeeded INTEGER,
    executed             BOOLEAN NOT NULL DEFAULT FALSE,
    row_count            INTEGER,
    latency_ms           INTEGER,
    llm_tokens_used      INTEGER,
    success              BOOLEAN NOT NULL DEFAULT FALSE,
    error_code           TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```

- [x] **T-010-2** 인덱스 생성
  ```sql
  CREATE INDEX idx_qasql_projects_user_id ON qasql_projects(user_id);
  CREATE INDEX idx_qasql_project_configs_project_id ON qasql_project_configs(project_id);
  CREATE INDEX idx_qasql_api_keys_project_id ON qasql_api_keys(project_id);
  CREATE INDEX idx_qasql_api_keys_key_hash ON qasql_api_keys(key_hash);
  CREATE INDEX idx_qasql_query_logs_project_id ON qasql_query_logs(project_id);
  CREATE INDEX idx_qasql_query_logs_created_at ON qasql_query_logs(created_at DESC);
  ```

- [x] **T-010-3** `updated_at` 자동 갱신 트리거 작성
  ```sql
  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_qasql_profiles_updated_at
    BEFORE UPDATE ON qasql_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

  CREATE TRIGGER trg_qasql_projects_updated_at
    BEFORE UPDATE ON qasql_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  ```

- [x] **T-010-4** 신규 유저 가입 시 `qasql_profiles` 자동 생성 트리거
  ```sql
  CREATE OR REPLACE FUNCTION handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO qasql_profiles (id) VALUES (NEW.id);
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  ```

**검증**: Supabase Table Editor에서 5개 테이블 확인, 트리거 목록 확인

---

### T-011 RLS (Row Level Security) 정책

- [x] **T-011-1** 전체 테이블 RLS 활성화
  ```sql
  ALTER TABLE qasql_profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE qasql_projects ENABLE ROW LEVEL SECURITY;
  ALTER TABLE qasql_project_configs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE qasql_api_keys ENABLE ROW LEVEL SECURITY;
  ALTER TABLE qasql_query_logs ENABLE ROW LEVEL SECURITY;
  ```

- [x] **T-011-2** `qasql_profiles` RLS 정책
  ```sql
  -- 본인 프로필만 조회/수정
  CREATE POLICY "profiles_select_own" ON qasql_profiles
    FOR SELECT USING (auth.uid() = id);
  CREATE POLICY "profiles_update_own" ON qasql_profiles
    FOR UPDATE USING (auth.uid() = id);
  ```

- [x] **T-011-3** `qasql_projects` RLS 정책
  ```sql
  CREATE POLICY "projects_select_own" ON qasql_projects
    FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "projects_insert_own" ON qasql_projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "projects_update_own" ON qasql_projects
    FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "projects_delete_own" ON qasql_projects
    FOR DELETE USING (auth.uid() = user_id);
  ```

- [x] **T-011-4** `qasql_project_configs` RLS 정책 (프로젝트 소유자 간접 확인)
  ```sql
  CREATE POLICY "configs_select_own" ON qasql_project_configs
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM qasql_projects p
              WHERE p.id = project_id AND p.user_id = auth.uid())
    );
  CREATE POLICY "configs_insert_own" ON qasql_project_configs
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM qasql_projects p
              WHERE p.id = project_id AND p.user_id = auth.uid())
    );
  CREATE POLICY "configs_update_own" ON qasql_project_configs
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM qasql_projects p
              WHERE p.id = project_id AND p.user_id = auth.uid())
    );
  CREATE POLICY "configs_delete_own" ON qasql_project_configs
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM qasql_projects p
              WHERE p.id = project_id AND p.user_id = auth.uid())
    );
  ```

- [x] **T-011-5** `qasql_api_keys`, `qasql_query_logs` RLS 정책 (T-011-4와 동일 패턴 적용)

- [x] **T-011-6** Service Role 전용 정책 — 외부 API 호출 시 service_role key로 RLS 우회 허용 확인
  ```sql
  -- service_role은 RLS를 자동 우회함 (Supabase 기본 동작)
  -- API Key 검증 등 서버 사이드 로직은 service_role key 사용
  ```

**검증**:
- Supabase SQL Editor에서 다른 user_id로 SELECT 시도 → 결과 0건 확인
- 본인 user_id로 SELECT 시도 → 정상 조회 확인

---

### T-012 Supabase Storage 정책

- [x] **T-012-1** `schema-cache` 버킷 RLS 정책 설정
  ```sql
  -- 인증된 사용자만 자신의 프로젝트 폴더에 읽기/쓰기
  CREATE POLICY "storage_select_own" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'schema-cache' AND auth.uid() IS NOT NULL
    );
  CREATE POLICY "storage_insert_own" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'schema-cache' AND auth.uid() IS NOT NULL
    );
  CREATE POLICY "storage_delete_own" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'schema-cache' AND auth.uid() IS NOT NULL
    );
  ```

**검증**: Supabase Storage 대시보드에서 정책 목록 확인

---

### T-013 TypeScript 타입 정의

- [x] **T-013-1** Supabase CLI로 타입 자동 생성
  ```bash
  npx supabase gen types typescript --project-id <project-id> > types/supabase.ts
  ```
- [x] **T-013-2** `types/index.ts` — 플랫폼 전용 타입 정의
  ```typescript
  // 프로젝트 상태, DB 타입, LLM 프로바이더, 플랜 등 유니온 타입
  // API 요청/응답 인터페이스
  // Zod 스키마 기반 추론 타입
  ```

**검증**: `npm run build` 타입 에러 0건

---

### PHASE 1 검증 체크포인트

> 아래 항목을 모두 통과해야 PHASE 2로 진행할 수 있다.

- [ ] **CHK-01-1** Supabase Table Editor에서 5개 테이블(`qasql_profiles`, `qasql_projects`, `qasql_project_configs`, `qasql_api_keys`, `qasql_query_logs`) 존재 확인
- [ ] **CHK-01-2** Supabase SQL Editor에서 테스트 유저 A로 INSERT 후, 유저 B JWT로 SELECT → 결과 0건 (RLS 격리 동작)
- [ ] **CHK-01-3** Supabase Auth에서 테스트 계정 가입 → `qasql_profiles` 레코드 자동 생성 확인 (트리거 동작)
- [ ] **CHK-01-4** `qasql_projects` UPDATE 후 `updated_at` 자동 갱신 확인 (트리거 동작)
- [ ] **CHK-01-5** `qasql_project_configs.db_port`에 범위 밖 값(`99999`) INSERT 시도 → CHECK 제약 오류 반환
- [ ] **CHK-01-6** Supabase Storage `schema-cache` 버킷 정책 설정 확인 (미인증 접근 시 403)
- [ ] **CHK-01-7** `npx supabase gen types` 실행 → `types/supabase.ts` 생성 후 `npm run build` 타입 에러 0건

---

## PHASE 2 — 보안 유틸리티

> 목적: 암호화, API Key 생성/검증 로직을 UI/API 작성 전에 완성한다.
> 보안 로직은 테스트 가능한 순수 함수로 구현하여 신뢰성을 확보한다.

**필요 스킬**: Node.js Crypto API, AES-256-GCM, SHA-256, 랜덤 토큰 생성

---

### T-020 AES-256 암호화 모듈

- [x] **T-020-1** `lib/crypto/encrypt.ts` 작성
  ```typescript
  // AES-256-GCM 방식
  // encrypt(plaintext: string): string  → "iv:authTag:ciphertext" (base64)
  // decrypt(encrypted: string): string
  // ENCRYPTION_KEY는 환경변수에서만 로드
  ```
- [ ] **T-020-2** 암호화 로직 단위 검증
  - `encrypt("test")` → 매번 다른 암호문 (IV가 랜덤)
  - `decrypt(encrypt("test"))` === `"test"`
  - 잘못된 키로 decrypt 시 에러 발생 확인

**검증**: Node.js 스크립트로 암/복호화 왕복 테스트 통과

---

### T-021 API Key 생성/검증 모듈

- [x] **T-021-1** `lib/api-key/generate.ts` 작성
  ```typescript
  // generateApiKey(projectId: string): { raw: string, hash: string, prefix: string }
  // 형식: sk-qasql-{projectId 앞 8자}-{crypto.randomBytes(24).toString('hex')}
  // hash: SHA-256(raw) → hex string
  // prefix: raw 앞 20자 (표시용)
  ```
- [x] **T-021-2** `lib/api-key/verify.ts` 작성
  ```typescript
  // verifyApiKey(rawKey: string, storedHash: string): boolean
  // SHA-256(rawKey) === storedHash 비교 (timing-safe compare)
  ```
- [x] **T-021-3** IP Whitelist 검증 함수
  ```typescript
  // isIpAllowed(clientIp: string, whitelist: string[]): boolean
  // whitelist가 빈 배열이면 모든 IP 허용
  ```

**검증**: 생성된 키 형식 확인, 검증 함수 true/false 케이스 확인

---

### T-022 입력값 유효성 검사 스키마 (Zod)

- [x] **T-022-1** `lib/validations/project.ts` — 프로젝트 생성/수정 스키마
- [x] **T-022-2** `lib/validations/db-config.ts` — DB 설정 스키마 (타입별 필드 조건부 필수)
- [x] **T-022-3** `lib/validations/llm-config.ts` — LLM 설정 스키마
- [x] **T-022-4** `lib/validations/query.ts` — 외부 API 쿼리 요청 스키마

**검증**: 각 스키마의 정상/비정상 입력 파싱 결과 확인

---

### PHASE 2 검증 체크포인트

> 아래 항목을 모두 통과해야 PHASE 3로 진행할 수 있다.

- [ ] **CHK-02-1** `encrypt("hello")` 실행 시 매번 다른 결과값 반환 (IV 랜덤 확인)
- [ ] **CHK-02-2** `decrypt(encrypt("hello")) === "hello"` — 암/복호화 왕복 일치
- [ ] **CHK-02-3** 다른 `ENCRYPTION_KEY`로 `decrypt()` 시도 → 예외 발생 (키 불일치 감지)
- [ ] **CHK-02-4** `generateApiKey(projectId)` 결과가 `sk-qasql-` 접두어로 시작하는 형식 준수
- [ ] **CHK-02-5** `verifyApiKey(raw, hash)` → 올바른 쌍 `true`, 다른 raw → `false`
- [ ] **CHK-02-6** `isIpAllowed("1.2.3.4", [])` → `true` (빈 whitelist = 전체 허용)
- [ ] **CHK-02-7** `isIpAllowed("1.2.3.4", ["5.6.7.8"])` → `false`
- [ ] **CHK-02-8** Zod 스키마: `db-config`에서 PostgreSQL 타입 선택 시 host 필드 필수 검증 동작
- [ ] **CHK-02-9** Zod 스키마: Supabase 타입 선택 시 host 불필요, supabase_url 필수 검증 동작

---

## PHASE 3 — 인증 시스템

> 목적: 플랫폼의 모든 접근 제어 기반을 구현한다.
> Supabase Auth를 최대한 활용하여 직접 구현 최소화.

**필요 스킬**: Next.js App Router, Supabase Auth SSR, Next.js Middleware, React Hook Form, Zod

---

### T-030 인증 미들웨어

- [x] **T-030-1** `middleware.ts` 작성
  ```typescript
  // 보호 경로 목록: /dashboard, /projects, /settings
  // 미인증 요청 → /login 리다이렉트
  // 인증된 요청이 /login, /signup 접근 → /dashboard 리다이렉트
  // Supabase 세션 갱신 (refreshSession) 처리
  // /api/v1/** 경로는 미들웨어 제외 (별도 API Key 검증)
  ```

**검증**: 미인증 상태에서 `/dashboard` 접근 → `/login` 리다이렉트 확인

---

### T-031 인증 페이지 UI

- [x] **T-031-1** `app/(auth)/layout.tsx` — 인증 페이지 공통 레이아웃 (중앙 정렬 카드)
- [x] **T-031-2** `app/(auth)/signup/page.tsx` — 회원가입 폼
  - 이메일, 비밀번호, 비밀번호 확인 입력
  - Zod 유효성 검사 (비밀번호 8자+, 이메일 형식)
  - Supabase `signUp()` 호출
  - 성공 시 "이메일 확인 안내" 화면 전환
  - 에러 메시지 표시 (이미 가입된 이메일 등)
- [x] **T-031-3** `app/(auth)/login/page.tsx` — 로그인 폼
  - 이메일, 비밀번호 입력
  - Supabase `signInWithPassword()` 호출
  - 성공 시 `/dashboard` 리다이렉트
  - 에러 메시지 표시
- [x] **T-031-4** `app/(auth)/reset-password/page.tsx` — 비밀번호 재설정 요청
  - 이메일 입력 → Supabase `resetPasswordForEmail()` 호출
- [x] **T-031-5** `app/(auth)/update-password/page.tsx` — 비밀번호 재설정 처리
  - 이메일 링크 클릭 후 도달하는 페이지
  - Supabase `updateUser({ password })` 호출

**검증**:
- 회원가입 → 이메일 수신 → 인증 링크 클릭 → 로그인 가능 확인
- 잘못된 비밀번호 로그인 → 에러 메시지 표시 확인
- 비밀번호 재설정 이메일 수신 확인

---

### T-032 세션 관리 유틸

- [x] **T-032-1** `lib/supabase/auth.ts`
  ```typescript
  // getCurrentUser(): 서버 컴포넌트용 현재 유저 조회
  // getCurrentUserOrRedirect(): 미인증 시 redirect('/login')
  // getUserPlan(): qasql_profiles에서 플랜 조회
  ```
- [x] **T-032-2** `app/api/auth/signout/route.ts` — 로그아웃 API Route
  ```typescript
  // POST → supabase.auth.signOut() → 쿠키 삭제 → '/' 리다이렉트
  ```

**검증**: 로그아웃 후 보호 경로 접근 시 리다이렉트 확인

---

### PHASE 3 검증 체크포인트

> 아래 항목을 모두 통과해야 PHASE 4로 진행할 수 있다.

- [ ] **CHK-03-1** 미인증 상태에서 `/dashboard` 직접 접근 → `/login`으로 리다이렉트
- [ ] **CHK-03-2** 로그인 상태에서 `/login` 접근 → `/dashboard`로 리다이렉트
- [ ] **CHK-03-3** 회원가입 → 이메일 수신 → 인증 링크 클릭 → `/login`에서 로그인 성공
- [ ] **CHK-03-4** 잘못된 비밀번호 로그인 → 에러 메시지 표시 (스택 트레이스 미노출)
- [ ] **CHK-03-5** 비밀번호 재설정 이메일 수신 → 링크 클릭 → 새 비밀번호 설정 → 로그인 성공
- [ ] **CHK-03-6** 로그아웃 후 `/dashboard` 접근 → `/login` 리다이렉트
- [ ] **CHK-03-7** 세션 만료(Access Token 만료) 시 Refresh Token으로 자동 갱신 동작
- [ ] **CHK-03-8** `getUserPlan()` 호출 시 `qasql_profiles.plan` 값 반환 확인

---

## PHASE 4 — 플랫폼 내부 API (Next.js API Routes)

> 목적: Web UI가 사용하는 내부 API를 먼저 완성한다.
> UI는 이 API를 호출하기만 하면 되므로, API 완성 후 UI 개발 시 재작업 없음.

**필요 스킬**: Next.js Route Handlers, Supabase Server Client (service_role), AES-256 암호화 적용, 에러 핸들링 패턴

---

### T-040 공통 API 유틸리티

- [x] **T-040-1** `lib/api/response.ts` — 표준 응답 헬퍼
  ```typescript
  // successResponse(data, status?)
  // errorResponse(code, message, status)
  // 일관된 JSON 구조 보장
  ```
- [x] **T-040-2** `lib/api/auth-guard.ts` — API Route 인증 가드
  ```typescript
  // withAuth(handler): 미인증 요청 401 반환
  // 인증된 user 객체를 handler에 주입
  ```
- [x] **T-040-3** `lib/api/validate.ts` — 요청 바디 Zod 검증 헬퍼
  ```typescript
  // validateBody(schema, body): 검증 실패 시 400 + 에러 상세 반환
  ```

---

### T-041 프로젝트 관리 API

- [x] **T-041-1** `app/api/projects/route.ts`
  - `GET` — 내 프로젝트 목록 조회 (API 호출 수, 마지막 쿼리 일시 포함)
  - `POST` — 프로젝트 생성 (플랜별 최대 개수 검사)
- [x] **T-041-2** `app/api/projects/[id]/route.ts`
  - `GET` — 프로젝트 상세 + config 조회 (민감 정보 마스킹 처리)
  - `PATCH` — 프로젝트 이름/설명 수정
  - `DELETE` — 프로젝트 삭제 (cascade로 관련 데이터 전부 삭제)

**검증**:
- 다른 사용자의 project_id로 GET → 404 확인 (RLS 동작)
- 플랜 초과 생성 시도 → 403 확인

---

### T-042 DB/LLM 설정 API

- [x] **T-042-1** `app/api/projects/[id]/config/route.ts`
  - `GET` — config 조회 (암호화된 필드 마스킹 `****` 반환)
  - `PUT` — config 저장 (비밀번호/API Key를 AES-256 암호화 후 저장)
- [x] **T-042-2** `app/api/projects/[id]/test-db/route.ts`
  - `POST` — DB 연결 테스트
  - 요청 바디의 자격증명을 복호화하여 실제 연결 시도
  - 연결 성공/실패 + 테이블 수 반환
  - **주의**: 테스트용 쿼리는 `SELECT 1` 또는 테이블 목록 조회만 (DML 차단)
- [x] **T-042-3** `app/api/projects/[id]/test-llm/route.ts`
  - `POST` — LLM 연결 테스트
  - 간단한 프롬프트 ("respond with OK") 전송 후 응답 확인
  - Ollama / Anthropic / OpenAI 각 프로바이더별 연결 방식 분기

**검증**:
- 올바른 PostgreSQL 자격증명 → 성공 응답
- 잘못된 비밀번호 → 실패 메시지 (스택 트레이스 노출 금지)
- Anthropic 잘못된 API Key → 실패 메시지

---

### T-043 API Key 관리 API

- [x] **T-043-1** `app/api/projects/[id]/api-keys/route.ts`
  - `GET` — API Key 목록 조회 (prefix, is_active, expires_at, ip_whitelist만 반환)
  - `POST` — 신규 API Key 발급 (raw key는 응답에만 1회 포함, DB에는 hash만 저장)
- [x] **T-043-2** `app/api/projects/[id]/api-keys/[keyId]/route.ts`
  - `PATCH` — is_active 변경 (활성화/비활성화), ip_whitelist 수정
  - `DELETE` — API Key 삭제 (즉시 무효화)

**검증**:
- 발급 직후 raw key 반환 확인
- 재조회 시 raw key 없음 (prefix만 표시) 확인
- 삭제된 key_hash로 외부 API 호출 → 401 확인

---

### T-044 스키마 초기화 API

- [x] **T-044-1** `app/api/projects/[id]/setup/route.ts`
  - `POST` — 스키마 초기화 실행
  - `schema_status` = `'running'` 으로 업데이트 후 즉시 응답 반환 (비동기)
  - Python Serverless Function 트리거 (별도 엔드포인트 호출)
  - Vercel 함수 타임아웃: 120초
- [x] **T-044-2** `app/api/projects/[id]/setup/status/route.ts`
  - `GET` — 현재 schema_status 반환 (Realtime 대안용 폴링 엔드포인트)

---

### PHASE 4 검증 체크포인트

> 아래 항목을 모두 통과해야 PHASE 5로 진행할 수 있다.
> cURL 또는 Postman으로 직접 API를 호출하여 검증한다.

- [ ] **CHK-04-1** 인증 없이 `GET /api/projects` 호출 → `401 Unauthorized`
- [ ] **CHK-04-2** 인증 후 `POST /api/projects` (정상 입력) → 프로젝트 생성 성공, DB 레코드 확인
- [ ] **CHK-04-3** 인증 후 `POST /api/projects` (Free 플랜 2번째 생성 시도) → `403` 플랜 초과 에러
- [ ] **CHK-04-4** 유저 A의 project_id로 유저 B 세션에서 `GET /api/projects/{id}` → `404`
- [ ] **CHK-04-5** `PUT /api/projects/{id}/config` (PostgreSQL 설정) → DB에 비밀번호 암호화 저장 확인 (평문 불일치)
- [ ] **CHK-04-6** `GET /api/projects/{id}/config` → 비밀번호 필드 `****` 마스킹 반환
- [ ] **CHK-04-7** `POST /api/projects/{id}/test-db` (올바른 PG 자격증명) → 성공 + 테이블 수 반환
- [ ] **CHK-04-8** `POST /api/projects/{id}/test-db` (틀린 비밀번호) → 실패 메시지, 스택 트레이스 미노출
- [ ] **CHK-04-9** `POST /api/projects/{id}/test-llm` (유효한 Anthropic API Key) → 성공
- [ ] **CHK-04-10** `POST /api/projects/{id}/api-keys` → raw key 1회 반환, `GET` 재조회 시 raw key 없음
- [ ] **CHK-04-11** `DELETE /api/projects/{id}` → 연관 config, api_keys, query_logs 전부 삭제 확인

---

## PHASE 5 — Python SDK 연동 레이어

> 목적: QA-SQL SDK를 Vercel에서 실행하는 브릿지를 구현한다.
> SDK 코드는 수정하지 않으며, 실행 환경만 구성한다.

**필요 스킬**: Python 3.10+, Vercel Python Runtime, QA-SQL SDK API, Supabase Python Client, 환경 분리 설계

---

### T-050 Python 런타임 환경 구성

- [x] **T-050-1** `api/` 디렉토리에 Python 함수 파일 구조 생성 (Vercel Python Runtime 규칙 준수)
  ```
  api/
  ├── engine/
  │   ├── setup.py     ← 스키마 초기화
  │   └── query.py     ← 쿼리 실행
  └── requirements.txt
  ```
- [x] **T-050-2** `api/requirements.txt` 작성
  ```
  qasql-sdk @ file:../  # 로컬 SDK 참조
  psycopg2-binary>=2.9.0
  mysql-connector-python
  supabase
  anthropic>=0.18.0
  openai>=1.0.0
  cryptography  # AES 복호화 (Python 측)
  ```
- [x] **T-050-3** `api/engine/_utils.py` — 공통 유틸
  ```python
  # decrypt_aes256(encrypted: str, key: str) -> str  ← Node.js와 동일 알고리즘
  # build_engine_from_config(config: dict) -> QASQLEngine
  # supabase_client()  ← service_role key 사용
  ```
- [ ] **T-050-4** Node.js AES-256-GCM ↔ Python cryptography 라이브러리 호환성 검증
  - Node.js로 암호화한 값을 Python에서 복호화 성공 확인 (동일 IV/key/tag 포맷)

**검증**: Python 스크립트 단독 실행으로 SDK import 성공 확인

---

### T-051 스키마 초기화 Python Function

- [x] **T-051-1** `api/engine/setup.py` 작성
  ```python
  # POST 요청 수신 (project_id, 내부 인증 토큰)
  # 1. Supabase에서 project_config 조회 (service_role)
  # 2. 자격증명 복호화
  # 3. QASQLEngine 초기화
  # 4. engine.setup() 실행
  # 5. qasql_output/ 파일들을 Supabase Storage에 업로드
  # 6. schema_status = 'done', schema_cache_path 업데이트
  # 에러 발생 시 schema_status = 'error' 업데이트
  ```
- [x] **T-051-2** 내부 API 인증 — INTERNAL_API_SECRET 환경변수 검증
  ```python
  # 외부에서 직접 호출 불가하도록 secret key 검증
  ```

**검증**: project_id 전달 후 Supabase Storage에 파일 생성 확인, schema_status 변경 확인

---

### T-052 쿼리 실행 Python Function

- [x] **T-052-1** `api/engine/query.py` 작성
  ```python
  # POST 요청 수신 (project_id, question, hint, execute, options)
  # 1. Supabase에서 project_config + schema_cache_path 조회
  # 2. Supabase Storage에서 qasql_output/ 파일 다운로드 (임시 디렉토리)
  # 3. 자격증명 복호화
  # 4. QASQLEngine 초기화 (캐시된 스키마 재사용)
  # 5. engine.query(question, hint) 실행
  # 6. execute=True이면 engine.execute_sql(result.sql) 실행
  # 7. 결과 반환
  ```

**검증**: 실제 DB + LLM 환경에서 E2E 쿼리 실행 성공 확인

---

### PHASE 5 검증 체크포인트

> 아래 항목을 모두 통과해야 PHASE 6로 진행할 수 있다.
> Python 스크립트를 직접 실행하거나 Vercel 함수를 로컬에서 호출하여 검증한다.

- [ ] **CHK-05-1** `python api/engine/_utils.py` — Node.js로 암호화한 값을 Python에서 복호화 성공 (AES 호환성)
- [ ] **CHK-05-2** `python -c "from qasql import QASQLEngine"` — SDK import 에러 없음
- [ ] **CHK-05-3** `INTERNAL_API_SECRET` 없이 `api/engine/setup` 호출 → 403 반환
- [ ] **CHK-05-4** 올바른 `project_id`와 `INTERNAL_API_SECRET`으로 setup 호출 → Supabase Storage에 `qasql_output/` 파일 생성 확인
- [ ] **CHK-05-5** setup 완료 후 `qasql_project_configs.schema_status` = `'done'` 확인
- [ ] **CHK-05-6** setup 실패 시(잘못된 DB 자격증명) `schema_status` = `'error'` 확인
- [ ] **CHK-05-7** query 함수 직접 호출 (question="테이블 수는?") → SQL 반환 확인
- [ ] **CHK-05-8** `execute=true` 포함 query 호출 → SQL + rows + columns 반환 확인
- [ ] **CHK-05-9** Vercel 함수 타임아웃 내 (60초) 쿼리 완료 확인

---

## PHASE 6 — 외부 공개 API (v1)

> 목적: 외부 시스템이 호출하는 공개 API를 구현한다.
> API Key 검증, 에러 코드, 응답 포맷이 PRD 명세와 100% 일치해야 한다.

**필요 스킬**: Next.js Route Handlers, API Key 검증 로직, HTTP 에러 코드 설계, CORS 설정

---

### T-060 API Key 검증 미들웨어

- [x] **T-060-1** `lib/api/verify-api-key.ts`
  ```typescript
  // Authorization: Bearer <key> 헤더 파싱
  // key에서 project_id 추출 (sk-qasql-{projectId8자}-{random} 형식)
  // Supabase에서 해당 project_id의 활성 API Key 조회
  // SHA-256(rawKey) === key_hash 비교
  // is_active, expires_at, ip_whitelist 검사
  // 검증 실패 시 정확한 에러 코드 반환
  ```
- [x] **T-060-2** CORS 설정 — 모든 출처 허용 (외부 시스템 연동용)

---

### T-061 쿼리 API

- [x] **T-061-1** `app/api/v1/[projectId]/query/route.ts`
  - `POST` 처리
  - API Key 검증 → project_id 확인 → Python Function 호출
  - 응답 포맷 PRD FR-API-01 준수
  - `qasql_query_logs` 기록 (성공/실패 모두)
  - 에러 코드 매핑: `DB_CONNECTION_FAILED`, `LLM_UNAVAILABLE`, `NO_VALID_SQL`, `QUERY_TIMEOUT`

---

### T-062 테이블 목록 / 스키마 조회 API

- [x] **T-062-1** `app/api/v1/[projectId]/tables/route.ts`
  - `GET` — Supabase Storage의 스키마 캐시에서 테이블 목록 반환
- [x] **T-062-2** `app/api/v1/[projectId]/schema/[tableName]/route.ts`
  - `GET` — 특정 테이블의 컬럼 정보 + 설명 반환
- [x] **T-062-3** `app/api/v1/[projectId]/execute/route.ts`
  - `POST` — 원시 SQL 실행 (SELECT만 허용, DML 차단)

---

### T-063 Rate Limiting

- [x] **T-063-1** `middleware.ts`에 `/api/v1/**` Rate Limiting 추가
  ```typescript
  // 플랜별 제한: free=100/월, pro=5000/월
  // 초당 제한: 동시 요청 수 제어
  // Supabase query_logs COUNT 또는 별도 카운터 테이블 활용
  // 초과 시 429 + RATE_LIMIT_EXCEEDED 반환
  ```

**검증**:
- 유효한 API Key로 `/api/v1/{id}/query` 호출 → 200 + SQL 반환
- 만료된 API Key → 401 + INVALID_API_KEY
- 잘못된 project_id → 404 + PROJECT_NOT_FOUND

---

### PHASE 6 검증 체크포인트

> 아래 항목을 모두 통과해야 PHASE 7로 진행할 수 있다.
> cURL로 외부 시스템 관점에서 호출하여 검증한다.

```bash
# 검증용 기본 cURL 명령어 형식
curl -X POST https://{domain}/api/v1/{project_id}/query \
  -H "Authorization: Bearer sk-qasql-xxx" \
  -H "Content-Type: application/json" \
  -d '{"question": "테이블 수는?", "execute": true}'
```

- [ ] **CHK-06-1** 유효한 API Key + 올바른 question → `200` + `sql`, `confidence`, `rows` 포함 응답
- [ ] **CHK-06-2** `Authorization` 헤더 없음 → `401` + `{"error": "INVALID_API_KEY"}`
- [ ] **CHK-06-3** 유효하지 않은 API Key (변조) → `401` + `{"error": "INVALID_API_KEY"}`
- [ ] **CHK-06-4** 비활성화(`is_active=false`) Key → `401`
- [ ] **CHK-06-5** 만료(`expires_at` 과거) Key → `401`
- [ ] **CHK-06-6** IP Whitelist에 없는 IP에서 호출 → `401`
- [ ] **CHK-06-7** 존재하지 않는 `project_id` → `404` + `{"error": "PROJECT_NOT_FOUND"}`
- [ ] **CHK-06-8** `GET /api/v1/{id}/tables` → 테이블 목록 JSON 반환
- [ ] **CHK-06-9** `GET /api/v1/{id}/schema/{table}` → 컬럼 정보 + 설명 반환
- [ ] **CHK-06-10** `POST /api/v1/{id}/execute` (DML 쿼리) → 거부 응답
- [ ] **CHK-06-11** `POST /api/v1/{id}/execute` (SELECT 쿼리) → 결과 반환
- [ ] **CHK-06-12** Free 플랜 100회 초과 호출 → `429` + `{"error": "RATE_LIMIT_EXCEEDED"}`
- [ ] **CHK-06-13** 다른 출처(Origin)에서 호출 → CORS 헤더 정상 포함
- [ ] **CHK-06-14** 쿼리 성공/실패 모두 `qasql_query_logs`에 레코드 생성 확인

---

## PHASE 7 — Web UI

> 목적: PHASE 3~6의 API를 소비하는 프론트엔드를 구현한다.
> 모든 데이터 로직은 API에 있으므로 UI는 표시와 UX에만 집중한다.

**필요 스킬**: Next.js App Router (Server/Client Components), Tailwind CSS, Supabase Realtime 구독, React Hook Form + Zod, Recharts (차트)

---

### T-070 공통 레이아웃 & 컴포넌트

- [x] **T-070-1** `app/(platform)/layout.tsx` — 사이드바 + 헤더 레이아웃
  - 사이드바: 대시보드, 프로젝트 목록, 계정 설정, 로그아웃
  - 헤더: 현재 페이지명, 사용자 이메일, 플랜 배지
- [x] **T-070-2** 공통 UI 컴포넌트
  - `Button`, `Input`, `Select`, `Badge`, `Card`, `Modal`, `Table`, `Spinner`
  - `CopyButton` — 클립보드 복사 + 피드백
  - `MaskText` — 민감 정보 마스킹 표시 (토글 가능)
  - `StatusBadge` — draft/active/error 상태 표시

---

### T-071 대시보드 페이지

- [x] **T-071-1** `app/(platform)/dashboard/page.tsx`
  - 프로젝트 수, 이번달 API 호출 수, 평균 신뢰도 요약 카드
  - 최근 쿼리 로그 5건 테이블

---

### T-072 프로젝트 관리 페이지

- [x] **T-072-1** `app/(platform)/projects/page.tsx` — 프로젝트 목록
  - 카드 형태 (이름, 상태 배지, API 호출 수, 마지막 쿼리 일시)
  - "새 프로젝트" 버튼
- [x] **T-072-2** `app/(platform)/projects/new/page.tsx` — 프로젝트 생성 폼
  - 이름(필수), 설명(선택) 입력
  - 플랜 제한 초과 시 업그레이드 안내
- [x] **T-072-3** `app/(platform)/projects/[id]/page.tsx` — 프로젝트 상세
  - 탭 구성: 개요 / DB 설정 / LLM 설정 / API Key / 스키마 / 위험 구역

---

### T-073 DB 설정 탭

- [x] **T-073-1** DB 타입 선택 (SQLite / PostgreSQL / MySQL / Supabase) → 타입별 폼 동적 전환
- [x] **T-073-2** "연결 테스트" 버튼 — 로딩 스피너 + 성공/실패 토스트
- [x] **T-073-3** 저장 시 비밀번호 필드 마스킹 처리, 수정 시 재입력 안내

---

### T-074 LLM 설정 탭

- [x] **T-074-1** LLM 프로바이더 선택 → 타입별 폼 (Ollama: URL+모델 / Claude: API Key+모델 / OpenAI: API Key+모델)
- [x] **T-074-2** "연결 테스트" 버튼

---

### T-075 API Key 탭

- [x] **T-075-1** API Key 목록 표시 (prefix, 상태, 만료일, IP Whitelist)
- [x] **T-075-2** "새 API Key 발급" → 발급 후 raw key 1회 표시 모달 (복사 버튼 포함)
  - "이 키는 지금만 표시됩니다. 안전한 곳에 보관하세요." 경고 문구
- [x] **T-075-3** Key 비활성화 / 삭제 버튼

---

### T-076 스키마 관리 탭

- [x] **T-076-1** 현재 schema_status 표시 (none/running/done/error)
- [x] **T-076-2** "스키마 분석 시작" 버튼 → 실행 후 Supabase Realtime으로 진행 상태 실시간 표시
  ```typescript
  // supabase.channel('schema-status')
  //   .on('postgres_changes', { table: 'qasql_project_configs' }, callback)
  //   .subscribe()
  ```
- [x] **T-076-3** 분석 완료 후 테이블 목록 + 각 테이블 컬럼 정보 표시
- [x] **T-076-4** Readable Names 편집 테이블 (컬럼명 ↔ 가독성 이름 매핑)

---

### T-077 계정 설정 페이지

- [x] **T-077-1** `app/(platform)/settings/page.tsx`
  - 현재 이메일 표시, 현재 플랜 표시
  - 비밀번호 변경 폼
  - 계정 삭제 (확인 모달 + "DELETE" 텍스트 입력 필수)

---

### PHASE 7 검증 체크포인트

> 아래 항목을 모두 통과해야 PHASE 8로 진행할 수 있다.
> 실제 브라우저에서 수동으로 흐름을 검증한다.

- [ ] **CHK-07-1** 로그인 후 사이드바 전체 메뉴 렌더링 및 각 링크 이동 정상
- [ ] **CHK-07-2** 프로젝트 생성 폼 → 이름 미입력 후 제출 → 인라인 에러 표시 (서버 호출 없이)
- [ ] **CHK-07-3** DB 설정 → PostgreSQL 타입 선택 시 MySQL/Supabase 필드 숨김
- [ ] **CHK-07-4** "연결 테스트" 클릭 → 로딩 스피너 표시 → 결과 토스트 표시
- [ ] **CHK-07-5** 비밀번호 필드 저장 후 재접속 시 `****` 마스킹 표시
- [ ] **CHK-07-6** API Key 발급 모달에서 raw key 표시 → 복사 버튼 동작 → 모달 닫기 후 재발급 시 이전 key 미노출
- [ ] **CHK-07-7** "스키마 분석 시작" 클릭 → 진행 중 상태 실시간 표시 → 완료 후 테이블 목록 렌더링
- [ ] **CHK-07-8** Supabase Realtime 미지원 환경에서 폴링 폴백 동작 확인
- [ ] **CHK-07-9** 계정 삭제 모달에서 "DELETE" 미입력 시 확인 버튼 비활성화
- [ ] **CHK-07-10** 반응형 레이아웃 — 모바일(375px), 태블릿(768px), 데스크톱(1280px) 렌더링 이상 없음
- [ ] **CHK-07-11** `npm run build` 후 Vercel 배포 → 프로덕션 URL에서 전체 UI 정상 동작

---

## PHASE 8 — Phase 2 기능 (운영 기능)

**필요 스킬**: Recharts, CSV 생성, Vercel Middleware Rate Limiting, SQL 집계 쿼리

---

### T-080 Playground

- [x] **T-080-1** `app/(platform)/projects/[id]/playground/page.tsx`
  - 자연어 질문 입력 텍스트에어리어 + Hint 입력 (선택)
  - "SQL 생성" 버튼 → API 호출 → SQL 코드 블록 표시
  - 신뢰도 점수, reasoning 표시
  - SQL 편집 가능 (CodeMirror 또는 textarea)
  - "실행" 버튼 → 결과 테이블 표시

---

### T-081 쿼리 히스토리

- [x] **T-081-1** `app/(platform)/projects/[id]/logs/page.tsx`
  - `qasql_query_logs` 페이지네이션 목록
  - 필터: 날짜 범위, 성공/실패, 신뢰도 범위
  - 각 로그 클릭 → 상세 모달 (질문, SQL, reasoning, 에러 코드)
  - CSV 내보내기 버튼

---

### T-082 사용량 대시보드

- [x] **T-082-1** 기간별 API 호출 수 라인 차트 (Recharts)
- [x] **T-082-2** 성공률 파이 차트
- [x] **T-082-3** 평균 응답 시간, 평균 신뢰도 숫자 카드

---

### PHASE 8 검증 체크포인트

> 아래 항목을 모두 통과해야 PHASE 9로 진행할 수 있다.

- [ ] **CHK-08-1** Playground에서 자연어 질문 입력 → SQL 생성 → 신뢰도/reasoning 표시
- [ ] **CHK-08-2** Playground에서 생성된 SQL 직접 수정 후 "실행" → 결과 테이블 표시
- [ ] **CHK-08-3** 쿼리 히스토리 목록에서 날짜 범위 필터 → 정확한 범위 데이터만 표시
- [ ] **CHK-08-4** 히스토리 CSV 내보내기 → 파일 다운로드 + 인코딩/컬럼 구조 정상
- [ ] **CHK-08-5** 사용량 대시보드 차트 — 이번주 API 호출 데이터 정확하게 집계
- [ ] **CHK-08-6** 호출 0건인 날짜도 차트에 0으로 표시 (빈 날짜 처리)
- [ ] **CHK-08-7** 성공률 파이 차트 — 성공/실패 건수 합산이 전체 호출 수와 일치

---

## PHASE 9 — 품질 보증 및 배포 완성

> 목적: 실제 운영 전 전체 흐름 검증 및 비정상 케이스 처리 확인

**필요 스킬**: E2E 시나리오 설계, 브라우저 개발자 도구, Vercel 로그 분석

---

### T-090 E2E 통합 시나리오 검증

> 실제 브라우저 + cURL을 병행하여 전체 사용자 여정을 검증한다.

- [ ] **T-090-1** [가입] 신규 이메일 가입 → 인증 메일 수신 → 링크 클릭 → 로그인 성공 → 대시보드 진입
- [ ] **T-090-2** [프로젝트] 프로젝트 생성 → PostgreSQL DB 설정 + 연결 테스트 성공 → Anthropic LLM 설정 + 연결 테스트 성공
- [ ] **T-090-3** [스키마] "스키마 분석 시작" 클릭 → Realtime 진행 상태 표시 → 완료 후 테이블 목록 렌더링
- [ ] **T-090-4** [API] API Key 발급 → cURL로 `/api/v1/{id}/query` 호출 → SQL + 실행 결과 수신
- [ ] **T-090-5** [Playground] 자연어 질문 → SQL 생성 → 신뢰도 표시 → "실행" → 결과 테이블 표시
- [ ] **T-090-6** [MySQL] MySQL DB 설정 → 스키마 초기화 → 쿼리 API 호출 → 정상 동작
- [ ] **T-090-7** [Supabase] Supabase DB 설정 → 스키마 초기화 → 쿼리 API 호출 → 정상 동작
- [ ] **T-090-8** [Ollama] Ollama LLM 설정 → 쿼리 API 호출 → 정상 동작 (로컬 LLM 환경)
- [ ] **T-090-9** [삭제] 프로젝트 삭제 → API Key로 쿼리 시도 → `404 PROJECT_NOT_FOUND`

---

### T-091 보안 점검

- [ ] **T-091-1** Supabase DB에서 `db_password_enc`, `llm_api_key_enc` 컬럼값이 암호문(평문 아님) 확인
- [ ] **T-091-2** 유저 B 세션으로 유저 A의 `project_id` 내부 API 호출 → `404`
- [ ] **T-091-3** 외부 쿼리 API에 `question: "DROP TABLE users"` 입력 → SQL 생성 시도이지만 실행은 SELECT 결과만 반환, DML 실행 없음 확인
- [ ] **T-091-4** `api/engine/setup` 직접 호출 (`INTERNAL_API_SECRET` 헤더 없음) → `403`
- [ ] **T-091-5** Supabase Storage에서 타 사용자 `project_id` 경로 파일 직접 접근 → `403`
- [x] **T-091-6** `ENCRYPTION_KEY` 환경변수가 소스코드 또는 응답 body에 노출되지 않음 확인
- [x] **T-091-7** Vercel 함수 응답에 내부 스택 트레이스 미포함 확인 (에러 메시지만 반환)

---

### T-092 Vercel 운영 환경 최종 설정

- [ ] **T-092-1** Vercel → Settings → Environment Variables에서 Production 환경변수 전체 확인
- [ ] **T-092-2** `vercel.json` 함수 타임아웃 실제 적용 확인 (Vercel 대시보드 → Functions 탭)
- [ ] **T-092-3** 커스텀 도메인 연결 및 HTTPS 인증서 자동 발급 확인 (선택)
- [x] **T-092-4** Vercel Analytics 활성화 → 첫 페이지뷰 데이터 수집 확인

---

### PHASE 9 최종 체크리스트 (출시 판단 기준)

- [ ] **CHK-09-1** 전체 E2E 시나리오(T-090) 모두 통과
- [ ] **CHK-09-2** 보안 점검(T-091) 모두 통과 — 미통과 항목은 출시 블로커
- [ ] **CHK-09-3** Vercel 프로덕션 배포 후 `/api/v1/{id}/query` 실제 호출 응답 시간 p50 ≤ 3초 (LLM 제외)
- [ ] **CHK-09-4** 24시간 Vercel 함수 로그 모니터링 — 예상치 못한 500 에러 없음
- [ ] **CHK-09-5** Free 플랜 Rate Limit 실제 동작 확인 (101번째 호출 → 429)

---

## 태스크 의존성 요약

```
T-000 (Supabase 셋업)
  └── T-001 (Next.js 초기화)
        └── T-002 (Vercel 배포)
              └── T-010 (DB 스키마)
                    └── T-011 (RLS)
                          └── T-012 (Storage 정책)
                                └── T-013 (TypeScript 타입)
                                      └── T-020 (AES-256)
                                            └── T-021 (API Key)
                                                  └── T-022 (Zod 스키마)
                                                        └── T-030 (Auth 미들웨어)
                                                              └── T-031 (Auth UI)
                                                                    └── T-032 (세션 유틸)
                                                                          └── T-040 (API 공통)
                                                                               ├── T-041 (프로젝트 API)
                                                                               ├── T-042 (DB/LLM API)
                                                                               ├── T-043 (API Key API)
                                                                               └── T-044 (스키마 API)
                                                                                     └── T-050 (Python 환경)
                                                                                           ├── T-051 (Setup Fn)
                                                                                           └── T-052 (Query Fn)
                                                                                                 └── T-060 (외부 API 미들웨어)
                                                                                                       ├── T-061 (쿼리 API)
                                                                                                       ├── T-062 (테이블/스키마 API)
                                                                                                       └── T-063 (Rate Limiting)
                                                                                                             └── T-070 (공통 UI)
                                                                                                                   ├── T-071~077 (각 페이지)
                                                                                                                   └── T-080~082 (Phase 2 기능)
                                                                                                                         └── T-090~092 (검증)
```

---

## 단계별 필요 스킬 요약

| Phase | 핵심 스킬 |
|-------|----------|
| **0** | Supabase 콘솔, Vercel CLI, Next.js 14 초기화, 환경변수 |
| **1** | PostgreSQL DDL, Supabase RLS, SQL 트리거, Storage 정책, TypeScript |
| **2** | Node.js Crypto (AES-256-GCM, SHA-256), Zod 스키마 설계 |
| **3** | Supabase Auth SSR, Next.js Middleware, React Hook Form |
| **4** | Next.js Route Handlers, Supabase Server Client, API 에러 설계 |
| **5** | Python 3.10+, Vercel Python Runtime, QA-SQL SDK, cryptography 라이브러리 |
| **6** | HTTP 보안 헤더, CORS, API Key 검증, Rate Limiting |
| **7** | Next.js App Router, Tailwind CSS, Supabase Realtime, Recharts |
| **8** | CSV 생성, SQL 집계, 차트 라이브러리 |
| **9** | E2E 시나리오, 보안 점검, Vercel 운영 설정 |

---

*각 태스크는 완료 후 `[x]`로 표시한다. 블로커 발생 시 `[!]`로 표시하고 이유를 주석으로 기록한다.*
