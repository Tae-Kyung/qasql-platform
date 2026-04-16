# PRD: QA-SQL Platform

**Product Requirements Document**
Version 2.0 | 2026-03-25

---

## 문서 구성

| 문서 | 역할 |
|------|------|
| **PRD.md** (이 문서) | 제품 요구사항 전체 정의 — 무엇을 만들 것인가 |
| **STRUCTURE.md** | 프로젝트 폴더 구조 및 설계 원칙 — 어떻게 조직할 것인가 |
| **TASK.md** | 단계별 개발 태스크 및 검증 체크포인트 — 어떤 순서로 만들 것인가 |

---

## 1. 개요

### 1.1 제품 비전

QA-SQL Platform은 **QA-SQL SDK를 기반으로 구축된 웹 기반 NL-to-SQL SaaS 플랫폼**이다. 사용자는 회원가입 후 프로젝트를 생성하고, 데이터베이스 및 LLM 설정을 완료하면 즉시 사용 가능한 REST API를 발급받는다. 이 API를 통해 어떤 외부 시스템에서도 자연어로 데이터베이스를 질의하는 NL-to-SQL 기능을 쉽게 구현할 수 있다.

### 1.2 핵심 가치

| 가치 | 설명 |
|------|------|
| **즉시 사용** | 코드 없이 설정만으로 NL-to-SQL API 발급 |
| **프라이버시 보장** | 고객 DB와 LLM은 고객이 직접 지정 — 데이터가 플랫폼 외부로 나가지 않음 |
| **범용 연동** | REST API 형태로 어떤 시스템에도 붙일 수 있음 |
| **SDK 100% 활용** | QA-SQL SDK의 모든 기능을 그대로 제공, SDK 코드 수정 없음 |
| **SDK 업그레이드 대응** | 어댑터 레이어로 SDK 버전 교체를 플랫폼과 격리 |

### 1.3 대상 사용자

- **개발자**: 자사 시스템에 NL-to-SQL 기능을 빠르게 통합하고 싶은 소프트웨어 엔지니어
- **데이터 팀**: SQL을 모르는 비기술 사용자를 위해 자연어 데이터 조회 환경을 만들고 싶은 팀
- **SI/솔루션 업체**: 고객사 시스템에 NL-to-SQL 기능을 납품하려는 개발사

---

## 2. QA-SQL SDK 핵심 기능 (변경 없이 100% 유지)

플랫폼은 아래 SDK 기능을 백엔드 엔진으로 그대로 활용한다. **SDK 코드(`qasql/` 디렉토리) 자체는 절대 수정하지 않는다.**

### 2.1 4단계 파이프라인

```
자연어 질문
    │
    ▼
[1] Schema Agent (Map-Reduce)
    관련 테이블/컬럼만 추출
    │
    ▼
[2] SQL Candidate Generator
    5가지 전략으로 SQL 후보 4~5개 생성
    (FULL_SCHEMA / SME_METADATA / MINIMAL_PROFILE / FOCUSED_SCHEMA / FULL_PROFILE)
    │
    ▼
[3] SQL Executor
    각 후보 실행 → 실패 시 LLM으로 자동 수정
    │
    ▼
[4] LLM-as-a-Judge
    최적 SQL 선택 + 신뢰도 점수 반환
```

### 2.2 지원 데이터베이스

| DB | 연결 방식 |
|----|----------|
| SQLite | `sqlite:///path/to/db.sqlite` |
| PostgreSQL | `postgresql://user:pass@host:port/db` |
| MySQL | `mysql://user:pass@host:3306/db` |
| Supabase | URL + Service Role Key |

### 2.3 지원 LLM 프로바이더

| 프로바이더 | 방식 |
|-----------|------|
| Ollama | 로컬 HTTP (프라이버시 최우선) |
| Anthropic Claude | API Key |
| OpenAI | API Key |

### 2.4 주요 쿼리 옵션

- `question`: 자연어 질문 (필수)
- `hint`: 도메인 전문가 힌트 (선택, 정확도 향상)
- `execute`: SQL 실행 결과 포함 여부
- `relevance_threshold`: 스키마 필터링 임계값
- `query_timeout`: 쿼리 타임아웃
- `readable_names`: 컬럼명 가독성 매핑

