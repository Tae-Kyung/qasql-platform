# STRUCTURE.md: QA-SQL Platform 프로젝트 구조

> **설계 원칙**
> 1. SDK는 건드리지 않는다 — 플랫폼은 SDK를 블랙박스로 취급한다
> 2. SDK와 플랫폼 사이에 어댑터 레이어를 두어 SDK 버전 교체를 격리한다
> 3. TypeScript 코드와 Python 코드의 경계를 명확히 분리한다
> 4. 기능별로 응집하고 계층별로 분리한다

---

## 전체 Monorepo 구조

```
qasql-sdk/                          ← Git 루트 (monorepo)
│
├── qasql/                          ─────────────────────────────────
│   ├── __init__.py                  SDK 레이어 (절대 수정 금지)
│   ├── engine.py                    SDK 업그레이드 시 이 디렉토리만 교체
│   ├── config.py                   ─────────────────────────────────
│   ├── database.py
│   ├── llm.py
│   ├── result.py
│   ├── tui.py
│   ├── cli.py
│   └── core/
│       ├── schema_agent.py
│       ├── generator.py
│       ├── executor.py
│       ├── judge.py
│       └── prompts.py
│
├── examples/                       ← SDK 예제 (변경 없음)
│
├── platform/                       ─────────────────────────────────
│   │                                플랫폼 루트 (Next.js 프로젝트)
│   │                                Vercel은 이 디렉토리를 루트로 인식
│   │                               ─────────────────────────────────
│   │
│   ├── app/                        ← Next.js App Router
│   │   ├── (auth)/                 ← 인증 페이지 Route Group (레이아웃 공유)
│   │   │   ├── layout.tsx          ← 중앙 정렬 카드 레이아웃
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   ├── reset-password/
│   │   │   │   └── page.tsx
│   │   │   └── update-password/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (platform)/             ← 플랫폼 UI Route Group (인증 필요)
│   │   │   ├── layout.tsx          ← 사이드바 + 헤더 레이아웃
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx        ← 프로젝트 목록
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx    ← 프로젝트 생성
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    ← 프로젝트 상세 (탭 기반)
│   │   │   │       ├── playground/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── logs/
│   │   │   │           └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   │
│   │   ├── api/                    ← Next.js API Routes (TypeScript)
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   └── signout/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   ├── projects/           ← 플랫폼 내부 API (Web UI 전용)
│   │   │   │   ├── route.ts        ← GET(목록), POST(생성)
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts    ← GET, PATCH, DELETE
│   │   │   │       ├── config/
│   │   │   │       │   └── route.ts
│   │   │   │       ├── test-db/
│   │   │   │       │   └── route.ts
│   │   │   │       ├── test-llm/
│   │   │   │       │   └── route.ts
│   │   │   │       ├── api-keys/
│   │   │   │       │   ├── route.ts
│   │   │   │       │   └── [keyId]/
│   │   │   │       │       └── route.ts
│   │   │   │       └── setup/
│   │   │   │           ├── route.ts
│   │   │   │           └── status/
│   │   │   │               └── route.ts
│   │   │   │
│   │   │   └── v1/                 ← 외부 공개 API (Bearer 인증)
│   │   │       └── [projectId]/
│   │   │           ├── query/
│   │   │           │   └── route.ts
│   │   │           ├── tables/
│   │   │           │   └── route.ts
│   │   │           ├── schema/
│   │   │           │   └── [tableName]/
│   │   │           │       └── route.ts
│   │   │           └── execute/
│   │   │               └── route.ts
│   │   │
│   │   ├── layout.tsx              ← 루트 레이아웃 (폰트, 메타데이터)
│   │   ├── page.tsx                ← 랜딩 → /login 리다이렉트
│   │   └── globals.css
│   │
│   ├── components/                 ← UI 컴포넌트 (표시만 담당, 로직 없음)
│   │   │
│   │   ├── ui/                     ← 범용 기본 컴포넌트 (도메인 무관)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── spinner.tsx
│   │   │   ├── toast.tsx
│   │   │   └── tabs.tsx
│   │   │
│   │   └── features/               ← 기능별 도메인 컴포넌트
│   │       ├── auth/
│   │       │   ├── login-form.tsx
│   │       │   └── signup-form.tsx
│   │       ├── projects/
│   │       │   ├── project-card.tsx
│   │       │   ├── project-form.tsx
│   │       │   └── project-status-badge.tsx
│   │       ├── config/
│   │       │   ├── db-config-form.tsx   ← DB 타입별 필드 동적 전환
│   │       │   └── llm-config-form.tsx
│   │       ├── api-keys/
│   │       │   ├── api-key-table.tsx
│   │       │   └── api-key-reveal-modal.tsx  ← raw key 1회 표시
│   │       ├── schema/
│   │       │   ├── schema-setup-panel.tsx    ← Realtime 진행 상태
│   │       │   └── schema-table-viewer.tsx
│   │       ├── playground/
│   │       │   ├── query-input.tsx
│   │       │   ├── sql-result-panel.tsx
│   │       │   └── result-table.tsx
│   │       └── dashboard/
│   │           ├── stat-card.tsx
│   │           ├── usage-chart.tsx       ← Recharts 래퍼
│   │           └── recent-logs-table.tsx
│   │
│   ├── lib/                        ← 비즈니스 로직 (UI 없는 순수 함수/클래스)
│   │   │
│   │   ├── supabase/               ← Supabase 클라이언트 팩토리
│   │   │   ├── client.ts           ← 브라우저용 (싱글턴)
│   │   │   ├── server.ts           ← 서버 컴포넌트용 (쿠키 기반)
│   │   │   ├── middleware.ts       ← Edge Middleware용
│   │   │   └── auth.ts             ← getCurrentUser, getUserPlan 등
│   │   │
│   │   ├── crypto/                 ← 암호화 유틸 (Node.js Crypto)
│   │   │   └── encrypt.ts          ← AES-256-GCM encrypt/decrypt
│   │   │
│   │   ├── api-key/                ← API Key 생성/검증
│   │   │   ├── generate.ts         ← generateApiKey()
│   │   │   └── verify.ts           ← verifyApiKey(), isIpAllowed()
│   │   │
│   │   ├── api/                    ← API Route 공통 유틸
│   │   │   ├── response.ts         ← successResponse(), errorResponse()
│   │   │   ├── auth-guard.ts       ← withAuth() 고차 함수
│   │   │   ├── validate.ts         ← validateBody() Zod 래퍼
│   │   │   └── verify-api-key.ts   ← 외부 API용 Bearer 검증
│   │   │
│   │   └── validations/            ← Zod 입력 스키마
│   │       ├── project.ts
│   │       ├── db-config.ts        ← DB 타입별 조건부 필드
│   │       ├── llm-config.ts
│   │       └── query.ts            ← 외부 API 요청 바디
│   │
│   ├── hooks/                      ← React Custom Hooks (클라이언트 전용)
│   │   ├── use-projects.ts         ← 프로젝트 목록 fetch + 캐시
│   │   ├── use-schema-realtime.ts  ← Supabase Realtime 구독
│   │   └── use-query-logs.ts       ← 쿼리 히스토리 페이지네이션
│   │
│   ├── types/                      ← TypeScript 타입 정의
│   │   ├── supabase.ts             ← CLI 자동 생성 (수동 편집 금지)
│   │   └── index.ts                ← 플랫폼 전용 타입 (API 요청/응답 등)
│   │
│   ├── engine/                     ─────────────────────────────────
│   │   │                            Python SDK 어댑터 레이어
│   │   │                            SDK 업그레이드 시 이 폴더만 수정
│   │   │                           ─────────────────────────────────
│   │   ├── adapter/
│   │   │   ├── __init__.py
│   │   │   ├── setup.py            ← engine.setup() 래퍼
│   │   │   ├── query.py            ← engine.query() 래퍼
│   │   │   └── connection.py       ← DB/LLM 연결 테스트 래퍼
│   │   │
│   │   ├── handlers/               ← Vercel Serverless Function 진입점
│   │   │   ├── setup_handler.py    ← POST /engine/setup
│   │   │   └── query_handler.py    ← POST /engine/query
│   │   │
│   │   ├── utils/
│   │   │   ├── crypto.py           ← Node.js AES 호환 복호화
│   │   │   ├── storage.py          ← Supabase Storage 업/다운로드
│   │   │   └── supabase_client.py  ← service_role Supabase 클라이언트
│   │   │
│   │   ├── requirements.txt        ← Python 의존성
│   │   └── SDK_VERSION             ← 현재 연동된 SDK 버전 기록 파일
│   │
│   ├── supabase/                   ← Supabase 프로젝트 설정
│   │   ├── migrations/
│   │   │   ├── 001_create_tables.sql
│   │   │   ├── 002_rls_policies.sql
│   │   │   └── 003_storage_policies.sql
│   │   └── seed.sql                ← 개발용 초기 데이터
│   │
│   ├── public/                     ← 정적 파일
│   │   └── favicon.ico
│   │
│   ├── middleware.ts               ← Edge Middleware (인증 + Rate Limiting)
│   ├── next.config.ts
│   ├── vercel.json                 ← 함수 타임아웃, 라우팅 설정
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── .env.local                  ← 로컬 환경변수 (Git 제외)
│   ├── .env.example                ← 환경변수 템플릿 (Git 포함)
│   └── package.json
│
├── PRD.md
├── TASK.md
├── STRUCTURE.md                    ← 이 파일
├── README.md                       ← SDK README (기존)
├── pyproject.toml                  ← SDK 패키지 설정 (기존)
├── setup.py
└── .gitignore
```

