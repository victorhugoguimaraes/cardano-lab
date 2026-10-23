import { BlockfrostProvider } from '@meshsdk/core';
import { createHeadlessWallet } from '../core/wallet';
import { mintOneNft, type MintInput } from '../core/mint';
import { verifyHashAgainstAsset } from '../core/verify';
import { loadWallet } from './wallet';
import { getBlockfrost, getBlockfrostProjectId } from './blockfrost';
import { AppError } from './errors';
import type { CardanoNetwork } from '../core/types';

const CREATION_METHODS = ['sem IA', 'IA assistida', 'gerada por IA'] as const;

function requiredString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError('INVALID_NFT_INPUT', 'Dados do NFT inválidos', `Campo obrigatório ausente: ${field}`);
  }
  return value.trim();
}

function normalizeImageUri(value: string): string {
  if (/^[a-zA-Z0-9]+$/.test(value) && value.length >= 32) return `ipfs://${value}`;
  return value;
}

export function parseMintInput(body: Record<string, unknown>): MintInput {
  const network = body.network === 'preview' || body.network === 'preprod' ? body.network : null;
  const creationMethod = CREATION_METHODS.includes(body.creationMethod as typeof CREATION_METHODS[number])
    ? body.creationMethod as typeof CREATION_METHODS[number]
    : null;
  const durationDays = body.durationDays;
  const createdAt = requiredString(body, 'createdAt');
  const sha256 = requiredString(body, 'sha256');

  if (!network) throw new AppError('INVALID_NFT_INPUT', 'Dados do NFT inválidos', 'A rede deve ser preview ou preprod');
  if (!creationMethod) throw new AppError('INVALID_NFT_INPUT', 'Dados do NFT inválidos', 'Processo de criação inválido');
  if (typeof durationDays !== 'number' || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
    throw new AppError('INVALID_NFT_INPUT', 'Dados do NFT inválidos', 'O prazo da política deve ser um número inteiro entre 1 e 3650 dias');
  }
  if (!/^[a-f0-9]{64}$/i.test(sha256)) throw new AppError('INVALID_NFT_INPUT', 'Dados do NFT inválidos', 'sha256 deve conter 64 caracteres hexadecimais');

  return {
    network,
    assetName: requiredString(body, 'assetName'),
    imageUri: normalizeImageUri(requiredString(body, 'imageUri')),
    mediaType: requiredString(body, 'mediaType'),
    name: requiredString(body, 'name'),
    description: requiredString(body, 'description'),
    creator: requiredString(body, 'creator'),
    creationMethod,
    createdAt,
    sha256,
    project: requiredString(body, 'project'),
    durationDays,
  };
}

function providerFor(network: CardanoNetwork): BlockfrostProvider {
  return new BlockfrostProvider(getBlockfrostProjectId(network));
}

export async function mintFromConfiguredWallet(input: MintInput) {
  const wallet = loadWallet();
  if (!wallet) throw new Error('Configure ou importe uma carteira antes de cunhar.');
  const provider = providerFor(input.network);
  const signingWallet = await createHeadlessWallet(input.network, provider, wallet.mnemonic);
  const result = await mintOneNft(provider, signingWallet, input);
  const outputIndex = await findMintedOutputIndex(input.network, result.txHash, result.unit);

  return {
    ...result,
    outputIndex,
    utxo: outputIndex === null ? null : `${result.txHash}#${outputIndex}`,
  };
}

async function findMintedOutputIndex(network: CardanoNetwork, txHash: string, unit: string): Promise<number | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const transaction = await getBlockfrost(network).txsUtxos(txHash);
      const outputIndex = transaction.outputs.findIndex((output) =>
        output.amount.some((amount) => amount.unit === unit)
      );
      if (outputIndex >= 0) return outputIndex;
    } catch {
      // Blockfrost may need a few seconds to index the submitted transaction.
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return null;
}

export async function verifyNftHash(network: CardanoNetwork, assetUnit: string, fileHash: string) {
  return verifyHashAgainstAsset(providerFor(network), assetUnit, fileHash);
}
