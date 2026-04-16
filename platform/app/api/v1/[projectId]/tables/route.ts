import { NextRequest, NextResponse } from "next/server";
import { verifyApiKeyFromRequest } from "@/lib/api/verify-api-key";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await ctx.params;

  // API Key 검증
  const verified = await verifyApiKeyFromRequest(req, projectId);
  if (verified instanceof NextResponse) return verified;

  const supabase = await createServiceClient();

  // schema_cache_path 조회
  const { data: config } = await supabase
    .from("qasql_project_configs")
    .select("schema_cache_path, schema_status")
    .eq("project_id", projectId)
    .single();

  if (!config || config.schema_status !== "done" || !config.schema_cache_path) {
    return NextResponse.json(
      { error: "DB_CONNECTION_FAILED", message: "스키마 초기화가 완료되지 않았습니다" },
      { status: 503 }
    );
  }

  // Supabase Storage에서 schema.json 다운로드
  const schemaPath = `${config.schema_cache_path}/schema.json`;
  const { data: fileData, error } = await supabase.storage
    .from("schema-cache")
    .download(schemaPath);

  if (error || !fileData) {
    return NextResponse.json(
      { error: "DB_CONNECTION_FAILED", message: "스키마 캐시를 불러올 수 없습니다" },
      { status: 503 }
    );
  }

  const text = await fileData.text();
  let schema: Record<string, unknown>;
  try {
    schema = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "스키마 데이터가 손상되었습니다" },
      { status: 500 }
    );
  }

  const tables = Object.keys(schema);
  return NextResponse.json({ tables, count: tables.length });
}
