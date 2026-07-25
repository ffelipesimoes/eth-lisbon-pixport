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
