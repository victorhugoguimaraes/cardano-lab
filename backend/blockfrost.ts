import * as dotenv from 'dotenv';
dotenv.config();

import { BlockFrostAPI, BlockfrostServerError } from '@blockfrost/blockfrost-js';
import { AppError, errnoCode, errorMessage } from './errors';

export type CardanoNetwork = 'preview' | 'preprod';

const runtimeApiKeys: Partial<Record<CardanoNetwork, string>> = {};

function projectIdFor(network: CardanoNetwork): string | undefined {
  const runtime = runtimeApiKeys[network];
  const specific = runtime || (network === 'preview'
    ? process.env.BLOCKFROST_PREVIEW_PROJECT_ID || process.env.BLOCKFROST_PREVIEW_API_KEY
    : process.env.BLOCKFROST_PREPROD_PROJECT_ID || process.env.BLOCKFROST_PREPROD_API_KEY);
  if (specific) return specific;
  return undefined;
}

export function validateApiKeyForNetwork(network: CardanoNetwork, apiKey: string): string | null {
  const normalized = apiKey.trim().toLowerCase();
  if (!normalized) return null;

  if (!normalized.startsWith(network)) {
    const label = network === 'preview' ? 'Preview' : 'Preprod';
    return `A chave da rede ${label} deve começar com "${network}". Verifique se você colou a chave da rede correta.`;
  }

  if (!/^[a-z]+[a-z0-9]{20,}$/i.test(apiKey.trim())) {
    return 'A chave Blockfrost parece incompleta ou inválida. Copie o project ID completo no painel do Blockfrost.';
  }

  return null;
}

export function configureApiKeys(keys: Partial<Record<CardanoNetwork, string>>): void {
  for (const network of ['preview', 'preprod'] as const) {
    const value = keys[network]?.trim();
    if (value) runtimeApiKeys[network] = value;
  }
}

export function configuredApiKeyLabels(): Record<CardanoNetwork, string> {
  return {
    preview: projectIdFor('preview') ? 'API cadastrada' : 'API não cadastrada',
    preprod: projectIdFor('preprod') ? 'API cadastrada' : 'API não cadastrada',
  };
}

export function getBlockfrostProjectId(network: CardanoNetwork): string {
  const projectId = projectIdFor(network);
  if (!projectId) {
    throw new AppError(
      'API_NOT_CONFIGURED',
      `API Blockfrost não cadastrada para ${network === 'preview' ? 'Preview' : 'Preprod'}`,
      'Configure a chave dessa rede na aba Rede & logs.'
    );
  }
  return projectId;
}

export function configuredNetworks(): Record<CardanoNetwork, boolean> {
  return { preview: Boolean(projectIdFor('preview')), preprod: Boolean(projectIdFor('preprod')) };
}

export function defaultNetwork(): CardanoNetwork {
  const requested = process.env.CARDANO_NETWORK;
  if (requested === 'preview' || requested === 'preprod') return requested;
  return configuredNetworks().preview ? 'preview' : 'preprod';
}

export function getBlockfrost(network: CardanoNetwork): BlockFrostAPI {
  return new BlockFrostAPI({ projectId: getBlockfrostProjectId(network) });
}

export interface ChainTip {
  hash: string;
  height: number;
  time: number;
  slot: number;
  epoch: number;
  previousBlock: string | null;
  network: CardanoNetwork;
}

export interface ProtocolParameters {
  epoch: number;
  minFeeA: number;
  minFeeB: number;
  minUtxo: string | null;
  maxTxSize: number;
  keyDeposit: string;
  poolDeposit: string;
}

