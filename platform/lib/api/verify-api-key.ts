import { createHash, timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export interface VerifiedApiKey {
  project_id: string;
  key_id: string;
}

/**
 * Authorization: Bearer <rawKey> 헤더를 파싱하고 API Key를 검증한다.
 * 성공 시 { project_id, key_id } 반환, 실패 시 NextResponse(401/403) 반환.
 */
export async function verifyApiKeyFromRequest(
  req: NextRequest,
  projectId: string
): Promise<VerifiedApiKey | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "INVALID_API_KEY", message: "Authorization 헤더가 없습니다" },
      { status: 401 }
    );
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) {
    return NextResponse.json(
      { error: "INVALID_API_KEY", message: "API Key가 비어 있습니다" },
      { status: 401 }
    );
  }

  // rawKey에서 projectId 8자 접두어 추출하여 빠른 lookup
  const supabase = await createServiceClient();

  const { data: keys, error } = await supabase
    .from("qasql_api_keys")
    .select("id, key_hash, is_active, expires_at, ip_whitelist")
    .eq("project_id", projectId);

  if (error || !keys || keys.length === 0) {
    return NextResponse.json(
      { error: "INVALID_API_KEY", message: "유효하지 않은 API Key입니다" },
      { status: 401 }
    );
  }

  // SHA-256(rawKey) 계산 후 timing-safe 비교
  const inputHash = createHash("sha256").update(rawKey).digest("hex");
  const inputBuf = Buffer.from(inputHash, "hex");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchedKey = keys.find((k: any) => {
    const storedBuf = Buffer.from(k.key_hash as string, "hex");
    if (inputBuf.length !== storedBuf.length) return false;
    return timingSafeEqual(inputBuf, storedBuf);
  });

  if (!matchedKey) {
    return NextResponse.json(
      { error: "INVALID_API_KEY", message: "유효하지 않은 API Key입니다" },
      { status: 401 }
    );
  }

  // 활성 상태 확인
  if (!(matchedKey as { is_active: boolean }).is_active) {
    return NextResponse.json(
      { error: "INVALID_API_KEY", message: "비활성화된 API Key입니다" },
      { status: 401 }
    );
  }

  // 만료 확인
  const expiresAt = (matchedKey as { expires_at: string | null }).expires_at;
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return NextResponse.json(
      { error: "INVALID_API_KEY", message: "만료된 API Key입니다" },
      { status: 401 }
    );
  }

  // IP Whitelist 확인
  const ipWhitelist = (matchedKey as { ip_whitelist: string[] }).ip_whitelist ?? [];
  if (ipWhitelist.length > 0) {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "";
    if (!ipWhitelist.includes(clientIp)) {
      return NextResponse.json(
        { error: "INVALID_API_KEY", message: "허용되지 않은 IP입니다" },
        { status: 401 }
      );
    }
  }

  return {
    project_id: projectId,
    key_id: (matchedKey as { id: string }).id,
  };
}
