import { createHash, timingSafeEqual } from "crypto";

/**
 * API Key 검증 (timing-safe 비교)
 */
export function verifyApiKey(rawKey: string, storedHash: string): boolean {
  const inputHash = createHash("sha256").update(rawKey).digest("hex");
  const inputBuf = Buffer.from(inputHash, "hex");
  const storedBuf = Buffer.from(storedHash, "hex");

  if (inputBuf.length !== storedBuf.length) return false;
  return timingSafeEqual(inputBuf, storedBuf);
}

/**
 * IP Whitelist 검증
 * whitelist가 빈 배열이면 모든 IP 허용
 */
export function isIpAllowed(clientIp: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) return true;
  return whitelist.includes(clientIp);
}
