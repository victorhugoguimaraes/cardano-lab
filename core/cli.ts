import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { parseNetwork } from "./config";
import { createBlockfrostProvider, describeProvider } from "./provider";
import { createHeadlessWallet } from "./wallet";
import { sha256File } from "./hashing";
import { mintOneNft } from "./mint";
import { verifyFileAgainstAsset } from "./verify";

const rl = createInterface({ input, output });

async function main(): Promise<void> {
  const command = Bun.argv[2] ?? "help";
  if (command === "help") {
    console.log(`Cardano Lab\n\nComandos:\n  bun run cli network\n  bun run cli hash --file caminho\n  bun run cli validate\n  bun run cli mint\n  bun run cli verify --file caminho`);
    return;
  }
  if (command === "network") {
    const value = await rl.question("Rede [preview/preprod]: ");
    console.log(`Rede selecionada: ${parseNetwork(value)}`);
    return;
  }
  if (command === "wallet-info") {
    const network = parseNetwork(await rl.question("Rede [preview/preprod]: "));
    const mnemonic = await rl.question("Seed phrase (não será salva): ");
    const provider = createBlockfrostProvider(network);
    const wallet = await createHeadlessWallet(network, provider, mnemonic);
    const address = wallet.getChangeAddress();
    const balance = await wallet.getBalance();
    console.log(`Provedor: ${describeProvider(network)}`);
    console.log(`Endereço: ${address}`);
    console.log(`Saldo: ${JSON.stringify(balance)}`);
    return;
  }
  if (command === "hash") {
    const file = Bun.argv[3] === "--file" ? Bun.argv[4] : undefined;
    if (!file) throw new Error("Uso: bun run cli hash --file caminho");
    console.log(await sha256File(file));
    return;
  }
  if (command === "mint") {
    const network = parseNetwork(await rl.question("Rede [preview/preprod]: "));
    const imagePath = await rl.question("Caminho da imagem: ");
    const imageUri = await rl.question("URI pública da imagem [ipfs:// ou https://]: ");
    const assetName = await rl.question("Asset name [ORIGEM0001]: ") || "ORIGEM0001";
    const name = await rl.question("Nome da obra: ");
    const description = await rl.question("Descrição: ");
    const creator = await rl.question("Pseudônimo do criador: ");
    const creationMethod = await rl.question("Método [sem IA/IA assistida/gerada por IA]: ") as "sem IA" | "IA assistida" | "gerada por IA";
    const mediaType = await rl.question("MIME type [image/png]: ") || "image/png";
    const durationText = await rl.question("Validade da política em dias [30]: ");
    const durationDays = Number(durationText || "30");
    if (!Number.isInteger(durationDays) || durationDays <= 0) throw new Error("A duração deve ser um número inteiro positivo.");
    const sha256 = await sha256File(imagePath);
    const createdAt = new Date().toISOString();
    const project = "Origem Digital";
    const mnemonic = await rl.question("Seed phrase (somente em memória): ");
    const provider = createBlockfrostProvider(network);
    const wallet = await createHeadlessWallet(network, provider, mnemonic);
    const address = wallet.getChangeAddress();
    console.log(`\nProvedor: ${describeProvider(network)}`);
    console.log(`Destino: ${address}`);
    console.log(`SHA-256: ${sha256}`);
    console.log("A transação será criada com quantidade 1 e política sig + before.");
    const confirmation = await rl.question("Digite ENVIAR para assinar e transmitir: ");
    if (confirmation !== "ENVIAR") {
      console.log("Operação cancelada. Nenhuma transação foi assinada.");
      return;
    }
    const result = await mintOneNft(provider, wallet, {
      network,
      assetName,
      imageUri,
      mediaType,
      name,
      description,
      creator,
      creationMethod,
      createdAt,
      sha256,
      project,
      durationDays,
    });
    await mkdir("evidence", { recursive: true });
    await mkdir("metadata", { recursive: true });
    await mkdir("policy", { recursive: true });
    await writeFile("metadata/nft.json", JSON.stringify(result.metadata, null, 2));
    await writeFile("policy/policy.json", JSON.stringify(result.policy, null, 2));
    await writeFile("evidence/mint-result.json", JSON.stringify({
      network,
      txHash: result.txHash,
      address: result.address,
      policyId: result.policyId,
      assetName: result.assetName,
      assetNameHex: result.assetNameHex,
      unit: result.unit,
      beforeSlot: result.beforeSlot,
    }, null, 2));
    console.log(`Transação enviada: ${result.txHash}`);
    return;
  }
  if (command === "verify") {
    const network = parseNetwork(await rl.question("Rede [preview/preprod]: "));
    const assetUnit = await rl.question("Asset unit (policyId + assetNameHex): ");
    const filePath = Bun.argv[3] === "--file" ? Bun.argv[4] : await rl.question("Caminho do arquivo: ");
    if (!filePath) throw new Error("Caminho do arquivo é obrigatório.");
    const provider = createBlockfrostProvider(network);
    const result = await verifyFileAgainstAsset(provider, assetUnit, filePath);
    console.log(`Hash do arquivo: ${result.fileHash}`);
    console.log(`Hash registrado: ${result.registeredHash}`);
    console.log(result.result);
    return;
  }
  console.log(`O comando '${command}' ainda será conectado ao fluxo Mesh SDK.`);
}

try {
  await main();
} finally {
  rl.close();
}
