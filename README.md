# Laboratório Cardano + TypeScript

Sistema completo para interação com a blockchain **Cardano (rede Preview)** — criação de carteiras, consulta de saldo/UTXOs, parâmetros da rede e transferências de ADA assinadas localmente, com **interface web** e **CLI de terminal**.

Desenvolvido para a tarefa **Tarefa Casa 01 — Projetos Transversais I (UnB, 2º/2026)**.

---

## Início rápido (para testar em 3 passos)

```bash
npm install                          # 1. instala as dependências (uma vez)
# 2. crie o arquivo .env com o seu Project ID da rede Preview (ver seção 3)
npm run server                       # 3. sobe API + interface
```

Depois abra **http://localhost:3001** no navegador. Para ver a execução pelo terminal (rede, carteira, saldo, stake e protocolo), use `npm run start` — tudo também é gravado em `logs_execucao.txt`.

> **O que olhar primeiro (guia de avaliação):**
> 1. `logs_execucao.txt` — evidência de execução com **TXID + link clicável** do CardanoScan
> 2. `src/` — código TypeScript (CLI + API + carteira + transações)
> 3. `frontend/` — interface web
> 4. Seção 7 deste README — mapa de cada arquivo e dos critérios avaliados

---

## 1. Requisitos

| Item | Versão usada |
|---|---|
| [Bun](https://bun.sh) | 1.3+ (Node.js 18+ também funciona para compilar) |
| Conta no [Blockfrost](https://blockfrost.io/) | Project ID da rede **Preview** |
| Navegador | Chrome/Edge/Firefox atualizados |

## 2. Instalação (uma vez só)

```bash
# 1. Entre na pasta do projeto
cd cardano-lab

# 2. Instale as dependências
npm install
```

## 3. Configurar o Blockfrost

1. Acesse https://blockfrost.io/ → crie uma conta → **New project** → escolha a rede **Preview**
2. Copie o Project ID (começa com `preview`)
3. Crie o arquivo `.env` na raiz do projeto com o conteúdo:

```env
BLOCKFROST_PROJECT_ID=previewSEU_PROJECT_ID_AQUI
```

> O programa **recusa** Project IDs de outras redes — só funciona na Preview (rede de testes).

---

## 4. Como usar — Interface Web (recomendado para demonstração)

### Passo 1: Iniciar o servidor

```bash
npm run server
```

O terminal deve mostrar:

```
[SERVER] Cardano Lab rodando em http://localhost:3001
[SERVER] API disponível em http://localhost:3001/api/
[SERVER] Frontend em http://localhost:3001/
```

### Passo 2: Acessar no navegador

Abra **http://localhost:3001**

### Passo 3: Criar ou importar carteira

**Criar carteira nova:**
1. Clique em **"Gerar Nova"**
2. Anote as **24 palavras mnemônicas** exibidas (guardadas com segurança — são a chave da carteira)
3. O endereço `addr_test1...` aparece na tela

**Importar carteira existente:**
1. Clique em **"Importar Carteira"**
2. Cole as 24 palavras no primeiro campo (o Ctrl+V preenche todos os campos de uma vez) — ou digite uma por uma
3. Clique em **"Importar Carteira"**

### Passo 4: Receber tADA (moeda de teste)

1. Clique no botão **"Faucet"** (copia o endereço e abre a faucet oficial)
2. Cole o endereço `addr_test1...` na faucet e solicite tADA
3. Aguarde alguns minutos e clique no botão **"Atualizar"** (ícone de refresh) para ver o saldo

### Passo 5: Ver dados da rede

O card **"Cadeia & Protocolo"** mostra, atualizados a cada consulta:

- **Tip da cadeia**: época, bloco atual, slot e hash
- **Parâmetros do protocolo**: `minFeeA`, `minFeeB`, `maxTxSize`, `keyDeposit`
- **Conta de stake**: endereço `stake_test1...` derivado da carteira e valor sob controle

### Passo 6: Enviar ADA

1. Preencha **"Endereço de destino"** (outro endereço `addr_test1...`)
2. Informe o **valor em ADA** (mínimo 1 ADA)
3. Clique em **"Enviar ADA"**
4. Na tela **"Transação Enviada"** aparecem o **TXID** e o link **"Ver no CardanoScan"**

---

## 5. Como usar — Terminal (CLI)

### Consultar rede, carteira, saldo e UTXOs

```bash
npm run start
```

Saída gravada em `logs_execucao.txt` (e no console):

- `[1]`/`[2]` — conexão com Blockfrost, **época, bloco, slot e hash do tip**
- `[3]` — endereço `addr_test1...` da carteira ativa
- `[FAUCET]` — link da faucet com o endereço para colar
- `[BALANCE]` — saldo em ADA
- `[UTXOs]` — lista de UTXOs (com tx hash, índice e valor)
- `[STAKE]` — endereço **`stake_test1...`** e valor sob controle
- `[PROTOCOL]` — minFeeA, minFeeB, maxTxSize, keyDeposit

### Enviar ADA via terminal

```bash
npm run start -- --transfer <endereco_destino> <valor_em_ada>
```

Exemplo:

```bash
npm run start -- --transfer addr_test1qq...abc123 1
```

Ao final da execução o bloco abaixo é gravado em `logs_execucao.txt`:

```
========================================
TRANSAÇÃO ENVIADA
========================================
TXID: <hash_da_transacao>
Explorer: https://preview.cardanoscan.io/transaction/<hash_da_transacao>
========================================
```

> O link acima é clicável no arquivo de log e leva ao explorer da transação.

### Comandos úteis

```bash
npm run start        # CLI: consulta de rede, carteira, saldo, UTXOs, stake, protocolo
npm run server       # Sobe API + interface web em http://localhost:3001
npm run dev:server   # Servidor com hot-reload (desenvolvimento)
npm run build        # Compila TypeScript (validação de tipos) para dist/
```

> **Windows (PowerShell):** se `npm run start -- --transfer ...` não repassar os argumentos, use diretamente:
> `bun src/index.ts --transfer <endereco> <valor>`

---

## 6. Evidências de execução (para a entrega)

| Artefato | Onde está |
|---|---|
| Código-fonte TypeScript | `src/` |
| Interface web | `frontend/` |
| Log de execução com **TXID + link do Explorer** | `logs_execucao.txt` |
| Instruções de uso | este `README.md` |

O arquivo `logs_execucao.txt` é gravado em **append** (nada é apagado entre execuções) e contém, com timestamps:

- Endereço `addr_test1...` e endereço de stake `stake_test1...`
- Tip da cadeia Preview (época, bloco, slot, hash)
- Parâmetros do protocolo
- Após `--transfer`: **TXID** e link `https://preview.cardanoscan.io/transaction/<TXID>`

---

## 7. Estrutura do projeto

### Visão geral dos diretórios

```
cardano-lab/
├── src/                  ← código-fonte TypeScript (lógica do sistema)
├── frontend/             ← interface web (HTML + CSS + JS puro)
├── bip39_words.txt       ← wordlist oficial BIP39 usada na importação
├── logs_execucao.txt     ← ARTEFATO: log de execução com TXID + link do Explorer
├── README.md             ← este documento (instruções de uso)
├── package.json          ← scripts (npm run start / server / build) e dependências
├── tsconfig.json         ← configuração do compilador TypeScript (strict, sem `any`)
├── .gitignore            ← lista de arquivos que NÃO vão para o repositório
├── bun.lock              ← lockfile de dependências (Bun)
└── package-lock.json     ← lockfile de dependências (npm)
```

### `src/` — back-end e CLI

| Arquivo | Responsabilidade |
|---|---|
| `index.ts` | **Ponto de entrada do terminal (CLI)**: conecta à rede, mostra tip da cadeia, carteira, saldo, UTXOs, conta de stake e parâmetros do protocolo; com `--transfer` constrói, assina e envia a transação gravando **TXID + link do Explorer** |
| `server.ts` | **Servidor HTTP** (`Bun.serve`): API REST (`/api/tip`, `/api/balance`, `/api/utxos`, `/api/stake`, `/api/protocol`, `/api/wallet`, `/api/transfer`...) e entrega da interface web em `http://localhost:3001` |
| `wallet.ts` | Criação e importação de carteira (24 palavras BIP39 → chaves CIP-1852, derivadas no caminho `1852'/1815'/0'/0/*`), persistência em `wallet.json` |
| `blockfrost.ts` | Cliente da API **Blockfrost**: tip da cadeia e parâmetros do protocolo, com tratamento de erros tipado |
| `utxo.ts` | Consulta de saldo, lista de UTXOs e conta de stake (`stake_test1...`) de um endereço |
| `transaction.ts` | Fluxo completo de transferência: monta a transação → calcula a taxa → assina localmente com a chave privada → envia à rede → retorna TXID |
| `errors.ts` | Classe `AppError` e helpers: contrato de erro `{code, message, details}` — sem uso de `any` |

### `frontend/` — interface web

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Página principal: cartões de carteira, saldo, UTXOs, cadeia & protocolo, envio de ADA e console de logs |
| `css/style.css` | Tema escuro e layout responsivo |
| `js/app.js` | Lógica da interface: chamadas à API (`fetch`), geração/importação de carteira (grade de 24 campos com suporte a colar), atualização de saldos e envio de transferências |

### Arquivos gerados durante a execução (não versionados)

| Arquivo | O que é |
|---|---|
| `wallet.json` | Chaves da carteira — criado automaticamente ao gerar/importar carteira (**contém o mnemônico; não incluir em zip/repositório**) |
| `.env` | Project ID do Blockfrost (**credencial; não incluir em zip/repositório** — basta criar o arquivo na raiz com o conteúdo da seção 3) |
| `dist/` | Código compilado pelo `npm run build` (regenerável) |
| `node_modules/` | Dependências (reinstaláveis com `npm install`) |

> O zip da entrega traz apenas o que a professora precisa: `src/`, `frontend/`, `README.md`, `logs_execucao.txt` e os arquivos de configuração — **sem** segredos (`wallet.json`, `.env`) e sem pastas geradas (`node_modules/`, `dist/`).

### Mapa critérios → arquivos

| O que é avaliado | Onde está |
|---|---|
| Código TS sem `any` e com tratamento de erros | `src/*.ts`, `src/errors.ts`, `tsconfig.json` (`strict`) |
| CLI com logs de rede (tip), stake e protocolo | `src/index.ts` → `logs_execucao.txt` |
| Transferência com TXID + link do Explorer | `src/transaction.ts`, bloco final em `logs_execucao.txt` |
| Interface web funcional | `frontend/` |
| Instruções de uso | `README.md` (este arquivo) |
| Arquivos ocultos excluídos corretamente | `.gitignore` (`node_modules/`, `dist/`, `.env`, `wallet.json`)

---

## 8. Segurança

- **Nunca** compartilhe `wallet.json`, o mnemônico de 24 palavras ou o `.env`
- O `.gitignore` já exclui `.env` e `wallet.json` do versionamento
- Rede **Preview** usa moeda sem valor real (tADA)

## 9. Solução de problemas

| Problema | Solução |
|---|---|
| `BLOCKFROST_PROJECT_ID não encontrado` | Crie o arquivo `.env` com o Project ID da Preview |
| `Este laboratório exige a rede Preview` | O Project ID é de outra rede — crie um projeto Preview |
| Porta 3001 ocupada | Feche o processo anterior ou rode com `PORT=3002 npm run server` |
| Saldo zerado | Solicite tADA na faucet e aguarde a confirmação |
| `Saldo insuficiente` na transferência | Solicite mais tADA ou reduza o valor enviado |
| Página sem estilo/JS | Dê um hard refresh (**Ctrl+Shift+R**) |

## Licença

MIT