---

## 핵심 설계 결정

### 1. SDK 어댑터 레이어 (`platform/engine/`)

SDK를 플랫폼 코드에서 직접 `import` 하지 않는다.
반드시 `engine/adapter/` 를 통해서만 접근한다.

```
[Python Serverless Handler]
        │
        ▼
[engine/adapter/]         ← SDK 버전 교체 시 여기만 수정
        │  from qasql import QASQLEngine
        ▼
[qasql SDK]               ← 절대 수정하지 않음
```

**SDK 버전 교체 절차:**
1. `qasql/` 디렉토리 내용 교체 (새 버전)
2. `platform/engine/SDK_VERSION` 파일 버전 번호 갱신
3. `engine/adapter/` 에서 새 API 변경사항만 반영
4. `engine/requirements.txt` 버전 핀 업데이트
5. CHK-05 체크포인트 재검증

**`SDK_VERSION` 파일 예시:**
```
1.0.4
# 변경 이력
# 1.0.4 (2026-03-25): 최초 연동
# 1.0.5 (미정): setup() 반환값 구조 변경 시 adapter/setup.py 수정 필요
```

---

### 2. Python ↔ TypeScript 경계

두 언어의 경계는 **HTTP (Vercel Serverless Function 호출)** 이다.
Next.js API Route → Python Handler를 HTTP로 호출하며, JSON으로 데이터를 주고받는다.

