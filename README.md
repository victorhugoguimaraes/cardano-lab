# Cardano Lab — Carteira na rede Preview

Aplicação educacional em TypeScript para interagir com a blockchain Cardano na rede de testes **Preview**. O sistema cria e importa carteiras, consulta dados pela Blockfrost e realiza transferências de tADA com assinatura local.

> Projeto desenvolvido para a disciplina Projetos Transversais I — UnB. A rede Preview utiliza tADA, moeda de teste sem valor financeiro.

## Funcionalidades

- Geração e importação de carteira com mnemonic BIP39 de 24 palavras.
- Derivação de endereço de pagamento `addr_test1...` e endereço de stake `stake_test1...`.
- Consulta de tip da cadeia, saldo, UTXOs, conta de stake e parâmetros de protocolo.
- Solicitação de tADA pela faucet oficial da testnet.
- Transferência de ADA: construção, assinatura local, submissão e link para o CardanoScan.
- Interface web e comandos de terminal.

## Tecnologias

- TypeScript e Bun
- [Blockfrost](https://blockfrost.io/) para acesso à rede Cardano Preview
- `@emurgo/cardano-serialization-lib-nodejs` para endereços, chaves e transações
- `bip39` para geração e validação de mnemonics

## Executar localmente

### 1. Pré-requisitos

- [Node.js](https://nodejs.org/) 18+ e [Bun](https://bun.sh/)
- Uma conta no [Blockfrost](https://blockfrost.io/) com um Project ID criado para a rede **Preview**

### 2. Configuração

Instale as dependências e crie seu arquivo de ambiente:

```powershell
npm install
Copy-Item .env.example .env
```

Abra `.env` e substitua o valor pelo seu Project ID da Blockfrost Preview:

```env
BLOCKFROST_PROJECT_ID=SEU_PROJECT_ID_DA_BLOCKFROST_PREVIEW
```

Nunca publique o `.env`, o mnemonic ou o arquivo `wallet.json`.

### 3. Iniciar a interface

```powershell
npm run server
```

Abra o endereço informado no terminal. Pela interface, gere ou importe uma carteira, solicite tADA na faucet, atualize os dados e envie ADA para outro endereço Preview.

## Uso pelo terminal

```powershell
# Consulta cadeia, carteira, saldo, UTXOs, stake e parâmetros
npm run start

# Envia ADA para outro endereço Preview
npm run start -- --transfer <endereco_destino> <valor_em_ada>
```

Cada execução é registrada em `logs_execucao.txt`. Após uma transferência, o arquivo registra o TXID e o link do CardanoScan Preview.

## Estrutura

```text
src/
  blockfrost.ts   Cliente e parâmetros da rede Preview
  wallet.ts       Mnemonic, chaves e endereços da carteira
  utxo.ts         Saldo, UTXOs e conta de stake
  transaction.ts  Construção, assinatura e envio de ADA
  server.ts       API HTTP e entrega do frontend
  index.ts        Interface de linha de comando
frontend/         Interface web (HTML, CSS e JavaScript)
```

## Segurança e escopo

Este é um laboratório para a rede Preview. Não use mnemonics de uma carteira que tenha fundos reais. A aplicação transfere apenas ADA e rejeita UTXOs com tokens nativos, para não construir uma transação que deixe tokens sem troco.

## Licença

[MIT](LICENSE).
