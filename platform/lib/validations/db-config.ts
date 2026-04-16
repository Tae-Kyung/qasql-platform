import { z } from "zod";

const postgresqlSchema = z.object({
  db_type: z.literal("postgresql"),
  db_host: z.string().min(1, "Host를 입력하세요"),
  db_port: z.number().int().min(1).max(65535).default(5432),
  db_name: z.string().min(1, "DB 이름을 입력하세요"),
  db_user: z.string().min(1, "사용자명을 입력하세요"),
  db_password: z.string().optional(),
});

const mysqlSchema = z.object({
  db_type: z.literal("mysql"),
  db_host: z.string().min(1, "Host를 입력하세요"),
  db_port: z.number().int().min(1).max(65535).default(3306),
  db_name: z.string().min(1, "DB 이름을 입력하세요"),
  db_user: z.string().min(1, "사용자명을 입력하세요"),
  db_password: z.string().optional(),
});

const sqliteSchema = z.object({
  db_type: z.literal("sqlite"),
  db_host: z.string().optional(),
  db_port: z.number().optional(),
  db_name: z.string().min(1, "파일 경로 또는 URL을 입력하세요"),
  db_user: z.string().optional(),
  db_password: z.string().optional(),
});

const supabaseSchema = z.object({
  db_type: z.literal("supabase"),
  supabase_url: z.string().url("올바른 Supabase URL을 입력하세요"),
  supabase_key: z.string().optional(),
  pg_uri: z.string().optional(),
  db_host: z.string().optional(),
  db_port: z.number().optional(),
  db_name: z.string().optional(),
  db_user: z.string().optional(),
  db_password: z.string().optional(),
});

export const dbConfigSchema = z.discriminatedUnion("db_type", [
  postgresqlSchema,
  mysqlSchema,
  sqliteSchema,
  supabaseSchema,
]);

export type DbConfigInput = z.infer<typeof dbConfigSchema>;
