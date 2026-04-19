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

---

## PHASE 10 — QA-SQL 엔진 정확도 및 성능 향상 (Phase A: 즉시 적용)

> 목적: `qasql/` 파이프라인의 NL-to-SQL 정확도와 성능을 단계적으로 개선한다.
> 상세 분석: `research/future_study.md` 참조.
> Phase A는 기존 코드에 최소 변경으로 즉시 효과를 낼 수 있는 개선에 집중한다.
> **원칙**: 각 태스크 완료 후 기존 동작이 깨지지 않았는지 회귀 검증한다.

**필요 스킬**: Python, LLM 프롬프트 엔지니어링, SQL 방언 지식

---

### T-100 DB 방언(Dialect) 인식 프롬프트

> 참조: `future_study.md` §2.2.5
> 대상 파일: `qasql/core/prompts.py`, `qasql/core/generator.py`, `qasql/engine.py`

- [x] **T-100-1** `qasql/core/prompts.py`에 `DIALECT_HINTS` 딕셔너리 추가
  ```python
  DIALECT_HINTS = {
      "sqlite": "Use SQLite syntax. No FULL OUTER JOIN. Use || for string concatenation. Date functions: date(), strftime(). Use LIMIT (no FETCH/OFFSET syntax). CAST() for type conversion.",
      "postgresql": "Use PostgreSQL syntax. Use :: for type casting. String concat with ||. Date functions: DATE_TRUNC(), EXTRACT(), TO_CHAR(). Window functions supported. Use ILIKE for case-insensitive LIKE.",
      "mysql": "Use MySQL syntax. Use CONCAT() for string concatenation. Use LIMIT (not FETCH). Date functions: DATE_FORMAT(), DATEDIFF(), NOW(). Use backticks for reserved word escaping. No FULL OUTER JOIN.",
      "supabase": "Use PostgreSQL syntax (Supabase uses PostgreSQL). Use :: for type casting. String concat with ||. Date functions: DATE_TRUNC(), EXTRACT(), TO_CHAR(). Window functions supported.",
  }
  ```
- [x] **T-100-2** `PROMPTS` 딕셔너리의 `SYSTEM_BASE` 및 각 전략 `system` 프롬프트에 `{dialect_hint}` 플레이스홀더 추가
  - 기존 하드코딩된 system 프롬프트를 동적 포맷으로 변경
  - `SYSTEM_BASE` 끝에 `\n\nSQL Dialect: {dialect_hint}` 추가
- [x] **T-100-3** `CandidateGenerator.__init__()`에 `db_type` 파라미터 추가
  - `_generate_candidate()` 내부에서 `prompt_config["system"]`에 dialect hint 삽입
- [x] **T-100-4** `QASQLEngine.query()`에서 `CandidateGenerator` 생성 시 `self.config.db_type` 전달
  - `engine.py:402` 부근 `generator = CandidateGenerator(self.llm_client)` → `CandidateGenerator(self.llm_client, db_type=self.config.db_type)`
- [x] **T-100-5** `REFINEMENT_PROMPT`, `LAST_RESORT_PROMPT`에도 동일하게 dialect hint 삽입
  - `SQLExecutor.__init__()`에 `db_type` 파라미터 추가
  - `engine.py`에서 Executor 생성 시 `db_type` 전달

**검증**:
- SQLite DB로 쿼리 시 system 프롬프트에 "Use SQLite syntax" 포함 확인
- PostgreSQL DB로 쿼리 시 "Use PostgreSQL syntax" 포함 확인
- 기존 테스트 쿼리 회귀 — 정상 동작 확인

---

### T-101 샘플 데이터 프롬프트 포함

> 참조: `future_study.md` §2.2.4
> 대상 파일: `qasql/core/generator.py`, `qasql/core/prompts.py`

- [x] **T-101-1** `CandidateGenerator`에 `_format_with_samples()` 메서드 추가
  ```python
  def _format_with_samples(self, schema: dict) -> str:
      """Format schema with sample rows for LLM context."""
      lines = []
      for table_name, table_info in schema.items():
          lines.append(f"Table: {table_name}")
          for col in table_info.get("columns", []):
              col_str = f"  {col['name']} ({col.get('type', 'TEXT')})"
              # distinct_values가 있으면 값 예시 추가
              if col.get("distinct_values"):
                  vals = col["distinct_values"][:5]
                  col_str += f"  -- e.g., {', '.join(repr(v) for v in vals)}"
              lines.append(col_str)
          # sample_rows 추가 (최대 3행)
          samples = table_info.get("sample_rows", [])
          if samples:
              col_names = [c["name"] for c in table_info.get("columns", [])]
              lines.append(f"  Sample rows ({len(samples)}):")
              for row in samples[:3]:
                  row_str = ", ".join(f"{col_names[i]}={repr(v)}" for i, v in enumerate(row) if i < len(col_names))
                  lines.append(f"    ({row_str})")
          lines.append("")
      return "\n".join(lines)
  ```
- [x] **T-101-2** 새로운 전략 `SCHEMA_WITH_SAMPLES` 추가 또는 기존 `FULL_SCHEMA` 전략이 샘플 데이터를 포함하도록 변경
  - **결정**: 기존 `FULL_SCHEMA` 전략은 유지하고, `FULL_PROFILE` 전략에 샘플 데이터를 추가하는 방식 채택 (프롬프트 크기 관리)
  - `_generate_candidate()`에서 `FULL_PROFILE` 전략일 때 `_format_with_samples()` 사용
- [x] **T-101-3** `_format_with_profile()` → `_format_with_profile_and_samples()` 리팩터링
  - 기존 profile 정보 + 샘플 데이터 + distinct values 통합
  - 프롬프트 토큰 제한 고려: 테이블당 최대 3 sample rows, distinct values는 5개까지만
- [x] **T-101-4** `FOCUSED_SCHEMA` 전략에도 샘플 데이터 포함 옵션 추가
  - focused_schema에 해당하는 테이블의 sample_rows를 프롬프트에 삽입
  - `_format_focused_with_samples()` 메서드 추가

**검증**:
- 생성된 프롬프트에 sample rows 포함 확인 (로그 또는 디버그 출력)
- 날짜 포맷이 있는 DB에서 쿼리 시 올바른 날짜 형식 사용 확인
- 프롬프트 토큰 수가 모델 제한(llama3.2:3b = 128K) 이내 확인

---

### T-102 전략별 Temperature 차등 적용

> 참조: `future_study.md` §2.2.2
> 대상 파일: `qasql/core/prompts.py`, `qasql/core/generator.py`

- [x] **T-102-1** `qasql/core/prompts.py`의 각 `PROMPTS` 항목에 `temperature` 필드 추가
  ```python
  ContextStrategy.FULL_SCHEMA: {
      "name": "full_schema",
      "temperature": 0.0,    # 정밀한 기본 후보
      ...
  },
  ContextStrategy.SME_METADATA: {
      "name": "sme_metadata",
      "temperature": 0.0,    # hint 기반은 정확하게
      ...
  },
  ContextStrategy.MINIMAL_PROFILE: {
      "name": "minimal_profile",
      "temperature": 0.2,    # 약간의 다양성
      ...
  },
  ContextStrategy.FOCUSED_SCHEMA: {
      "name": "focused_schema",
      "temperature": 0.1,    # 미세 변동
      ...
  },
  ContextStrategy.FULL_PROFILE: {
      "name": "full_profile",
      "temperature": 0.3,    # 프로파일 기반 탐색
      ...
  },
  ```
