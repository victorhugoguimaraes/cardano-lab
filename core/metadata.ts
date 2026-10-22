import { isSha256, utf8ByteLength } from "./hashing";
import type { Cip25Metadata, NftMetadata } from "./types";

const MAX_TEXT_BYTES = 64;

function validateValue(value: unknown, path: string): void {
  if (typeof value === "string") {
    if (utf8ByteLength(value) > MAX_TEXT_BYTES) {
      throw new Error(`${path} excede 64 bytes UTF-8.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateValue(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      if (utf8ByteLength(key) > MAX_TEXT_BYTES) {
        throw new Error(`${path}.${key} excede 64 bytes UTF-8.`);
      }
      validateValue(item, `${path}.${key}`);
    });
    return;
  }
  throw new Error(`${path} deve conter apenas strings, arrays ou objetos.`);
}

export function validateAssetName(assetName: string): void {
  if (!assetName) throw new Error("O asset name não pode ser vazio.");
  if (utf8ByteLength(assetName) > 32) {
    throw new Error("O asset name deve ocupar no máximo 32 bytes UTF-8.");
  }
}

export function validateNftMetadata(metadata: Cip25Metadata, policyId: string, assetName: string): void {
  validateAssetName(assetName);
  if (!metadata["721"]?.[policyId]?.[assetName]) {
    throw new Error("Metadados não possuem a chave CIP-25 721/policyId/assetName esperada.");
  }
  const item = metadata["721"][policyId][assetName];
  if (!item.name || !item.image) throw new Error("Os campos name e image são obrigatórios.");
  if (typeof item.image === "string" && !/^(ipfs:\/\/|https:\/\/)/.test(item.image)) {
    throw new Error("image deve ser uma URI ipfs:// ou https:// acessível.");
  }
  if (!isSha256(item.sha256)) throw new Error("sha256 deve conter 64 caracteres hexadecimais.");
  validateValue(metadata, "metadata");
}

export function buildCip25Metadata(
  policyId: string,
  assetName: string,
  item: NftMetadata
): Cip25Metadata {
  const metadata: Cip25Metadata = { "721": { [policyId]: { [assetName]: item } } };
  validateNftMetadata(metadata, policyId, assetName);
  return metadata;
}
