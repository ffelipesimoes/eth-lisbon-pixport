/**
 * World Identity Check (Beta) — console-facing backend verification.
 *
 * This is the gateway twin of packages/agent/src/worldid.ts: same semantics
 * (verifyCloudProof + tier map), exposed over HTTP so the Next.js console can
 * resolve a payer's allowance tier without ever trusting the browser.
 *
 * Why a twin instead of importing @pixport/agent: the agent package pulls in
 * langchain/hedera-agent-kit (heavy autonomous-agent stack); the gateway stays
 * lean. Keep the tier semantics in sync with packages/agent/src/types.ts.
 *
 * Tier mapping (World Identity Check Beta → HIP-336 allowance tier):
 *   "orb"    → Identity Check ✓ (Orb-verified unique human)  → HIGH tier (default R$10.000/payment)
 *   "device" → World App device-verified (not full Identity Check) → MEDIUM tier (default R$1.000)
 *   absent   → No proof / failed verification                → ZERO tier (rejected)
 *
 * Stage fallback: WORLD_MOCK=true trusts the proof's verification_level without
 * calling the Cloud API (alias of the spec's SKIP_WORLDID; the console mirrors
 * it with NEXT_PUBLIC_SKIP_WORLDID=true). Dev/judge use only.
 */

import { verifyCloudProof } from "@worldcoin/idkit-core/backend";
import { VerificationLevel as IDKitVerificationLevel } from "@worldcoin/idkit-core";

export type WorldVerificationLevel = "orb" | "device";

/** Proof shape as returned by IDKit's onSuccess (ISuccessResult) — signal travels alongside. */
export interface WorldIDProofBody {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: WorldVerificationLevel;
}

export interface AllowanceTierInfo {
  name: "orb" | "device" | "none";
  label: string;
  /** Max per-payment spend in BRL minor units (centavos) — same denomination as the agent's TIERS. */
  maxSpendUnits: string;
  /** Human-readable BRL amount for the console badge, e.g. "10000.00". */
  maxSpendBrl: string;
}

export interface WorldIDConfig {
  appId: string;
  action: string;
  environment: "staging" | "production";
  /** True when WORLD_MOCK=true — proof level trusted without Cloud API call. */
  mock: boolean;
  /** True when a real (non-placeholder) app_id is configured. */
  configured: boolean;
}

const WORLD_API_V2_BASE: Record<string, string> = {
  staging: "https://staging-developer.worldcoin.org/api/v2/verify",
  production: "https://developer.worldcoin.org/api/v2/verify",
};

export function loadWorldIDConfig(): WorldIDConfig {
  const appId = process.env.WORLD_APP_ID ?? "";
  const action = process.env.WORLD_ACTION ?? "pixport-payment";
  const environment = (process.env.WORLD_ENV ?? "staging") as "staging" | "production";
  const mock = process.env.WORLD_MOCK === "true";
  const configured = Boolean(appId) && !appId.startsWith("app_X");
  return { appId, action, environment, mock, configured };
}

function unitsToBrl(units: bigint): string {
  return `${units / 100n}.${String(units % 100n).padStart(2, "0")}`;
}

/**
 * Tier table — mirrors TIERS in packages/agent/src/types.ts (same env overrides).
 * Defined per-call so TIER_*_MAX env changes apply without restart.
 */
export function resolveTier(level: WorldVerificationLevel | "none"): AllowanceTierInfo {
  if (level === "orb") {
    const max = BigInt(process.env.TIER_ORB_MAX ?? "1000000");
    return {
      name: "orb",
      label: "Orb-verified human — Identity Check ✓",
      maxSpendUnits: max.toString(),
      maxSpendBrl: unitsToBrl(max),
    };
  }
  if (level === "device") {
    const max = BigInt(process.env.TIER_DEVICE_MAX ?? "100000");
    return {
      name: "device",
      label: "Device-verified (not Identity Check)",
      maxSpendUnits: max.toString(),
      maxSpendBrl: unitsToBrl(max),
    };
  }
  const max = BigInt(process.env.TIER_UNVERIFIED_MAX ?? "0");
  return {
    name: "none",
    label: "Unverified — Identity Check required",
    maxSpendUnits: max.toString(),
    maxSpendBrl: unitsToBrl(max),
  };
}

export interface WorldIDVerifyOutcome {
  verified: boolean;
  verificationLevel: WorldVerificationLevel | null;
  tier: AllowanceTierInfo;
  /** True when the result came from WORLD_MOCK short-circuit (stage fallback). */
  mock: boolean;
  reason?: string;
}

/**
 * Verify a World Identity Check proof server-side via verifyCloudProof()
 * (Cloud API v2) and resolve the allowance tier. Never trusts the client:
 * the tier is derived from the cryptographically-bound verification_level
 * only AFTER the Cloud API confirms the proof.
 */
export async function verifyAndResolveTier(
  proof: WorldIDProofBody,
  signal: string,
  config: WorldIDConfig,
): Promise<WorldIDVerifyOutcome> {
  // Stage fallback — trust the claimed level, no API call. Never for production.
  if (config.mock) {
    console.log(`[WorldID] MOCK — ${proof.verification_level} proof accepted without API call (signal: ${signal})`);
    return {
      verified: true,
      verificationLevel: proof.verification_level,
      tier: resolveTier(proof.verification_level),
      mock: true,
    };
  }

  const base = WORLD_API_V2_BASE[config.environment] ?? WORLD_API_V2_BASE.staging;
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
      signal,
      endpoint,
    );
  } catch (err) {
    return {
      verified: false,
      verificationLevel: null,
      tier: resolveTier("none"),
      mock: false,
      reason: `Network error calling World Identity Check API: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (result.success) {
    console.log(`[WorldID] Identity Check verified: ${proof.verification_level} (signal: ${signal})`);
    return {
      verified: true,
      verificationLevel: proof.verification_level,
      tier: resolveTier(proof.verification_level),
      mock: false,
    };
  }

  return {
    verified: false,
    verificationLevel: null,
    tier: resolveTier("none"),
    mock: false,
    reason: result.detail ?? result.code ?? "World Identity Check verification failed",
  };
}
