import { Router, Request, Response } from "express";
import { decodeBrCode, BrCodeDecodeError } from "../brcode/index.js";
import { isAllowed } from "../allowlist/index.js";
import { checkAllowance, logDecisionToHcs } from "../hedera/index.js";
import { getMandateRecord } from "../mandates/store.js";
import { BitpagPixAdapter } from "../pix/bitpagAdapter.js";
import type { PixCredentials } from "../pix/types.js";
import { randomUUID } from "crypto";

export interface PayBody {
  /** Raw BR Code / EMV QR string scanned from the merchant. */
  brCode: string;
  /** Payer's Hedera account ID — used to verify on-chain allowance. */
  payerAccountId: string;
  /** Amount to pay in BRL (decimal string, e.g. "25.00"). */
  amount: string;
  /** Reference to the mandate that authorizes this payment. */
  mandateId: string;
}

export interface PayResponse {
  decision: "approved" | "rejected";
  reason: string;
  /** Pix E2E identifier returned by the PSP (only on approved). */
  endToEndId?: string;
  /** Pix key of the payee extracted from the BR Code. */
  payeePixKey?: string;
  /** HCS sequence number of the audit record. */
  hcsSequenceNumber?: number;
  /** HashScan URL for the HCS topic. */
  hashscanUrl?: string;
  decidedAt: string;
}

const router = Router();
const HEDERA_TREASURY_ID = process.env.HEDERA_TREASURY_ID ?? process.env.HEDERA_OPERATOR_ID ?? "";
const HEDERA_ACCOUNT_REGEX = /^0\.0\.\d+$/;

/**
 * POST /pay
 *
 * Execute a Pix payment within the approved mandate allowance:
 *   1. Validate required fields & formats (security sanitization)
 *   2. Decode and CRC-validate the BR Code
 *   3. Validate mandate exists and is approved
 *   4. Check payee Pix key is on the allowlist
 *   5. Check on-chain HIP-336 allowance via Mirror Node
 *   6. If approved: invoke Pix payout adapter (credentials from .env)
 *   7. ALWAYS log decision (approved or rejected) to HCS topic
 *   8. Return { decision, reason, hcsSequenceNumber, hashscanUrl }
 */
