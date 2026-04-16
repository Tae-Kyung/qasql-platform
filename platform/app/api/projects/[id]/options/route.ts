import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";

export const PATCH = withAuth(async (req: NextRequest, ctx, user: User) => {
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

  let body: { selected_tables?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "BAD_REQUEST", message: "요청 본문을 파싱할 수 없습니다" },
      { status: 400 }
    );
  }

  const selected_tables = body.selected_tables;
  if (!Array.isArray(selected_tables)) {
    return NextResponse.json(
      { success: false, error: "BAD_REQUEST", message: "selected_tables는 배열이어야 합니다" },
      { status: 400 }
    );
  }

  // Fetch existing options and merge
  const { data: config } = await supabase
    .from("qasql_project_configs")
    .select("options")
    .eq("project_id", id)
    .single();

  const existingOptions = (config?.options ?? {}) as Record<string, unknown>;
  const mergedOptions = { ...existingOptions, selected_tables };

  const { error } = await supabase
    .from("qasql_project_configs")
    .update({ options: mergedOptions })
    .eq("project_id", id);

  if (error) {
    console.error("[options PATCH] Supabase error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
});
