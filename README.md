# Cardano Lab

Aplicação educacional para explorar carteiras, UTXOs e NFTs na rede de testes
Cardano. O projeto usa Bun, TypeScript, Mesh SDK e Blockfrost.

O laboratório foi pensado para a aula: a pessoa configura a rede pela interface,
cria ou importa uma carteira de teste, consulta seus dados e acompanha cada etapa
sem colocar credenciais no código.

## Formas de uso

### Testar pelo navegador

A versão online pode ser acessada em:

<https://victorhugoguimaraes.github.io/cardano-lab/>

Essa opção é prática para testar a interface sem instalar nada. Na primeira
abertura, o backend gratuito pode levar alguns segundos para acordar. Depois,
na aba **Rede & logs**:

1. Cole a chave Preview e/ou Preprod do Blockfrost.
2. Clique em **Salvar APIs**.
3. Escolha a rede liberada no seletor do topo.
4. Acesse **Carteira** para importar suas 24 palavras ou gerar uma carteira de teste.

Use somente carteiras de teste e tADA. As chaves são cadastradas pela
interface e não devem ser incluídas no código ou em arquivos públicos.

### Usar localmente

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

## Publicação online

O repositório já contém o fluxo de publicação do frontend no GitHub Pages e do
backend Bun no Render Free. O Pages hospeda a interface; o Render mantém a API
que conversa com o Blockfrost.

1. No Render, crie um **Web Service** a partir deste repositório. O arquivo
   `render.yaml` já informa Bun, o comando de instalação e o comando de início.
2. No serviço do Render, configure `APP_ORIGIN` como
   `https://victorhugoguimaraes.github.io` e aguarde a URL pública do serviço.
3. No GitHub, abra **Settings > Secrets and variables > Actions > Variables** e
   crie `CARDANO_API_URL` com a URL pública do Render, por exemplo
   `https://cardano-lab-api.onrender.com`.
4. Em **Settings > Pages**, selecione **GitHub Actions** como fonte. Cada push
   na branch `main` publica uma nova versão.

O plano gratuito do Render pode adormecer depois de um período sem acesso, então
o primeiro carregamento depois da pausa pode levar cerca de um minuto. Ele é
adequado para demonstrações e trabalhos acadêmicos; para uso contínuo, escolha
um plano com serviço persistente.

## O que a aplicação oferece

- Carteira Cardano com importação, geração e cópia do mnemonic.
- Consulta de saldo, conta de stake e UTXOs atualizados.
- Cópia rápida da referência de cada UTXO.
- Aba de visualização dos NFTs e assets nativos da carteira.
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
