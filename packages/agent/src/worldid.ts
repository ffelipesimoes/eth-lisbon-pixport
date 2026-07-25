/**
 * World Identity Check (Beta) — server-side verification + allowance tier mapping.
 *
 * This module implements the World Identity Check gate that determines the payer's
 * AllowanceTier. "Identity Check" is World's Beta product for verifying unique
 * personhood via the Orb device.
 *
 * Tier mapping (World Identity Check Beta → HIP-336 allowance tier):
 *   "orb"    → Identity Check ✓ (Orb-verified unique human)  → HIGH  tier (1 M units)
 *   "device" → World App device-verified (not full Identity Check) → MEDIUM tier (100 k units)
 *   absent   → No proof / unverified                              → ZERO  tier (rejected)
 *
 * Verification uses verifyCloudProof() from @worldcoin/idkit-core/backend — the
 * canonical SDK function for server-side Identity Check verification (v2 API).
 *
 * Dev-test path (no phone required):
 *   Set WORLD_ENV=staging and use https://simulator.worldcoin.org to generate
 *   a staging orb proof. See DEV_TEST.md for full steps.
 */

import { verifyCloudProof } from "@worldcoin/idkit-core/backend";
import { VerificationLevel as IDKitVerificationLevel } from "@worldcoin/idkit-core";
import type { WorldIDProof, WorldIDVerifyResult, VerificationLevel, AllowanceTier } from "./types.js";
import { TIERS } from "./types.js";

/**
 * The verification level required for World Identity Check (Beta).
 * Only orb-level proofs pass the Identity Check gate and receive the HIGH tier.
 */
export const IDENTITY_CHECK_LEVEL: VerificationLevel = "orb";

/**
 * World Identity Check Cloud API v2 base URL per environment.
 * verifyCloudProof appends /{app_id} automatically when this is passed as endpoint.
 */
const WORLD_API_V2_BASE: Record<string, string> = {
  staging: "https://staging-developer.worldcoin.org/api/v2/verify",
  production: "https://developer.worldcoin.org/api/v2/verify",
};

export interface WorldIDConfig {
  appId: string;
  action: string;
  environment: "staging" | "production";
}

export function loadWorldIDConfig(): WorldIDConfig {
  const appId = process.env.WORLD_APP_ID ?? "";
  const action = process.env.WORLD_ACTION ?? "pixport-payment";
  const environment = (process.env.WORLD_ENV ?? "staging") as "staging" | "production";

  // WORLD_MOCK=true bypasses all API calls — safe for dev / judge testing
  if (process.env.WORLD_MOCK !== "true" && (!appId || appId.startsWith("app_X"))) {
    throw new Error(
      "WORLD_APP_ID is not configured. Set it in .env or set WORLD_MOCK=true for dev testing.",
    );
  }

  return { appId: appId || "app_mock", action, environment };
}

/**
 * Verify a World Identity Check proof using the canonical @worldcoin/idkit-core/backend
 * verifyCloudProof() function (v2 API).
 *
 * The v2 API accepts the proof fields and a hashed signal, and returns { success: true }
 * on valid proofs. The verification_level is trusted from the proof after successful
 * verification — the ZK proof cryptographically binds the credential type.
 *
 * For staging (judge testing), pass WORLD_ENV=staging to route to the staging Cloud API.
 */
export async function verifyWorldIDProof(
  proof: WorldIDProof,
  config: WorldIDConfig,
): Promise<WorldIDVerifyResult> {
  const base = WORLD_API_V2_BASE[config.environment] ?? WORLD_API_V2_BASE.staging;
  // verifyCloudProof constructs the full URL as `${endpoint}/${app_id}` when endpoint ends with the base path.
  // We pass the full endpoint including app_id to be explicit.
  const endpoint = `${base}/${config.appId}`;

  let result: { success: boolean; code?: string; detail?: string };
  try {
    result = await verifyCloudProof(
      {
        proof: proof.proof,
        merkle_root: proof.merkle_root,
        nullifier_hash: proof.nullifier_hash,
        // Cast to IDKit enum — runtime values "orb"/"device" match enum members exactly
        verification_level: proof.verification_level as unknown as IDKitVerificationLevel,
      },
      config.appId as `app_${string}`,
      config.action,
      proof.signal,
      endpoint,
    );
  } catch (err) {
    return {
      verified: false,
      verification_level: null,
      reason: `Network error calling World Identity Check API: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (result.success) {
    const level = proof.verification_level;
    const isIdentityCheck = level === IDENTITY_CHECK_LEVEL;
    console.log(
      `[WorldID] Identity Check result: ${level}` +
      (isIdentityCheck ? " [Identity Check ✓ — Orb-verified human]" : " [device-only, not Identity Check]"),
    );
    return {
      verified: true,
      verification_level: level,
    };
  }

  return {
    verified: false,
    verification_level: null,
    reason: result.detail ?? result.code ?? "World Identity Check verification failed",
  };
}

/**
 * Map a World ID verification level to an AllowanceTier.
 *
 * Identity Check (orb) → HIGH tier  (1,000,000 units max)
 * Device-verified       → MEDIUM tier (100,000 units max)
 * Unverified / failed   → ZERO tier  (0 — immediate reject)
 */
export function resolveAllowanceTier(verificationLevel: VerificationLevel): AllowanceTier {
  return TIERS[verificationLevel];
}

/**
 * Full Identity Check gate: verify proof → resolve tier.
 *
 * If proof is undefined (no World ID provided), returns the "none" tier (immediate reject).
 * If WORLD_MOCK=true, the proof's verification_level is trusted without an API call.
 */
export async function identityCheckAndResolveTier(
  proof: WorldIDProof | undefined,
  config: WorldIDConfig,
): Promise<{ tier: AllowanceTier; verifyResult: WorldIDVerifyResult }> {
  if (!proof) {
    return {
      tier: TIERS.none,
      verifyResult: { verified: false, verification_level: null, reason: "No World ID proof provided — Identity Check required" },
    };
  }

  // Mock mode: trust the verification_level in the proof without calling the Identity Check API.
  // Intended for dev testing and judge demos — never use in production.
  if (process.env.WORLD_MOCK === "true") {
    const level = proof.verification_level;
    const tier = resolveAllowanceTier(level);
    const isIdentityCheck = level === IDENTITY_CHECK_LEVEL;
    console.log(
      `[WorldID] MOCK — ${level} proof accepted without API call` +
      (isIdentityCheck ? " [Identity Check ✓]" : " [device-only, not Identity Check]"),
    );
    return {
      tier,
      verifyResult: { verified: true, verification_level: level },
    };
  }

  const verifyResult = await verifyWorldIDProof(proof, config);

  if (!verifyResult.verified || !verifyResult.verification_level) {
    return { tier: TIERS.none, verifyResult };
  }

  const tier = resolveAllowanceTier(verifyResult.verification_level);
  return { tier, verifyResult };
}
