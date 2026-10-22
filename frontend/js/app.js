/**
 * Cardano Preview Lab - Frontend Application
 */

let wallet = null;
let connected = false;

const elements = {
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  networkSelect: document.getElementById('networkSelect'),
  apiStatus: document.getElementById('apiStatus'),
  chainNetworkLabel: document.getElementById('chainNetworkLabel'),
  footerNetwork: document.getElementById('footerNetwork'),
  apiConfigForm: document.getElementById('apiConfigForm'),
  previewApiKey: document.getElementById('previewApiKey'),
  preprodApiKey: document.getElementById('preprodApiKey'),
  btnSaveApiKeys: document.getElementById('btnSaveApiKeys'),
  tabButtons: Array.from(document.querySelectorAll('[data-tab-target]')),
  walletAddress: document.getElementById('walletAddress'),
  balanceAmount: document.getElementById('balanceAmount'),
  btnImportWallet: document.getElementById('btnImportWallet'),
  btnNewWallet: document.getElementById('btnNewWallet'),
  btnRefresh: document.getElementById('btnRefresh'),
  btnRefreshUtxos: document.getElementById('btnRefreshUtxos'),
  nftMintForm: document.getElementById('nftMintForm'),
  nftVerifyForm: document.getElementById('nftVerifyForm'),
  nftFileHash: document.getElementById('nftFileHash'),
  nftVerifyResult: document.getElementById('nftVerifyResult'),
  btnFaucet: document.getElementById('btnFaucet'),
  btnCopyAddress: document.getElementById('btnCopyAddress'),
  mnemonicSection: document.getElementById('mnemonicSection'),
  btnCancelImport: document.getElementById('btnCancelImport'),
  mnemonicForm: document.getElementById('mnemonicForm'),
  mnemonicGrid: document.getElementById('mnemonicGrid'),
  btnCopyMnemonic: document.getElementById('btnCopyMnemonic'),
  btnMnemonicImport: document.getElementById('btnMnemonicImport'),
  generatedSection: document.getElementById('generatedSection'),
  btnCloseGenerated: document.getElementById('btnCloseGenerated'),
  generatedGrid: document.getElementById('generatedGrid'),
  btnCopyGeneratedMnemonic: document.getElementById('btnCopyGeneratedMnemonic'),
  utxoCount: document.getElementById('utxoCount'),
  utxosList: document.getElementById('utxosList'),
  transferForm: document.getElementById('transferForm'),
  toAddress: document.getElementById('toAddress'),
  amount: document.getElementById('amount'),
  btnTransfer: document.getElementById('btnTransfer'),
  resultCard: document.getElementById('resultCard'),
  txHash: document.getElementById('txHash'),
  explorerLink: document.getElementById('explorerLink'),
  logsContent: document.getElementById('logsContent'),
  btnClearLogs: document.getElementById('btnClearLogs'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toastMessage'),
  tipEpoch: document.getElementById('tipEpoch'),
  tipHeight: document.getElementById('tipHeight'),
  tipSlot: document.getElementById('tipSlot'),
  tipHash: document.getElementById('tipHash'),
  protoMinFeeA: document.getElementById('protoMinFeeA'),
  protoMinFeeB: document.getElementById('protoMinFeeB'),
  protoMaxTxSize: document.getElementById('protoMaxTxSize'),
  protoKeyDeposit: document.getElementById('protoKeyDeposit'),
  stakeAddress: document.getElementById('stakeAddress'),
  stakeAmount: document.getElementById('stakeAmount'),
};

const API_BASE = window.location.protocol.startsWith('http') ? '/api' : 'http://localhost:3001/api';
const WORD_COUNT = 24;
let latestGeneratedMnemonic = [];
let currentNetwork = localStorage.getItem('cardanoNetwork') || 'preview';
let currentTab = localStorage.getItem('cardanoTab') || 'overview';
let configuredApiNetworks = { preview: false, preprod: false };

document.addEventListener('DOMContentLoaded', init);

function init() {
  elements.tabButtons.forEach((button, index) => {
    button.addEventListener('click', () => switchTab(button.dataset.tabTarget));
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const next = event.key === 'ArrowRight'
        ? (index + 1) % elements.tabButtons.length
        : (index - 1 + elements.tabButtons.length) % elements.tabButtons.length;
      elements.tabButtons[next].focus();
      switchTab(elements.tabButtons[next].dataset.tabTarget);
    });
  });
  switchTab(currentTab);
  elements.networkSelect.value = currentNetwork;
  updateNetworkLabels();
  elements.networkSelect.addEventListener('change', handleNetworkChange);
  document.getElementById('nftNetwork').addEventListener('change', syncNetworkActions);
  document.getElementById('nftVerifyNetwork').addEventListener('change', syncNetworkActions);
  elements.apiConfigForm.addEventListener('submit', saveApiKeys);
  elements.btnImportWallet.addEventListener('click', showMnemonicForm);
  if (elements.btnCancelImport) {
    elements.btnCancelImport.addEventListener('click', () => {
      elements.mnemonicSection.style.display = 'none';
    });
  }
  elements.btnNewWallet.addEventListener('click', createNewWallet);
  elements.btnRefresh.addEventListener('click', refreshData);
  elements.btnRefreshUtxos.addEventListener('click', refreshUtxos);
  elements.nftMintForm.addEventListener('submit', handleNftMint);
  elements.nftVerifyForm.addEventListener('submit', handleNftVerify);
  elements.btnFaucet.addEventListener('click', openFaucet);
  elements.btnCopyAddress.addEventListener('click', copyAddress);
  elements.transferForm.addEventListener('submit', handleTransfer);
  elements.mnemonicForm.addEventListener('submit', handleMnemonicImport);
  elements.btnCopyMnemonic.addEventListener('click', copyMnemonic);
  elements.utxosList.addEventListener('click', handleUtxoListClick);
  elements.btnClearLogs.addEventListener('click', clearLogs);

  if (elements.btnCloseGenerated) {
    elements.btnCloseGenerated.addEventListener('click', () => {
      elements.generatedSection.style.display = 'none';
    });
  }

  if (elements.btnCopyGeneratedMnemonic) {
    elements.btnCopyGeneratedMnemonic.addEventListener('click', copyGeneratedMnemonic);
  }

  buildMnemonicGrid();
  refreshApiStatus();
  loadExistingWallet();
  refreshChainInfo();
}

