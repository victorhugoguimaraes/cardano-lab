import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export async function sha256File(path: string): Promise<string> {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}

export function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

export function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}