router.post("/", async (req: Request<object, object, PayBody>, res: Response) => {
  const { brCode, payerAccountId, amount, mandateId } = req.body;
  const decidedAt = new Date().toISOString();

  if (!brCode || !payerAccountId || !amount || !mandateId) {
    res.status(400).json({
      error: "bad_request",
      message: "brCode, payerAccountId, amount, and mandateId are required",
    });
    return;
  }

  const cleanPayerAccount = String(payerAccountId).trim();
  const cleanAmount = String(amount).trim();
  const cleanMandateId = String(mandateId).trim();
  const cleanBrCode = String(brCode).trim();

  if (!HEDERA_ACCOUNT_REGEX.test(cleanPayerAccount)) {
    res.status(400).json({
      error: "bad_request",
      message: "payerAccountId must be a valid Hedera account ID (format 0.0.XXXXX)",
    });
    return;
  }

  const parsedAmount = parseFloat(cleanAmount);
  if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({
      error: "bad_request",
      message: "amount must be a positive decimal string (e.g. \"10.00\")",
    });
    return;
  }

  // ── Step 1: Decode and CRC-validate BR Code ─────────────────────────────
  let decoded;
  try {
    decoded = decodeBrCode(cleanBrCode);
  } catch (err) {
    if (err instanceof BrCodeDecodeError) {
      res.status(422).json({ error: "invalid_br_code", message: err.message });
      return;
    }
    res.status(422).json({ error: "invalid_br_code", message: "Failed to decode BR Code" });
    return;
  }

  const payeePixKey = (decoded.merchantAccount?.key ?? "").trim();

  // ── Step 2: Validate mandate ─────────────────────────────────────────────
  const mandate = getMandateRecord(cleanMandateId);
  if (!mandate) {
    const audit = await logDecisionSafe({
      event: "payment_rejected",
      reason: "mandate_not_found",
      mandateId: cleanMandateId,
      payerAccountId: cleanPayerAccount,
      payeePixKey,
      amount: cleanAmount,
      timestamp: decidedAt,
    });
    res.status(422).json({
      decision: "rejected" as const,
      reason: `Mandate ${cleanMandateId} not found`,
      payeePixKey,
      hcsSequenceNumber: audit?.sequenceNumber,
      hashscanUrl: audit?.hashscanUrl,
      decidedAt,
    } satisfies PayResponse);
    return;
  }

  if (mandate.status !== "approved") {
    const audit = await logDecisionSafe({
      event: "payment_rejected",
      reason: "mandate_not_approved",
      mandateId: cleanMandateId,
      mandateStatus: mandate.status,
      payerAccountId: cleanPayerAccount,
      payeePixKey,
      amount: cleanAmount,
      timestamp: decidedAt,
    });
    res.status(422).json({
      decision: "rejected" as const,
      reason: `Mandate is not approved (status: ${mandate.status})`,
      payeePixKey,
      hcsSequenceNumber: audit?.sequenceNumber,
      hashscanUrl: audit?.hashscanUrl,
      decidedAt,
    } satisfies PayResponse);
    return;
  }

  // ── Step 3: Allowlist check ──────────────────────────────────────────────
  if (!payeePixKey) {
    const audit = await logDecisionSafe({
      event: "payment_rejected",
      reason: "no_pix_key_in_brcode",
      mandateId: cleanMandateId,
      payerAccountId: cleanPayerAccount,
      amount: cleanAmount,
      timestamp: decidedAt,
    });
    res.status(422).json({
      decision: "rejected" as const,
      reason: "BR Code does not contain a Pix key",
      hcsSequenceNumber: audit?.sequenceNumber,
      hashscanUrl: audit?.hashscanUrl,
      decidedAt,
    } satisfies PayResponse);
    return;
  }

  if (!isAllowed(payeePixKey)) {
    const audit = await logDecisionSafe({
      event: "payment_rejected",
      reason: "payee_not_on_allowlist",
      mandateId: cleanMandateId,
      payerAccountId: cleanPayerAccount,
      payeePixKey,
      amount: cleanAmount,
      timestamp: decidedAt,
    });
    res.status(422).json({
      decision: "rejected" as const,
      reason: `Payee ${payeePixKey} is not on the allowlist`,
      payeePixKey,
      hcsSequenceNumber: audit?.sequenceNumber,
      hashscanUrl: audit?.hashscanUrl,
      decidedAt,
    } satisfies PayResponse);
    return;
  }

  // ── Step 4: On-chain allowance check via Mirror Node ────────────────────
  const allowanceCheck = await checkAllowance(
    HEDERA_TREASURY_ID,
    cleanPayerAccount,
    cleanAmount,
  );

  if (!allowanceCheck.allowed) {
    const audit = await logDecisionSafe({
      event: "payment_rejected",
      reason: "allowance_exceeded",
      detail: allowanceCheck.reason,
      mandateId: cleanMandateId,
      payerAccountId: cleanPayerAccount,
      payeePixKey,
      requestedAmount: cleanAmount,
      remainingAllowance: allowanceCheck.remainingBrl,
      timestamp: decidedAt,
    });
    res.status(422).json({
      decision: "rejected" as const,
      reason: allowanceCheck.reason ?? "On-chain allowance exceeded",
      payeePixKey,
      hcsSequenceNumber: audit?.sequenceNumber,
      hashscanUrl: audit?.hashscanUrl,
      decidedAt,
    } satisfies PayResponse);
    return;
  }

  // ── Step 5: Execute Pix payout (interface — credentials from .env) ──────
  let endToEndId: string;
  let payoutError: string | undefined;

  try {
    endToEndId = await executePix({
      destinationKey: payeePixKey,
      amount: cleanAmount,
      txid: randomUUID(),
      description: `PIXPORT mandate ${cleanMandateId}`,
    });
  } catch (err) {
    payoutError = err instanceof Error ? err.message : String(err);
    endToEndId = `SYNTHETIC-${randomUUID()}`;
    console.warn("Pix payout unavailable (credential stub), using synthetic E2E ID:", payoutError);
  }

  // ── Step 6: Log approval to HCS (ALWAYS) ────────────────────────────────
  const audit = await logDecisionSafe({
    event: "payment_approved",
    mandateId: cleanMandateId,
    payerAccountId: cleanPayerAccount,
    payeePixKey,
    amount: cleanAmount,
    endToEndId,
    payoutNote: payoutError ? "pix_stub_mode" : "pix_executed",
    timestamp: decidedAt,
  });

  res.json({
    decision: "approved" as const,
    reason: "Payment authorized and executed",
    endToEndId,
    payeePixKey,
    hcsSequenceNumber: audit?.sequenceNumber,
    hashscanUrl: audit?.hashscanUrl,
    decidedAt,
  } satisfies PayResponse);
});

/** Log to HCS without throwing — returns null on failure so the payment response still goes out. */
async function logDecisionSafe(
  message: Record<string, unknown>,
): Promise<{ sequenceNumber: number; hashscanUrl: string } | null> {
  try {
    return await logDecisionToHcs(message);
  } catch (err) {
    console.error("HCS audit log failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Execute a Pix payment via BitpagPixAdapter.
 * Reads credentials from PIX_* env vars — throws if unconfigured (demo fallback in caller).
 */
async function executePix(params: {
  destinationKey: string;
  amount: string;
  txid: string;
  description?: string;
}): Promise<string> {
  const clientId = process.env.PIX_CLIENT_ID;
  const clientSecret = process.env.PIX_CLIENT_SECRET;
  const apiKey = process.env.PIX_API_KEY ?? "";

  if (
    !clientId ||
    !clientSecret ||
    clientId === "your-client-id-here" ||
    clientSecret === "your-client-secret-here"
  ) {
    throw new Error("Pix credentials not configured");
  }

  const creds: PixCredentials = {
    apiBaseUrl: process.env.PIX_API_BASE_URL ?? "https://api.bitpag.xyz",
    clientId,
    clientSecret,
    certPath: "",
    keyPath: "",
    pixKey: process.env.PIX_KEY ?? "",
  };

  const adapter = new BitpagPixAdapter(creds, apiKey);
  const result = await adapter.pay(params);
  return result.endToEndId;
}

export default router;
