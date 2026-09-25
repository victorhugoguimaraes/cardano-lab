import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import { generateMnemonic, mnemonicToEntropy as bip39MnemonicToEntropy, validateMnemonic, wordlists } from 'bip39';
import { AppError, errorMessage, toAppError } from './errors';

export interface WalletData {
  mnemonic: string;
  paymentKey: string;
  stakeKey: string;
  address: string;
  network: number;
}

const WALLET_FILE = path.join(__dirname, '..', 'wallet.json');
const BIP39_ENGLISH_WORDLIST = wordlists.english;

function mnemonicToEntropy(words: string[]): string {
  for (const word of words) {
    const normalizedWord = word.toLowerCase().trim();
    if (!BIP39_ENGLISH_WORDLIST.includes(normalizedWord)) {
      throw new AppError(
        'INVALID_WORD',
        `Palavra inválida: "${word}"`,
        `A palavra "${word}" não está na lista BIP39 inglesa. Verifique a ortografia.`
      );
    }
  }

  const mnemonic = words.map((word) => word.toLowerCase().trim()).join(' ');
  if (!validateMnemonic(mnemonic, BIP39_ENGLISH_WORDLIST)) {
    throw new AppError(
      'INVALID_MNEMONIC_CHECKSUM',
      'Mnemonic inválido',
      'As 24 palavras não formam um mnemonic BIP39 válido. Verifique a ordem e a ortografia.'
    );
  }

  return bip39MnemonicToEntropy(mnemonic, BIP39_ENGLISH_WORDLIST);
}

// ============================================================
// Derivação de chaves a partir do mnemonic
// ============================================================

function deriveWalletFromMnemonic(mnemonic: string) {
  const cleanMnemonic = mnemonic.trim().replace(/\s+/g, ' ');
  const words = cleanMnemonic.split(' ');

  if (words.length !== 24) {
    throw new AppError(
      'INVALID_WORD_COUNT',
      `Eram esperadas 24 palavras, mas foram recebidas ${words.length}`,
      words.length < 24
        ? 'Faltam palavras. Verifique se copiou todas as 24 palavras.'
        : 'Excesso de palavras. O mnemonic deve ter exatamente 24 palavras.'
    );
  }

  // NOTA: Palavras duplicadas são permitidas pelo BIP39.
  // A validação de duplicatas foi removida.

  try {
    const entropy = mnemonicToEntropy(words);
    const rootKey = CardanoWasm.Bip32PrivateKey.from_bip39_entropy(
      Buffer.from(entropy, 'hex'),
      Buffer.alloc(0)
    );

    const accountKey = rootKey
      .derive(0x80000000 + 1852)
      .derive(0x80000000 + 1815)
      .derive(0x80000000 + 0);

    const paymentKey = accountKey.derive(0).derive(0);
    const stakeKey = accountKey.derive(2).derive(0);

    const paymentPubKey = paymentKey.to_public().to_raw_key();
    const stakePubKey = stakeKey.to_public().to_raw_key();

    const paymentKeyHash = paymentPubKey.hash();
    const stakeKeyHash = stakePubKey.hash();

    const paymentCredential = CardanoWasm.Credential.from_keyhash(paymentKeyHash);
    const stakeCredential = CardanoWasm.Credential.from_keyhash(stakeKeyHash);

    const baseAddr = CardanoWasm.BaseAddress.new(0, paymentCredential, stakeCredential);
    const address = baseAddr.to_address().to_bech32();

    const paymentKeyHex = Buffer.from(paymentKey.to_raw_key().as_bytes()).toString('hex');
    const stakeKeyHex = Buffer.from(stakeKey.to_raw_key().as_bytes()).toString('hex');

    return { address, paymentKeyHex, stakeKeyHex };
  } catch (error) {
    throw toAppError(error, 'DERIVATION_FAILED', 'Falha ao derivar chaves do mnemonic');
  }
}

// ============================================================
// Readline helpers (apenas para CLI)
// ============================================================

function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = createReadline();
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
    rl.on('error', (err) => {
      rl.close();
      reject(err);
    });
  });
}

// ============================================================
// Persistência
// ============================================================

function saveWallet(wallet: WalletData): void {
  try {
    fs.writeFileSync(WALLET_FILE, JSON.stringify(wallet, null, 2));
  } catch (error) {
    throw new AppError(
      'SAVE_FAILED',
      'Falha ao salvar carteira',
      `Não foi possível escrever em ${WALLET_FILE}: ${errorMessage(error)}`
    );
  }
}

