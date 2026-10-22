import {
  ForgeScript,
  resolveScriptHash,
  deserializeAddress,
  type NativeScript as MeshNativeScript,
} from "@meshsdk/core";
import type { NativeScript } from "./types";

export function buildNativePolicy(keyHash: string, beforeSlot: bigint): NativeScript {
  if (!/^[0-9a-f]{56}$/i.test(keyHash)) throw new Error("keyHash inválido.");
  if (beforeSlot <= 0n) throw new Error("beforeSlot deve ser positivo.");
  return {
    type: "all",
    scripts: [
      { type: "sig", keyHash },
      { type: "before", slot: beforeSlot.toString() },
    ],
  };
}

export function policyFromAddress(address: string, beforeSlot: bigint) {
  const { pubKeyHash } = deserializeAddress(address);
  const script = buildNativePolicy(pubKeyHash, beforeSlot);
  const forgingScript = ForgeScript.fromNativeScript(script as MeshNativeScript);
  return { script, forgingScript, policyId: resolveScriptHash(forgingScript) };
}
