import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";

async function getOwnedKey(keyId: string, projectId: string, userId: string) {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("qasql_api_keys")
    .select("id, project_id")
    .eq("id", keyId)
    .eq("project_id", projectId)
    .single();

  if (!data) return null;

  // 프로젝트 소유 확인
  const { data: project } = await supabase
    .from("qasql_projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  return project ? data : null;
}

export const PATCH = withAuth(async (req, ctx, user: User) => {
  const { id, keyId } = await ctx.params;
  const key = await getOwnedKey(keyId, id, user.id);
  if (!key) {
    return NextResponse.json(
      { success: false, error: "PROJECT_NOT_FOUND", message: "API Key를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;
  if (Array.isArray(body.ip_whitelist)) update.ip_whitelist = body.ip_whitelist;

  const supabase = await createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (supabase as any)
    .from("qasql_api_keys")
    .update(update)
    .eq("id", keyId)
    .select("id, key_prefix, is_active, expires_at, ip_whitelist, created_at")
    .single();

  if (error) {
    console.error("[api-key PATCH] Supabase error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "API 키 업데이트 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: updated });
});

export const DELETE = withAuth(async (_req, ctx, user: User) => {
  const { id, keyId } = await ctx.params;
  const key = await getOwnedKey(keyId, id, user.id);
  if (!key) {
    return NextResponse.json(
      { success: false, error: "PROJECT_NOT_FOUND", message: "API Key를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const supabase = await createServiceClient();
  const { error } = await supabase.from("qasql_api_keys").delete().eq("id", keyId);

  if (error) {
    console.error("[api-key DELETE] Supabase error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "API 키 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: null });
});
