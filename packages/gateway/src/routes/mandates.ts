import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { addToAllowlist, isAllowed } from "../allowlist/index.js";
import { logDecisionToHcs } from "../hedera/index.js";
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
  createdAt: string;
}

const router = Router();
const HCS_TOPIC_ID = process.env.HCS_TOPIC_ID ?? "";

/**
 * POST /mandates
 *
 * Create a payment mandate:
 *   1. Validate required fields
 *   2. Add payeePixKey to in-memory allowlist
 *   3. Log mandate creation to HCS audit trail
 *   4. Return mandateId and status
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

  const parsedAmount = parseFloat(maxAmount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({
      error: "bad_request",
      message: "maxAmount must be a positive decimal string (e.g. \"100.00\")",
    });
    return;
  }

  const mandateId = randomUUID();
  const createdAt = new Date().toISOString();

  // Register payee on allowlist
  addToAllowlist(payeePixKey);

  // Log to HCS
  let hcsSequenceNumber: number | undefined;
  let hcsTopicId: string | undefined;

  try {
    const hcsResult = await logDecisionToHcs({
      event: "mandate_created",
      mandateId,
      payeePixKey,
      payerAccountId,
      maxAmount,
      memo: memo ?? null,
      timestamp: createdAt,
    });
    hcsSequenceNumber = hcsResult.sequenceNumber;
    hcsTopicId = HCS_TOPIC_ID || undefined;
  } catch (err) {
    // HCS logging failure is non-fatal for mandate creation; mandate still saved
    console.error("HCS log failed for mandate creation:", err instanceof Error ? err.message : err);
  }

  const mandate = {
    mandateId,
    status: "approved" as const,
    payeePixKey,
    payerAccountId,
    maxAmount,
    memo,
    hcsTopicId,
    hcsSequenceNumber,
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
  const mandate = getMandateRecord(req.params.id);
  if (!mandate) {
    res.status(404).json({ error: "not_found", message: `Mandate ${req.params.id} not found` });
    return;
  }
  res.json(mandate);
});

export default router;
