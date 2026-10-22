import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "node_modules", "libsodium-sumo", "dist", "modules-sumo-esm", "libsodium-sumo.mjs");
const target = join(root, "node_modules", "libsodium-wrappers-sumo", "dist", "modules-sumo-esm", "libsodium-sumo.mjs");

if (existsSync(source)) {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  console.log("Patched libsodium-wrappers-sumo ESM dependency path.");
}