---

## 3. 플랫폼 기능 요구사항

### 3.1 인증 및 회원 관리

#### FR-AUTH-01: 회원가입
- 이메일 + 비밀번호로 가입 (비밀번호 8자 이상)
- 이메일 인증 완료 후 서비스 이용 가능
- 가입 시 무료 플랜(Free) 자동 부여 (`qasql_profiles` 트리거로 자동 생성)

#### FR-AUTH-02: 로그인
- 이메일/비밀번호 로그인
- Supabase Auth JWT 기반 세션 관리 (Access Token 1시간, Refresh Token 7일)
- 비밀번호 찾기 (이메일 재설정 링크)

#### FR-AUTH-03: 계정 설정
- 비밀번호 변경
- 계정 삭제 (확인 모달 + "DELETE" 텍스트 입력 필수, 소프트 삭제 30일 유예)

---

### 3.2 프로젝트 관리

#### FR-PROJ-01: 프로젝트 생성
- 사용자당 최대 N개 프로젝트 생성 (플랜별 상이)
- 입력 항목: 이름(필수, 최대 100자), 설명(선택, 최대 500자)

#### FR-PROJ-02: 프로젝트 목록 / 상세
- 생성된 모든 프로젝트 목록 조회
- 각 프로젝트의 상태(draft/active/error), API 호출 수, 마지막 쿼리 일시 표시
- 탭 구성: 개요 / DB 설정 / LLM 설정 / API Key / 스키마 / 위험 구역

#### FR-PROJ-03: 프로젝트 수정 / 삭제
- 이름, 설명, DB 설정, LLM 설정 변경 가능
- 프로젝트 삭제 시 관련 config, api_keys, query_logs 전부 cascade 삭제

---

### 3.3 데이터베이스 설정

#### FR-DB-01: DB 연결 설정
각 프로젝트에 하나의 DB를 연결한다.

| DB 타입 | 필요 입력 |
|---------|----------|
| SQLite | 파일 경로 또는 URL |
| PostgreSQL | Host, Port, DB명, Username, Password (또는 URI 직접 입력) |
| MySQL | Host, Port, DB명, Username, Password (또는 URI 직접 입력) |
| Supabase | Project URL, Service Role Key |

#### FR-DB-02: 연결 테스트
- 저장 전 "연결 테스트" 버튼으로 접속 가능 여부 확인
- 테스트 쿼리: `SELECT 1` 또는 테이블 목록 조회만 허용 (DML 차단)
- 성공 시 테이블 수 표시, 실패 시 에러 메시지 (스택 트레이스 미노출)

#### FR-DB-03: DB 자격증명 보안 저장
- 비밀번호 등 민감 정보는 AES-256-GCM 암호화 후 Supabase DB 저장
- UI에서는 `****` 마스킹 표시, 수정 시 재입력 안내

---

### 3.4 LLM 설정

#### FR-LLM-01: LLM 프로바이더 설정

| 프로바이더 | 필요 입력 |
|-----------|----------|
| Ollama | Base URL (예: `http://192.168.1.100:11434`), 모델명 |
| Anthropic Claude | API Key, 모델명 (예: `claude-sonnet-4-6`) |
| OpenAI | API Key, 모델명 (예: `gpt-4o`) |

#### FR-LLM-02: LLM 연결 테스트
- 간단한 프롬프트("respond with OK")로 응답 가능 여부 확인
- LLM API Key는 AES-256-GCM 암호화 후 저장

---

### 3.5 API Key 관리

#### FR-KEY-01: API Key 발급
- 형식: `sk-qasql-{projectId 앞 8자}-{random 48chars hex}`
- DB에는 SHA-256 해시만 저장, 원문은 발급 시 1회만 표시
- 발급 모달에 경고 문구: "이 키는 지금만 표시됩니다. 안전한 곳에 보관하세요."

