import { createHash, randomBytes } from "crypto";

export interface GeneratedApiKey {
  raw: string;
  hash: string;
  prefix: string;
}

/**
 * API Key 생성
 * 형식: sk-qasql-{projectId 앞 8자}-{randomBytes(24).hex}
 */
export function generateApiKey(projectId: string): GeneratedApiKey {
  const projectPrefix = projectId.replace(/-/g, "").slice(0, 8);
  const random = randomBytes(24).toString("hex");
  const raw = `sk-qasql-${projectPrefix}-${random}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 20);

  return { raw, hash, prefix };
}
