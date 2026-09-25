import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import { blockfrost } from './blockfrost';
import { AppError, httpStatus, toAppError } from './errors';

export interface UTXO {
  tx_hash: string;
  output_index: number;
  amount: { unit: string; quantity: string }[];
  address: string;
  data_hash?: string | null;
}

export interface StakeAccountView {
  stakeAddress: string;
  controlledAmount: string | null;
}

function assertTestAddress(address: string): void {
  if (!address || !address.startsWith('addr_')) {
    throw new AppError(
      'INVALID_ADDRESS',
      'Endereço inválido',
      'O endereço deve começar com "addr_" e ser um endereço Cardano válido.'
    );
  }
}

export async function getAddressBalance(address: string): Promise<bigint> {
  try {
    assertTestAddress(address);
    const utxos = await blockfrost.addressesUtxos(address);
    let totalBalance = BigInt(0);

    for (const utxo of utxos) {
      for (const amount of utxo.amount) {
        if (amount.unit === 'lovelace') {
          totalBalance += BigInt(amount.quantity);
        }
      }
    }

    return totalBalance;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (httpStatus(error) === 404) return BigInt(0);
    throw toAppError(error, 'BALANCE_FETCH_FAILED', 'Falha ao consultar saldo');
  }
}

export async function getAddressUtxos(address: string): Promise<UTXO[]> {
  try {
    assertTestAddress(address);
    const utxos = await blockfrost.addressesUtxos(address);
    return utxos.map((utxo) => ({
      tx_hash: utxo.tx_hash,
      output_index: utxo.output_index,
      amount: utxo.amount,
      address: utxo.address,
      data_hash: utxo.data_hash,
    }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (httpStatus(error) === 404) return [];
    throw toAppError(error, 'UTXO_FETCH_FAILED', 'Falha ao consultar UTXOs');
  }
}

export function deriveStakeAddress(address: string): string | null {
  const addr = CardanoWasm.Address.from_bech32(address);
  const baseAddr = CardanoWasm.BaseAddress.from_address(addr);
  if (!baseAddr) return null;

  const rewardAddr = CardanoWasm.RewardAddress.new(0, baseAddr.stake_cred());
  return rewardAddr.to_address().to_bech32();
}

export async function getStakeAccount(address: string): Promise<StakeAccountView | null> {
  try {
    const stakeAddress = deriveStakeAddress(address);
    if (!stakeAddress) return null;

    try {
      const accountInfo = await blockfrost.accounts(stakeAddress);
      return {
        stakeAddress,
        controlledAmount: accountInfo.controlled_amount,
      };
    } catch (error) {
      if (httpStatus(error) === 404) {
        return { stakeAddress, controlledAmount: null };
      }
      return { stakeAddress, controlledAmount: null };
    }
  } catch {
    return null;
  }
}

export function formatLovelace(lovelace: bigint): string {
  const ada = Number(lovelace) / 1_000_000;
  return `${ada.toFixed(6)} ADA`;
}

export function filterUsableUtxos(utxos: UTXO[]): UTXO[] {
  const minUtxo = BigInt(1_000_000);
  return utxos.filter((utxo) => {
    const lovelaceAmount = utxo.amount.find((a) => a.unit === 'lovelace');
    return Boolean(lovelaceAmount && BigInt(lovelaceAmount.quantity) >= minUtxo);
  });
}