- [x] **T-102-2** `CandidateGenerator._generate_candidate()` 수정
  - `generator.py:168` — `temperature=0.0` 하드코딩 → `temperature=prompt_config.get("temperature", 0.0)` 으로 변경
- [x] **T-102-3** 회귀 테스트: 동일 질문에 대해 5개 후보 SQL이 이전보다 더 다양한지 비교
  - 후보 SQL 간 편집 거리(Levenshtein distance) 계산하여 다양성 정량화

**검증**:
- `FULL_SCHEMA`(temp=0.0)과 `FULL_PROFILE`(temp=0.3)이 서로 다른 SQL 생성 확인
- 동일 질문 5회 반복 시 temp>0 전략에서 미세한 변동 발생 확인
- 기존 대비 후보 다양성(고유 SQL 수) 증가 확인

---

### T-103 누적 에러 히스토리 기반 리파인먼트

> 참조: `future_study.md` §2.3.2
> 대상 파일: `qasql/core/executor.py`, `qasql/core/prompts.py`

- [x] **T-103-1** `REFINEMENT_PROMPT`의 `user_template` 확장
  - `{error_history}` 플레이스홀더 추가
  ```python
  REFINEMENT_PROMPT = {
      "system": """...""",
      "user_template": """Original SQL:
  {sql}

  Current Error:
  {error}

  Previous Attempts (DO NOT repeat these mistakes):
  {error_history}

  Schema:
  {schema}

  Question: {question}

  Return only the corrected SQL query."""
  }
  ```
- [x] **T-103-2** `SQLExecutor._execute_with_retry()` 수정
  - `error_history: list[dict]` 누적 리스트 도입
  - 각 반복에서 `{"iteration": i, "sql": sql[:200], "error": error}` 를 히스토리에 추가
  - `_refine_sql()` 호출 시 히스토리 전달
  ```python
  def _execute_with_retry(self, candidate, nl_query, schema_str):
      sql = candidate.sql
      error_history = []

      for iteration in range(1, self.max_iterations + 1):
          try:
              # ... 실행 ...
          except Exception as e:
              error_history.append({
                  "iteration": iteration,
                  "sql": sql[:200],
                  "error": str(e)
              })
              if iteration < self.max_iterations:
                  refined_sql = self._refine_sql(
                      sql, str(e), schema_str, nl_query, error_history
                  )
  ```
- [x] **T-103-3** `SQLExecutor._refine_sql()` 시그니처 변경
  - `error_history` 파라미터 추가
  - 히스토리를 포맷팅하여 프롬프트에 삽입
  ```python
  def _refine_sql(self, sql, error, schema_str, nl_query, error_history=None):
      history_str = ""
      if error_history and len(error_history) > 1:
          history_str = "\n".join([
              f"Attempt {h['iteration']}: SQL='{h['sql'][:100]}...' → Error: {h['error'][:150]}"
              for h in error_history[:-1]  # 현재 에러 제외
          ])
      prompt = REFINEMENT_PROMPT["user_template"].format(
          sql=sql, error=error, error_history=history_str,
          schema=schema_str, question=nl_query
      )
  ```

**검증**:
- 의도적으로 잘못된 테이블명을 포함한 SQL에서 3회 리파인 시, 이전 에러와 동일한 실수 반복하지 않음 확인
- 리파인 로그에 히스토리 포함 확인

---

### T-104 Judge 실행 결과 기반 판단

> 참조: `future_study.md` §2.4.1
> 대상 파일: `qasql/core/judge.py`, `qasql/core/prompts.py`

- [x] **T-104-1** `JUDGE_PROMPT`의 `system` 프롬프트 확장
  - 실행 결과 정보를 평가 기준에 추가
  ```python
  JUDGE_PROMPT = {
      "system": """You are a Senior SQL Reviewer. Your job is to select the BEST SQL query from multiple candidates.

  Evaluate each candidate based on:
  1. Correctness - Does it answer the question?
  2. Result shape - Does the number of rows/columns make sense for the question?
     - Aggregation questions should return few rows
     - List questions should return multiple rows
     - Count questions should return a single number
  3. Completeness - Does it include all required columns?
  4. Efficiency - Is it well-structured?
  5. Result data - Do the sample output values look reasonable?

  Return your selection in JSON format:
  {
      "selected_id": <candidate_id>,
      "confidence": <0.0-1.0>,
      "reasoning": "<brief explanation>"
  }""",
      ...
  }
  ```
- [x] **T-104-2** `SQLJudge._llm_judge()` 메서드 수정 — 후보 텍스트에 실행 결과 요약 추가
  ```python
  def _llm_judge(self, successful, nl_query, hint, total_candidates):
      candidates_text = []
      for candidate, exec_result in successful:
          text = f"Option {candidate.candidate_id} ({candidate.strategy_name}):\n"
          text += f"SQL: {exec_result.sql}\n"
          # 실행 결과 요약 추가
          row_count = len(exec_result.rows) if exec_result.rows else 0
          text += f"Result: {row_count} rows, columns: {exec_result.columns}\n"
          if exec_result.rows and len(exec_result.rows) > 0:
              # 첫 3행만 샘플로 포함 (데이터 크기 제한)
              sample_rows = exec_result.rows[:3]
              text += f"Sample output:\n"
              for row in sample_rows:
                  text += f"  {row}\n"
          candidates_text.append(text)
  ```
- [x] **T-104-3** `SQLJudge.judge()` 시그니처는 변경 불필요 — `execution_results`에 이미 `rows`, `columns` 포함
  - `ExecutionResult.rows`가 너무 클 때(>100행) 잘라내는 안전장치 추가
  ```python
  # 결과 요약 시 최대 행 수 제한
  MAX_SAMPLE_ROWS_FOR_JUDGE = 5
  MAX_ROW_STR_LENGTH = 200  # 각 행의 문자열 길이 제한
  ```
- [x] **T-104-4** Judge 프롬프트에 "질문 유형 힌트" 추가
  - 집계 질문이면 "This appears to be an aggregation question — expect few rows"
  - 목록 질문이면 "This appears to be a listing question — expect multiple rows"
  - 쿼리 분해 단계(`schema_agent._decompose_query()`)의 결과를 Judge에게도 전달

**검증**:
- "총 매출 합계는?" 질문 → 1행 반환하는 후보 선택 확인 (vs 전체 행 반환 후보)
- "모든 고객 목록" 질문 → 다수 행 반환하는 후보 선택 확인
- Judge 프롬프트에 실행 결과 포함 확인 (로그)

---

### PHASE 10 검증 체크포인트

> 아래 항목을 모두 통과해야 PHASE 11로 진행할 수 있다.

- [ ] **CHK-10-1** SQLite DB 쿼리 시 프롬프트에 "Use SQLite syntax" 포함, PostgreSQL 시 "Use PostgreSQL syntax" 포함
- [ ] **CHK-10-2** 프롬프트에 sample rows 및 distinct values 포함 (FULL_PROFILE 전략에서)
- [ ] **CHK-10-3** 5개 후보 SQL 중 최소 2개가 서로 다른 SQL 생성 (Temperature 다양성)
- [ ] **CHK-10-4** 리파인 3회차 프롬프트에 1, 2회차 에러 히스토리 포함
- [ ] **CHK-10-5** Judge 프롬프트에 "Result: N rows, columns: [...]" 정보 포함
- [ ] **CHK-10-6** 기존 단순 쿼리("Show all customers") 회귀 — 여전히 정상 SQL 생성
- [ ] **CHK-10-7** 기존 복잡 쿼리("Show total sales by customer") 회귀 — 여전히 정상 SQL 생성
- [ ] **CHK-10-8** `engine.query()` 호출 시 에러 없이 `QueryResult` 반환 (모든 변경 통합 후)

