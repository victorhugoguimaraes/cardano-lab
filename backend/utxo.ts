import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import { defaultNetwork, getBlockfrost, type CardanoNetwork } from './blockfrost';
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

export interface WalletAssetView {
  unit: string;
  policyId: string;
  assetNameHex: string;
  assetName: string;
  quantity: string;
  fingerprint: string | null;
  isNft: boolean;
  image: string | null;
  description: string | null;
}

function metadataText(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>)[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value.join('');
  }
  return null;
}

function assetDisplayName(assetNameHex: string): string {
  if (!assetNameHex) return 'NFT sem nome';
  try {
    const decoded = Buffer.from(assetNameHex, 'hex').toString('utf8').trim();
    return decoded || `Asset ${assetNameHex.slice(0, 12)}...`;
  } catch {
    return `Asset ${assetNameHex.slice(0, 12)}...`;
  }
}

function browserImageUrl(image: string | null): string | null {
  if (!image) return null;
  if (image.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${image.slice(7)}`;
  return image;
}

export async function getWalletAssets(address: string, network: CardanoNetwork = defaultNetwork()): Promise<WalletAssetView[]> {
  try {
    assertPreviewAddress(address);
    const account = await getBlockfrost(network).addressesExtended(address);
    const assets = account.amount.filter((amount) => amount.unit !== 'lovelace' && BigInt(amount.quantity) > 0);

    return await Promise.all(assets.map(async (amount) => {
      const [policyId, assetNameHex] = [amount.unit.slice(0, 56), amount.unit.slice(56)];
      let details: Awaited<ReturnType<ReturnType<typeof getBlockfrost>['assetsById']>> | null = null;
      if (amount.quantity === '1' || amount.has_nft_onchain_metadata) {
        try {
          details = await getBlockfrost(network).assetsById(amount.unit);
        } catch {
          details = null;
        }
      }

      const onchain = details?.onchain_metadata;
      const metadata = details?.metadata;
      const image = browserImageUrl(metadataText(onchain, 'image') || metadataText(metadata, 'image'));
      const description = metadataText(onchain, 'description') || metadataText(metadata, 'description');

      return {
        unit: amount.unit,
        policyId,
        assetNameHex,
        assetName: metadataText(onchain, 'name') || metadataText(metadata, 'name') || assetDisplayName(assetNameHex),
        quantity: amount.quantity,
        fingerprint: details?.fingerprint ?? null,
        isNft: amount.quantity === '1' || Boolean(details?.onchain_metadata_standard),
        image,
        description,
      };
    }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (httpStatus(error) === 404) return [];
    throw toAppError(error, 'ASSETS_FETCH_FAILED', 'Falha ao consultar NFTs da carteira');
  }
}

export function assertPreviewAddress(address: string): void {
  if (!address || !address.startsWith('addr_test1')) {
    throw new AppError(
      'INVALID_ADDRESS',
      'Endereço inválido',
      'Informe um endereço de pagamento Cardano da rede Preview (addr_test1...).'
    );
  }

  try {
    const decodedAddress = CardanoWasm.Address.from_bech32(address);
    if (decodedAddress.network_id() !== 0) {
      throw new Error('rede diferente de Preview');
    }
  } catch {
    throw new AppError(
      'INVALID_ADDRESS',
      'Endereço inválido',
      'Informe um endereço Cardano válido da rede Preview (addr_test1...).'
    );
  }
}

export async function getAddressBalance(address: string, network: CardanoNetwork = defaultNetwork()): Promise<bigint> {
  try {
    assertPreviewAddress(address);
    const utxos = await getBlockfrost(network).addressesUtxos(address);
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

export async function getAddressUtxos(address: string, network: CardanoNetwork = defaultNetwork()): Promise<UTXO[]> {
  try {
    assertPreviewAddress(address);
    const utxos = await getBlockfrost(network).addressesUtxos(address);
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

export async function getStakeAccount(address: string, network: CardanoNetwork = defaultNetwork()): Promise<StakeAccountView | null> {
  try {
    const stakeAddress = deriveStakeAddress(address);
    if (!stakeAddress) return null;

    try {
      const accountInfo = await getBlockfrost(network).accounts(stakeAddress);
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

export function isAdaOnlyUtxo(utxo: UTXO): boolean {
  return utxo.amount.every((amount) => amount.unit === 'lovelace');
}
