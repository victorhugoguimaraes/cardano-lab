import { MeshWallet } from "@meshsdk/wallet";
import type { BlockfrostProvider } from "@meshsdk/core";
import { networkId } from "./config";
import type { CardanoNetwork } from "./types";

export async function createHeadlessWallet(
  network: CardanoNetwork,
  provider: BlockfrostProvider,
  mnemonic: string
): Promise<MeshWallet> {
  const words = mnemonic.trim().split(/\s+/).filter(Boolean);
  if (words.length !== 12 && words.length !== 15 && words.length !== 18 && words.length !== 21 && words.length !== 24) {
    throw new Error("A seed phrase deve possuir 12, 15, 18, 21 ou 24 palavras.");
  }
  return new MeshWallet({
    networkId: networkId(network),
    fetcher: provider,
    submitter: provider,
    key: { type: "mnemonic", words },
  });
}
