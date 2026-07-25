import { Router, Request, Response } from "express";
import { decodeBrCode, BrCodeDecodeError } from "../brcode/index.js";

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
  /** Pix E2E identifier returned by the PSP. */
  endToEndId: string;
  status: "completed" | "pending" | "failed";
  /** Pix key of the payee extracted from the BR Code. */
  payeePixKey?: string;
  /** HashScan URL to the HCS audit record for this payment. */
  hcsAuditUrl?: string;
  completedAt: string;
}

const router = Router();

/**
 * POST /pay
 *
 * Execute a Pix payment within the approved mandate allowance:
 *   1. Decode and CRC-validate the BR Code
 *   2. Verify the mandate exists and is active
 *   3. Confirm payee Pix key matches the allowlist + on-chain allowance
 *   4. Call Pix payout adapter (credentials from .env)
 *   5. Write HCS audit record
 *   6. Return E2E ID and HCS audit URL
 *
 * Block 1: returns 501 after BR Code validation (CRC gate is live).
 */
router.post("/", (req: Request<object, object, PayBody>, res: Response) => {
  const { brCode } = req.body;

  if (!brCode) {
    res.status(400).json({ error: "bad_request", message: "brCode is required" });
    return;
  }

  // BR Code decoding and CRC16 validation gate — live even in Block 1
  let decoded;
  try {
    decoded = decodeBrCode(brCode);
  } catch (err) {
    if (err instanceof BrCodeDecodeError) {
      res.status(422).json({
        error: "invalid_br_code",
        message: err.message,
      });
      return;
    }
    throw err;
  }

  // Block 2 continues here: mandate check, allowance check, Pix payout, HCS audit
  res.status(501).json({
    error: "not_implemented",
    message: "Payment execution will be implemented in Block 2.",
    debug: {
      payeePixKey: decoded.merchantAccount?.key,
      merchantName: decoded.merchantName,
      currency: decoded.transactionCurrency,
    },
  });
});

export default router;
