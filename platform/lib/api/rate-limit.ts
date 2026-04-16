import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const PLAN_MONTHLY_LIMITS: Record<string, number> = {
  free: 100,
  pro: 5000,
  enterprise: Infinity,
};

/**
 * 월간 API 호출 수 Rate Limiting 검사.
 * 초과 시 429 NextResponse 반환, 허용 시 null 반환.
 */
export async function checkRateLimit(
  projectId: string
): Promise<NextResponse | null> {
  const supabase = await createServiceClient();

  // 프로젝트 소유자 조회
  const { data: project } = await supabase
    .from("qasql_projects")
    .select("user_id")
    .eq("id", projectId)
    .single();

  if (!project) return null;

  // 플랜 조회
  const { data: profile } = await supabase
    .from("qasql_profiles")
    .select("plan")
    .eq("id", project.user_id)
    .single();

  const plan = (profile?.plan as string) ?? "free";
  const limit = PLAN_MONTHLY_LIMITS[plan] ?? PLAN_MONTHLY_LIMITS.free;

  if (limit === Infinity) return null;

  // 이번 달 쿼리 수 집계
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count } = await supabase
    .from("qasql_query_logs")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .gte("created_at", monthStart);

  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      {
        error: "RATE_LIMIT_EXCEEDED",
        message: `월간 API 호출 한도(${limit}회)를 초과했습니다. 플랜을 업그레이드하세요.`,
        limit,
        current: count,
      },
      { status: 429 }
    );
  }

  return null;
}
