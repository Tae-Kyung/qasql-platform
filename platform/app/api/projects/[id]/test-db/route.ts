import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto/encrypt";
import { User } from "@supabase/supabase-js";

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
    .select("*")
    .eq("project_id", id)
    .single();

  if (!config?.db_type) {
    return NextResponse.json(
      { success: false, error: "BAD_REQUEST", message: "DB 설정이 없습니다" },
      { status: 400 }
    );
  }

  try {
    if (config.db_type === "supabase") {
      const key = config.supabase_key_enc ? decrypt(config.supabase_key_enc) : "";
      const url = config.supabase_url ?? "";

      // OpenAPI 스펙으로 테이블 목록 조회 (service_role 기반)
      const res = await fetch(`${url}/rest/v1/`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Supabase 응답 오류 (HTTP ${res.status}): ${text.slice(0, 100)}`);
      }
      const spec = await res.json();
      const tableCount = Object.keys(spec.definitions ?? {}).length;

      return NextResponse.json({
        success: true,
        data: { connected: true, table_count: tableCount },
      });
    }

    if (config.db_type === "postgresql") {
      const { Client } = await import("pg");
      const password = config.db_password_enc ? decrypt(config.db_password_enc) : "";
      const client = new Client({
        host: config.db_host ?? "localhost",
        port: config.db_port ?? 5432,
        database: config.db_name ?? "",
        user: config.db_user ?? "",
        password,
        connectionTimeoutMillis: 5000,
        ssl: false,
      });
      await client.connect();
      const { rows } = await client.query(
        "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = 'public'"
      );
      await client.end();
      return NextResponse.json({
        success: true,
        data: { table_count: parseInt(rows[0]?.cnt ?? "0", 10) },
      });
    }

    return NextResponse.json({
      success: false,
      error: "DB_CONNECTION_FAILED",
      message: `${config.db_type} 연결 테스트는 엔진 서버를 통해 처리됩니다 (Phase 5)`,
    }, { status: 503 });

  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    const safeMsg = msg.split("\n")[0].slice(0, 200);
    return NextResponse.json(
      { success: false, error: "DB_CONNECTION_FAILED", message: safeMsg },
      { status: 503 }
    );
  }
});
