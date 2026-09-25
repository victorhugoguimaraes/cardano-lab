import * as fs from 'fs';
import * as path from 'path';
import { importWalletWithMnemonic, generateWalletForAPI, loadWallet } from './wallet';
import { assertPreviewAddress, getAddressBalance, getAddressUtxos, getStakeAccount } from './utxo';
import { transferADA } from './transaction';
import { getTip, getProtocolParameters } from './blockfrost';
import { AppError, errorMessage, toAppError } from './errors';

const PORT = Number(process.env.PORT) || 3001;

const MIME_TYPES: { [key: string]: string } = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJSON(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}

function sendError(code: string, message: string, details?: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error: { code, message, details } }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}

function sendAppError(error: unknown, fallbackCode: string, fallbackMessage: string, status = 400): Response {
  const appError = toAppError(error, fallbackCode, fallbackMessage);
  const httpStatus = appError.status_code && appError.status_code >= 400 && appError.status_code < 600
    ? appError.status_code
    : status;
  return sendError(appError.code, appError.message, appError.details, httpStatus);
}

async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed = JSON.parse(await req.text());
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function isValidAddress(address: unknown): address is string {
  if (typeof address !== 'string') return false;
  try {
    assertPreviewAddress(address);
    return true;
  } catch {
    return false;
  }
}