#### FR-KEY-02: API Key 재발급 / 삭제
- 기존 Key 삭제 후 새 Key 발급 가능
- 삭제된 Key는 즉시 무효화

#### FR-KEY-03: Key 권한 제어
- IP Whitelist 설정 (빈 배열 = 전체 허용)
- Key별 만료일 설정 (선택)

---

### 3.6 발급 API (외부 시스템 연동)

플랫폼이 외부 시스템에 제공하는 핵심 REST API다.

#### FR-API-01: NL-to-SQL 쿼리 API

```
POST /api/v1/{project_id}/query
Authorization: Bearer sk-qasql-{projectId8자}-{random}
Content-Type: application/json
```

**Request Body**
```json
{
  "question": "지난달 매출 상위 10개 고객은?",
  "hint": "매출 = sum(amount) from orders",
  "execute": true,
  "options": {
    "relevance_threshold": 0.3,
    "query_timeout": 30
  }
}
```

**Response (성공)**
```json
{
  "success": true,
  "sql": "SELECT customer_id, SUM(amount) AS revenue FROM orders WHERE ...",
  "confidence": 0.92,
  "reasoning": "FOCUSED_SCHEMA 전략이 가장 정확한 결과를 반환함",
  "candidates_tried": 5,
  "candidates_succeeded": 3,
  "rows": [{"customer_id": 1, "revenue": 5200000}],
  "columns": ["customer_id", "revenue"],
  "usage": { "latency_ms": 2340, "llm_tokens_used": 1240 }
}
```

**Response (실패)**
```json
{
  "success": false,
  "error": "NO_VALID_SQL",
  "message": "유효한 SQL을 생성하지 못했습니다.",
  "usage": { "latency_ms": 4100, "llm_tokens_used": 890 }
}
```

#### FR-API-02: 테이블 목록 API
```
GET /api/v1/{project_id}/tables
Authorization: Bearer sk-qasql-xxx
```

#### FR-API-03: 스키마 조회 API
```
GET /api/v1/{project_id}/schema/{table_name}
Authorization: Bearer sk-qasql-xxx
```

#### FR-API-04: SQL 직접 실행 API
```
POST /api/v1/{project_id}/execute
Authorization: Bearer sk-qasql-xxx
```
SELECT만 허용, DML(INSERT/UPDATE/DELETE/DROP 등) 차단

#### FR-API-05: 에러 코드

| 코드 | HTTP | 설명 |
|------|------|------|
| `INVALID_API_KEY` | 401 | 유효하지 않은 API Key |
| `PROJECT_NOT_FOUND` | 404 | 프로젝트 없음 |
| `DB_CONNECTION_FAILED` | 503 | DB 연결 실패 |
| `LLM_UNAVAILABLE` | 503 | LLM 응답 불가 |
| `NO_VALID_SQL` | 422 | SQL 생성 실패 |
| `RATE_LIMIT_EXCEEDED` | 429 | 호출 한도 초과 |
| `QUERY_TIMEOUT` | 408 | 쿼리 타임아웃 |

---

### 3.7 대시보드 및 모니터링

#### FR-DASH-01: 프로젝트 대시보드
- 기간별 API 호출 수 (일/주/월) 라인 차트
- 성공률 파이 차트
- 평균 응답 시간, 평균 신뢰도 숫자 카드

#### FR-DASH-02: 쿼리 히스토리
- 전체 쿼리 로그 (질문, 생성된 SQL, 신뢰도, 소요 시간)
- 검색 및 필터 (날짜 범위, 성공/실패, 신뢰도 범위)
- CSV 내보내기

#### FR-DASH-03: Playground
- 자연어 질문 + Hint 입력 → SQL 생성 → 신뢰도/reasoning 표시
- 생성된 SQL 직접 편집 후 재실행 가능
- 실행 결과 테이블 표시

---

### 3.8 스키마 관리

#### FR-SCHEMA-01: 스키마 초기화
- "스키마 분석 시작" 실행 → SDK `engine.setup()` 호출
- Supabase Realtime으로 진행 상태 실시간 표시
- 완료 후 스키마 캐시를 Supabase Storage에 저장

