import * as dotenv from 'dotenv';
dotenv.config();

import { BlockFrostAPI, BlockfrostServerError } from '@blockfrost/blockfrost-js';
import { AppError, errnoCode, errorMessage } from './errors';

const BLOCKFROST_PROJECT_ID = process.env.BLOCKFROST_PROJECT_ID;

if (!BLOCKFROST_PROJECT_ID) {
  console.error('\n[CONFIG] BLOCKFROST_PROJECT_ID não encontrado no .env');
  console.error('[CONFIG] Crie um arquivo .env com:');
  console.error('[CONFIG]   BLOCKFROST_PROJECT_ID=seu_project_id_aqui');
  console.error('[CONFIG] Obtenha em: https://blockfrost.io/\n');
  process.exit(1);
}

const inferredNetwork = BLOCKFROST_PROJECT_ID.startsWith('preview')
  ? 'preview'
  : BLOCKFROST_PROJECT_ID.startsWith('preprod')
    ? 'preprod'
    : BLOCKFROST_PROJECT_ID.startsWith('mainnet')
      ? 'mainnet'
      : 'preview';

if (inferredNetwork !== 'preview') {
  console.error(`\n[CONFIG] Este laboratório exige a rede Preview. Project ID detectado: ${inferredNetwork}`);
  process.exit(1);
}

export const blockfrost = new BlockFrostAPI({
  projectId: BLOCKFROST_PROJECT_ID,
});

export const CARDANO_NETWORK = 'preview' as const;

export interface ChainTip {
  hash: string;
  height: number;
  time: number;
  slot: number;
  epoch: number;
  previousBlock: string | null;
  network: typeof CARDANO_NETWORK;
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

export async function getTip(): Promise<ChainTip> {
  try {
    const tip = await blockfrost.blocksLatest();
    return {
      hash: tip.hash,
      height: tip.height ?? 0,
      time: tip.time ?? 0,
      slot: tip.slot ?? 0,
      epoch: tip.epoch ?? 0,
      previousBlock: tip.previous_block,
      network: CARDANO_NETWORK,
    };
  } catch (error) {
    const bfError = handleBlockfrostError(error, 'Consulta do Tip');
    console.error(`[BLOCKFROST] ${bfError.message}`);
    if (bfError.details) console.error(`[DETALHE] ${bfError.details}`);
    throw bfError;
  }
}

export async function getProtocolParameters(): Promise<ProtocolParameters> {
  try {
    const latestEpoch = await blockfrost.epochsLatest();
    const params = await blockfrost.epochsParameters(latestEpoch.epoch);
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
