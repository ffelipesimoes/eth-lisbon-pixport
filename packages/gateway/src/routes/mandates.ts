import { Router, Request, Response } from "express";

export interface CreateMandateBody {
  /** Pix key of the approved payee (must be on allowlist). */
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

/**
 * POST /mandates
 *
 * Create a new payment mandate:
 *   1. Validate payeePixKey is on the allowlist
 *   2. Check HIP-336 on-chain allowance via HTS (Block 2 — HederaEngineer)
 *   3. Write mandate to HCS audit trail
 *   4. Return mandate ID and status
 *
 * Block 1: returns 501 (Not Implemented) — skeleton only.
 */
router.post("/", (_req: Request<object, object, CreateMandateBody>, res: Response) => {
  res.status(501).json({
    error: "not_implemented",
    message: "POST /mandates will be implemented in Block 2 after HederaEngineer provides HTS token ID and HCS topic ID.",
  });
});

export default router;
