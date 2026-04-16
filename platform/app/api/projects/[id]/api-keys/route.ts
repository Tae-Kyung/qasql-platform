import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-key/generate";
import { User } from "@supabase/supabase-js";

async function getOwnedProject(projectId: string, userId: string) {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("qasql_projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();
  return data;
}

export const GET = withAuth(async (_req, ctx, user: User) => {
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) {
    return NextResponse.json(
      { success: false, error: "PROJECT_NOT_FOUND", message: "프로젝트를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const supabase = await createServiceClient();
  const { data: keys, error } = await supabase
    .from("qasql_api_keys")
    .select("id, key_prefix, is_active, expires_at, ip_whitelist, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api-keys GET] Supabase error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "API 키 목록 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: keys });
});

export const POST = withAuth(async (req, ctx, user: User) => {
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) {
    return NextResponse.json(
      { success: false, error: "PROJECT_NOT_FOUND", message: "프로젝트를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const expiresAt: string | null = body.expires_at ?? null;
  const ipWhitelist: string[] = body.ip_whitelist ?? [];

  const { raw, hash, prefix } = generateApiKey(id);

  const supabase = await createServiceClient();
  const { data: key, error } = await supabase
    .from("qasql_api_keys")
    .insert({
      project_id: id,
      key_hash: hash,
      key_prefix: prefix,
      is_active: true,
      expires_at: expiresAt,
      ip_whitelist: ipWhitelist,
    })
    .select("id, key_prefix, is_active, expires_at, ip_whitelist, created_at")
    .single();

  if (error) {
    console.error("[api-keys POST] Supabase error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "API 키 생성 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }

  // raw key는 이 응답에만 1회 포함
  return NextResponse.json(
    {
      success: true,
      data: { ...key, raw_key: raw },
      warning: "이 키는 지금만 표시됩니다. 안전한 곳에 보관하세요.",
    },
    { status: 201 }
  );
});
