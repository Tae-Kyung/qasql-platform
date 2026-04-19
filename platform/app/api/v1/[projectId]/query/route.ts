import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import { verifyApiKeyFromRequest } from "@/lib/api/verify-api-key";
import { validateBody } from "@/lib/api/validate";
import { queryRequestSchema } from "@/lib/validations/query";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await ctx.params;

  // 1. API Key 검증
  const verified = await verifyApiKeyFromRequest(req, projectId);
  if (verified instanceof NextResponse) return verified;

  // 2. Rate Limit 검사
  const rateLimitError = await checkRateLimit(projectId);
  if (rateLimitError) return rateLimitError;

  // 3. 요청 바디 검증
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "요청 바디가 올바르지 않습니다" },
      { status: 400 }
    );
  }

  const { data: input, error: validationError } = validateBody(queryRequestSchema, body);
  if (validationError) return validationError;

  const supabase = await createServiceClient();
  const startTime = Date.now();

  // 4. 프로젝트 및 config 조회
  const { data: project } = await supabase
    .from("qasql_projects")
    .select("id, status")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json(
      { error: "PROJECT_NOT_FOUND", message: "프로젝트를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const { data: config } = await supabase
    .from("qasql_project_configs")
    .select("schema_status, llm_provider, db_type")
    .eq("project_id", projectId)
    .single();

  if (!config?.llm_provider || !config?.db_type) {
    await logQuery(supabase, projectId, input!.question, null, false, "DB_CONNECTION_FAILED", startTime);
    return NextResponse.json(
      { error: "DB_CONNECTION_FAILED", message: "DB 및 LLM 설정이 완료되지 않았습니다" },
      { status: 503 }
    );
  }

  if (config.schema_status !== "done") {
    await logQuery(supabase, projectId, input!.question, null, false, "DB_CONNECTION_FAILED", startTime);
    return NextResponse.json(
      { error: "DB_CONNECTION_FAILED", message: "스키마 초기화가 완료되지 않았습니다" },
      { status: 503 }
    );
  }

  // 5. Python 엔진 호출
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}`;
  const engineUrl = `${baseUrl}/api/engine/query`;
  let engineResult: Record<string, unknown>;
  try {
    const engineRes = await fetch(engineUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
      },
      body: JSON.stringify({
        project_id: projectId,
        question: input!.question,
        hint: input!.hint,
        execute: input!.execute,
        options: input!.options,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!engineRes.ok) {
      const errBody = await engineRes.json().catch(() => ({}));
      const errCode = (errBody as { error?: string }).error ?? "INTERNAL_ERROR";
      await logQuery(supabase, projectId, input!.question, null, false, errCode, startTime);
      return NextResponse.json(
        { error: errCode, message: (errBody as { message?: string }).message ?? "엔진 오류가 발생했습니다" },
        { status: engineRes.status }
      );
    }

    engineResult = await engineRes.json();
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    const code = isTimeout ? "QUERY_TIMEOUT" : "LLM_UNAVAILABLE";
    await logQuery(supabase, projectId, input!.question, null, false, code, startTime);
    return NextResponse.json(
      { error: code, message: isTimeout ? "쿼리 시간이 초과되었습니다" : "LLM 서비스에 연결할 수 없습니다" },
      { status: 503 }
    );
  }

  // 6. 성공 로그 기록
  const latencyMs = Date.now() - startTime;
  await supabase.from("qasql_query_logs").insert({
    project_id: projectId,
    question: input!.question,
    hint: input!.hint ?? null,
    generated_sql: (engineResult.sql as string) ?? null,
    confidence: (engineResult.confidence as number) ?? null,
    reasoning: (engineResult.reasoning as string) ?? null,
    candidates_tried: (engineResult.candidates_tried as number) ?? null,
    candidates_succeeded: (engineResult.candidates_succeeded as number) ?? null,
    executed: input!.execute ?? false,
    row_count: Array.isArray(engineResult.rows) ? (engineResult.rows as unknown[]).length : null,
    latency_ms: latencyMs,
    llm_tokens_used: (engineResult.usage as { llm_tokens_used?: number } | null)?.llm_tokens_used ?? null,
    success: true,
    error_code: null,
  });

  // 7. 프로젝트 상태 active로 업데이트
  await supabase
    .from("qasql_projects")
    .update({ status: "active" })
    .eq("id", projectId);

  return NextResponse.json({
    sql: engineResult.sql,
    confidence: engineResult.confidence,
    reasoning: engineResult.reasoning,
    candidates_tried: engineResult.candidates_tried,
    candidates_succeeded: engineResult.candidates_succeeded,
    rows: engineResult.rows,
    columns: engineResult.columns,
    usage: {
      latency_ms: latencyMs,
      llm_tokens_used:
        (engineResult.usage as { llm_tokens_used?: number } | null)?.llm_tokens_used ?? 0,
    },
  });
}

async function logQuery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  projectId: string,
  question: string,
  sql: string | null,
  success: boolean,
  errorCode: string,
  startTime: number
) {
  await supabase.from("qasql_query_logs").insert({
    project_id: projectId,
    question,
    generated_sql: sql,
    executed: false,
    success,
    error_code: errorCode,
    latency_ms: Date.now() - startTime,
  });
}
