import { BlockfrostProvider } from "@meshsdk/core";
import type { CardanoNetwork } from "./types";
import { providerNetworkName, requiredEnv } from "./config";

export function createBlockfrostProvider(network: CardanoNetwork): BlockfrostProvider {
  const keyName = network === "preview"
    ? "BLOCKFROST_PREVIEW_API_KEY"
    : "BLOCKFROST_PREPROD_API_KEY";
  return new BlockfrostProvider(requiredEnv(keyName));
}

export function explorerTransactionUrl(network: CardanoNetwork, txHash: string): string {
  return `https://${network === "preview" ? "preview" : "preprod"}.cardanoscan.io/transaction/${txHash}`;
}

export function describeProvider(network: CardanoNetwork): string {
  return `Blockfrost (${providerNetworkName(network)})`;
}
