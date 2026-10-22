import { describe, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { sha256File, utf8ByteLength } from "../core/hashing";
import { buildCip25Metadata, validateAssetName } from "../core/metadata";

describe("Origem Digital core", () => {
  test("calcula SHA-256 dos bytes do arquivo", async () => {
    const path = `${import.meta.dir}/fixture.txt`;
    await writeFile(path, "origem digital\n", "utf8");
    expect(await sha256File(path)).toBe("fe2d31d0a6fd45f3b8ce128e8d96e64111745d35ddb9e2e3af7b035943fc323c");
  });

  test("mede limite em bytes UTF-8", () => {
    expect(utf8ByteLength("á")).toBe(2);
    expect(() => validateAssetName("😀".repeat(9))).toThrow();
  });

  test("gera CIP-25 com campos obrigatórios", () => {
    const metadata = buildCip25Metadata("a".repeat(56), "ORIGEM0001", {
      name: "Origem Digital #001",
      image: "ipfs://bafyteste",
      mediaType: "image/png",
      description: "Registro de teste",
      creator: "aluno",
      creationMethod: "IA assistida",
      createdAt: "2026-10-22T00:00:00Z",
      sha256: "a".repeat(64),
      project: "Origem Digital",
    });
    expect(metadata["721"]["a".repeat(56)]!["ORIGEM0001"]!.image).toBe("ipfs://bafyteste");
  });
});