```
[TypeScript: app/api/projects/[id]/setup/route.ts]
        │  POST http://내부엔드포인트/engine/setup
        │  { project_id, internal_secret }
        ▼
[Python: engine/handlers/setup_handler.py]
        │  adapter.setup(project_id) 호출
        │  { status: "done" | "error" }
        ▼
[TypeScript: 응답 처리 후 클라이언트 반환]
```

**경계 규칙:**
- TypeScript에서는 암호화된 자격증명을 Python에 전달하지 않는다 (Python이 Supabase에서 직접 조회)
- Python에서는 UI 관련 로직을 포함하지 않는다
- 두 언어 간 공유 상수(에러 코드 등)는 문서화로 동기화한다

---

### 3. Vercel 배포 구성

Vercel은 `platform/` 디렉토리를 루트로 인식하도록 설정한다.

**`platform/vercel.json`:**
```json
{
  "functions": {
    "app/api/v1/**": { "maxDuration": 60 },
    "app/api/projects/*/setup": { "maxDuration": 120 },
    "engine/handlers/**": {
      "runtime": "python3.12",
      "maxDuration": 120
    }
  },
  "rewrites": [
    {
      "source": "/internal/engine/:path*",
      "destination": "/engine/handlers/:path*"
    }
  ]
}
```

