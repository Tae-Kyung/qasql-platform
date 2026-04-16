import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import { verifyApiKeyFromRequest } from "@/lib/api/verify-api-key";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { validateBody } from "@/lib/api/validate";

const executeSchema = z.object({
  sql: z.string().min(1, "SQL을 입력하세요").max(10000),
});

// DML 차단: SELECT 외 쿼리 거부
function isDml(sql: string): boolean {
  const normalized = sql.trim().toUpperCase();
  const dmlKeywords = ["INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "TRUNCATE", "REPLACE", "MERGE"];
  return dmlKeywords.some((kw) => normalized.startsWith(kw));
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await ctx.params;

  // API Key 검증
  const verified = await verifyApiKeyFromRequest(req, projectId);
  if (verified instanceof NextResponse) return verified;

  // 요청 바디 검증
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "요청 바디가 올바르지 않습니다" },
      { status: 400 }
    );
  }

  const { data: input, error: validationError } = validateBody(executeSchema, body);
  if (validationError) return validationError;

  // DML 차단
  if (isDml(input!.sql)) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "SELECT 쿼리만 실행할 수 있습니다" },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  // config 확인
  const { data: config } = await supabase
    .from("qasql_project_configs")
    .select("schema_status")
    .eq("project_id", projectId)
    .single();

  if (!config || config.schema_status !== "done") {
    return NextResponse.json(
      { error: "DB_CONNECTION_FAILED", message: "스키마 초기화가 완료되지 않았습니다" },
      { status: 503 }
    );
  }

  // Python 엔진의 execute 엔드포인트 호출
  const engineUrl = `${process.env.NEXT_PUBLIC_APP_URL}/internal/engine/query`;
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
        question: null,
        raw_sql: input!.sql,
        execute: true,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!engineRes.ok) {
      const errBody = await engineRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: (errBody as { error?: string }).error ?? "INTERNAL_ERROR",
          message: (errBody as { message?: string }).message ?? "실행 중 오류가 발생했습니다",
        },
        { status: engineRes.status }
      );
    }

    engineResult = await engineRes.json();
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    return NextResponse.json(
      {
        error: isTimeout ? "QUERY_TIMEOUT" : "DB_CONNECTION_FAILED",
        message: isTimeout ? "쿼리 시간이 초과되었습니다" : "DB 연결에 실패했습니다",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    sql: input!.sql,
    rows: engineResult.rows,
    columns: engineResult.columns,
    row_count: Array.isArray(engineResult.rows) ? (engineResult.rows as unknown[]).length : 0,
  });
}