---

## PHASE 11 — QA-SQL 엔진 정확도 향상 (Phase B: 중기 개선)

> 목적: Few-shot, CoT, 스키마 그래프 등 중간 규모 변경으로 정확도를 본격적으로 높인다.
> Phase A(PHASE 10) 완료 후 진행한다.
> **원칙**: 새 모듈은 기존 파이프라인과 느슨하게 결합하여 독립 테스트 가능하게 설계한다.

**필요 스킬**: Python, 그래프 알고리즘(BFS), LLM 프롬프트 엔지니어링, threading, 캐싱 설계

---

### T-110 Few-Shot 예시 라이브러리 구축

> 참조: `future_study.md` §2.2.1
> 대상 파일: 신규 `qasql/core/few_shot.py`, `qasql/core/prompts.py`, `qasql/core/generator.py`

- [x] **T-110-1** `qasql/core/few_shot.py` 신규 파일 생성 — Few-shot 예시 저장소
  ```python
  # 쿼리 패턴별 few-shot 예시 딕셔너리
  FEW_SHOT_EXAMPLES = {
      "simple_select": [
          {"question": "Show all customers", "sql": "SELECT * FROM customers"},
          {"question": "List product names", "sql": "SELECT name FROM products"},
      ],
      "aggregation": [
          {"question": "Total sales by region", "sql": "SELECT region, SUM(amount) FROM orders GROUP BY region"},
          {"question": "Average order value", "sql": "SELECT AVG(total) FROM orders"},
          {"question": "Count of active users", "sql": "SELECT COUNT(*) FROM users WHERE status = 'active'"},
      ],
      "join": [
          {"question": "Orders with customer names", "sql": "SELECT c.name, o.* FROM orders o JOIN customers c ON o.customer_id = c.id"},
      ],
      "subquery": [
          {"question": "Customers with above-average orders", "sql": "SELECT * FROM customers WHERE id IN (SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) > (SELECT AVG(cnt) FROM (SELECT COUNT(*) as cnt FROM orders GROUP BY customer_id) t))"},
      ],
      "window_function": [
          {"question": "Rank products by sales", "sql": "SELECT name, sales, RANK() OVER (ORDER BY sales DESC) as rank FROM products"},
      ],
      "date_filter": [
          {"question": "Orders from last month", "sql": "SELECT * FROM orders WHERE order_date >= DATE('now', '-1 month')"},
      ],
      "case_when": [
          {"question": "Categorize sales as high/low", "sql": "SELECT *, CASE WHEN amount > 1000 THEN 'high' ELSE 'low' END as category FROM sales"},
      ],
  }
  ```
- [x] **T-110-2** `QueryClassifier` 클래스 작성 — LLM으로 질문의 쿼리 패턴 분류
  ```python
  class QueryClassifier:
      def __init__(self, llm_client):
          self.llm_client = llm_client

      def classify(self, nl_query: str) -> list[str]:
          """질문을 쿼리 패턴으로 분류. 복수 패턴 반환 가능."""
          prompt = f"""Classify this database question into one or more categories.
  Categories: simple_select, aggregation, join, subquery, window_function, date_filter, case_when

  Question: "{nl_query}"

  Return only the category names, comma-separated."""
          response = self.llm_client.complete(prompt=prompt, max_tokens=50)
          return [c.strip() for c in response.split(",")]
  ```
- [x] **T-110-3** `get_relevant_examples()` 함수 작성 — 분류 결과에 따라 관련 few-shot 예시 선택
  ```python
  def get_relevant_examples(categories: list[str], max_examples: int = 3) -> list[dict]:
      """카테고리에 해당하는 few-shot 예시를 최대 max_examples개 선택"""
      examples = []
      for cat in categories:
          if cat in FEW_SHOT_EXAMPLES:
              examples.extend(FEW_SHOT_EXAMPLES[cat][:2])
      return examples[:max_examples]
  ```
- [x] **T-110-4** `CandidateGenerator._generate_candidate()` 수정 — few-shot 예시를 프롬프트에 삽입
  - `FULL_SCHEMA`, `FOCUSED_SCHEMA` 전략에 few-shot 섹션 추가
  ```python
  # user_prompt 생성 시 few-shot 예시 삽입
  if few_shot_examples:
      examples_str = "\n".join([
          f"Q: {ex['question']}\nSQL: {ex['sql']}" for ex in few_shot_examples
      ])
      user_prompt = f"Examples:\n{examples_str}\n\n" + user_prompt
  ```
- [x] **T-110-5** `QASQLEngine.query()` 수정 — 쿼리 분류 단계를 Stage 1.5로 추가
  - Schema Agent 직후, Candidate Generation 직전에 분류 수행
  - 분류 결과를 `CandidateGenerator.generate_all_candidates()`에 전달

**검증**:
- "총 매출 합계" 질문 → `aggregation` 카테고리로 분류 확인
- 프롬프트에 관련 few-shot 예시 포함 확인
- 복잡한 JOIN 질문에서 few-shot 유무에 따른 정확도 비교 (수동)

---

### T-111 Chain-of-Thought (CoT) 프롬프트 도입

> 참조: `future_study.md` §2.2.3
> 대상 파일: `qasql/core/prompts.py`

- [x] **T-111-1** `COT_SYSTEM_PROMPT` 상수 추가 — CoT 유도 시스템 프롬프트
  ```python
  COT_SYSTEM_PROMPT = """You are an expert SQL query generator. Think step-by-step before writing the final SQL.

  For each question, follow these steps:
  Step 1: Identify the entities (tables) mentioned or implied in the question.
  Step 2: Determine the required columns, aggregations, and computed fields.
  Step 3: Identify the JOIN conditions between tables (using foreign keys).
  Step 4: Determine the WHERE/HAVING filter conditions.
  Step 5: Determine the ORDER BY and LIMIT clauses if needed.
  Step 6: Write the final SQL query.

  Rules:
  1. Show your reasoning for each step briefly
  2. After reasoning, output the final SQL inside ```sql ... ``` code block
  3. Use exact column and table names from the schema
  4. Do NOT use DISTINCT unless explicitly asked
  {dialect_hint}"""
  ```
- [x] **T-111-2** `ContextStrategy.COT_FOCUSED` 신규 전략 추가 (기존 5개 + 1 = 6개)
  - `ContextStrategy` Enum에 `COT_FOCUSED = "cot_focused"` 추가
  - `PROMPTS` 딕셔너리에 CoT 전략 항목 추가
  ```python
  ContextStrategy.COT_FOCUSED: {
      "name": "cot_focused",
      "temperature": 0.0,
      "system": COT_SYSTEM_PROMPT,
      "user_template": """Database Schema (relevant tables only):
  {schema}

  Question: {question}

  Think step-by-step and generate the SQL query."""
  },
  ```
- [x] **T-111-3** `CandidateGenerator.generate_all_candidates()` 수정 — 전략 목록에 CoT 추가
  - hint 없을 때: 4 → 5개 (기존 4 + COT_FOCUSED)
  - hint 있을 때: 5 → 6개 (기존 5 + COT_FOCUSED)
  - CoT 전략은 focused_schema 기반으로 동작
