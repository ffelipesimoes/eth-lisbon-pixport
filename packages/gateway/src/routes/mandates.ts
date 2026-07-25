import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { addToAllowlist } from "../allowlist/index.js";
import { logDecisionToHcs, approveAllowanceOnChain } from "../hedera/index.js";
import { saveMandateRecord, getMandateRecord } from "../mandates/store.js";

export interface CreateMandateBody {
  /** Pix key of the approved payee. */
  payeePixKey: string;
  /** Payer Hedera account ID (0.0.XXXXX format). */
  payerAccountId: string;
  /** Maximum BRL amount to authorize (decimal string, e.g. "100.00"). */
  maxAmount: string;
  /** Optional memo attached to the on-chain HCS record. */
  memo?: string;
}

export interface CreateMandateResponse {
  mandateId: string;
  status: "pending" | "approved" | "rejected";
  payeePixKey: string;
  payerAccountId: string;
  maxAmount: string;
  hcsTopicId?: string;
  hcsSequenceNumber?: number;
  hederaApprovalTxId?: string;
  createdAt: string;
}

const router = Router();
const HCS_TOPIC_ID = process.env.HCS_TOPIC_ID ?? "";
const HEDERA_ACCOUNT_REGEX = /^0\.0\.\d+$/;

/**
 * POST /mandates
 *
 * Create a payment mandate:
 *   1. Validate required fields & formats (security sanitization)
 *   2. Add payeePixKey to in-memory allowlist
 *   3. Submit on-chain HIP-336 AccountAllowanceApproveTransaction to Hedera
 *   4. Log mandate creation to HCS audit trail
 *   5. Return mandateId and status
 */
router.post("/", async (req: Request<object, object, CreateMandateBody>, res: Response) => {
  const { payeePixKey, payerAccountId, maxAmount, memo } = req.body;

  if (!payeePixKey || !payerAccountId || !maxAmount) {
    res.status(400).json({
      error: "bad_request",
      message: "payeePixKey, payerAccountId, and maxAmount are required",
    });
    return;
  }

  const cleanPayeeKey = String(payeePixKey).trim();
  const cleanPayerAccount = String(payerAccountId).trim();
  const cleanMaxAmount = String(maxAmount).trim();

  if (!HEDERA_ACCOUNT_REGEX.test(cleanPayerAccount)) {
    res.status(400).json({
      error: "bad_request",
      message: "payerAccountId must be a valid Hedera account ID (format 0.0.XXXXX)",
    });
    return;
  }

  const parsedAmount = parseFloat(cleanMaxAmount);
  if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({
      error: "bad_request",
      message: "maxAmount must be a positive decimal string (e.g. \"100.00\")",
    });
    return;
  }

  const mandateId = randomUUID();
  const createdAt = new Date().toISOString();

  // Register payee on allowlist
  addToAllowlist(cleanPayeeKey);

  // Submit on-chain HIP-336 Allowance Approve to Hedera Testnet
  let hederaApprovalTxId: string | undefined;
  try {
    const onChainResult = await approveAllowanceOnChain(cleanPayerAccount, cleanMaxAmount);
    if (onChainResult) {
      hederaApprovalTxId = onChainResult.transactionId;
    }
  } catch (err) {
    console.warn("On-chain approveAllowance submission note:", err instanceof Error ? err.message : err);
  }

  // Log to HCS
  let hcsSequenceNumber: number | undefined;
  let hcsTopicId: string | undefined;

  try {
    const hcsResult = await logDecisionToHcs({
      event: "mandate_created",
      mandateId,
      payeePixKey: cleanPayeeKey,
      payerAccountId: cleanPayerAccount,
      maxAmount: cleanMaxAmount,
      hederaApprovalTxId,
      memo: memo ? String(memo).trim() : null,
      timestamp: createdAt,
    });
    hcsSequenceNumber = hcsResult.sequenceNumber;
    hcsTopicId = HCS_TOPIC_ID || undefined;
  } catch (err) {
    console.error("HCS log failed for mandate creation:", err instanceof Error ? err.message : err);
  }

  const mandate = {
    mandateId,
    status: "approved" as const,
    payeePixKey: cleanPayeeKey,
    payerAccountId: cleanPayerAccount,
    maxAmount: cleanMaxAmount,
    memo: memo ? String(memo).trim() : undefined,
    hcsTopicId,
    hcsSequenceNumber,
    hederaApprovalTxId,
    createdAt,
  };

  saveMandateRecord(mandate);

  res.status(201).json(mandate satisfies CreateMandateResponse);
});

/**
 * GET /mandates/:id
 *
 * Return mandate status for the console and for POST /pay validation.
 */
router.get("/:id", (req: Request<{ id: string }>, res: Response) => {
  const cleanId = String(req.params.id).trim();
  const mandate = getMandateRecord(cleanId);
  if (!mandate) {
    res.status(404).json({ error: "not_found", message: `Mandate ${cleanId} not found` });
    return;
  }
  res.json(mandate);
});

export default router;