#### FR-SCHEMA-02: 스키마 재초기화
- DB 구조 변경 시 수동으로 재분석 가능
- 이전 스키마 캐시 삭제 후 재실행

#### FR-SCHEMA-03: Readable Names 설정
- UI에서 컬럼명 → 사람이 읽기 쉬운 이름 매핑 테이블 관리
- SDK `readable_names` 옵션으로 전달

---

## 4. 비기능 요구사항

### 4.1 보안

| 항목 | 요구사항 |
|------|---------|
| 전송 암호화 | 모든 통신 HTTPS (Vercel + Supabase 기본 제공) |
| 자격증명 저장 | DB 비밀번호, LLM API Key — AES-256-GCM 암호화 후 Supabase DB 저장 |
| 암호화 키 | Vercel 환경변수 `ENCRYPTION_KEY`에 저장, 코드에 포함 금지 |
| API Key | SHA-256 해시 후 Supabase 저장, 원문 발급 시 1회만 표시 |
| 세션 | Supabase Auth JWT (Access 1시간, Refresh 7일) |
| DB 격리 | Supabase RLS로 사용자별 데이터 접근 제어 |
| TS↔Python 통신 | `INTERNAL_API_SECRET` 헤더로 내부 엔드포인트 보호 |
| Rate Limiting | Vercel Middleware로 플랜별 호출 한도 적용 |
| DML 차단 | 외부 `/execute` API에서 SELECT만 허용 |

### 4.2 성능

| 항목 | 목표 |
|------|------|
| API 응답 시간 (p50) | 3초 이하 (LLM 처리 시간 제외) |
| API 응답 시간 (p95) | 10초 이하 |
| 플랫폼 가용성 | 99.5% 이상 |
| 동시 쿼리 처리 | 프로젝트당 최대 5 동시 요청 |
| Vercel 함수 타임아웃 | 쿼리 API 60초, 스키마 초기화 120초 |

### 4.3 확장성

- Vercel Serverless Function 기반 — 수평 확장 자동
- 프로젝트별 독립 엔진 인스턴스 (요청별 격리)
- SDK 업그레이드 시 어댑터 레이어만 수정 (플랫폼 코드 영향 없음)
- Supabase 마이그레이션 순번 관리로 스키마 변경 추적

---

## 5. 기술 스택

| 레이어 | 기술 | 선택 이유 |
|--------|------|----------|
| **SDK 엔진** | QA-SQL SDK (Python) | 기존 코드 100% 재사용 |
| **SDK 어댑터** | Python (`platform/engine/adapter/`) | SDK와 플랫폼 사이 격리 레이어 |
| **Python 함수** | Vercel Python Runtime 3.12 | SDK를 Serverless로 실행 |
| **Backend API** | Next.js 14 API Routes | 프론트엔드와 통합 배포, TypeScript |
| **Frontend** | Next.js 14 App Router | Vercel 최적화 SSR, React 생태계 |
| **Platform DB** | Supabase PostgreSQL | RLS 내장, 플랫폼 메타데이터 저장 |
| **Auth** | Supabase Auth | 이메일/JWT 내장, 트리거 연동 |
| **파일 저장** | Supabase Storage | SDK 스키마 캐시 (`qasql_output/`) |
| **실시간** | Supabase Realtime | 스키마 초기화 진행 상태 구독 |
| **배포** | Vercel | Next.js 네이티브, 글로벌 CDN |
| **유효성 검사** | Zod | TypeScript 타입 추론 연동 |
| **폼 관리** | React Hook Form | Zod 스키마 연동 |
| **차트** | Recharts | React 기반 사용량 시각화 |

---

## 6. 시스템 아키텍처

### 6.1 전체 구조