- [x] **T-111-4** CoT 응답에서 SQL 추출 로직 보강 — reasoning 텍스트와 SQL을 분리
  - `_extract_sql()` 이미 ```sql 블록을 추출하므로 추가 변경 최소화
  - 단, reasoning 텍스트를 `SQLCandidate`에 `reasoning` 필드로 저장하여 디버깅 지원

**검증**:
- CoT 전략이 step-by-step 추론 후 SQL을 생성하는지 확인 (응답 텍스트 확인)
- 추출된 SQL이 유효한지 확인 (실행 성공)
- 후보 수가 의도대로 증가했는지 확인

---

### T-112 스키마 그래프 기반 JOIN 경로 탐색

> 참조: `future_study.md` §2.1.1
> 대상 파일: 신규 `qasql/core/schema_graph.py`, `qasql/core/schema_agent.py`, `qasql/engine.py`

- [x] **T-112-1** `qasql/core/schema_graph.py` 신규 파일 생성
  ```python
  """
  Schema Graph Module
  FK 관계를 그래프로 모델링하여 JOIN 경로를 탐색한다.
  """
  from collections import defaultdict, deque
  from itertools import combinations

  class SchemaGraph:
      def __init__(self, schema: dict):
          self.adjacency = defaultdict(set)  # table -> {related_tables}
          self.edges = {}  # (table_a, table_b) -> {"column": ..., "ref_column": ...}
          self._build_graph(schema)

      def _build_graph(self, schema: dict):
          """FK 관계에서 양방향 그래프 구축"""
          for table_name, table_info in schema.items():
              for fk in table_info.get("foreign_keys", []):
                  ref_table = fk["references_table"]
                  self.adjacency[table_name].add(ref_table)
                  self.adjacency[ref_table].add(table_name)
                  self.edges[(table_name, ref_table)] = {
                      "column": fk["column"],
                      "ref_column": fk["references_column"]
                  }
                  self.edges[(ref_table, table_name)] = {
                      "column": fk["references_column"],
                      "ref_column": fk["column"]
                  }

      def find_join_path(self, table_a: str, table_b: str) -> list[str]:
          """BFS로 두 테이블 간 최단 FK 경로 반환"""
          # ... BFS 구현 ...

      def expand_relevant_tables(self, tables: list[str]) -> list[str]:
          """관련 테이블 쌍 간 브릿지 테이블 자동 포함"""
          expanded = set(tables)
          for a, b in combinations(tables, 2):
              path = self.find_join_path(a, b)
              if path and len(path) <= 4:  # 경로가 너무 길면 제외
                  expanded.update(path)
          return list(expanded)

      def get_join_conditions(self, path: list[str]) -> list[str]:
          """경로의 JOIN 조건 생성"""
          # ... 인접 테이블 간 ON 절 생성 ...
  ```
- [x] **T-112-2** `SchemaGraph.find_join_path()` BFS 구현
  ```python
  def find_join_path(self, table_a: str, table_b: str) -> list[str]:
      if table_a == table_b:
          return [table_a]
      if table_a not in self.adjacency or table_b not in self.adjacency:
          return []

      visited = {table_a}
      queue = deque([(table_a, [table_a])])

      while queue:
          current, path = queue.popleft()
          for neighbor in self.adjacency[current]:
              if neighbor == table_b:
                  return path + [neighbor]
              if neighbor not in visited:
                  visited.add(neighbor)
                  queue.append((neighbor, path + [neighbor]))

      return []  # 경로 없음
  ```
- [x] **T-112-3** `SchemaGraph.get_join_conditions()` 구현
  ```python
  def get_join_conditions(self, path: list[str]) -> list[str]:
      """경로를 따라 JOIN ON 조건을 문자열 리스트로 반환"""
      conditions = []
      for i in range(len(path) - 1):
          a, b = path[i], path[i + 1]
          edge = self.edges.get((a, b))
          if edge:
              conditions.append(
                  f"{a}.{edge['column']} = {b}.{edge['ref_column']}"
              )
      return conditions
  ```
- [x] **T-112-4** `SchemaAgent.run()` 수정 — 관련 테이블 확장 단계 추가
  ```python
  def run(self, nl_query, schema, profile, hint, relevance_threshold):
      # ... 기존 점수 매기기 ...

      # 관련 테이블 필터링 후, 브릿지 테이블 확장
      from qasql.core.schema_graph import SchemaGraph
      graph = SchemaGraph(schema)
      expanded_tables = graph.expand_relevant_tables(list(relevant_tables.keys()))

      # 확장된 테이블을 relevant_tables에 추가
      for table_name in expanded_tables:
          if table_name not in relevant_tables and table_name in schema:
              relevant_tables[table_name] = schema[table_name]

      # JOIN 경로 정보를 메타데이터에 포함
      # ...
  ```
- [x] **T-112-5** JOIN 조건 정보를 `CandidateGenerator` 프롬프트에 포함
  - `focused_schema`에 JOIN 힌트 섹션 추가
  ```
  Suggested JOIN paths:
    orders.customer_id = customers.id
    order_items.order_id = orders.id
  ```
- [x] **T-112-6** `qasql/core/__init__.py` 업데이트 — `SchemaGraph` export 추가
- [x] **T-112-7** 엣지 케이스 처리
  - FK가 없는 스키마 → 그래프 확장 단계 스킵
  - 순환 참조 → BFS visited 체크로 무한루프 방지
  - 경로 길이 제한 (max_path_length=4) → 너무 먼 테이블 제외

**검증**:
- 3개 테이블 체인(customers → orders → order_items)에서 customers, order_items만 관련으로 식별 시 orders 자동 포함 확인
- FK가 없는 스키마에서 에러 없이 기존 동작 유지 확인
- 프롬프트에 "Suggested JOIN paths" 섹션 포함 확인

---

### T-113 후보 SQL 병렬 실행

> 참조: `future_study.md` §2.3.1
> 대상 파일: `qasql/core/executor.py`, `qasql/database.py`, `qasql/engine.py`

- [x] **T-113-1** `SQLExecutor`에 `execute_all_candidates_parallel()` 메서드 추가
  ```python
  from concurrent.futures import ThreadPoolExecutor, as_completed

  def execute_all_candidates_parallel(
      self, candidates, nl_query, schema_str, max_workers=None
  ) -> list[ExecutionResult]:
      max_workers = max_workers or min(len(candidates), 4)
      results = [None] * len(candidates)

      with ThreadPoolExecutor(max_workers=max_workers) as executor:
          future_to_idx = {
              executor.submit(
                  self._execute_with_retry, c, nl_query, schema_str
              ): i
              for i, c in enumerate(candidates)
          }
          for future in as_completed(future_to_idx):
              idx = future_to_idx[future]
              try:
                  results[idx] = future.result()
              except Exception as e:
                  results[idx] = ExecutionResult(
                      candidate_id=candidates[idx].candidate_id,
                      sql=candidates[idx].sql,
                      success=False, error=str(e)
                  )
      return results
  ```
- [x] **T-113-2** `_execute_with_retry()` 수정 — 스레드 안전성 확보
  - DB connector를 메서드 내에서 새로 생성 (공유 커넥션 사용 금지)
  ```python
  def _execute_with_retry(self, candidate, nl_query, schema_str):
      # 스레드별 독립 커넥터 생성
      local_connector = self._create_connector()
      # ... 기존 로직 (self.db_connector → local_connector 교체) ...
  ```
- [x] **T-113-3** `SQLExecutor.__init__()` 수정 — 커넥터 팩토리 함수 추가
  ```python
  def __init__(self, db_connector, llm_client, max_iterations=3,
               query_timeout=30.0, connector_factory=None):
      self.db_connector = db_connector
      self._connector_factory = connector_factory  # callable() -> BaseDatabaseConnector
      # ...

  def _create_connector(self):
      if self._connector_factory:
          return self._connector_factory()
      return self.db_connector  # 폴백: 기존 방식
  ```
- [x] **T-113-4** `QASQLEngine.query()` 수정 — 커넥터 팩토리를 Executor에 전달
  ```python
  executor = SQLExecutor(
      db_connector=self.db_connector,
      llm_client=self.llm_client,
      connector_factory=self._create_db_connector,  # 팩토리 함수 전달
      ...
  )
  ```
- [x] **T-113-5** DB 타입별 병렬 실행 가능 여부 판단
  ```python
  # SQLite: WAL mode가 아니면 읽기도 직렬화 → 병렬 비활성화
  # PostgreSQL/MySQL: 병렬 가능
  parallel_execution = self.config.db_type != "sqlite"
  if parallel_execution:
      execution_results = executor.execute_all_candidates_parallel(...)
  else:
      execution_results = executor.execute_all_candidates(...)
  ```
- [x] **T-113-6** 성능 측정 — 병렬 vs 순차 실행 시간 비교 로깅
  - `metadata["timings"]["execution_ms"]`에서 차이 비교

**검증**:
- PostgreSQL DB에서 5개 후보 병렬 실행 → 순차 대비 2-3x 속도 향상 확인
- SQLite DB에서 기존 순차 실행 유지 확인 (병렬 비활성)
- 병렬 실행 시 결과 순서가 candidate_id 기준 정렬 확인
- 스레드 안전성 — 동시 실행 중 DB 에러 없음 확인

---

### T-114 쿼리 캐싱 시스템

> 참조: `future_study.md` §2.5.1
> 대상 파일: 신규 `qasql/core/cache.py`, `qasql/engine.py`

- [x] **T-114-1** `qasql/core/cache.py` 신규 파일 생성
  ```python
  """
  Query Cache Module
  동일/유사 쿼리의 결과를 캐싱하여 재계산을 방지한다.
  """
  import hashlib
  import json
  import time
  from pathlib import Path
  from typing import Optional
  from dataclasses import dataclass

  @dataclass
  class CacheEntry:
      question: str
      hint: str
      sql: str
      confidence: float
      timestamp: float
      hit_count: int = 0

  class QueryCache:
      def __init__(self, cache_dir: Path = None, max_entries: int = 1000, ttl_seconds: float = 86400):
          self.cache_dir = cache_dir or Path("./qasql_output/cache")
          self.max_entries = max_entries
          self.ttl_seconds = ttl_seconds
          self._memory_cache: dict[str, CacheEntry] = {}
          self._load_from_disk()

      def _make_key(self, question: str, hint: str = "") -> str:
          """질문+힌트의 정규화된 해시 키 생성"""
          normalized = question.strip().lower() + "|" + (hint or "").strip().lower()
          return hashlib.sha256(normalized.encode()).hexdigest()[:16]

      def get(self, question: str, hint: str = "") -> Optional[CacheEntry]:
          """정확히 일치하는 캐시 엔트리 반환"""
          key = self._make_key(question, hint)
          entry = self._memory_cache.get(key)
          if entry and (time.time() - entry.timestamp) < self.ttl_seconds:
              entry.hit_count += 1
              return entry
          return None

      def put(self, question: str, hint: str, sql: str, confidence: float):
          """캐시에 저장"""
          key = self._make_key(question, hint)
          self._memory_cache[key] = CacheEntry(
              question=question, hint=hint, sql=sql,
              confidence=confidence, timestamp=time.time()
          )
          self._evict_if_needed()
          self._save_to_disk()

      def _evict_if_needed(self):
          """LRU 방식으로 오래된 엔트리 제거"""
          if len(self._memory_cache) > self.max_entries:
              sorted_keys = sorted(
                  self._memory_cache.keys(),
                  key=lambda k: self._memory_cache[k].timestamp
              )
              for key in sorted_keys[:len(self._memory_cache) - self.max_entries]:
                  del self._memory_cache[key]

      def _save_to_disk(self):
          """디스크에 캐시 저장"""
          # ... JSON 직렬화 ...

      def _load_from_disk(self):
          """디스크에서 캐시 로드"""
          # ... JSON 역직렬화 ...
  ```
- [x] **T-114-2** `QASQLEngine`에 캐시 통합
  ```python
  class QASQLEngine:
      def __init__(self, ...):
          # ...
          self._query_cache: Optional[QueryCache] = None

      def query(self, question, hint=None):
          # 캐시 확인
          if self._query_cache:
              cached = self._query_cache.get(question, hint or "")
              if cached:
                  return QueryResult(
                      sql=cached.sql, confidence=cached.confidence,
                      question=question, hint=hint,
                      reasoning="Retrieved from cache",
                      metadata={"cache_hit": True}
                  )

          # ... 기존 파이프라인 ...

          # 캐시 저장 (신뢰도 0.5 이상만)
          if self._query_cache and judgment.confidence >= 0.5:
              self._query_cache.put(question, hint or "", judgment.selected_sql, judgment.confidence)

          return result
  ```
- [x] **T-114-3** `QASQLConfig`에 캐시 설정 추가
  ```python
  # config.py
  enable_cache: bool = True
  cache_ttl_seconds: float = 86400  # 24시간
  cache_max_entries: int = 1000
  ```
- [x] **T-114-4** 캐시 무효화 API
  ```python
  class QASQLEngine:
      def clear_cache(self):
          """캐시 전체 삭제"""
          if self._query_cache:
              self._query_cache.clear()

      def invalidate_cache(self, question: str, hint: str = ""):
          """특정 쿼리 캐시 삭제"""
          if self._query_cache:
              self._query_cache.remove(question, hint)
  ```

**검증**:
- 동일 질문 2회 연속 호출 → 2회차 `metadata.cache_hit=True`, 응답 시간 10x 이상 단축
- 캐시 TTL 만료 후 → 재계산 발생 확인
- `engine.clear_cache()` 후 → 캐시 미스 확인
- 다른 hint로 동일 질문 → 별도 캐시 엔트리 확인

---

### PHASE 11 검증 체크포인트

> 아래 항목을 모두 통과해야 PHASE 12로 진행할 수 있다.

- [ ] **CHK-11-1** Few-shot 예시가 쿼리 유형에 따라 동적 선택되어 프롬프트에 포함
- [ ] **CHK-11-2** CoT 전략이 step-by-step 추론 후 SQL 생성, 추출 정상 동작
- [ ] **CHK-11-3** 후보 수가 hint 없이 5개(기존 4 + CoT), hint 있을 때 6개(기존 5 + CoT)
- [ ] **CHK-11-4** FK가 있는 스키마에서 SchemaGraph가 브릿지 테이블을 자동 포함
- [ ] **CHK-11-5** FK가 없는 스키마에서 SchemaGraph 스킵 → 기존 동작 유지
- [ ] **CHK-11-6** PostgreSQL에서 병렬 실행 → 순차 대비 2x 이상 속도 향상
- [ ] **CHK-11-7** 동일 쿼리 반복 시 캐시 히트 확인, 캐시 무효화 후 캐시 미스 확인
- [ ] **CHK-11-8** 모든 변경 통합 후 기존 E2E 쿼리 정상 동작 (회귀)

---

## PHASE 12 — QA-SQL 엔진 고도화 (Phase C: 장기 연구)

> 목적: Embedding 기반 의미적 매칭, 쿼리 분해, 피드백 루프 등 연구 수준 개선을 구현한다.
> Phase B(PHASE 11) 완료 후 진행한다.
> **원칙**: 각 기능은 feature flag로 제어 가능하게 만들어, 단계적 롤아웃이 가능하도록 한다.

**필요 스킬**: Python, Embedding 모델 (sentence-transformers), 벤치마크 데이터셋, 비동기 프로그래밍, 데이터 파이프라인 설계

---

### T-120 Embedding 기반 의미적 스키마 매칭

> 참조: `future_study.md` §2.1.2, §2.1.3
> 대상 파일: 신규 `qasql/core/semantic_matcher.py`, `qasql/core/schema_agent.py`

- [ ] **T-120-1** `qasql/core/semantic_matcher.py` 신규 파일 생성
  ```python
  """
  Semantic Matcher Module
  Embedding 기반 의미적 유사도로 스키마 매칭 정확도를 높인다.
  """
  class SemanticMatcher:
      def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
          # sentence-transformers 로드 (optional dependency)
          ...

      def encode_schema(self, schema: dict, profile: dict) -> dict:
          """스키마의 모든 테이블/컬럼을 벡터화하여 캐싱"""
          # 테이블명 + 컬럼명 + 설명을 자연어 문장으로 변환 후 인코딩
          ...

      def score_tables(self, query: str, schema_embeddings: dict) -> dict[str, float]:
          """쿼리와 각 테이블의 의미적 유사도 점수 반환"""
          ...
  ```
- [ ] **T-120-2** `setup()` 단계에서 스키마 임베딩 사전 계산 및 캐싱
  - `qasql_output/embeddings/{db_name}_embeddings.npy` 저장
  - 스키마 변경 시만 재계산 (해시 비교)
- [ ] **T-120-3** `SchemaAgent._score_table()` 수정 — 키워드 + LLM + Embedding 3중 점수 병합
  ```python
  final_score = max(keyword_score, llm_score, embedding_score)
  # 또는 가중 평균:
  # final_score = 0.3 * keyword_score + 0.3 * llm_score + 0.4 * embedding_score
  ```
- [ ] **T-120-4** `sentence-transformers` optional dependency 처리
  - `try/except ImportError`로 미설치 시 기존 키워드+LLM 방식 폴백
  - `pyproject.toml`에 `[project.optional-dependencies]` 추가: `semantic = ["sentence-transformers>=2.0"]`
- [ ] **T-120-5** 동의어 확장 딕셔너리 (`synonyms.json`) 추가
  ```json
  {
    "sales": ["revenue", "income", "매출", "수익"],
    "customer": ["client", "buyer", "고객", "거래처"],
    "order": ["purchase", "transaction", "주문", "거래"],
    "product": ["item", "goods", "상품", "제품"],
    "quantity": ["qty", "amount", "수량"]
  }
  ```
- [ ] **T-120-6** 키워드 매칭 시 동의어 확장 적용
  - `schema_agent.py:_keyword_match_score()` 에서 component words를 동의어로 확장 후 매칭

**검증**:
- "매출 합계" 쿼리 → "sales" 컬럼 포함 테이블 관련도 높음 확인
- sentence-transformers 미설치 환경 → 에러 없이 기존 방식 동작 확인
- 동의어 "qty" → "quantity" 컬럼 매칭 확인

---

### T-121 복합 쿼리 분해 (Query Decomposition)

> 참조: `future_study.md` §2.5.3
> 대상 파일: 신규 `qasql/core/decomposer.py`, `qasql/engine.py`

- [ ] **T-121-1** `qasql/core/decomposer.py` 신규 파일 생성
  ```python
  """
  Query Decomposer Module
  복합 질문을 하위 질문으로 분해하고 SQL을 합성한다.
  """
  class QueryDecomposer:
      def __init__(self, llm_client):
          self.llm_client = llm_client

      def should_decompose(self, nl_query: str) -> bool:
          """질문이 분해가 필요한 복합 질문인지 판단"""
          ...

      def decompose(self, nl_query: str) -> list[dict]:
          """질문을 하위 질문 리스트로 분해"""
          # 반환: [{"sub_question": "...", "depends_on": [0, 1], "type": "subquery|cte"}]
          ...

      def compose_sql(self, sub_results: list[dict]) -> str:
          """하위 SQL들을 합성하여 최종 SQL 생성"""
          ...
  ```
- [ ] **T-121-2** `should_decompose()` 구현 — LLM으로 복잡도 판단
  ```python
  def should_decompose(self, nl_query: str) -> bool:
      prompt = f"""Is this question a complex query that requires multiple steps or subqueries?

  Question: "{nl_query}"

  Answer YES only if the question requires:
  - Nested subqueries
  - Multiple aggregation levels
  - Comparing aggregated values
  - Finding top/bottom within a filtered subset

  Answer ONLY "YES" or "NO"."""

      response = self.llm_client.complete(prompt=prompt, max_tokens=10)
      return "YES" in response.upper()
  ```
- [ ] **T-121-3** `decompose()` 구현 — LLM으로 하위 질문 분해
  ```python
  def decompose(self, nl_query: str) -> list[dict]:
      prompt = f"""Break this complex question into simpler sub-questions that can each be answered with a simple SQL query.

  Question: "{nl_query}"

  Return JSON array of sub-questions in execution order:
  [
    {{"id": 1, "sub_question": "...", "depends_on": []}},
    {{"id": 2, "sub_question": "...", "depends_on": [1]}}
  ]"""

      response = self.llm_client.complete(prompt=prompt, max_tokens=1024)
      return self._parse_json(response)
  ```
- [ ] **T-121-4** `compose_sql()` 구현 — CTE 또는 서브쿼리 패턴으로 합성
  ```python
  def compose_sql(self, sub_results: list[dict], schema_str: str) -> str:
      prompt = f"""Combine these sub-query results into a single SQL query using CTEs or subqueries.

  Schema:
  {schema_str}

  Sub-queries:
  {json.dumps(sub_results, indent=2)}

  Write a single combined SQL query. Return ONLY the SQL."""

      response = self.llm_client.complete(prompt=prompt, max_tokens=2048)
      return self._extract_sql(response)
  ```
- [ ] **T-121-5** `QASQLEngine.query()` 수정 — 분해 파이프라인 통합
  ```python
  def query(self, question, hint=None):
      # Stage 0: 복합 쿼리 분해 판단
      decomposer = QueryDecomposer(self.llm_client)
      if decomposer.should_decompose(question):
          return self._query_decomposed(question, hint, decomposer)
      else:
          return self._query_standard(question, hint)  # 기존 파이프라인
  ```
- [ ] **T-121-6** `_query_decomposed()` 구현
  - 각 하위 질문에 대해 기존 `_query_standard()` 호출
  - 하위 SQL 결과를 수집하여 `compose_sql()`로 합성
  - 합성된 SQL 실행 및 검증

**검증**:
- "지난 달 매출이 가장 높은 지역의 고객 수" → 분해 판단 YES 확인
- 하위 질문 2-3개로 분해 확인
- 합성된 SQL이 실행 가능하고 올바른 결과 반환 확인
- 단순 질문("Show all customers") → 분해 판단 NO, 기존 파이프라인 사용 확인

---

### T-122 사용자 피드백 학습 루프

> 참조: `future_study.md` §2.5.2
> 대상 파일: 신규 `qasql/core/feedback.py`, `qasql/engine.py`

- [ ] **T-122-1** `qasql/core/feedback.py` 신규 파일 생성
  ```python
  """
  Feedback Store Module
  사용자 피드백(질문-SQL 쌍)을 저장하고 few-shot 예시로 활용한다.
  """
  class FeedbackStore:
      def __init__(self, store_path: Path = None):
          self.store_path = store_path or Path("./qasql_output/feedback")
          self.entries: list[dict] = []
          self._load()

      def add_feedback(self, question: str, original_sql: str, corrected_sql: str, hint: str = ""):
          """사용자가 수정한 SQL을 피드백으로 저장"""
          ...

      def get_relevant_feedback(self, question: str, max_entries: int = 3) -> list[dict]:
          """질문과 관련된 피드백을 few-shot 예시로 반환"""
          # 단순: 키워드 매칭
          # 고급: embedding 유사도 (T-120 의존)
          ...

      def _load(self):
          """디스크에서 피드백 로드"""
          ...

      def _save(self):
          """디스크에 피드백 저장"""
          ...
  ```
- [ ] **T-122-2** `QASQLEngine.submit_feedback()` 공개 메서드 추가
  ```python
  def submit_feedback(self, question: str, original_sql: str, corrected_sql: str, hint: str = ""):
      """사용자 피드백 제출. 향후 쿼리 시 few-shot 예시로 활용됨."""
      if self._feedback_store:
          self._feedback_store.add_feedback(question, original_sql, corrected_sql, hint)
  ```
- [ ] **T-122-3** `CandidateGenerator`에 피드백 기반 few-shot 주입
  - 쿼리 생성 시 관련 피드백을 few-shot 예시로 프롬프트에 삽입
  - 기존 `T-110`의 few-shot 라이브러리 + 사용자 피드백 통합
- [ ] **T-122-4** 피드백 가중치: 최근 피드백 > 오래된 피드백
  - 시간 기반 감쇠 (최근 7일 피드백 우선)
- [ ] **T-122-5** TUI에 피드백 루프 UI 통합
  - SQL 실행 후 "Was this correct? [Y/n/edit]" 프롬프트
  - "edit" 선택 시 SQL 수정 → 자동 `submit_feedback()` 호출

**검증**:
- `submit_feedback("총 매출", "SELECT *...", "SELECT SUM(amount)...")` 저장 확인
- 이후 "매출 합계" 쿼리 시 피드백이 few-shot 예시로 삽입 확인
- 피드백 디스크 저장/로드 왕복 확인

---

### T-123 벤치마크 평가 프레임워크

> 참조: `future_study.md` §2.5.4
> 대상 파일: 신규 `qasql/benchmark/`, `tests/`

- [ ] **T-123-1** `qasql/benchmark/__init__.py` 디렉토리 구조 생성
  ```
  qasql/benchmark/
  ├── __init__.py
  ├── runner.py         ← 벤치마크 실행기
  ├── metrics.py        ← 평가 지표 계산
  ├── datasets/         ← 벤치마크 데이터셋 (JSON)
  │   ├── mini_spider.json     ← Spider 서브셋 (50문항)
  │   └── custom.json          ← 커스텀 테스트셋
  └── report.py         ← 결과 리포트 생성
  ```
- [ ] **T-123-2** `qasql/benchmark/metrics.py` 작성
  ```python
  class SQLMetrics:
      @staticmethod
      def execution_accuracy(predicted_rows, gold_rows) -> bool:
          """실행 결과 일치 여부 (순서 무시, 부동소수점 허용)"""
          ...

      @staticmethod
      def exact_match(predicted_sql: str, gold_sql: str) -> bool:
          """SQL 문자열 정규화 후 일치 비교"""
          ...

      @staticmethod
      def partial_match(predicted_sql: str, gold_sql: str) -> dict:
          """부분 일치 (SELECT절, FROM절, WHERE절, GROUP BY절 각각 비교)"""
          ...
  ```
- [ ] **T-123-3** `qasql/benchmark/runner.py` 작성
  ```python
  class BenchmarkRunner:
      def __init__(self, engine: QASQLEngine, dataset_path: str):
          ...

      def run(self, max_questions: int = None) -> dict:
          """벤치마크 실행. 각 질문에 대해 SQL 생성 + 실행 + 비교"""
          results = {
              "total": 0,
              "execution_accuracy": 0,
              "exact_match": 0,
              "avg_confidence": 0.0,
              "avg_latency_ms": 0.0,
              "errors": [],
              "details": [],
          }
          for item in self.dataset[:max_questions]:
              # engine.query() 호출, gold와 비교
              ...
          return results

      def run_comparison(self, engine_a, engine_b) -> dict:
          """두 엔진 설정 간 A/B 비교"""
          ...
  ```
- [ ] **T-123-4** Mini Spider 데이터셋 생성 (50문항)
  - `qasql/benchmark/datasets/mini_spider.json` 작성
  - 복잡도별 분포: easy(20), medium(15), hard(10), extra_hard(5)
  - 각 항목: `{"question": "...", "gold_sql": "...", "db_id": "...", "difficulty": "..."}`
- [ ] **T-123-5** `qasql/benchmark/report.py` — 결과 리포트 생성
  ```python
  class BenchmarkReport:
      def generate(self, results: dict) -> str:
          """마크다운 형식 벤치마크 리포트 생성"""
          ...
      def compare(self, results_a: dict, results_b: dict) -> str:
          """A/B 비교 리포트"""
          ...
  ```
- [ ] **T-123-6** CLI 명령어 추가: `qasql benchmark`
  ```python
  # cli.py에 benchmark 서브커맨드 추가
  benchmark_p = subparsers.add_parser("benchmark", help="Run benchmark")
  benchmark_p.add_argument("--dataset", required=True, help="Path to benchmark dataset JSON")
  benchmark_p.add_argument("--max", type=int, help="Max questions to evaluate")
  benchmark_p.add_argument("--report", "-r", help="Save report to file")
  ```

**검증**:
- `qasql benchmark --dataset mini_spider.json --max 10` 실행 → 결과 요약 출력
- execution_accuracy 지표가 0.0~1.0 범위 내 반환 확인
- 리포트 생성 → 마크다운 파일 정상 출력 확인

---

### T-124 Self-Consistency 앙상블 및 다중 Judge

> 참조: `future_study.md` §2.4.2, §2.4.3
> 대상 파일: `qasql/core/judge.py`

- [ ] **T-124-1** `SQLJudge`에 `_cross_validate()` 메서드 추가
  ```python
  def _cross_validate(self, execution_results: list[ExecutionResult]) -> dict[int, float]:
      """결과 간 교차 검증으로 후보별 합의도 점수 반환"""
      result_groups = {}
      for r in execution_results:
          if r.success and r.rows is not None:
              # 결과 구조 해시: (행 수, 컬럼 수, 정렬된 컬럼명)
              structure = (len(r.rows), len(r.columns or []), tuple(sorted(r.columns or [])))
              result_groups.setdefault(structure, []).append(r.candidate_id)

      # 합의도 점수: 같은 구조의 결과를 반환한 후보 수 / 전체 성공 후보 수
      total_successful = sum(len(ids) for ids in result_groups.values())
      consensus_scores = {}
      for structure, candidate_ids in result_groups.items():
          score = len(candidate_ids) / total_successful if total_successful > 0 else 0
          for cid in candidate_ids:
              consensus_scores[cid] = score

      return consensus_scores
  ```
- [ ] **T-124-2** `judge()` 메서드에서 교차 검증 결과를 LLM Judge 프롬프트에 포함
  ```python
  # 합의도 높은 후보에 보너스 표시
  consensus = self._cross_validate(execution_results)
  for candidate, exec_result in successful:
      consensus_score = consensus.get(candidate.candidate_id, 0)
      text += f"Consensus: {consensus_score:.0%} of candidates agree with this result structure\n"
  ```
- [ ] **T-124-3** 신뢰도 보정 — Judge의 confidence에 합의도 반영
  ```python
  # LLM이 반환한 confidence에 합의도 보정 적용
  adjusted_confidence = min(1.0, raw_confidence * (0.7 + 0.3 * consensus_score))
  ```
- [ ] **T-124-4** (선택) 다중 Judge 앙상블 — 3회 Judge 호출 후 다수결
  ```python
  def _ensemble_judge(self, successful, nl_query, hint, total_candidates, rounds=3):
      votes = {}
      for _ in range(rounds):
          result = self._llm_judge(successful, nl_query, hint, total_candidates)
          votes[result.selected_id] = votes.get(result.selected_id, 0) + 1
      # 가장 많은 표를 받은 후보 선택
      winner_id = max(votes, key=votes.get)
      ...
  ```
  - 단, LLM 호출 3배 증가 → 성능 트레이드오프 고려하여 config flag로 제어

**검증**:
- 5개 후보 중 3개가 같은 구조(행 수+컬럼)의 결과 → 합의도 60% 확인
- 합의도 높은 후보의 confidence가 보정되어 상향 확인
- 앙상블 모드 활성화 시 3회 Judge 호출 확인

---

### T-125 Structured Output (Tool Use) 적용

> 참조: `future_study.md` §2.6.3
> 대상 파일: `qasql/llm.py`, `qasql/core/generator.py`, `qasql/core/judge.py`

- [ ] **T-125-1** `AnthropicClient`에 `complete_with_tool()` 메서드 추가
  ```python
  def complete_with_tool(self, prompt, system_prompt, tool_schema, max_tokens=2048):
      """Anthropic tool use를 이용한 구조화된 응답"""
      response = self.client.messages.create(
          model=self.model,
          max_tokens=max_tokens,
          system=system_prompt,
          messages=[{"role": "user", "content": prompt}],
          tools=[tool_schema],
          tool_choice={"type": "tool", "name": tool_schema["name"]}
      )
      # tool use 블록에서 구조화된 결과 추출
      for block in response.content:
          if block.type == "tool_use":
              return block.input
      return None
  ```
- [ ] **T-125-2** `OpenAIClient`에 JSON mode 지원 추가
  ```python
  def complete_json(self, prompt, system_prompt, max_tokens=2048):
      """OpenAI JSON mode를 이용한 구조화된 응답"""
      response = self.client.chat.completions.create(
          model=self.model,
          messages=[...],
          response_format={"type": "json_object"},
          max_tokens=max_tokens,
      )
      return json.loads(response.choices[0].message.content)
  ```
- [ ] **T-125-3** `BaseLLMClient`에 `supports_structured_output` 프로퍼티 추가
  ```python
  class BaseLLMClient:
      @property
      def supports_structured_output(self) -> bool:
          return False  # Ollama 기본값

  class AnthropicClient(BaseLLMClient):
      @property
      def supports_structured_output(self) -> bool:
          return True
  ```
- [ ] **T-125-4** `CandidateGenerator`에서 structured output 활용
  - `supports_structured_output=True` 일 때 tool use/JSON mode로 SQL 추출
  - 폴백: 기존 regex 추출
- [ ] **T-125-5** `SQLJudge`에서 structured output 활용
  - Judge의 JSON 응답을 tool use로 강제하여 파싱 실패 제거

**검증**:
- Anthropic API 사용 시 tool use로 SQL 추출 → 파싱 실패 0건 확인
- OpenAI API 사용 시 JSON mode로 Judge 응답 → 파싱 실패 0건 확인
- Ollama 사용 시 기존 regex 추출로 폴백 → 기존 동작 유지 확인

---

### PHASE 12 검증 체크포인트

> 아래 항목을 모두 통과하면 엔진 고도화 완료.

- [ ] **CHK-12-1** Embedding 매칭: "매출" 쿼리 → "sales" 컬럼 관련 테이블 식별 (동의어 + 임베딩)
- [ ] **CHK-12-2** 복합 쿼리 분해: 2-step 질문 → 하위 질문 분해 → 합성 SQL 실행 성공
- [ ] **CHK-12-3** 피드백 루프: 수정된 SQL 저장 → 이후 유사 질문에서 활용 확인
- [ ] **CHK-12-4** 벤치마크: mini_spider 50문항 실행 → execution_accuracy 수치 출력
- [ ] **CHK-12-5** Self-Consistency: 합의도 점수 계산 및 confidence 보정 동작
- [ ] **CHK-12-6** Structured Output: Anthropic/OpenAI → 파싱 실패 0건, Ollama → 폴백 정상
- [ ] **CHK-12-7** 전체 통합 벤치마크: Phase A+B+C 적용 전/후 execution_accuracy 비교 → 20% 이상 향상
- [ ] **CHK-12-8** 모든 feature flag off 시 기존 v1.0.4 동작과 동일한 결과

---

## 엔진 개선 태스크 의존성 요약

```
PHASE 10 (즉시 적용 — Phase A)
├── T-100 DB 방언 인식 프롬프트
├── T-101 샘플 데이터 프롬프트 포함
├── T-102 전략별 Temperature 차등
├── T-103 누적 에러 히스토리 리파인
└── T-104 Judge 실행 결과 기반 판단
      ↓ (CHK-10 통과 필수)