function switchTab(tabName) {
  const validTab = elements.tabButtons.some((button) => button.dataset.tabTarget === tabName)
    ? tabName
    : 'overview';
  currentTab = validTab;
  localStorage.setItem('cardanoTab', validTab);
  elements.tabButtons.forEach((button) => {
    const active = button.dataset.tabTarget === validTab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-tab]').forEach((panel) => {
    panel.classList.toggle('tab-hidden', panel.dataset.tab !== validTab);
  });
}

function handleNetworkChange(event) {
  currentNetwork = event.target.value;
  localStorage.setItem('cardanoNetwork', currentNetwork);
  updateNetworkLabels();
  refreshApiStatus();
  refreshChainInfo();
  if (wallet) refreshData();
  addLog(`Rede selecionada: ${currentNetwork === 'preview' ? 'Preview' : 'Preprod'}`);
}

function updateNetworkLabels() {
  const label = currentNetwork === 'preview' ? 'Preview' : 'Preprod';
  if (elements.chainNetworkLabel) elements.chainNetworkLabel.textContent = label;
  if (elements.footerNetwork) elements.footerNetwork.textContent = `Rede: ${label}`;
}

async function refreshApiStatus() {
  try {
    const data = await apiCall('/config/networks', 'GET', null, false);
    configuredApiNetworks = data.configured;
    const available = Boolean(configuredApiNetworks[currentNetwork]);
    elements.apiStatus.className = `api-status ${available ? 'ready' : 'error'}`;
    elements.apiStatus.textContent = available
      ? `API Blockfrost cadastrada para ${networkLabel(currentNetwork)}. Esta rede está liberada.`
      : `API não cadastrada para ${networkLabel(currentNetwork)}. Cadastre a chave ${networkLabel(currentNetwork)} na aba Rede & logs para liberar esta rede.`;
    syncNetworkActions();
    return available;
  } catch (error) {
    elements.apiStatus.className = 'api-status error';
    elements.apiStatus.textContent = 'Não foi possível verificar as APIs Blockfrost. As operações de rede permanecem bloqueadas.';
    configuredApiNetworks = { preview: false, preprod: false };
    syncNetworkActions();
    return false;
  }
}

