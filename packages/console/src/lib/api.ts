const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:3001";

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

/** Fetch latest mandate status from the gateway. */
export async function fetchMandateStatus(mandateId: string): Promise<MandateStatus> {
  const res = await fetch(`${GATEWAY_URL}/mandates/${mandateId}`);
  if (!res.ok) throw new Error(`Gateway error: ${res.status}`);
  return res.json() as Promise<MandateStatus>;
}

/** Create a new mandate. */
export async function createMandate(body: {
  payeePixKey: string;
  payerAccountId: string;
  maxAmount: string;
  memo?: string;
}): Promise<MandateStatus> {
  const res = await fetch(`${GATEWAY_URL}/mandates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `Gateway error: ${res.status}`);
  }
  return res.json() as Promise<MandateStatus>;
}

/** Execute a Pix payment via POST /pay. */
export async function executePay(body: {
  brCode: string;
  payerAccountId: string;
  amount: string;
  mandateId: string;
}): Promise<PayResult> {
  const res = await fetch(`${GATEWAY_URL}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as PayResult;
  return data;
}

/** Fetch the last N entries from the HCS audit trail. */
export async function fetchHcsAudit(limit = 10): Promise<HcsEntry[]> {
  const res = await fetch(`${GATEWAY_URL}/audit?limit=${limit}`);
  if (!res.ok) throw new Error(`Gateway error: ${res.status}`);
  return res.json() as Promise<HcsEntry[]>;
}
