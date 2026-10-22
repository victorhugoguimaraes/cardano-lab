import { sha256File } from "./hashing";
import type { BlockfrostProvider } from "@meshsdk/core";

export async function verifyFileAgainstAsset(
  provider: BlockfrostProvider,
  assetUnit: string,
  filePath: string
) {
  const fileHash = await sha256File(filePath);
  const assetMetadata = await provider.fetchAssetMetadata(assetUnit) as Record<string, unknown>;
  const registeredHash = typeof assetMetadata.sha256 === "string" ? assetMetadata.sha256 : undefined;
  if (!registeredHash) {
    throw new Error("O ativo consultado não possui sha256 nos metadados retornados pelo Blockfrost.");
  }
  return {
    filePath,
    fileHash,
    registeredHash,
    matches: fileHash.toLowerCase() === registeredHash.toLowerCase(),
    result: fileHash.toLowerCase() === registeredHash.toLowerCase()
      ? "arquivo correspondente"
      : "arquivo diferente",
  } as const;
}

export async function verifyHashAgainstAsset(
  provider: BlockfrostProvider,
  assetUnit: string,
  fileHash: string
) {
  const assetMetadata = await provider.fetchAssetMetadata(assetUnit) as Record<string, unknown>;
  const registeredHash = typeof assetMetadata.sha256 === "string" ? assetMetadata.sha256 : undefined;
  if (!registeredHash) {
    throw new Error("O ativo consultado não possui sha256 nos metadados retornados pelo Blockfrost.");
  }
  const matches = fileHash.toLowerCase() === registeredHash.toLowerCase();
  return {
    fileHash,
    registeredHash,
    matches,
    result: matches ? "arquivo correspondente" : "arquivo diferente",
  } as const;
}
