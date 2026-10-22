import type { CardanoNetwork } from "./types";

export function parseNetwork(value: string | undefined): CardanoNetwork {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "preview" || normalized === "preprod") return normalized;
  throw new Error("Rede inválida. Escolha preview ou preprod.");
}

export function networkId(network: CardanoNetwork): 0 {
  // Preview and Preprod are both Cardano testnets.
  return 0;
}

export function providerNetworkName(network: CardanoNetwork): "Preview" | "Preprod" {
  return network === "preview" ? "Preview" : "Preprod";
}

export function requiredEnv(name: string): string {
  const value = Bun.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}
