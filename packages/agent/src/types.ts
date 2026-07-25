import { z } from "zod";

// ─── BR Code ─────────────────────────────────────────────────────────────────

export const BrCodeSchema = z.object({
  raw: z.string().min(1),
  payeePixKey: z.string().optional(),
  merchantName: z.string().optional(),
  merchantCity: z.string().optional(),
  txid: z.string().optional(),
  /** Amount in BRL as a decimal string, e.g. "25.00". May be undefined for open-value codes. */
  amount: z.string().optional(),
});
export type BrCode = z.infer<typeof BrCodeSchema>;

// ─── World ID ─────────────────────────────────────────────────────────────────

/** Verification level from World ID — directly maps to allowance tier. */
export type VerificationLevel = "orb" | "device" | "none";

export const WorldIDProofSchema = z.object({
  /** ZK proof hex string from IDKit. */
  proof: z.string(),
  /** Merkle root of the World ID state at proof generation time. */
  merkle_root: z.string(),
  /** Unique nullifier hash — prevents double-spending the same proof. */
  nullifier_hash: z.string(),
  /** Verification level claimed by the prover. */
  verification_level: z.enum(["orb", "device"]),
  /** Signal string used when generating the proof (e.g. payer's Hedera account ID). */
  signal: z.string(),
});
export type WorldIDProof = z.infer<typeof WorldIDProofSchema>;

export const WorldIDVerifyResultSchema = z.object({
  verified: z.boolean(),
  /** Nullable — only set when verified is true. */
  verification_level: z.enum(["orb", "device"]).nullable(),
  /** Reason why verification failed, if any. */
  reason: z.string().optional(),
});
export type WorldIDVerifyResult = z.infer<typeof WorldIDVerifyResultSchema>;

// ─── Allowance Tier ───────────────────────────────────────────────────────────

/**
 * Maps World ID verification level to a maximum allowed spend.
 * All amounts are in HTS token minor units (same denomination as HIP-336 allowance).
 */
export interface AllowanceTier {
  name: "orb" | "device" | "none";
  /** Human-readable label. */
  label: string;
  /** Maximum total spend this tier allows (in token minor units). */
  maxSpend: bigint;
}

export const TIERS: Record<VerificationLevel, AllowanceTier> = {
  orb: {
    name: "orb",
    label: "Orb-verified human",
    maxSpend: BigInt(process.env.TIER_ORB_MAX ?? "1000000"),
  },
  device: {
    name: "device",
    label: "Device-verified",
    maxSpend: BigInt(process.env.TIER_DEVICE_MAX ?? "100000"),
  },
  none: {
    name: "none",
    label: "Unverified",
    maxSpend: BigInt(process.env.TIER_UNVERIFIED_MAX ?? "0"),
  },
};

// ─── Allowance State (from Mirror Node) ───────────────────────────────────────

export interface AllowanceState {
  ownerAccountId: string;
  spenderAccountId: string;
  tokenId: string;
  /** Current approved allowance (in token minor units). */
  approvedAmount: bigint;
  /** Amount already spent via this allowance. */
  spentAmount: bigint;
  /** Remaining unspent allowance. */
  remainingAmount: bigint;
}

// ─── Payment Request (agent input) ───────────────────────────────────────────

export const PaymentRequestSchema = z.object({
  /** Raw BR Code / EMV QR string. */
  brCode: z.string().min(1),
  /** Payer's Hedera account ID, e.g. "0.0.12345". */
  payerAccountId: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Mandate ID referencing the on-chain allowance approval. */
  mandateId: z.string().min(1),
  /** Optional World ID proof — if omitted, verification_level is "none". */
  worldIdProof: WorldIDProofSchema.optional(),
});
export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;

// ─── Agent Decision ───────────────────────────────────────────────────────────

export type AgentDecision =
  | { decision: "approve"; reason: string; tier: AllowanceTier; hcsMessageId?: string }
  | { decision: "reject"; reason: string; code: RejectionCode; hcsMessageId?: string };

export type RejectionCode =
  | "IDENTITY_VERIFICATION_FAILED"
  | "TIER_INSUFFICIENT"
  | "ALLOWANCE_EXCEEDED"
  | "ALLOWANCE_UNSET"
  | "INVALID_BR_CODE"
  | "GATEWAY_ERROR"
  | "INTERNAL_ERROR";

// ─── Gateway ──────────────────────────────────────────────────────────────────

export interface GatewayPayRequest {
  brCode: string;
  payerAccountId: string;
  amount: string;
  mandateId: string;
}

export interface GatewayPayResponse {
  endToEndId: string;
  status: "completed" | "pending" | "failed";
  payeePixKey?: string;
  hcsAuditUrl?: string;
  completedAt: string;
}

// ─── HCS audit event ─────────────────────────────────────────────────────────

export interface HcsAuditEvent {
  type: "PAYMENT_APPROVED" | "PAYMENT_REJECTED" | "IDENTITY_CHECK";
  mandateId: string;
  payerAccountId: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  tier: string;
  decision: "approve" | "reject";
  rejectionCode?: RejectionCode;
  /** Gateway end-to-end ID when approved. */
  endToEndId?: string;
  /** Human-readable reason for the decision. */
  reason: string;
  brCodeAmount?: string;
  payeePixKey?: string;
}
