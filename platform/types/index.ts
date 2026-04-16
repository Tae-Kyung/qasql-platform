// 플랫폼 전용 타입 정의

export type Plan = "free" | "pro" | "enterprise";
export type ProjectStatus = "draft" | "active" | "error";
export type DbType = "sqlite" | "postgresql" | "mysql" | "supabase";
export type LlmProvider = "ollama" | "anthropic" | "openai";
export type SchemaStatus = "none" | "running" | "done" | "error";

// ── 프로젝트 ──────────────────────────────────────────────
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectConfig {
  id: string;
  project_id: string;
  db_type: DbType | null;
  db_host: string | null;
  db_port: number | null;
  db_name: string | null;
  db_user: string | null;
  db_password_enc: string | null;
  supabase_url: string | null;
  supabase_key_enc: string | null;
  llm_provider: LlmProvider | null;
  llm_model: string | null;
  llm_api_key_enc: string | null;
  llm_base_url: string | null;
  options: Record<string, unknown>;
  readable_names: Record<string, unknown>;
  schema_cache_path: string | null;
  schema_status: SchemaStatus;
  schema_updated_at: string | null;
}

export interface ApiKey {
  id: string;
  project_id: string;
  key_hash: string;
  key_prefix: string;
  is_active: boolean;
  expires_at: string | null;
  ip_whitelist: string[];
  created_at: string;
}

export interface QueryLog {
  id: string;
  project_id: string;
  question: string | null;
  hint: string | null;
  generated_sql: string | null;
  confidence: number | null;
  reasoning: string | null;
  candidates_tried: number | null;
  candidates_succeeded: number | null;
  executed: boolean;
  row_count: number | null;
  latency_ms: number | null;
  llm_tokens_used: number | null;
  success: boolean;
  error_code: string | null;
  created_at: string;
}

// ── API 요청/응답 ─────────────────────────────────────────
export interface CreateProjectBody {
  name: string;
  description?: string;
}

export interface UpdateProjectBody {
  name?: string;
  description?: string;
}

export interface DbConfigBody {
  db_type: DbType;
  db_host?: string;
  db_port?: number;
  db_name?: string;
  db_user?: string;
  db_password?: string;
  supabase_url?: string;
  supabase_key?: string;
}

export interface LlmConfigBody {
  llm_provider: LlmProvider;
  llm_model: string;
  llm_api_key?: string;
  llm_base_url?: string;
}

export interface QueryRequestBody {
  question: string;
  hint?: string;
  execute?: boolean;
  options?: {
    relevance_threshold?: number;
    query_timeout?: number;
  };
}

export interface QueryResponseBody {
  success: boolean;
  sql?: string;
  confidence?: number;
  reasoning?: string;
  candidates_tried?: number;
  candidates_succeeded?: number;
  rows?: Record<string, unknown>[];
  columns?: string[];
  usage?: {
    latency_ms: number;
    llm_tokens_used: number;
  };
  error?: string;
  message?: string;
}

// ── 에러 코드 ─────────────────────────────────────────────
export type ApiErrorCode =
  | "INVALID_API_KEY"
  | "PROJECT_NOT_FOUND"
  | "DB_CONNECTION_FAILED"
  | "LLM_UNAVAILABLE"
  | "NO_VALID_SQL"
  | "RATE_LIMIT_EXCEEDED"
  | "QUERY_TIMEOUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";