function persistWalletFromMnemonic(mnemonic: string): WalletData {
  const normalized = mnemonic.trim().replace(/\s+/g, ' ');
  const { address, paymentKeyHex, stakeKeyHex } = deriveWalletFromMnemonic(normalized);
  const walletData: WalletData = {
    mnemonic: normalized,
    paymentKey: paymentKeyHex,
    stakeKey: stakeKeyHex,
    address,
    network: 0,
  };
  saveWallet(walletData);
  return walletData;
}

export function loadWallet(): WalletData | null {
  try {
    if (!fs.existsSync(WALLET_FILE)) {
      return null;
    }
    const data = fs.readFileSync(WALLET_FILE, 'utf-8');
    const parsed = JSON.parse(data);

    if (!parsed.address || !parsed.mnemonic) {
      console.error('[WALLET] Arquivo wallet.json corrompido');
      return null;
    }

    return parsed as WalletData;
  } catch (error) {
    console.error(`[WALLET] Erro ao ler wallet.json: ${errorMessage(error)}`);
    return null;
  }
}

// ============================================================
// API pública — CLI (usa readline)
// ============================================================

export async function importWallet(): Promise<WalletData> {
  console.log('\n========================================');
  console.log('IMPORTAR CARTEIRA');
  console.log('========================================\n');
  console.log('Digite suas 24 palavras mnemônicas (separadas por espaço):\n');

  const mnemonic = await question('> ');

  console.log('\n[WALLET] Derivando chaves a partir do mnemônico...');

  try {
    const walletData = persistWalletFromMnemonic(mnemonic);
    console.log('[WALLET] Carteira importada com sucesso!');
    console.log(`[WALLET] Endereço: ${walletData.address}\n`);
    return walletData;
  } catch (error) {
    const appError = toAppError(error, 'IMPORT_FAILED', 'Falha ao importar carteira');
    console.error(`[ERRO] ${appError.message}`);
    if (appError.details) console.error(`[DETALHE] ${appError.details}`);
    throw appError;
  }
}

export async function importWalletWithMnemonic(mnemonic: string): Promise<WalletData> {
  return persistWalletFromMnemonic(mnemonic);
}

/**
 * Cria nova carteira via CLI (com interação readline).
 * NÃO usar na API — usar generateWalletForAPI() no lugar.
 */
export async function createNewWallet(): Promise<WalletData> {
  console.log('\n========================================');
  console.log('CRIAR NOVA CARTEIRA');
  console.log('========================================\n');

  const useExisting = await question('Deseja importar uma carteira existente? (s/n): ');

  if (useExisting.toLowerCase() === 's') {
    return importWallet();
  }

  console.log('\n[WALLET] Gerando nova carteira...');

  const words = generateMnemonic(256, undefined, BIP39_ENGLISH_WORDLIST).split(' ');

  console.log('\n*** GUARDE ESTAS 24 PALAVRAS EM LOCAL SEGURO ***\n');
  console.log(words.map((w, i) => `${String(i + 1).padStart(2, '0')}. ${w}`).join('\n'));
  console.log('\n*** ELAS SÃO NECESSÁRIAS PARA RECUPERAR SUA CARTEIRA ***\n');

  await question('Pressione ENTER após anotar as palavras...');

  const walletData = persistWalletFromMnemonic(words.join(' '));
  console.log(`\n[WALLET] Endereço gerado: ${walletData.address}\n`);
  return walletData;
}

/**
 * Gera carteira programaticamente (sem readline).
 * Seguro para uso via API HTTP.
 * Retorna os dados da carteira e as palavras mnemônicas para exibição.
 */
export function generateWalletForAPI(): { wallet: WalletData; words: string[] } {
  const words = generateMnemonic(256, undefined, BIP39_ENGLISH_WORDLIST).split(' ');
  const wallet = persistWalletFromMnemonic(words.join(' '));
  return { wallet, words };
}

// ============================================================
// Getters
// ============================================================

export function getAddress(): string {
  const wallet = loadWallet();
  if (!wallet) {
    throw new AppError(
      'WALLET_NOT_FOUND',
      'Carteira não encontrada',
      'Execute o programa e crie ou importe uma carteira primeiro.'
    );
  }
  return wallet.address;
}

export function getPaymentKey(): string {
  const wallet = loadWallet();
  if (!wallet) {
    throw new AppError(
      'WALLET_NOT_FOUND',
      'Carteira não encontrada',
      'Execute o programa e crie ou importe uma carteira primeiro.'
    );
  }
  return wallet.paymentKey;
}

export function getMnemonic(): string {
  const wallet = loadWallet();
  if (!wallet) {
    throw new AppError(
      'WALLET_NOT_FOUND',
      'Carteira não encontrada',
      'Execute o programa e crie ou importe uma carteira primeiro.'
    );
  }
  return wallet.mnemonic;
}