```
[사용자 브라우저]                    [외부 시스템 / 고객 앱]
        │                                    │ Bearer Token
        ▼                                    ▼
┌───────────────────────────────────────────────────────┐
│                    Vercel                             │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Next.js 14 (platform/)                        │  │
│  │  ├── app/(auth)/         인증 페이지            │  │
│  │  ├── app/(platform)/     플랫폼 Web UI          │  │
│  │  └── app/api/            TypeScript API Routes  │  │
│  │      ├── /auth/          로그아웃               │  │
│  │      ├── /projects/      플랫폼 내부 API        │  │
│  │      └── /v1/            외부 공개 API          │  │
│  └────────────────────────┬────────────────────────┘  │
│                           │ HTTP (INTERNAL_API_SECRET) │
│  ┌────────────────────────▼────────────────────────┐  │
│  │  Python Serverless (platform/engine/)           │  │
│  │  ├── handlers/      Vercel 진입점               │  │
│  │  ├── adapter/   ◄── SDK 어댑터 (격리 레이어)    │  │
│  │  └── utils/         암호화, Storage, Supabase   │  │
│  └────────────────────────┬────────────────────────┘  │
└───────────────────────────┼───────────────────────────┘
                            │
              ┌─────────────┼──────────────┐
              ▼             ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────────┐
        │ Supabase │  │ 고객 DB  │  │  고객 LLM    │
        │ Auth     │  │ PG/MySQL │  │  Ollama/     │
        │ DB       │  │ SQLite   │  │  Claude/     │
        │ Storage  │  │ Supabase │  │  OpenAI      │
        │ Realtime │  └──────────┘  └──────────────┘
        └──────────┘

[qasql/ SDK]  ←── adapter/가 호출 (직접 import 금지)
```

### 6.2 SDK 어댑터 격리 구조

SDK를 플랫폼이 직접 `import` 하지 않는다. 반드시 어댑터를 통해서만 접근한다.

```
[Python Handler]
      │
      ▼
[engine/adapter/]    ← SDK 업그레이드 시 여기만 수정
      │  from qasql import QASQLEngine
      ▼
[qasql/ SDK]         ← 절대 수정하지 않음
```

### 6.3 요청 흐름 — 외부 API 쿼리

```
외부 시스템
  │  POST /api/v1/{project_id}/query
  │  Authorization: Bearer sk-qasql-xxx
  ▼
Vercel API Route (TypeScript)
  │  1. Bearer Token → SHA-256 → DB 해시 비교
  │  2. is_active, expires_at, ip_whitelist 검사
  │  3. project_config 조회 (암호화된 자격증명)
  ▼
Python Handler (HTTP 호출)
  │  4. Supabase에서 project_config 직접 조회
  │  5. AES-256 복호화 → DB URI, LLM 설정
  │  6. Storage에서 스키마 캐시 다운로드
  │  7. QASQLEngine 초기화 (어댑터 경유)
  │  8. engine.query(question, hint) 실행
  ▼
고객 DB + 고객 LLM (4단계 파이프라인)
  ▼
Vercel API Route
  │  9. qasql_query_logs 기록
  │  10. JSON 응답 반환
  ▼
외부 시스템
```

### 6.4 요청 흐름 — 스키마 초기화

```
브라우저
  │  "스키마 분석 시작" 클릭
  ▼
Vercel API Route
  │  schema_status = 'running' 업데이트
  │  Python Handler 비동기 호출 후 즉시 200 반환
  ▼
Python Handler (백그라운드)
  │  engine.setup() 실행
  │  qasql_output/ → Supabase Storage 업로드
  │  schema_status = 'done' 업데이트
  ▼
Supabase Realtime
  │  DB 변경 감지 → 브라우저 푸시
  ▼
브라우저 (실시간 상태 표시)
```

---

## 7. 프로젝트 구조

> 상세 디렉토리 트리 및 설계 원칙은 `STRUCTURE.md` 참고

### 7.1 Monorepo 구성

