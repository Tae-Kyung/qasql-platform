import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { updateProjectSchema } from "@/lib/validations/project";
import { createServiceClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";

async function getOwnedProject(projectId: string, userId: string) {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("qasql_projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();
  return data;
}

export const GET = withAuth(async (_req, ctx, user: User) => {
  const { id } = await ctx.params;
  const supabase = await createServiceClient();

  const project = await getOwnedProject(id, user.id);
  if (!project) {
    return NextResponse.json(
      { success: false, error: "PROJECT_NOT_FOUND", message: "프로젝트를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const { data: config } = await supabase
    .from("qasql_project_configs")
    .select("*")
    .eq("project_id", id)
    .single();

  // 민감 정보 마스킹
  const maskedConfig = config
    ? {
        ...config,
        db_password_enc: config.db_password_enc ? "****" : null,
        supabase_key_enc: config.supabase_key_enc ? "****" : null,
        llm_api_key_enc: config.llm_api_key_enc ? "****" : null,
      }
    : null;

  return NextResponse.json({ success: true, data: { ...project, config: maskedConfig } });
});

export const PATCH = withAuth(async (req, ctx, user: User) => {
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) {
    return NextResponse.json(
      { success: false, error: "PROJECT_NOT_FOUND", message: "프로젝트를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { data, error: validErr } = validateBody(updateProjectSchema, body);
  if (validErr) return validErr;

  const supabase = await createServiceClient();
  const { data: updated, error } = await supabase
    .from("qasql_projects")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[project PATCH] Supabase error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "프로젝트 업데이트 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: updated });
});

export const DELETE = withAuth(async (_req, ctx, user: User) => {
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) {
    return NextResponse.json(
      { success: false, error: "PROJECT_NOT_FOUND", message: "프로젝트를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const supabase = await createServiceClient();
  const { error } = await supabase.from("qasql_projects").delete().eq("id", id);

  if (error) {
    console.error("[project DELETE] Supabase error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "프로젝트 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: null }, { status: 200 });
});
