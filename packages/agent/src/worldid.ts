/**
 * World ID verification + allowance tier mapping.
 *
 * Flow:
 *  1. Receive a WorldIDProof from the caller.
 *  2. POST to the World ID Cloud API to verify the ZK proof.
 *  3. Map the returned verification_level to an AllowanceTier.
 *
 * Dev-test path (no phone required):
 *  Set WORLD_ENV=staging and use https://simulator.worldcoin.org to generate
 *  a valid test proof against the staging Cloud API endpoint. See DEV_TEST.md.
 */

import type { WorldIDProof, WorldIDVerifyResult, VerificationLevel, AllowanceTier } from "./types.js";
import { TIERS } from "./types.js";

/** World ID Cloud API base URL per environment. */
const WORLD_API_BASE: Record<string, string> = {
  staging: "https://staging-developer.worldcoin.org",
  production: "https://developer.worldcoin.org",
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
 * Verify a World ID proof via the Cloud API.
 *
 * Returns { verified: true, verification_level } on success,
 * or { verified: false, reason } on failure.
 */
export async function verifyWorldIDProof(
  proof: WorldIDProof,
  config: WorldIDConfig,
): Promise<WorldIDVerifyResult> {
  const base = WORLD_API_BASE[config.environment] ?? WORLD_API_BASE.staging;
  const url = `${base}/api/v1/verify/${config.appId}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: config.action,
        signal: proof.signal,
        proof: proof.proof,
        merkle_root: proof.merkle_root,
        nullifier_hash: proof.nullifier_hash,
        verification_level: proof.verification_level,
      }),
    });
  } catch (err) {
    return {
      verified: false,
      verification_level: null,
      reason: `Network error calling World ID API: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (response.ok) {
    // 200 → proof is valid
    const body = (await response.json()) as { nullifier_hash?: string; verification_level?: string };
    const level = body.verification_level as "orb" | "device" | undefined;
    return {
      verified: true,
      verification_level: level ?? proof.verification_level,
    };
  }

  // 400 / 4xx → verification failed (invalid proof, already used nullifier, etc.)
  let reason = `HTTP ${response.status}`;
  try {
    const errBody = (await response.json()) as { code?: string; detail?: string; attribute?: string };
    reason = errBody.detail ?? errBody.code ?? reason;
  } catch {
    // ignore parse error
  }
  return { verified: false, verification_level: null, reason };
}

/**
 * Map a World ID verification level to an AllowanceTier.
 *
 * This is the core identity → tier business logic:
 *   orb-verified human  → high tier (TIER_ORB_MAX)
 *   device-verified     → medium tier (TIER_DEVICE_MAX)
 *   unverified / failed → reject tier (0 spend)
 */
export function resolveAllowanceTier(verificationLevel: VerificationLevel): AllowanceTier {
  return TIERS[verificationLevel];
}

/**
 * Full identity check: verify proof → resolve tier.
 *
 * If proof is undefined (no World ID provided), returns the "none" tier.
 * If WORLD_MOCK=true, the proof is accepted as-is without calling the API.
 */
export async function identityCheckAndResolveTier(
  proof: WorldIDProof | undefined,
  config: WorldIDConfig,
): Promise<{ tier: AllowanceTier; verifyResult: WorldIDVerifyResult }> {
  if (!proof) {
    return {
      tier: TIERS.none,
      verifyResult: { verified: false, verification_level: null, reason: "No proof provided" },
    };
  }

  // Mock mode: trust the verification_level in the proof without calling the API.
  // Intended for dev testing and judge demos — never use in production.
  if (process.env.WORLD_MOCK === "true") {
    // proof.verification_level is "orb" | "device" (enforced by Zod schema)
    const level = proof.verification_level;
    const tier = resolveAllowanceTier(level);
    console.log(`[WorldID] MOCK mode — accepting ${level} proof without API call`);
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
