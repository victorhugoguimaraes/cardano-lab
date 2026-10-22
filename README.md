# Cardano Lab

Aplicação educacional para explorar carteiras, UTXOs e NFTs na rede de testes
Cardano. O projeto usa Bun, TypeScript, Mesh SDK e Blockfrost.

O laboratório foi pensado para a aula: a pessoa configura a rede pela interface,
cria ou importa uma carteira de teste, consulta seus dados e acompanha cada etapa
sem colocar credenciais no código.

## Para usar localmente

### Pré-requisitos

- Windows, macOS ou Linux
- [Bun](https://bun.sh/)
- Uma conta no [Blockfrost](https://blockfrost.io/)
- Um project ID da rede Preview, Preprod ou das duas

### Instalação

```bash
bun install
```

### Iniciar a aplicação

```bash
bun run server
```

Abra [http://localhost:3001](http://localhost:3001). Na aba **Rede & logs**:

1. Cole a chave Preview e/ou Preprod.
2. Clique em **Salvar APIs**.
3. Escolha a rede liberada no seletor do topo.
4. Acesse **Carteira** para importar suas 24 palavras ou gerar uma carteira de teste.

Uma única chave já é suficiente. A rede sem chave permanece bloqueada até ser
configurada. As chaves e a carteira ficam somente na memória enquanto o servidor
está aberto.

Use apenas carteiras de teste e tADA. Nunca publique project IDs, mnemonic ou
chaves privadas.

## O que a aplicação oferece

- Carteira Cardano com importação, geração e cópia do mnemonic.
- Consulta de saldo, conta de stake e UTXOs atualizados.
- Cópia rápida da referência de cada UTXO.
- Faucet oficial para receber tADA.
- Transferência de ADA de teste com assinatura local.
- Registro e verificação de NFTs com hash SHA-256 e metadados CIP-25.
- Alternância entre Preview e Preprod pela interface.

## Organização do projeto

```text
frontend/       Interface HTML, CSS, JavaScript e favicon
backend/        API HTTP, carteira, Blockfrost e transações
core/           Mesh SDK, metadados, políticas e comandos compartilhados
docs/           Documentação complementar
```

## Licença

MIT. Consulte `LICENSE`.