function networkLabel(network) {
  return network === 'preview' ? 'Preview' : 'Preprod';
}

function networkConfigurationMessage(network, operation = 'usar esta rede') {
  return `Cadastre a chave Blockfrost ${networkLabel(network)} na aba Rede & logs antes de ${operation}.`;
}

async function ensureNetworkConfigured(network, operation = 'usar esta rede') {
  const available = await refreshApiStatus();
  if (available) return true;

  const message = networkConfigurationMessage(network, operation);
  addLog(message, 'error');
  showToast(message);
  switchTab('network');
  return false;
}

function syncNetworkActions() {
  const currentAvailable = Boolean(configuredApiNetworks[currentNetwork]);
  const actions = [elements.btnRefresh, elements.btnRefreshUtxos, elements.btnFaucet, elements.btnTransfer];
  for (const action of actions) {
    if (!action) continue;
    action.disabled = !currentAvailable;
    action.title = currentAvailable ? '' : networkConfigurationMessage(currentNetwork);
  }

  const nftNetwork = document.getElementById('nftNetwork')?.value || currentNetwork;
  const verifyNetwork = document.getElementById('nftVerifyNetwork')?.value || currentNetwork;
  const mintButton = document.getElementById('btnNftMint');
  const verifyButton = document.getElementById('btnNftVerify');
  if (mintButton) {
    mintButton.disabled = !configuredApiNetworks[nftNetwork];
    mintButton.title = mintButton.disabled ? networkConfigurationMessage(nftNetwork, 'cunhar um NFT') : '';
  }
  if (verifyButton) {
    verifyButton.disabled = !configuredApiNetworks[verifyNetwork];
    verifyButton.title = verifyButton.disabled ? networkConfigurationMessage(verifyNetwork, 'verificar um NFT') : '';
  }
}

async function saveApiKeys(event) {
  event.preventDefault();
  const preview = elements.previewApiKey.value.trim();
  const preprod = elements.preprodApiKey.value.trim();
  if (!preview && !preprod) {
    showToast('Informe pelo menos uma chave Blockfrost');
    return;
  }

  setLoading(elements.btnSaveApiKeys, true);
  try {
    const result = await apiCall('/config/apis', 'POST', { preview, preprod }, false);
    elements.previewApiKey.value = '';
    elements.preprodApiKey.value = '';

    // Keep the user on the only configured network when just one key was added.
    const configured = result.configured || {};
    const configuredNetworksNow = Object.entries(configured)
      .filter(([, isConfigured]) => Boolean(isConfigured))
      .map(([network]) => network);
    if (!configured[currentNetwork] && configuredNetworksNow.length === 1) {
      currentNetwork = configuredNetworksNow[0];
      elements.networkSelect.value = currentNetwork;
      localStorage.setItem('cardanoNetwork', currentNetwork);
      updateNetworkLabels();
      addLog(`Rede ${networkLabel(currentNetwork)} selecionada automaticamente`);
    }

    await refreshApiStatus();
    addLog('APIs Blockfrost configuradas nesta sessão', 'success');
    showToast(
      configuredNetworksNow.length === 1
        ? `API ${networkLabel(configuredNetworksNow[0])} salva. Essa rede está liberada.`
        : 'APIs salvas com segurança'
    );
    refreshChainInfo();
    if (wallet) refreshData();
  } catch (error) {
    const msg = getErrorMessage(error);
    addLog(`Erro ao salvar APIs: ${msg}`, 'error');
    showToast(msg);
  } finally {
    setLoading(elements.btnSaveApiKeys, false);
  }
}

function buildMnemonicGrid() {
  elements.mnemonicGrid.innerHTML = '';
  for (let i = 0; i < WORD_COUNT; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mnemonic-word';

    const index = document.createElement('span');
    index.className = 'word-index';
    index.textContent = `${i + 1}.`;

    const input = document.createElement('input');
    input.type = 'text';
    input.dataset.index = i;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = `...`;

    input.addEventListener('paste', handlePaste);
    input.addEventListener('input', handleWordInput);
    input.addEventListener('keydown', handleWordKeydown);

    wrapper.appendChild(index);
    wrapper.appendChild(input);
    elements.mnemonicGrid.appendChild(wrapper);
  }
}

