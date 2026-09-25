import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { getTip, getProtocolParameters } from './blockfrost';
import { createNewWallet, loadWallet } from './wallet';
import { getAddressBalance, getAddressUtxos, formatLovelace, filterUsableUtxos, getStakeAccount } from './utxo';
import { transferADA } from './transaction';
import { errorMessage } from './errors';

const LOG_FILE = path.join(__dirname, '..', 'logs_execucao.txt');

function log(message: string): void {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
  console.log(message);
}

async function main() {
  log('========================================');
  log('NOVA EXECUÇÃO — CARDANO PREVIEW LAB');
  log('========================================');

  try {
    log('[1] Blockfrost conectado');
    const tip = await getTip();
    log(`[2] Rede: Preview | Época: ${tip.epoch} | Bloco: ${tip.height} | Slot: ${tip.slot}`);
    log(`    Tip hash: ${tip.hash}`);

    let wallet = loadWallet();

    if (!wallet) {
      wallet = await createNewWallet();
    } else {
      console.log('[WALLET] Carteira existente encontrada');
      console.log(`[WALLET] Endereço: ${wallet.address}`);
      console.log('[WALLET] Para importar outra carteira, delete wallet.json e execute novamente\n');
    }

    log(`[3] Carteira ativa`);
    log(`Endereço: ${wallet.address}`);

    log('\n[FAUCET] Para obter tADA, acesse:');
    log('https://testnets.cardano.org/en/testnets/cardano/overview/');
    log(`Use o endereço: ${wallet.address}`);
    log('Aguardando recebimento de fundos...');

    log('\n[BALANCE] Consultando saldo...');
    const balance = await getAddressBalance(wallet.address);
    log(`Saldo: ${formatLovelace(balance)}`);

    log('\n[UTXOs] Consultando UTXOs...');
    const utxos = await getAddressUtxos(wallet.address);
    const usableUtxos = filterUsableUtxos(utxos);
    log(`UTXOs disponíveis: ${utxos.length} | Utilizáveis (>= 1 ADA): ${usableUtxos.length}`);

    if (usableUtxos.length > 0) {
      log('\nDetalhes dos UTXOs utilizáveis:');
      usableUtxos.forEach((utxo, index) => {
        const lovelace = utxo.amount.find(a => a.unit === 'lovelace');
        log(`  ${index + 1}. ${utxo.tx_hash}#${utxo.output_index} - ${formatLovelace(BigInt(lovelace?.quantity || '0'))}`);
      });
    }

    log('\n[STAKE] Consultando conta de stake...');
    const stakeAccount = await getStakeAccount(wallet.address);
    if (stakeAccount) {
      log(`Endereço de stake: ${stakeAccount.stakeAddress}`);
      log(`Valor sob controle: ${stakeAccount.controlledAmount ?? '0'} lovelace`);
    } else {
      log('Conta de stake não derivável a partir do endereço');
    }

    log('\n[PROTOCOL] Parâmetros do protocolo...');
    const params = await getProtocolParameters();
    log(`Época: ${params.epoch}`);
    log(`minFeeA: ${params.minFeeA} lovelace/byte | minFeeB: ${params.minFeeB} lovelace`);
    log(`maxTxSize: ${params.maxTxSize} bytes`);
    log(`keyDeposit: ${params.keyDeposit} | poolDeposit: ${params.poolDeposit}`);

    const args = process.argv.slice(2);
    if (args[0] === '--transfer' && args[1] && args[2]) {
      if (balance < BigInt(2_000_000)) {
        log('\n[TRANSACTION] Saldo insuficiente para transferência');
        log('Mínimo necessário: 2.0 ADA (incluindo taxas)');
      } else {
        const toAddress = args[1];
        const amountADA = parseFloat(args[2]);

        log(`\nEnviando ${amountADA} ADA para ${toAddress}...`);

        const result = await transferADA(toAddress, amountADA);

        log('\n========================================');
        log('TRANSAÇÃO ENVIADA');
        log('========================================');
        log(`TXID: ${result.txHash}`);
        log(`Explorer: ${result.explorerUrl}`);
        log('========================================');
      }
    }

    log('\n========================================');
    log('FIM');
    log('========================================\n');

  } catch (error) {
    console.error('\n[ERROR]', errorMessage(error));
    log(`\n[ERROR] ${errorMessage(error)}`);
  }
}

main();