```
qasql-sdk/                    ← Git 루트 (Monorepo)
├── qasql/                    ← SDK (수정 금지)
├── examples/                 ← SDK 예제
├── platform/                 ← Next.js 플랫폼 (Vercel Root)
│   ├── app/                  ← Next.js App Router
│   ├── components/           ← UI 컴포넌트
│   ├── lib/                  ← 비즈니스 로직 (TypeScript)
│   ├── hooks/                ← React Custom Hooks
│   ├── types/                ← TypeScript 타입
│   ├── engine/               ← Python SDK 어댑터 레이어
│   │   ├── adapter/          ← SDK 래퍼 (SDK 업그레이드 시 수정)
│   │   ├── handlers/         ← Vercel Python Serverless 진입점
│   │   ├── utils/            ← 암호화, Storage, Supabase 유틸
│   │   ├── requirements.txt
│   │   └── SDK_VERSION       ← 연동 SDK 버전 기록
│   ├── supabase/
│   │   └── migrations/       ← 순번 기반 마이그레이션 SQL
│   ├── middleware.ts          ← Edge Middleware
│   └── vercel.json           ← 함수 타임아웃 설정
├── PRD.md
├── TASK.md
└── STRUCTURE.md
```

### 7.2 계층 간 의존성 규칙

```
app/page.tsx (Server Component)
    ├── components/features/   표시 담당
    │       └── components/ui/ 기본 요소
    └── hooks/                 클라이언트 상태
            └── lib/supabase/client.ts

app/api/route.ts
    ├── lib/api/               공통 유틸 (auth-guard, validate, response)
    ├── lib/crypto/            AES-256 암호화
    ├── lib/api-key/           Key 생성/검증
    └── lib/supabase/server.ts

engine/handlers/ (Python)
    └── engine/adapter/        SDK 호출은 여기서만
            └── qasql/         SDK (읽기 전용)
```

**금지 사항:**
- `components/`에서 `lib/supabase/server.ts` import
- `engine/adapter/`에서 `qasql/` 내부 모듈 직접 import (공개 API만)
- `app/api/v1/`에서 Supabase anon key 사용 (service_role만 허용)
- `lib/`에서 React import (순수 함수 유지)

---

## 8. 데이터 모델

> Supabase PostgreSQL 기준. 인증은 Supabase Auth가 자동 관리하며, 플랫폼은 `auth.users`를 참조하는 `qasql_profiles` 테이블을 별도 운영한다.

### 8.1 테이블 정의

**`qasql_profiles`** — Supabase Auth 연동
```sql
id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
plan       TEXT NOT NULL DEFAULT 'free'
             CHECK (plan IN ('free', 'pro', 'enterprise'))
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- 신규 가입 시 트리거로 자동 생성
-- RLS: 본인 레코드만 조회/수정
```

**`qasql_projects`**
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100)
description TEXT CHECK (char_length(description) <= 500)
status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'active', 'error'))
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- RLS: user_id = auth.uid() 인 레코드만 접근
```

**`qasql_project_configs`**
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id        UUID NOT NULL REFERENCES qasql_projects(id) ON DELETE CASCADE UNIQUE
db_type           TEXT CHECK (db_type IN ('sqlite','postgresql','mysql','supabase'))
db_host           TEXT
db_port           INTEGER CHECK (db_port BETWEEN 1 AND 65535)
db_name           TEXT
db_user           TEXT
db_password_enc   TEXT        -- AES-256-GCM 암호화
supabase_url      TEXT
supabase_key_enc  TEXT        -- AES-256-GCM 암호화
llm_provider      TEXT CHECK (llm_provider IN ('ollama','anthropic','openai'))
llm_model         TEXT
llm_api_key_enc   TEXT        -- AES-256-GCM 암호화
llm_base_url      TEXT
options           JSONB NOT NULL DEFAULT '{}'   -- relevance_threshold, timeout 등
readable_names    JSONB NOT NULL DEFAULT '{}'   -- 컬럼명 매핑
schema_cache_path TEXT        -- Supabase Storage 경로
schema_status     TEXT NOT NULL DEFAULT 'none'
                    CHECK (schema_status IN ('none','running','done','error'))
schema_updated_at TIMESTAMPTZ
-- RLS: qasql_projects 통해 간접 적용
```