function handlePaste(e) {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text');
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) return;

  const inputs = Array.from(elements.mnemonicGrid.querySelectorAll('input'));
  const startIndex = Math.max(0, inputs.indexOf(e.target));

  for (let i = startIndex; i < WORD_COUNT; i++) {
    const wordIndex = i - startIndex;
    if (wordIndex < words.length) {
      inputs[i].value = words[wordIndex].toLowerCase();
      inputs[i].classList.add('filled');
    }
  }

  const focusIndex = Math.min(startIndex + words.length, WORD_COUNT - 1);
  inputs[focusIndex].focus();

  if (words.length >= WORD_COUNT) {
    addLog(`${WORD_COUNT} palavras coladas com sucesso`);
  } else {
    addLog(`${words.length} palavras coladas (faltam ${WORD_COUNT - words.length})`);
  }
}

function handleWordInput(e) {
  const input = e.target;
  const value = input.value.trim().toLowerCase();

  if (value.length > 0) {
    input.value = value;
    input.classList.add('filled');

    const inputs = Array.from(elements.mnemonicGrid.querySelectorAll('input'));
    const currentIndex = inputs.indexOf(input);

    if (value.includes(' ') || value.includes('\n')) {
      const pastedWords = value.split(/[\s\n]+/).filter(w => w.length > 0);
      input.value = pastedWords[0] || '';
      let targetIndex = currentIndex;

      for (let i = 0; i < pastedWords.length && targetIndex < WORD_COUNT; i++) {
        inputs[targetIndex].value = pastedWords[i].substring(0, 20);
        inputs[targetIndex].classList.add('filled');
        targetIndex++;
      }

      const nextIndex = Math.min(targetIndex, WORD_COUNT - 1);
      inputs[nextIndex].focus();
      return;
    }
  } else {
    input.classList.remove('filled');
  }
}

function handleWordKeydown(e) {
  const input = e.target;
  const inputs = Array.from(elements.mnemonicGrid.querySelectorAll('input'));
  const currentIndex = inputs.indexOf(input);

  if (e.key === 'Backspace' && input.value === '' && currentIndex > 0) {
    e.preventDefault();
    inputs[currentIndex - 1].focus();
    inputs[currentIndex - 1].value = '';
    inputs[currentIndex - 1].classList.remove('filled');
  }

  if (e.key === 'ArrowLeft' && currentIndex > 0) {
    e.preventDefault();
    inputs[currentIndex - 1].focus();
  }

  if (e.key === 'ArrowRight' && currentIndex < WORD_COUNT - 1) {
    e.preventDefault();
    inputs[currentIndex + 1].focus();
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    if (currentIndex < WORD_COUNT - 1) inputs[currentIndex + 1].focus();
  }
}

async function copyMnemonic() {
  const mnemonic = getMnemonicFromGrid();
  const words = mnemonic.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    showToast('Preencha o mnemonic antes de copiar');
    return;
  }

  try {
    await navigator.clipboard.writeText(mnemonic);
    showToast(`${words.length} palavras copiadas`);
    addLog(`Mnemonic copiado (${words.length} palavras)`);
  } catch {
    showToast('Não foi possível copiar o mnemonic');
  }
}

function getMnemonicFromGrid() {
  const inputs = elements.mnemonicGrid.querySelectorAll('input');
  const words = [];
  for (const input of inputs) {
    const val = input.value.trim();
    if (val) words.push(val);
  }
  return words.join(' ');
}

function clearMnemonicGrid() {
  const inputs = elements.mnemonicGrid.querySelectorAll('input');
  for (const input of inputs) {
    input.value = '';
    input.classList.remove('filled');
  }
}

async function apiCall(endpoint, method = 'GET', body = null, includeNetwork = true) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const separator = endpoint.includes('?') ? '&' : '?';
    const url = includeNetwork && method === 'GET' && endpoint !== '/config/networks'
      ? `${endpoint}${separator}network=${currentNetwork}`
      : endpoint;
    const response = await fetch(`${API_BASE}${url}`, options);

    const textBody = await response.text();

    let responseData;
    try {
      responseData = JSON.parse(textBody);
    } catch {
      throw {
        code: 'PARSE_ERROR',
        message: 'Resposta inválida do servidor',
        details: `O servidor retornou algo que não é JSON. Status: ${response.status}`,
      };
    }

    if (!response.ok || responseData.success === false) {
      throw responseData.error || {
        code: 'HTTP_ERROR',
        message: `Erro HTTP ${response.status}`,
        details: 'O servidor retornou um erro.',
      };
    }

    return responseData.data;
  } catch (error) {
    if (error.code) throw error;

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw {
        code: 'CONNECTION_ERROR',
        message: 'Não foi possível conectar ao servidor',
        details: 'Verifique se o servidor está rodando em http://localhost:3001',
      };
    }

    throw {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Erro desconhecido',
      details: 'Ocorreu um erro inesperado.',
    };
  }
}