**Vercel 프로젝트 설정:**
```
Root Directory: platform
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

---

### 4. 컴포넌트 분류 기준

| 위치 | 기준 | 예시 |
|------|------|------|
| `components/ui/` | 도메인 모름, 재사용 가능 | `Button`, `Modal`, `Table` |
| `components/features/` | 특정 도메인에 종속 | `ProjectCard`, `ApiKeyRevealModal` |
| `hooks/` | 상태/데이터 fetch 로직 | `useProjects`, `useSchemaRealtime` |
| `lib/` | 순수 함수, 비즈니스 로직 | `encrypt()`, `generateApiKey()` |
| `app/(platform)/*/page.tsx` | 페이지 조립만 | features 컴포넌트 조합 |

**컴포넌트 작성 규칙:**
- `ui/` 컴포넌트는 Supabase, API 호출 금지
- `features/` 컴포넌트는 `hooks/` 또는 props로만 데이터 수신
- `page.tsx`는 레이아웃 조립 + Server Component 데이터 fetch만

---

### 5. 환경변수 관리

| 변수 | 위치 | 접근 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | 브라우저 + 서버 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | 브라우저 + 서버 |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + `.env.local` | 서버 전용 |
| `ENCRYPTION_KEY` | Vercel + `.env.local` | 서버 전용 |
| `INTERNAL_API_SECRET` | Vercel + `.env.local` | 서버 전용 (TS↔Python 인증) |
| `NEXT_PUBLIC_APP_URL` | Vercel + `.env.local` | 브라우저 + 서버 |

**`.env.example` 파일** (Git에 포함):
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ENCRYPTION_KEY=<openssl rand -hex 32>
INTERNAL_API_SECRET=<openssl rand -hex 32>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### 6. Supabase 마이그레이션 전략

마이그레이션은 순번 기반으로 관리하며, 한 번 실행된 파일은 수정하지 않는다.

```
supabase/migrations/
├── 001_create_tables.sql       ← 테이블 생성
├── 002_rls_policies.sql        ← RLS 정책
├── 003_storage_policies.sql    ← Storage 정책
└── 004_xxx.sql                 ← 이후 변경사항 (새 파일로 추가)
```

**규칙:**
- 기존 마이그레이션 파일 수정 금지 → 새 파일로 ALTER/추가
- 마이그레이션 실행 후 `npx supabase gen types` 재실행하여 `types/supabase.ts` 갱신

---

### 7. SDK 업그레이드 체크리스트

SDK 새 버전이 릴리즈되었을 때 따라야 하는 절차:

```
[ ] 1. qasql/ 디렉토리를 새 버전으로 교체
[ ] 2. platform/engine/SDK_VERSION 파일 버전 업데이트
[ ] 3. platform/engine/requirements.txt 버전 핀 업데이트
[ ] 4. 새 버전 CHANGELOG 확인 → engine/adapter/ 영향 범위 파악
        - engine.query() 반환 구조 변경 → adapter/query.py 수정
        - engine.setup() 동작 변경 → adapter/setup.py 수정
        - 새 DB/LLM 지원 추가 → adapter/connection.py 수정
[ ] 5. CHK-05 체크포인트 재검증 (Python 함수 단위 테스트)
[ ] 6. CHK-06 체크포인트 재검증 (외부 API E2E)
[ ] 7. Vercel Preview 배포 후 기존 쿼리 정상 동작 확인
[ ] 8. 프로덕션 배포
```

---

## 파일 명명 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| Next.js 페이지 | kebab-case 디렉토리 + `page.tsx` | `reset-password/page.tsx` |
| React 컴포넌트 | kebab-case 파일명 | `api-key-table.tsx` |
| TypeScript 유틸 | kebab-case | `verify-api-key.ts` |
| Python 파일 | snake_case | `setup_handler.py` |
| Zod 스키마 | kebab-case | `db-config.ts` |
| 환경변수 | UPPER_SNAKE_CASE | `ENCRYPTION_KEY` |
| DB 테이블 | `qasql_` + snake_case | `qasql_projects` |

---

## 계층 간 의존성 규칙

```
app/page.tsx
    │  (Server Component: 데이터 fetch)
    ├── components/features/  (표시)
    │       └── components/ui/  (기본 요소)
    │
    └── hooks/  (클라이언트 상태)
            └── lib/supabase/client.ts

app/api/route.ts
    ├── lib/api/auth-guard.ts
    ├── lib/api/validate.ts
    ├── lib/crypto/encrypt.ts
    ├── lib/api-key/
    ├── lib/supabase/server.ts
    └── (Python 함수 HTTP 호출)

engine/handlers/
    └── engine/adapter/         ← SDK 호출은 여기서만
            └── qasql/          ← SDK (읽기 전용)
```

**금지 사항:**
- `components/` 에서 `lib/supabase/server.ts` import (서버 전용 모듈)
- `engine/adapter/` 에서 `qasql/` 내부 모듈 직접 import (공개 API만 사용)
- `app/api/v1/` 에서 Supabase anon key 사용 (service_role만 허용)
- `lib/` 에서 React import (순수 함수 유지)