PHASE 11 (중기 개선 — Phase B)
├── T-110 Few-Shot 예시 라이브러리
├── T-111 Chain-of-Thought 프롬프트
├── T-112 스키마 그래프 JOIN 경로 탐색
├── T-113 후보 병렬 실행
└── T-114 쿼리 캐싱 시스템
      ↓ (CHK-11 통과 필수)
PHASE 12 (장기 연구 — Phase C)
├── T-120 Embedding 의미적 스키마 매칭
├── T-121 복합 쿼리 분해
├── T-122 사용자 피드백 학습 루프     ← T-110 의존
├── T-123 벤치마크 평가 프레임워크
├── T-124 Self-Consistency 앙상블
└── T-125 Structured Output (Tool Use)
```

**Phase 내 의존성**:
- T-110 (Few-shot) → T-122 (피드백 루프) — 피드백이 few-shot으로 삽입되므로
- T-112 (스키마 그래프) → T-120 (Embedding 매칭) — 그래프 기반 위에 Embedding 레이어 추가
- T-123 (벤치마크) — 독립. Phase C 시작 시 가장 먼저 구축 권장 (측정 기반 개선)

---

## 엔진 개선 Phase별 필요 스킬 요약

| Phase | 핵심 스킬 |
|-------|----------|
| **10 (A)** | Python, SQL 방언 지식, 프롬프트 엔지니어링 |
| **11 (B)** | 그래프 알고리즘(BFS), ThreadPoolExecutor, 캐싱 설계, Few-shot 프롬프트 설계 |
| **12 (C)** | sentence-transformers, Embedding 유사도, 벤치마크 데이터셋, tool use API, 비동기 패턴 |
