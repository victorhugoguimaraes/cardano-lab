import {
  deserializeAddress,
  ForgeScript,
  MeshTxBuilder,
  resolveScriptHash,
  SLOT_CONFIG_NETWORK,
  stringToHex,
  type BlockfrostProvider,
} from "@meshsdk/core";
import type { MeshWallet } from "@meshsdk/wallet";
import { buildNativePolicy } from "./policy";
import { buildCip25Metadata, validateAssetName } from "./metadata";
import type { CardanoNetwork, CreationMethod, NftMetadata } from "./types";

export type MintInput = {
  network: CardanoNetwork;
  assetName: string;
  imageUri: string;
  mediaType: string;
  name: string;
  description: string;
  creator: string;
  creationMethod: CreationMethod;
  createdAt: string;
  sha256: string;
  project: string;
  durationDays: number;
};

export async function mintOneNft(
  provider: BlockfrostProvider,
  wallet: MeshWallet,
  input: MintInput
) {
  validateAssetName(input.assetName);
  const address = wallet.getChangeAddress();
  const { pubKeyHash } = deserializeAddress(address);
  const latest = await provider.fetchLatestBlock();
  const slotConfig = SLOT_CONFIG_NETWORK[input.network];
  const nowSlot = BigInt(latest.slot);
  const secondsPerDay = 86_400n;
  const beforeSlot = nowSlot + BigInt(input.durationDays) * secondsPerDay;
  const policy = buildNativePolicy(pubKeyHash, beforeSlot);
  const forgingScript = ForgeScript.fromNativeScript(policy);
  const policyId = resolveScriptHash(forgingScript);
  const tokenNameHex = stringToHex(input.assetName);
  const unit = policyId + tokenNameHex;
  const imageUri = /^[a-zA-Z0-9]+$/.test(input.imageUri) && input.imageUri.length >= 32
    ? `ipfs://${input.imageUri}`
    : input.imageUri;
  const metadataItem: NftMetadata = {
    name: input.name,
    image: imageUri,
    mediaType: input.mediaType,
    description: input.description,
    creator: input.creator,
    creationMethod: input.creationMethod,
    createdAt: input.createdAt,
    sha256: input.sha256,
    project: input.project,
  };
  const metadata = buildCip25Metadata(policyId, input.assetName, metadataItem);
  const txBuilder = new MeshTxBuilder({ fetcher: provider, verbose: true });
  const unsignedTx = await txBuilder
    .mint("1", policyId, tokenNameHex)
    .mintingScript(forgingScript)
    .metadataValue(721, metadata["721"])
    .txOut(address, [
      { unit, quantity: "1" },
    ])
    .invalidHereafter(Number(beforeSlot))
    .changeAddress(address)
    .selectUtxosFrom(await wallet.getUtxos())
    .complete();
  const signedTx = await wallet.signTx(unsignedTx);
  const txHash = await wallet.submitTx(signedTx);
  return {
    txHash,
    address,
    policyId,
    assetName: input.assetName,
    assetNameHex: tokenNameHex,
    unit,
    beforeSlot: beforeSlot.toString(),
    slotConfig,
    metadata,
    policy,
  };
}
