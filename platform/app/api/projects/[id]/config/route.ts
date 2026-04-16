import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { dbConfigSchema } from "@/lib/validations/db-config";
import { llmConfigSchema } from "@/lib/validations/llm-config";
import { encrypt } from "@/lib/crypto/encrypt";
import { createServiceClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";
import { z } from "zod";

const configSchema = z.object({
  db: dbConfigSchema.optional(),
  llm: llmConfigSchema.optional(),
  readable_names: z.record(z.record(z.string())).optional(),
  options: z.record(z.unknown()).optional(),
});

async function getOwnedProject(projectId: string, userId: string) {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("qasql_projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();
  return data;
}

export const GET = withAuth(async (_req, ctx, user: User) => {
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) {
    return NextResponse.json(
      { success: false, error: "PROJECT_NOT_FOUND", message: "프로젝트를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const supabase = await createServiceClient();
  const { data: config } = await supabase
    .from("qasql_project_configs")
    .select("*")
    .eq("project_id", id)
    .single();

  if (!config) {
    return NextResponse.json(
      { success: false, error: "PROJECT_NOT_FOUND", message: "설정을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      ...config,
      db_password_enc: config.db_password_enc ? "****" : null,
      supabase_key_enc: config.supabase_key_enc ? "****" : null,
      llm_api_key_enc: config.llm_api_key_enc ? "****" : null,
    },
  });
});

export const PUT = withAuth(async (req, ctx, user: User) => {
  try {
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) {
    return NextResponse.json(
      { success: false, error: "PROJECT_NOT_FOUND", message: "프로젝트를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { data, error: validErr } = validateBody(configSchema, body);
  if (validErr) return validErr;

  const supabase = await createServiceClient();
  const update: Record<string, unknown> = {};

  if (data.db) {
    const db = data.db;
    update.db_type = db.db_type;

    if (db.db_type === "supabase") {
      update.supabase_url = db.supabase_url;
      update.supabase_key_enc = db.supabase_key ? encrypt(db.supabase_key) : undefined;
      // pg_uri: parse and store individual fields
      if ("pg_uri" in db && db.pg_uri) {
        try {
          const u = new URL(db.pg_uri as string);
          update.db_host = u.hostname;
          update.db_port = u.port ? parseInt(u.port, 10) : 5432;
          update.db_name = u.pathname.replace(/^\//, "") || "postgres";
          update.db_user = decodeURIComponent(u.username) || "postgres";
          if (u.password) update.db_password_enc = encrypt(decodeURIComponent(u.password));
        } catch {
          // invalid URI — skip
        }
      }
    } else {
      update.db_host = "db_host" in db ? db.db_host : null;
      update.db_port = "db_port" in db ? db.db_port : null;
      update.db_name = db.db_name ?? null;
      update.db_user = "db_user" in db ? db.db_user : null;
      if ("db_password" in db && db.db_password) {
        update.db_password_enc = encrypt(db.db_password);
      }
    }
  }

  if (data.llm) {
    const llm = data.llm;
    update.llm_provider = llm.llm_provider;
    update.llm_model = llm.llm_model;
    if ("llm_api_key" in llm && llm.llm_api_key) {
      update.llm_api_key_enc = encrypt(llm.llm_api_key);
    }
    if ("llm_base_url" in llm && llm.llm_base_url) {
      update.llm_base_url = llm.llm_base_url;
    }
  }

  if (data.readable_names !== undefined) {
    update.readable_names = data.readable_names;
  }

  if (data.options !== undefined) {
    // options는 기존 값과 병합 (덮어쓰지 않음)
    update.options = data.options;
  }

  const { data: updated, error } = await supabase
    .from("qasql_project_configs")
    .update(update)
    .eq("project_id", id)
    .select()
    .single();

  if (error) {
    console.error("[config PUT] Supabase error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: `DB 오류: ${error.message ?? error.code ?? JSON.stringify(error)}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      db_password_enc: updated?.db_password_enc ? "****" : null,
      supabase_key_enc: updated?.supabase_key_enc ? "****" : null,
      llm_api_key_enc: updated?.llm_api_key_enc ? "****" : null,
    },
  });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[config PUT] unhandled:", e);
    return NextResponse.json({ success: false, error: "INTERNAL_ERROR", message: `예외: ${msg}` }, { status: 500 });
  }
});