function serveStatic(pathname: string): Response {
  const filePath = pathname === '/' ? '/index.html' : pathname;
  const fullPath = path.join(__dirname, '..', 'frontend', filePath);
  const ext = path.extname(fullPath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    if (fs.existsSync(fullPath)) {
      return new Response(fs.readFileSync(fullPath), { status: 200, headers: { 'Content-Type': contentType } });
    }

    const indexPath = path.join(__dirname, '..', 'frontend', 'index.html');
    if (fs.existsSync(indexPath)) {
      return new Response(fs.readFileSync(indexPath), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return sendError('NOT_FOUND', 'Frontend não encontrado', undefined, 404);
  } catch (error) {
    return sendAppError(error, 'SERVER_ERROR', 'Erro ao servir arquivo', 500);
  }
}

async function handleApi(method: string, apiPath: string, req: Request): Promise<Response> {
  if (method === 'GET' && apiPath === '/wallet') {
    const wallet = loadWallet();
    return wallet
      ? sendJSON({ address: wallet.address, hasWallet: true })
      : sendJSON({ address: null, hasWallet: false });
  }

  if (method === 'GET' && apiPath === '/tip') {
    try {
      return sendJSON(await getTip());
    } catch (error) {
      return sendAppError(error, 'TIP_ERROR', 'Falha ao consultar o tip da cadeia');
    }
  }

  if (method === 'GET' && apiPath === '/protocol') {
    try {
      return sendJSON(await getProtocolParameters());
    } catch (error) {
      return sendAppError(error, 'PROTOCOL_ERROR', 'Falha ao consultar parâmetros do protocolo');
    }
  }

  if (method === 'GET' && apiPath.startsWith('/stake/')) {
    const address = apiPath.replace('/stake/', '');
    if (!isValidAddress(address)) {
      return sendError('INVALID_ADDRESS', 'Endereço inválido', 'O endereço deve começar com "addr_"');
    }
    try {
      const stake = await getStakeAccount(address);
      if (!stake) {
        return sendError('STAKE_NOT_DERIVABLE', 'Conta de stake não derivável', 'O endereço não é um endereço base.');
      }
      return sendJSON(stake);
    } catch (error) {
      return sendAppError(error, 'STAKE_ERROR', 'Falha ao consultar conta de stake');
    }
  }

  if (method === 'GET' && apiPath.startsWith('/balance/')) {
    const address = apiPath.replace('/balance/', '');
    if (!isValidAddress(address)) {
      return sendError('INVALID_ADDRESS', 'Endereço inválido', 'O endereço deve começar com "addr_"');
    }
    try {
      const balance = await getAddressBalance(address);
      return sendJSON({ balance: Number(balance) });
    } catch (error) {
      return sendAppError(error, 'BALANCE_ERROR', 'Falha ao consultar saldo');
    }
  }

  if (method === 'GET' && apiPath.startsWith('/utxos/')) {
    const address = apiPath.replace('/utxos/', '');
    if (!isValidAddress(address)) {
      return sendError('INVALID_ADDRESS', 'Endereço inválido', 'O endereço deve começar com "addr_"');
    }
    try {
      const utxos = await getAddressUtxos(address);
      return sendJSON({ utxos });
    } catch (error) {
      return sendAppError(error, 'UTXO_ERROR', 'Falha ao consultar UTXOs');
    }
  }

  if (method === 'POST' && apiPath === '/wallet/import') {
    try {
      const body = await readJsonBody(req);
      if (!body) {
        return sendError('INVALID_JSON', 'Corpo da requisição não é JSON válido');
      }

      const { mnemonic } = body;
      if (!mnemonic || typeof mnemonic !== 'string') {
        return sendError('MISSING_MNEMONIC', 'O campo "mnemonic" é obrigatório');
      }

      const trimmedMnemonic = mnemonic.trim();
      const words = trimmedMnemonic.split(/\s+/);
      if (words.length !== 24) {
        return sendError(
          'INVALID_WORD_COUNT',
          `Eram esperadas 24 palavras, mas foram recebidas ${words.length}`,
          words.length < 24
            ? 'Faltam palavras. Verifique se copiou todas as 24.'
            : 'Excesso de palavras. O mnemonic deve ter exatamente 24.'
        );
      }

      const wallet = await importWalletWithMnemonic(trimmedMnemonic);
      return sendJSON({ address: wallet.address, network: wallet.network });
    } catch (error) {
      console.error('[API] Erro ao importar carteira:', errorMessage(error));
      return sendAppError(error, 'IMPORT_FAILED', 'Falha ao importar carteira');
    }
  }

  if (method === 'POST' && apiPath === '/wallet/generate') {
    try {
      const { wallet, words } = generateWalletForAPI();
      return sendJSON({ address: wallet.address, network: wallet.network, mnemonic: words });
    } catch (error) {
      console.error('[API] Erro ao gerar carteira:', errorMessage(error));
      return sendAppError(error, 'GENERATE_FAILED', 'Falha ao gerar carteira');
    }
  }

  if (method === 'POST' && apiPath === '/transfer') {
    try {
      const body = await readJsonBody(req);
      if (!body) {
        return sendError('INVALID_JSON', 'Corpo da requisição não é JSON válido');
      }

      const { to, amount } = body;

      if (!isValidAddress(to)) {
        return sendError('INVALID_DESTINATION', 'Endereço de destino inválido', 'O endereço deve começar com "addr_"');
      }
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        return sendError('INVALID_AMOUNT', 'Valor inválido', 'O valor deve ser um número maior que 0.');
      }
      if (amount < 1) {
        return sendError('AMOUNT_TOO_LOW', 'Valor mínimo é 1 ADA', 'O valor mínimo para transferência é 1 ADA.');
      }

      const result = await transferADA(to, amount);
      return sendJSON(result);
    } catch (error) {
      console.error('[API] Erro na transferência:', errorMessage(error));
      return sendAppError(error, 'TRANSFER_FAILED', 'Falha ao enviar transação');
    }
  }

  return sendError('NOT_FOUND', `Rota não encontrada: ${method} ${apiPath}`, undefined, 404);
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;
    const method = req.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      if (pathname.startsWith('/api/')) {
        return await handleApi(method, pathname.replace('/api', ''), req);
      }
      return serveStatic(pathname);
    } catch (error) {
      const appError = error instanceof AppError ? error : undefined;
      console.error('[SERVER] Erro interno:', errorMessage(error));
      return sendError(
        appError?.code || 'INTERNAL_ERROR',
        appError?.message || 'Erro interno do servidor',
        appError?.details || errorMessage(error),
        500
      );
    }
  },
});

console.log(`\n[SERVER] Cardano Lab rodando em http://${server.hostname}:${server.port}`);
console.log(`[SERVER] API disponível em http://${server.hostname}:${server.port}/api/`);
console.log(`[SERVER] Frontend em http://${server.hostname}:${server.port}/\n`);
