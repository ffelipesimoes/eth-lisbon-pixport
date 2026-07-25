import { Router, Request, Response } from "express";
import {
  loadWorldIDConfig,
  verifyAndResolveTier,
  type WorldIDProofBody,
  type AllowanceTierInfo,
} from "../worldid/index.js";
import { logDecisionToHcs } from "../hedera/index.js";

export interface WorldIdConfigResponse {
  appId: string;
  action: string;
  environment: "staging" | "production";
  /** True when the backend accepts proofs without calling the Cloud API (stage fallback). */
  mock: boolean;
  /** True when a real app_id is set — live verify possible. */
  configured: boolean;
}

export interface WorldIdVerifyRequest {
  /** ISuccessResult fields from IDKit onSuccess. */
  proof: WorldIDProofBody;
  /** Signal the proof was generated with — the payer's Hedera account ID. */
  signal: string;
}

export interface WorldIdVerifyResponse {
  verified: boolean;
  verificationLevel: "orb" | "device" | null;
  tier: AllowanceTierInfo;
  mock: boolean;
  reason?: string;
  /** HCS sequence number of the IDENTITY_CHECK audit record (when logging succeeds). */
  hcsSequenceNumber?: number;
  hashscanUrl?: string;
  verifiedAt: string;
}

const router = Router();

/**
 * GET /worldid/config
 *
 * Public widget configuration for the console: app_id + action the IDKitWidget
 * must use, plus whether the backend is in mock (stage fallback) mode.
 * Keeps World config in one place (gateway .env) — the console never hardcodes it.
 */
router.get("/config", (_req: Request, res: Response) => {
  const config = loadWorldIDConfig();
  res.json({
    appId: config.configured ? config.appId : "",
    action: config.action,
    environment: config.environment,
    mock: config.mock,
    configured: config.configured,
  } satisfies WorldIdConfigResponse);
});

/**
 * POST /worldid/verify
 *
 * Server-side World Identity Check: verify the IDKit proof via verifyCloudProof()
 * (Cloud API v2) and resolve the payer's HIP-336 allowance tier. The browser's
 * claims are never trusted — the tier comes from the proof only after the
 * Cloud API confirms it. The outcome (including rejections) is logged to the
 * HCS audit topic as an IDENTITY_CHECK event, best-effort.
 *
 * Stage fallback: with WORLD_MOCK=true the proof's verification_level is
 * trusted without an API call (documented in docs/world-identity-check-test-report.md).
 */
router.post("/verify", async (req: Request<object, object, WorldIdVerifyRequest>, res: Response) => {
  const { proof, signal } = req.body ?? {};
  const verifiedAt = new Date().toISOString();

  if (
    !proof ||
    typeof proof.proof !== "string" ||
    typeof proof.merkle_root !== "string" ||
    typeof proof.nullifier_hash !== "string" ||
    (proof.verification_level !== "orb" && proof.verification_level !== "device") ||
    typeof signal !== "string" ||
    signal.length === 0
  ) {
    res.status(400).json({
      error: "bad_request",
      message:
        "proof { proof, merkle_root, nullifier_hash, verification_level: 'orb'|'device' } and signal (payer account ID) are required",
    });
    return;
  }

  const config = loadWorldIDConfig();

  if (!config.mock && !config.configured) {
    res.status(503).json({
      error: "worldid_not_configured",
      message:
        "WORLD_APP_ID is not configured on the gateway. Register the app in the World Developer Portal, or set WORLD_MOCK=true for the stage fallback.",
    });
    return;
  }

  const outcome = await verifyAndResolveTier(proof, signal, config);

  // Audit the identity decision to HCS (best-effort — never blocks the response).
  const audit = await logIdentityCheckSafe({
    event: "identity_check",
    verified: outcome.verified,
    verificationLevel: outcome.verificationLevel ?? "none",
    tier: outcome.tier.name,
    maxSpendBrl: outcome.tier.maxSpendBrl,
    payerAccountId: signal,
    action: config.action,
    mock: outcome.mock,
    reason: outcome.reason,
    timestamp: verifiedAt,
  });

  res.status(200).json({
    verified: outcome.verified,
    verificationLevel: outcome.verificationLevel,
    tier: outcome.tier,
    mock: outcome.mock,
    reason: outcome.reason,
    hcsSequenceNumber: audit?.sequenceNumber,
    hashscanUrl: audit?.hashscanUrl,
    verifiedAt,
  } satisfies WorldIdVerifyResponse);
});

/** Log to HCS without throwing — returns null on failure so the verify response still goes out. */
async function logIdentityCheckSafe(
  message: Record<string, unknown>,
): Promise<{ sequenceNumber: number; hashscanUrl: string } | null> {
  try {
    return await logDecisionToHcs(message);
  } catch (err) {
    console.error("HCS identity_check log failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export default router;
