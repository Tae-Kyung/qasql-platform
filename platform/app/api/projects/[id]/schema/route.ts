import { NextResponse } from "next/server";
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
    .select("schema_status, schema_cache_path, readable_names, options")
    .eq("project_id", id)
    .single();

  const options = (config?.options ?? {}) as Record<string, unknown>;
  const selectedTables: string[] = Array.isArray(options.selected_tables)
    ? (options.selected_tables as string[])
    : [];

  if (!config || config.schema_status !== "done" || !config.schema_cache_path) {
    return NextResponse.json({
      success: true,
      data: { tables: [], readable_names: config?.readable_names ?? {}, selected_tables: selectedTables },
    });
  }

  const schemaPath = `${config.schema_cache_path}/schema.json`;
  const { data: fileData, error } = await supabase.storage
    .from("schema-cache")
    .download(schemaPath);

  if (error || !fileData) {
    return NextResponse.json({
      success: true,
      data: { tables: [], readable_names: config.readable_names ?? {} },
    });
  }

  const text = await fileData.text();
  let schema: Record<string, { column_name: string; data_type: string }[]>;
  try {
    schema = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "스키마 데이터가 손상되었습니다" },
      { status: 500 }
    );
  }

  const tables = Object.entries(schema).map(([table_name, columns]) => ({
    table_name,
    columns: Array.isArray(columns) ? columns : [],
  }));

  return NextResponse.json({
    success: true,
    data: { tables, readable_names: config.readable_names ?? {}, selected_tables: selectedTables },
  });
});