**`qasql_api_keys`**
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id   UUID NOT NULL REFERENCES qasql_projects(id) ON DELETE CASCADE
key_hash     TEXT NOT NULL UNIQUE   -- SHA-256 해시 (원문 비저장)
key_prefix   TEXT NOT NULL          -- 표시용 앞 20자
is_active    BOOLEAN NOT NULL DEFAULT TRUE
expires_at   TIMESTAMPTZ
ip_whitelist TEXT[] NOT NULL DEFAULT '{}'
created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- RLS: qasql_projects 통해 간접 적용
```

**`qasql_query_logs`**
```sql
id                   UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id           UUID NOT NULL REFERENCES qasql_projects(id) ON DELETE CASCADE
question             TEXT
hint                 TEXT
generated_sql        TEXT
confidence           FLOAT CHECK (confidence BETWEEN 0 AND 1)
reasoning            TEXT
candidates_tried     INTEGER
candidates_succeeded INTEGER
executed             BOOLEAN NOT NULL DEFAULT FALSE
row_count            INTEGER
latency_ms           INTEGER
llm_tokens_used      INTEGER
success              BOOLEAN NOT NULL DEFAULT FALSE
error_code           TEXT
created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- RLS: qasql_projects 통해 간접 적용
-- 쿼리 실행 결과 원본 데이터 비저장 (프라이버시)
```

### 8.2 Supabase Storage 구조

```
schema-cache/                   ← private 버킷
└── {project_id}/
    └── qasql_output/           ← SDK engine.setup()이 생성하는 캐시
        ├── schema.json
        ├── profile.json
        └── descriptions.json
