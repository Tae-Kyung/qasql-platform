import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { createProjectSchema } from "@/lib/validations/project";
import { createServiceClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";

const PLAN_PROJECT_LIMITS: Record<string, number> = {
  free: 1,
  pro: 10,
  enterprise: 9999,
};

export const GET = withAuth(async (_req, _ctx, user: User) => {
  const supabase = await createServiceClient();

  const { data: projects, error } = await supabase
    .from("qasql_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[projects GET] Supabase error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "프로젝트 목록 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }

  // 프로젝트별 API 호출 수 + 마지막 쿼리 일시 집계
  const enriched = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (projects ?? []).map(async (p: any) => {
      const { count } = await supabase
        .from("qasql_query_logs")
        .select("*", { count: "exact", head: true })
        .eq("project_id", p.id);

      const { data: lastLog } = await supabase
        .from("qasql_query_logs")
        .select("created_at")
        .eq("project_id", p.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...p,
        api_call_count: count ?? 0,
        last_queried_at: lastLog?.created_at ?? null,
      };
    })
  );

  return NextResponse.json({ success: true, data: enriched });
});

export const POST = withAuth(async (req, _ctx, user: User) => {
  const body = await req.json().catch(() => ({}));
  const { data, error: validErr } = validateBody(createProjectSchema, body);
  if (validErr) return validErr;

  const supabase = await createServiceClient();

  // 플랜 조회
  const { data: profile } = await supabase
    .from("qasql_profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = (profile as { plan?: string } | null)?.plan ?? "free";
  const limit = PLAN_PROJECT_LIMITS[plan] ?? 1;

  // 현재 프로젝트 수 확인
  const { count } = await supabase
    .from("qasql_projects")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      {
        success: false,
        error: "FORBIDDEN",
        message: `${plan} 플랜은 최대 ${limit}개 프로젝트까지 생성할 수 있습니다`,
      },
      { status: 403 }
    );
  }

  const { data: project, error } = await supabase
    .from("qasql_projects")
    .insert({ user_id: user.id, name: data.name, description: data.description ?? null })
    .select()
    .single();

  if (error) {
    console.error("[projects POST] Supabase error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "프로젝트 생성 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }

  // config 레코드 생성 (빈 설정)
  await supabase.from("qasql_project_configs").insert({ project_id: project.id });

  return NextResponse.json({ success: true, data: project }, { status: 201 });
});