function getErrorMessage(error) {
  const messages = {
    INVALID_WORD: 'Palavra inválida no mnemonic',
    INVALID_WORD_COUNT: 'Número incorreto de palavras',
    DUPLICATE_WORDS: 'Palavras duplicadas no mnemonic',
    DERIVATION_FAILED: 'Falha ao derivar chaves',
    MISSING_MNEMONIC: 'Digite as 24 palavras mnemônicas',
    INVALID_JSON: 'Formato de dados inválido',
    INVALID_ADDRESS: 'Endereço inválido',
    INVALID_DESTINATION: 'Endereço de destino inválido',
    INVALID_AMOUNT: 'Valor inválido',
    AMOUNT_TOO_LOW: 'Valor mínimo é 1 ADA',
    NOT_FOUND: 'Recurso não encontrado',
    BALANCE_FETCH_FAILED: 'Falha ao consultar saldo',
    UTXO_FETCH_FAILED: 'Falha ao consultar UTXOs',
    TRANSFER_FAILED: 'Falha na transferência',
    CONNECTION_ERROR: 'Servidor indisponível',
    CONNREFUSED: 'Servidor não está rodando',
    MISSING_API_KEY: 'Informe pelo menos uma chave Blockfrost',
    INVALID_API_KEY_NETWORK: 'A chave Blockfrost não pertence à rede selecionada',
    INVALID_API_KEY: 'Chave Blockfrost inválida ou sem acesso',
    API_NOT_CONFIGURED: 'A chave Blockfrost desta rede não foi cadastrada',
  };

  const title = messages[error.code] || error.message || 'Erro';

  if (error.details) {
    return `${title}: ${error.details}`;
  }

  return title;
}

function showMnemonicForm() {
  switchTab('wallet');
  elements.mnemonicSection.style.display = 'block';
  const firstInput = elements.mnemonicGrid.querySelector('input');
  if (firstInput) firstInput.focus();
}

async function handleMnemonicImport(e) {
  e.preventDefault();

  const mnemonic = getMnemonicFromGrid();
  const words = mnemonic.split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) {
    showToast('Digite suas 24 palavras mnemônicas');
    addLog('Erro: mnemonic vazio', 'error');
    return;
  }

  if (words.length !== 24) {
    const msg = words.length < 24
      ? `Faltam palavras. Digitou ${words.length}, precisa de 24.`
      : `Excesso de palavras. Digitou ${words.length}, precisa de 24.`;
    showToast(msg);
    addLog(`Erro: ${msg}`, 'error');
    return;
  }

  setLoading(elements.btnMnemonicImport, true);
  addLog('Importando carteira...');

  try {
    const data = await apiCall('/wallet/import', 'POST', { mnemonic });
    wallet = data;
    updateWalletUI();
    elements.mnemonicSection.style.display = 'none';
    clearMnemonicGrid();
    addLog('Carteira importada com sucesso', 'success');
    showToast('Carteira importada!');
    refreshData();
  } catch (error) {
    const msg = getErrorMessage(error);
    addLog(`Erro: ${msg}`, 'error');
    showToast(msg);
  } finally {
    setLoading(elements.btnMnemonicImport, false);
  }
}

async function createNewWallet() {
  setLoading(elements.btnNewWallet, true);
  addLog('Gerando nova carteira...');

  try {
    const data = await apiCall('/wallet/generate', 'POST');
    wallet = data;
    updateWalletUI();

    if (data.mnemonic && Array.isArray(data.mnemonic)) {
      latestGeneratedMnemonic = data.mnemonic;
      renderGeneratedMnemonic(data.mnemonic);
      if (elements.generatedSection) {
        elements.generatedSection.style.display = 'block';
      }
    }

    addLog('Carteira gerada com sucesso! Guarde o mnemônico.', 'success');
    showToast('Carteira gerada! Anote suas 24 palavras.');
    refreshData();
  } catch (error) {
    const msg = getErrorMessage(error);
    addLog(`Erro: ${msg}`, 'error');
    showToast(msg);
  } finally {
    setLoading(elements.btnNewWallet, false);
  }
}

