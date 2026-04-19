import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
import { withAuth } from "@/lib/api/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto/encrypt";
import { User } from "@supabase/supabase-js";

/** Supabase OpenAPI spec → schema.json 형태로 변환 */
function parseSupabaseSchema(
  spec: Record<string, unknown>
): Record<string, { column_name: string; data_type: string }[]> {
  const defs = (spec.definitions ?? {}) as Record<
    string,
    { properties?: Record<string, { type?: string; format?: string }> }
  >;
  const result: Record<string, { column_name: string; data_type: string }[]> = {};
  for (const [tableName, tableDef] of Object.entries(defs)) {
    const props = tableDef.properties ?? {};
    result[tableName] = Object.entries(props).map(([colName, colDef]) => ({
      column_name: colName,
      data_type: colDef.format ?? colDef.type ?? "unknown",
    }));
  }
  return result;
}

export const POST = withAuth(async (_req, ctx, user: User) => {
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
    .select("db_type, llm_provider, schema_status, supabase_url, supabase_key_enc")
    .eq("project_id", id)
    .single();

  if (!config?.db_type || !config?.llm_provider) {
    return NextResponse.json(
      { success: false, error: "BAD_REQUEST", message: "DB와 LLM 설정을 먼저 완료해주세요" },
      { status: 400 }
    );
  }

  if (config.schema_status === "running") {
    return NextResponse.json(
      { success: false, error: "BAD_REQUEST", message: "스키마 초기화가 이미 진행 중입니다" },
      { status: 409 }
    );
  }

  // status를 running으로 업데이트
  await supabase
    .from("qasql_project_configs")
    .update({ schema_status: "running" })
    .eq("project_id", id);

  // Supabase 타입은 OpenAPI 스펙으로 직접 처리 (Python 엔진 불필요)
  if (config.db_type === "supabase") {
    try {
      await runSupabaseSetup(id, config.supabase_url, config.supabase_key_enc, supabase);
      return NextResponse.json({
        success: true,
        data: { schema_status: "done", message: "스키마 초기화가 완료되었습니다" },
      });
    } catch (err) {
      await supabase
        .from("qasql_project_configs")
        .update({ schema_status: "error" })
        .eq("project_id", id);
      const msg = err instanceof Error ? err.message : "스키마 초기화 실패";
      return NextResponse.json(
        { success: false, error: "SETUP_FAILED", message: msg },
        { status: 500 }
      );
    }
  }

  // PostgreSQL/MySQL/SQLite: Python 엔진으로 위임
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL}`;
  const engineUrl = `${baseUrl}/api/engine/setup`;
  fetch(engineUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
    },
    body: JSON.stringify({ project_id: id }),
  }).catch(() => {
    supabase
      .from("qasql_project_configs")
      .update({ schema_status: "error" })
      .eq("project_id", id);
  });

  return NextResponse.json({
    success: true,
    data: { schema_status: "running", message: "스키마 초기화가 시작되었습니다" },
  });
});

async function runSupabaseSetup(
  projectId: string,
  supabaseUrl: string | null,
  supabaseKeyEnc: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const url = supabaseUrl ?? "";
  const key = supabaseKeyEnc ? decrypt(supabaseKeyEnc) : "";

  // 1. OpenAPI 스펙 가져오기
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase OpenAPI 응답 오류: HTTP ${res.status}`);
  const spec = await res.json();

  // 2. 스키마 파싱
  const schema = parseSupabaseSchema(spec);
  const schemaJson = JSON.stringify(schema);

  // 3. Supabase Storage에 저장
  const cachePath = `${projectId}/schema`;
  const { error: uploadError } = await supabase.storage
    .from("schema-cache")
    .upload(`${cachePath}/schema.json`, new Blob([schemaJson], { type: "application/json" }), {
      upsert: true,
    });

  if (uploadError) throw new Error(`스키마 저장 실패: ${uploadError.message}`);

  // 4. 상태 업데이트
  await supabase
    .from("qasql_project_configs")
    .update({
      schema_status: "done",
      schema_cache_path: cachePath,
      schema_updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId);
}
