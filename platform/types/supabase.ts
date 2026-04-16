// 이 파일은 Supabase CLI로 자동 생성됩니다.
// npx supabase gen types typescript --project-id <project-id> > types/supabase.ts
// 마이그레이션 실행 후 재생성할 것 — 수동 편집 금지
//
// 현재: 001_create_tables.sql 기준 수동 작성 (임시)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      qasql_profiles: {
        Row: {
          id: string;
          plan: "free" | "pro" | "enterprise";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          plan?: "free" | "pro" | "enterprise";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan?: "free" | "pro" | "enterprise";
          updated_at?: string;
        };
      };
      qasql_projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          status: "draft" | "active" | "error";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          status?: "draft" | "active" | "error";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          status?: "draft" | "active" | "error";
          updated_at?: string;
        };
      };
      qasql_project_configs: {
        Row: {
          id: string;
          project_id: string;
          db_type: "sqlite" | "postgresql" | "mysql" | "supabase" | null;
          db_host: string | null;
          db_port: number | null;
          db_name: string | null;
          db_user: string | null;
          db_password_enc: string | null;
          supabase_url: string | null;
          supabase_key_enc: string | null;
          llm_provider: "ollama" | "anthropic" | "openai" | null;
          llm_model: string | null;
          llm_api_key_enc: string | null;
          llm_base_url: string | null;
          options: Json;
          readable_names: Json;
          schema_cache_path: string | null;
          schema_status: "none" | "running" | "done" | "error";
          schema_updated_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          db_type?: "sqlite" | "postgresql" | "mysql" | "supabase" | null;
          db_host?: string | null;
          db_port?: number | null;
          db_name?: string | null;
          db_user?: string | null;
          db_password_enc?: string | null;
          supabase_url?: string | null;
          supabase_key_enc?: string | null;
          llm_provider?: "ollama" | "anthropic" | "openai" | null;
          llm_model?: string | null;
          llm_api_key_enc?: string | null;
          llm_base_url?: string | null;
          options?: Json;
          readable_names?: Json;
          schema_cache_path?: string | null;
          schema_status?: "none" | "running" | "done" | "error";
          schema_updated_at?: string | null;
        };
        Update: {
          db_type?: "sqlite" | "postgresql" | "mysql" | "supabase" | null;
          db_host?: string | null;
          db_port?: number | null;
          db_name?: string | null;
          db_user?: string | null;
          db_password_enc?: string | null;
          supabase_url?: string | null;
          supabase_key_enc?: string | null;
          llm_provider?: "ollama" | "anthropic" | "openai" | null;
          llm_model?: string | null;
          llm_api_key_enc?: string | null;
          llm_base_url?: string | null;
          options?: Json;
          readable_names?: Json;
          schema_cache_path?: string | null;
          schema_status?: "none" | "running" | "done" | "error";
          schema_updated_at?: string | null;
        };
      };
      qasql_api_keys: {
        Row: {
          id: string;
          project_id: string;
          key_hash: string;
          key_prefix: string;
          is_active: boolean;
          expires_at: string | null;
          ip_whitelist: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          key_hash: string;
          key_prefix: string;
          is_active?: boolean;
          expires_at?: string | null;
          ip_whitelist?: string[];
          created_at?: string;
        };
        Update: {
          is_active?: boolean;
          expires_at?: string | null;
          ip_whitelist?: string[];
        };
      };
      qasql_query_logs: {
        Row: {
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
        };
        Insert: {
          id?: string;
          project_id: string;
          question?: string | null;
          hint?: string | null;
          generated_sql?: string | null;
          confidence?: number | null;
          reasoning?: string | null;
          candidates_tried?: number | null;
          candidates_succeeded?: number | null;
          executed?: boolean;
          row_count?: number | null;
          latency_ms?: number | null;
          llm_tokens_used?: number | null;
          success?: boolean;
          error_code?: string | null;
          created_at?: string;
        };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