function renderGeneratedMnemonic(words) {
  if (!elements.generatedGrid) return;
  elements.generatedGrid.innerHTML = '';

  words.forEach((word, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'mnemonic-word';

    const indexSpan = document.createElement('span');
    indexSpan.className = 'word-index';
    indexSpan.textContent = `${index + 1}.`;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = word;
    input.readOnly = true;
    input.className = 'filled';

    wrapper.appendChild(indexSpan);
    wrapper.appendChild(input);
    elements.generatedGrid.appendChild(wrapper);
  });
}

function copyGeneratedMnemonic() {
  if (!latestGeneratedMnemonic || latestGeneratedMnemonic.length === 0) return;
  const text = latestGeneratedMnemonic.join(' ');
  navigator.clipboard.writeText(text);
  showToast('24 palavras copiadas para a área de transferência!');
  addLog('Mnemônico copiado!');
}

async function loadExistingWallet() {
  try {
    const data = await apiCall('/wallet');
    if (data.address) {
      wallet = data;
      updateWalletUI();
      addLog('Carteira existente carregada');
      refreshData();
    }
  } catch (error) {
    addLog('Nenhuma carteira encontrada');
  }
}

async function refreshChainInfo() {
  if (!await ensureNetworkConfigured(currentNetwork, 'consultar os dados da cadeia')) return;

  try {
    const tip = await apiCall('/tip');
    elements.tipEpoch.textContent = tip.epoch;
    elements.tipHeight.textContent = tip.height;
    elements.tipSlot.textContent = tip.slot;
    elements.tipHash.textContent = tip.hash;
    addLog(`Tip: bloco ${tip.height} | slot ${tip.slot} | época ${tip.epoch}`);
  } catch (error) {
    addLog(`Erro ao consultar tip: ${getErrorMessage(error)}`, 'error');
  }

  try {
    const proto = await apiCall('/protocol');
    elements.protoMinFeeA.textContent = `${proto.minFeeA} /byte`;
    elements.protoMinFeeB.textContent = `${proto.minFeeB}`;
    elements.protoMaxTxSize.textContent = `${proto.maxTxSize} bytes`;
    elements.protoKeyDeposit.textContent = `${proto.keyDeposit} lovelace`;
    addLog(`Protocolo: época ${proto.epoch} | minFeeA ${proto.minFeeA} | minFeeB ${proto.minFeeB}`);
  } catch (error) {
    addLog(`Erro ao consultar protocolo: ${getErrorMessage(error)}`, 'error');
  }

  if (!wallet || !wallet.address) return;
  await refreshStakeInfo();
}

async function refreshStakeInfo() {
  if (!wallet || !wallet.address) return;

  try {
    const stake = await apiCall(`/stake/${wallet.address}`);
    elements.stakeAddress.textContent = stake.stakeAddress;
    const controlled = stake.controlledAmount !== null ? stake.controlledAmount : '0';
    elements.stakeAmount.textContent = `${Number(controlled) / 1000000} ADA`;
    addLog(`Stake: ${stake.stakeAddress}`);
  } catch (error) {
    addLog(`Erro ao consultar stake: ${getErrorMessage(error)}`, 'error');
  }
}

async function refreshData() {
  if (!wallet) {
    showToast('Importe ou gere uma carteira primeiro');
    return;
  }

  if (!await ensureNetworkConfigured(currentNetwork, 'consultar saldo e UTXOs')) return;

  setLoading(elements.btnRefresh, true);
  addLog('Atualizando dados...');

  try {
    const balanceData = await apiCall(`/balance/${wallet.address}`);
    elements.balanceAmount.textContent = formatADA(balanceData.balance);
    addLog(`Saldo: ${formatADA(balanceData.balance)}`);

    await refreshUtxos();

    await refreshStakeInfo();

    showToast('Dados atualizados');
  } catch (error) {
    const msg = getErrorMessage(error);
    addLog(`Erro ao atualizar: ${msg}`, 'error');
    showToast(msg);
  } finally {
    setLoading(elements.btnRefresh, false);
  }
}

