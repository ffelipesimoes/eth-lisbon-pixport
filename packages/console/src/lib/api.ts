// Gateway is proxied through Next.js rewrites at /api/gateway — no CORS issues.
const GATEWAY_URL = "/api/gateway";

export interface MandateStatus {
  mandateId: string;
  status: "pending" | "approved" | "rejected";
  payeePixKey: string;
  payerAccountId: string;
  maxAmount: string;
  hcsTopicId?: string;
  hcsSequenceNumber?: number;
  createdAt: string;
}

export interface HcsEntry {
  sequenceNumber: number;
  topicId: string;
  consensusTimestamp: string;
  message: string;
  hashScanUrl: string;
}

export interface PayResult {
  decision: "approved" | "rejected";
  reason: string;
  endToEndId?: string;
  payeePixKey?: string;
  hcsSequenceNumber?: number;
  hashscanUrl?: string;
  decidedAt: string;
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && /fetch|network|ECONNREFUSED/i.test(String(err.message));
}

function gatewayOfflineError(): Error {
  return new Error("Gateway offline — run `npm run demo` to start the gateway on port 3001");
}

export async function fetchMandateStatus(mandateId: string): Promise<MandateStatus> {
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}/mandates/${mandateId}`);
  } catch (err) {
    throw isNetworkError(err) ? gatewayOfflineError() : err;
  }
  if (!res.ok) throw new Error(`Gateway error: ${res.status}`);
  return res.json() as Promise<MandateStatus>;
}

export async function createMandate(body: {
  payeePixKey: string;
  payerAccountId: string;
  maxAmount: string;
  memo?: string;
}): Promise<MandateStatus> {
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}/mandates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw isNetworkError(err) ? gatewayOfflineError() : err;
  }
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(errBody.message ?? `Gateway error: ${res.status}`);
  }
  return res.json() as Promise<MandateStatus>;
}

export async function executePay(body: {
  brCode: string;
  payerAccountId: string;
  amount: string;
  mandateId: string;
}): Promise<PayResult> {
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw isNetworkError(err) ? gatewayOfflineError() : err;
  }
  return res.json() as Promise<PayResult>;
}

export async function fetchHcsAudit(limit = 10): Promise<HcsEntry[]> {
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}/audit?limit=${limit}`);
  } catch (err) {
    throw isNetworkError(err) ? gatewayOfflineError() : err;
  }
  if (!res.ok) throw new Error(`Gateway error: ${res.status}`);
  return res.json() as Promise<HcsEntry[]>;
}

// ─── World Identity Check (Beta) ────────────────────────────────────────────

/** Proof fields as returned by IDKit's onSuccess (ISuccessResult). */
export interface WorldIdProofPayload {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: "orb" | "device";
}

export interface WorldIdConfig {
  appId: string;
  action: string;
  environment: "staging" | "production";
  /** True when the gateway trusts proof level without Cloud API (stage fallback). */
  mock: boolean;
  /** True when a real app_id is registered on the gateway — live verify possible. */
  configured: boolean;
}

export interface WorldIdTierInfo {
  name: "orb" | "device" | "none";
  label: string;
  /** Max per-payment spend in BRL minor units (centavos). */
  maxSpendUnits: string;
  /** Display string, e.g. "10000.00". */
  maxSpendBrl: string;
}

export interface WorldIdVerifyResult {
  verified: boolean;
  verificationLevel: "orb" | "device" | null;
  tier: WorldIdTierInfo;
  mock: boolean;
  reason?: string;
  hcsSequenceNumber?: number;
  hashscanUrl?: string;
  verifiedAt: string;
}

/** Widget configuration from the gateway — single source of truth for app_id/action. */
export async function fetchWorldIdConfig(): Promise<WorldIdConfig> {
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}/worldid/config`);
  } catch (err) {
    throw isNetworkError(err) ? gatewayOfflineError() : err;
  }
  if (!res.ok) throw new Error(`Gateway error: ${res.status}`);
  return res.json() as Promise<WorldIdConfig>;
}

/**
 * Send an IDKit proof to the BACKEND for verification (verifyCloudProof).
 * The console never trusts the widget's client-side claims — the allowance
 * tier displayed comes only from this backend response.
 */
export async function verifyWorldId(body: {
  proof: WorldIdProofPayload;
  signal: string;
}): Promise<WorldIdVerifyResult> {
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}/worldid/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw isNetworkError(err) ? gatewayOfflineError() : err;
  }
  const data = (await res.json().catch(() => ({}))) as WorldIdVerifyResult & { message?: string };
  if (!res.ok) throw new Error(data.message ?? `Gateway error: ${res.status}`);
  return data;
}
