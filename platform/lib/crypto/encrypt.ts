import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY 환경변수가 설정되지 않았습니다");
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32)
    throw new Error("ENCRYPTION_KEY는 32바이트(64자 hex)여야 합니다");
  return buf;
}

/**
 * AES-256-GCM 암호화
 * @returns "iv:authTag:ciphertext" (각 파트 base64)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * AES-256-GCM 복호화
 * @param encryptedData "iv:authTag:ciphertext" (각 파트 base64)
 */
export function decrypt(encryptedData: string): string {
  const key = getKey();
  const parts = encryptedData.split(":");
  if (parts.length !== 3)
    throw new Error("잘못된 암호문 형식 (iv:authTag:ciphertext 형식 필요)");

  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