async function refreshUtxos() {
  if (!wallet) {
    showToast('Importe ou gere uma carteira primeiro');
    return;
  }

  if (!await ensureNetworkConfigured(currentNetwork, 'consultar UTXOs')) return;

  setLoading(elements.btnRefreshUtxos, true);
  try {
    const utxosData = await apiCall(`/utxos/${wallet.address}`);
    updateUTXOs(utxosData.utxos);
    addLog(`UTXOs atualizados: ${utxosData.utxos.length}`);
    showToast('UTXOs atualizados');
  } catch (error) {
    const msg = getErrorMessage(error);
    addLog(`Erro ao atualizar UTXOs: ${msg}`, 'error');
    showToast(msg);
  } finally {
    setLoading(elements.btnRefreshUtxos, false);
  }
}

function updateWalletUI() {
  if (!wallet) return;

  elements.walletAddress.textContent = wallet.address;
  setConnected(true);
}

function updateUTXOs(utxos) {
  elements.utxoCount.textContent = utxos.length;

  if (utxos.length === 0) {
    elements.utxosList.innerHTML = `
      <div class="empty-state">
        <p>Nenhum UTXO disponível</p>
        <span>Use a faucet para receber tADA</span>
      </div>
    `;
    return;
  }

  elements.utxosList.innerHTML = utxos
    .map(
      (utxo) => {
        const lovelace = utxo.amount.find(a => a.unit === 'lovelace');
        const lovelaceValue = lovelace ? Number(lovelace.quantity) : 0;
        return `
    <div class="utxo-item">
      <span class="utxo-hash">${utxo.tx_hash.substring(0, 24)}...#${utxo.output_index}</span>
      <span class="utxo-amount">${formatADA(lovelaceValue)}</span>
      <button type="button" class="btn-copy utxo-copy" data-utxo-reference="${utxo.tx_hash}#${utxo.output_index}" title="Copiar referência da UTXO" aria-label="Copiar referência da UTXO">⧉</button>
    </div>
  `;
      }
    )
    .join('');
}

async function handleUtxoListClick(event) {
  const button = event.target.closest('[data-utxo-reference]');
  if (!button) return;

  try {
    await navigator.clipboard.writeText(button.dataset.utxoReference);
    showToast('Referência da UTXO copiada');
  } catch {
    showToast('Não foi possível copiar a UTXO');
  }
}

