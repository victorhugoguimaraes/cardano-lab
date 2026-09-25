import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import { blockfrost, getProtocolParameters } from './blockfrost';
import { UTXO, getAddressUtxos } from './utxo';
import { getAddress, loadWallet } from './wallet';
import { AppError, errorMessage, httpStatus, toAppError } from './errors';

export interface TransactionResult {
  txHash: string;
  explorerUrl: string;
}

function totalLovelace(utxos: UTXO[]): bigint {
  let total = BigInt(0);
  for (const utxo of utxos) {
    for (const amount of utxo.amount) {
      if (amount.unit === 'lovelace') {
        total += BigInt(amount.quantity);
      }
    }
  }
  return total;
}

function buildTxBody(
  utxos: UTXO[],
  fromAddress: string,
  toAddress: string,
  amountLovelace: bigint,
  fee: bigint,
  change: bigint
): CardanoWasm.TransactionBody {
  const txInputs = CardanoWasm.TransactionInputs.new();
  for (const utxo of utxos) {
    txInputs.add(
      CardanoWasm.TransactionInput.new(
        CardanoWasm.TransactionHash.from_hex(utxo.tx_hash),
        utxo.output_index
      )
    );
  }

  const txOutputs = CardanoWasm.TransactionOutputs.new();
  txOutputs.add(
    CardanoWasm.TransactionOutput.new(
      CardanoWasm.Address.from_bech32(toAddress),
      CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(amountLovelace.toString()))
    )
  );

  if (change > BigInt(0)) {
    txOutputs.add(
      CardanoWasm.TransactionOutput.new(
        CardanoWasm.Address.from_bech32(fromAddress),
        CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(change.toString()))
      )
    );
  }

  return CardanoWasm.TransactionBody.new(
    txInputs,
    txOutputs,
    CardanoWasm.BigNum.from_str(fee.toString())
  );
}

function signTx(txBody: CardanoWasm.TransactionBody, paymentKeyHex: string): CardanoWasm.Transaction {
  const txHash = CardanoWasm.hash_transaction(txBody);
  const privateKey = CardanoWasm.PrivateKey.from_hex(paymentKeyHex);
  const witness = CardanoWasm.make_vkey_witness(txHash, privateKey);

  const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
  vkeyWitnesses.add(witness);

  const witnesses = CardanoWasm.TransactionWitnessSet.new();
  witnesses.set_vkeys(vkeyWitnesses);

  const tx = CardanoWasm.Transaction.new(txBody, witnesses);
  tx.set_is_valid(true);
  return tx;
}

async function submitTx(tx: CardanoWasm.Transaction): Promise<string> {
  try {
    return await blockfrost.txSubmit(tx.to_bytes());
  } catch (error) {
    const status = httpStatus(error);
    if (status === 400) {
      throw new AppError(
        'SUBMIT_REJECTED',
        'Transação rejeitada',
        errorMessage(error) || 'A transação é inválida ou já foi enviada.',
        400
      );
    }
    if (status === 429) {
      throw new AppError(
        'RATE_LIMIT',
        'Limite de requisições atingido',
        'Aguarde alguns segundos e tente novamente.',
        429
      );
    }
    throw toAppError(error, 'SUBMIT_FAILED', 'Falha ao enviar transação ao node');
  }
}

function assertEnoughFunds(totalInput: bigint, amountLovelace: bigint, fee: bigint): bigint {
  const change = totalInput - amountLovelace - fee;
  if (change < BigInt(0)) {
    const available = Number(totalInput) / 1_000_000;
    const requested = Number(amountLovelace) / 1_000_000;
    const feeAda = Number(fee) / 1_000_000;
    throw new AppError(
      'INSUFFICIENT_BALANCE',
      'Saldo insuficiente',
      `Disponível: ${available.toFixed(6)} ADA | Enviado: ${requested.toFixed(6)} ADA | Taxa: ${feeAda.toFixed(6)} ADA`
    );
  }
  if (change > BigInt(0) && change < BigInt(1_000_000)) {
    throw new AppError(
      'CHANGE_TOO_LOW',
      'Troco muito baixo',
      `O troco seria ${Number(change) / 1_000_000} ADA, mínimo é 1 ADA. Ajuste o valor enviado.`
    );
  }
  return change;
}

export async function buildTransaction(
  toAddress: string,
  amountLovelace: bigint
): Promise<TransactionResult> {
  const fromAddress = getAddress();
  const wallet = loadWallet();

  if (!wallet) {
    throw new AppError('WALLET_NOT_FOUND', 'Carteira não encontrada');
  }

  console.log('[TX] Obtendo UTXOs...');
  const utxos = await getAddressUtxos(fromAddress);
  if (utxos.length === 0) {
    throw new AppError(
      'NO_UTXOS',
      'Nenhum UTXO disponível',
      'Solicite tADA na faucet primeiro.'
    );
  }

  console.log('[TX] Obtendo parâmetros do protocolo...');
  const protocolParams = await getProtocolParameters();
  const minFeeA = BigInt(protocolParams.minFeeA);
  const minFeeB = BigInt(protocolParams.minFeeB);

  const totalInput = totalLovelace(utxos);
  console.log(`[TX] Total disponível: ${totalInput} lovelace`);
  console.log(`[TX] Valor enviado: ${amountLovelace} lovelace`);

  const provisionalFee = BigInt(200_000);
  const provisionalChange = assertEnoughFunds(totalInput, amountLovelace, provisionalFee);

  try {
    const provisionalTx = signTx(
      buildTxBody(utxos, fromAddress, toAddress, amountLovelace, provisionalFee, provisionalChange),
      wallet.paymentKey
    );
    const txSize = BigInt(provisionalTx.to_bytes().length);
    const calculatedFee = minFeeA * txSize + minFeeB;
    const fee = calculatedFee > provisionalFee ? calculatedFee : provisionalFee;
    const change = assertEnoughFunds(totalInput, amountLovelace, fee);

    console.log(`[TX] Taxa calculada: ${fee} lovelace (${Number(fee) / 1_000_000} ADA)`);

    const signedTx = signTx(
      buildTxBody(utxos, fromAddress, toAddress, amountLovelace, fee, change),
      wallet.paymentKey
    );

    console.log('[TX] Enviando transação...');
    const submittedHash = await submitTx(signedTx);
    console.log(`[TX] Transação enviada: ${submittedHash}`);

    return {
      txHash: submittedHash,
      explorerUrl: `https://preview.cardanoscan.io/transaction/${submittedHash}`,
    };
  } catch (error) {
    throw toAppError(error, 'TX_BUILD_FAILED', 'Falha ao construir transação');
  }
}

export async function transferADA(toAddress: string, amountADA: number): Promise<TransactionResult> {
  const amountLovelace = BigInt(Math.floor(amountADA * 1_000_000));
  return buildTransaction(toAddress, amountLovelace);
}