```

### 8.3 Supabase 설정

| 항목 | 설정 |
|------|------|
| 이메일 인증 | 활성화 (가입 후 확인 필수) |
| JWT Access Token 만료 | 3600초 (1시간) |
| JWT Refresh Token 만료 | 604800초 (7일) |
| RLS | 전체 테이블 활성화 필수 |
| 소셜 로그인 | Google OAuth (Phase 3) |

### 8.4 마이그레이션 전략

```
platform/supabase/migrations/
├── 001_create_tables.sql       ← 테이블 + 인덱스 + 트리거
├── 002_rls_policies.sql        ← RLS 정책
├── 003_storage_policies.sql    ← Storage 버킷 정책
└── 004_xxx.sql                 ← 이후 변경사항 (새 파일 추가, 기존 수정 금지)
```

---

## 9. 환경변수

| 변수 | 접근 범위 | 용도 |
|------|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저 + 서버 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저 + 서버 | Supabase 공개 키 |
| `NEXT_PUBLIC_APP_URL` | 브라우저 + 서버 | 플랫폼 도메인 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 | Supabase RLS 우회 (서버 사이드) |
| `ENCRYPTION_KEY` | 서버 전용 | AES-256 암호화 키 (32바이트 hex) |
| `INTERNAL_API_SECRET` | 서버 전용 | TypeScript ↔ Python 내부 통신 인증 |

**생성 방법:**
```bash
openssl rand -hex 32   # ENCRYPTION_KEY 및 INTERNAL_API_SECRET 생성
```

---

## 10. Vercel 배포 구성

**Vercel 프로젝트 설정:**
```
Root Directory:  platform
Build Command:   npm run build
Output:          .next
Install:         npm install
```

**`platform/vercel.json`:**
```json
{
  "functions": {
    "app/api/v1/**":            { "maxDuration": 60 },
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

---

## 11. 플랜 및 제한

| 항목 | Free | Pro | Enterprise |
|------|------|-----|-----------|
| 프로젝트 수 | 1 | 5 | 무제한 |
| 월 API 호출 수 | 100 | 5,000 | 협의 |
| 동시 요청 수 | 1 | 5 | 협의 |
| 히스토리 보관 | 7일 | 90일 | 무제한 |
| IP Whitelist | X | O | O |
| 이메일 지원 | X | O | O (전담) |

---

## 12. SDK 업그레이드 전략

SDK 새 버전이 릴리즈되었을 때 플랫폼에 영향을 최소화하며 이식하는 절차:

```
[ ] 1. qasql/ 디렉토리를 새 버전으로 교체
[ ] 2. platform/engine/SDK_VERSION 파일 버전 갱신
[ ] 3. platform/engine/requirements.txt 버전 핀 업데이트
[ ] 4. SDK CHANGELOG 확인 → engine/adapter/ 영향 범위 파악
        engine.query() 반환 구조 변경  → adapter/query.py 수정
        engine.setup() 동작 변경       → adapter/setup.py 수정
        새 DB/LLM 지원 추가            → adapter/connection.py 수정
[ ] 5. TASK.md CHK-05 재검증 (Python 어댑터 단위 테스트)
[ ] 6. TASK.md CHK-06 재검증 (외부 API E2E)
[ ] 7. Vercel Preview 배포 후 기존 쿼리 정상 동작 확인
[ ] 8. 프로덕션 배포
```

---

## 13. 개발 로드맵

### Phase 1 — MVP

- [ ] Supabase 프로젝트 생성 및 Auth/RLS/Storage 설정
- [ ] DB 스키마 마이그레이션 (5개 테이블 + 인덱스 + 트리거)
- [ ] Next.js 14 + Vercel 초기 배포
- [ ] 회원가입 / 로그인 / 비밀번호 재설정 UI
- [ ] 프로젝트 CRUD
- [ ] DB/LLM 설정 + 연결 테스트
- [ ] AES-256 암호화 모듈 (Node.js ↔ Python 호환)
- [ ] SDK 어댑터 레이어 (`engine/adapter/`)
- [ ] 스키마 초기화 (Python Function + Supabase Realtime)
- [ ] API Key 발급 / 관리
- [ ] 외부 공개 API (`/api/v1/`) + Rate Limiting
- [ ] 기본 Web UI (대시보드, 프로젝트 설정)

### Phase 2 — 운영 기능

- [ ] Playground (웹 UI에서 쿼리 테스트)
- [ ] 쿼리 히스토리 + CSV 내보내기
- [ ] 사용량 통계 대시보드 (Recharts)
- [ ] IP Whitelist + API Key 만료일 설정

### Phase 3 — 성장 기능

- [ ] 요금제 및 결제 연동 (Stripe)
- [ ] 팀/멤버 관리 (프로젝트 공유)
- [ ] Google OAuth 로그인 (Supabase Auth)
- [ ] Webhook 지원 (쿼리 완료 이벤트)
- [ ] 온프레미스 배포 패키지 (Docker Compose)

---

## 14. 성공 지표 (KPI)

| 지표 | MVP 목표 |
|------|---------|
| 활성 프로젝트 수 | 50개 이상 |
| 월 쿼리 API 호출 수 | 10,000회 이상 |
| 평균 SQL 생성 신뢰도 | 0.80 이상 |
| API 가용성 | 99% 이상 |
| 가입 후 첫 쿼리까지 소요 시간 | 10분 이내 |

---

## 15. 오픈 이슈

| # | 이슈 | 현재 결정 |
|---|------|----------|
| 1 | 고객 DB 직접 연결 vs 프록시 경유 | 직접 연결 (IP Whitelist로 보완) |
| 2 | 스키마 캐시 저장 위치 | Supabase Storage `schema-cache/{project_id}/qasql_output/` |
| 3 | 쿼리 결과 저장 여부 | 메타데이터만 저장, 원본 데이터 비저장 |
| 4 | SQLite 파일 업로드 | Phase 1: 서버 경로/URL 입력으로 대체 |
| 5 | 멀티테넌트 격리 | Vercel Serverless 요청별 독립 실행 |
| 6 | Vercel 함수 타임아웃 | 쿼리 60초, 스키마 초기화 120초 (Pro 플랜) |
| 7 | 암호화 키 관리 | Vercel 환경변수 `ENCRYPTION_KEY` |
| 8 | TS↔Python 내부 통신 인증 | `INTERNAL_API_SECRET` 헤더 |
| 9 | SDK 버전 추적 | `platform/engine/SDK_VERSION` 파일로 관리 |

---

*이 문서는 QA-SQL Platform 개발의 공식 요구사항 기준이다. 변경 시 버전과 날짜를 업데이트한다.*
*관련 문서: `STRUCTURE.md` (프로젝트 구조) | `TASK.md` (개발 태스크)*