async function sha256File(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function handleNftMint(event) {
  event.preventDefault();
  if (!wallet) {
    showToast('Configure uma carteira antes de cunhar');
    return;
  }
  const file = document.getElementById('nftImageFile').files[0];
  if (!file) return;
  const fileHash = await sha256File(file);
  elements.nftFileHash.textContent = `SHA-256: ${fileHash}`;
  const payload = {
    network: document.getElementById('nftNetwork').value,
    assetName: document.getElementById('nftAssetName').value.trim(),
    imageUri: document.getElementById('nftImageUri').value.trim(),
    mediaType: document.getElementById('nftMediaType').value.trim(),
    name: document.getElementById('nftName').value.trim(),
    description: document.getElementById('nftDescription').value.trim(),
    creator: document.getElementById('nftCreator').value.trim(),
    creationMethod: document.getElementById('nftCreationMethod').value,
    createdAt: new Date().toISOString(),
    sha256: fileHash,
    project: document.getElementById('nftProject').value.trim(),
    durationDays: Number(document.getElementById('nftDuration').value),
  };
  if (!await ensureNetworkConfigured(payload.network, 'cunhar um NFT')) return;
  if (!window.confirm(`Cunhar 1 unidade de ${payload.assetName} na rede ${payload.network}?`)) return;
  setLoading(document.getElementById('btnNftMint'), true);
  try {
    const result = await apiCall('/nft/mint', 'POST', payload);
    addLog(`NFT enviado: ${result.txHash}`, 'success');
    showToast('NFT enviado para a rede');
    document.getElementById('nftAssetUnit').value = result.unit;
  } catch (error) {
    const msg = getErrorMessage(error);
    addLog(`Erro ao cunhar NFT: ${msg}`, 'error');
    showToast(msg);
  } finally {
    setLoading(document.getElementById('btnNftMint'), false);
  }
}

async function handleNftVerify(event) {
  event.preventDefault();
  const file = document.getElementById('nftVerifyFile').files[0];
  const assetUnit = document.getElementById('nftAssetUnit').value.trim();
  if (!file || !assetUnit) return;
  const verifyNetwork = document.getElementById('nftVerifyNetwork').value;
  if (!await ensureNetworkConfigured(verifyNetwork, 'verificar um NFT')) return;
  setLoading(document.getElementById('btnNftVerify'), true);
  try {
    const fileHash = await sha256File(file);
    const result = await apiCall('/nft/verify', 'POST', {
      network: verifyNetwork,
      assetUnit,
      fileHash,
    });
    elements.nftVerifyResult.textContent = `${result.result}. Hash do arquivo: ${fileHash}`;
    elements.nftVerifyResult.dataset.match = String(result.matches);
  } catch (error) {
    elements.nftVerifyResult.textContent = getErrorMessage(error);
    elements.nftVerifyResult.dataset.match = 'false';
  } finally {
    setLoading(document.getElementById('btnNftVerify'), false);
  }
}

async function handleTransfer(e) {
  e.preventDefault();

  if (!await ensureNetworkConfigured(currentNetwork, 'enviar uma transação')) return;

  const toAddress = elements.toAddress.value.trim();
  const amount = parseFloat(elements.amount.value);

  if (!toAddress) {
    showToast('Insira o endereço de destino');
    return;
  }

  if (!toAddress.startsWith('addr_')) {
    showToast('Endereço deve começar com addr_');
    return;
  }

  if (!amount || amount <= 0) {
    showToast('Insira um valor válido');
    return;
  }

  if (amount < 1) {
    showToast('Valor mínimo é 1 ADA');
    return;
  }

  setLoading(elements.btnTransfer, true);
  addLog(`Enviando ${amount} ADA...`);

  try {
    const data = await apiCall('/transfer', 'POST', {
      to: toAddress,
      amount: amount,
      network: currentNetwork,
    });

    elements.resultCard.style.display = 'block';
    elements.txHash.textContent = data.txHash;
    elements.explorerLink.href = `https://preview.cardanoscan.io/transaction/${data.txHash}`;

    addLog(`Transação enviada: ${data.txHash.substring(0, 16)}...`, 'success');
    showToast('Transação enviada!');

    elements.transferForm.reset();
    setTimeout(refreshData, 5000);
  } catch (error) {
    const msg = getErrorMessage(error);
    addLog(`Erro: ${msg}`, 'error');
    showToast(msg);
  } finally {
    setLoading(elements.btnTransfer, false);
  }
}

function openFaucet() {
  if (!wallet) {
    showToast('Importe ou gere uma carteira primeiro');
    return;
  }

  if (!configuredApiNetworks[currentNetwork]) {
    const message = networkConfigurationMessage(currentNetwork, 'abrir a faucet');
    addLog(message, 'error');
    showToast(message);
    switchTab('network');
    return;
  }

  navigator.clipboard.writeText(wallet.address);
  window.open('https://docs.cardano.org/cardano-testnets/tools/faucet/', '_blank');

  addLog('Endereço copiado! Cole na faucet');
  showToast('Endereço copiado para a faucet');
}

function copyAddress() {
  if (!wallet) return;

  navigator.clipboard.writeText(wallet.address);
  showToast('Endereço copiado!');
}

function formatADA(lovelace) {
  if (!lovelace) return '0.000000';
  const ada = lovelace / 1000000;
  return ada.toFixed(6);
}

function setConnected(state) {
  connected = state;
  elements.statusDot.classList.toggle('connected', state);
  elements.statusText.textContent = state ? 'Conectado' : 'Desconectado';
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
  if (!loading) syncNetworkActions();
}

function addLog(message, type = '') {
  const time = new Date().toLocaleTimeString('pt-BR');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-message ${type}">${message}</span>
  `;

  elements.logsContent.appendChild(entry);
  elements.logsContent.scrollTop = elements.logsContent.scrollHeight;
}

function clearLogs() {
  elements.logsContent.innerHTML = '';
  addLog('Logs limpos');
}

function showToast(message) {
  elements.toastMessage.textContent = message;
  elements.toast.classList.add('show');

  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 4000);
}
