import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";

export const GET = withAuth(async (_req, ctx, user: User) => {
  const { id } = await ctx.params;
  const supabase = await createServiceClient();

  const { data: project } = await supabase
    .from("qasql_projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json(
      { success: false, error: "PROJECT_NOT_FOUND", message: "프로젝트를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const { data: config } = await supabase
    .from("qasql_project_configs")
    .select("schema_status, schema_updated_at, schema_cache_path")
    .eq("project_id", id)
    .single();

  return NextResponse.json({
    success: true,
    data: {
      schema_status: config?.schema_status ?? "none",
      schema_updated_at: config?.schema_updated_at ?? null,
      schema_cache_path: config?.schema_cache_path ?? null,
    },
  });
});