const BLOCKFROST_STATUS: Record<number, { code: string; message: string; details: string }> = {
  400: {
    code: 'BAD_REQUEST',
    message: 'Requisição inválida',
    details: 'O formato do endereço ou parâmetro está incorreto.',
  },
  402: {
    code: 'RATE_LIMIT',
    message: 'Limite de requisições atingido',
    details: 'Aguarde alguns segundos e tente novamente.',
  },
  403: {
    code: 'INVALID_API_KEY',
    message: 'Chave Blockfrost inválida ou sem acesso',
    details: 'Confira se o project ID pertence à rede selecionada e se ainda está ativo.',
  },
  404: {
    code: 'NOT_FOUND',
    message: 'Recurso não encontrado',
    details: 'O endereço ou recurso consultado não existe na blockchain.',
  },
  418: {
    code: 'IP_BLOCKED',
    message: 'IP bloqueado',
    details: 'Seu IP foi bloqueado pelo Blockfrost. Aguarde ou use outro IP.',
  },
  429: {
    code: 'RATE_LIMIT',
    message: 'Limite de requisições atingido',
    details: 'Aguarde alguns segundos e tente novamente.',
  },
  500: {
    code: 'BLOCKFROST_ERROR',
    message: 'Erro interno do Blockfrost',
    details: 'Problema no servidor Blockfrost. Tente novamente em alguns instantes.',
  },
};

function handleBlockfrostError(error: unknown, context: string): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof BlockfrostServerError) {
    const mapped = BLOCKFROST_STATUS[error.status_code];
    if (mapped) {
      return new AppError(mapped.code, `${context}: ${mapped.message}`, mapped.details, error.status_code);
    }

    return new AppError(
      'BLOCKFROST_ERROR',
      `${context}: Erro do Blockfrost (HTTP ${error.status_code})`,
      error.message || 'Erro desconhecido do Blockfrost.',
      error.status_code
    );
  }

  const code = errnoCode(error);
  if (code === 'ECONNREFUSED') {
    return new AppError(
      'CONNECTION_REFUSED',
      `${context}: Conexão recusada`,
      'Não foi possível conectar ao servidor Blockfrost. Verifique sua conexão com a internet.'
    );
  }
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') {
    return new AppError(
      'TIMEOUT',
      `${context}: Tempo de conexão esgotado`,
      'A requisição demorou muito. Tente novamente.'
    );
  }
  if (code === 'ENOTFOUND') {
    return new AppError(
      'DNS_ERROR',
      `${context}: Servidor não encontrado`,
      'Não foi possível resolver o endereço do Blockfrost. Verifique sua conexão.'
    );
  }

  return new AppError(
    'UNKNOWN_ERROR',
    `${context}: ${errorMessage(error)}`,
    error instanceof Error ? error.stack : undefined
  );
}

export async function getTip(network: CardanoNetwork = defaultNetwork()): Promise<ChainTip> {
  try {
    const tip = await getBlockfrost(network).blocksLatest();
    return {
      hash: tip.hash,
      height: tip.height ?? 0,
      time: tip.time ?? 0,
      slot: tip.slot ?? 0,
      epoch: tip.epoch ?? 0,
      previousBlock: tip.previous_block,
      network,
    };
  } catch (error) {
    const bfError = handleBlockfrostError(error, 'Consulta do Tip');
    console.error(`[BLOCKFROST] ${bfError.message}`);
    if (bfError.details) console.error(`[DETALHE] ${bfError.details}`);
    throw bfError;
  }
}

export async function getProtocolParameters(network: CardanoNetwork = defaultNetwork()): Promise<ProtocolParameters> {
  try {
    const provider = getBlockfrost(network);
    const latestEpoch = await provider.epochsLatest();
    const params = await provider.epochsParameters(latestEpoch.epoch);
    return {
      epoch: latestEpoch.epoch,
      minFeeA: params.min_fee_a,
      minFeeB: params.min_fee_b,
      minUtxo: params.min_utxo ?? null,
      maxTxSize: params.max_tx_size,
      keyDeposit: params.key_deposit,
      poolDeposit: params.pool_deposit,
    };
  } catch (error) {
    const bfError = handleBlockfrostError(error, 'Parâmetros do Protocolo');
    console.error(`[BLOCKFROST] ${bfError.message}`);
    if (bfError.details) console.error(`[DETALHE] ${bfError.details}`);
    throw bfError;
  }
}
