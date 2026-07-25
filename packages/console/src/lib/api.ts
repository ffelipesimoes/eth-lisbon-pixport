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

/** Fetch latest mandate status from the gateway. */
export async function fetchMandateStatus(
  mandateId: string
): Promise<MandateStatus> {
  const res = await fetch(`${GATEWAY_URL}/mandates/${mandateId}`);
  if (!res.ok) throw new Error(`Gateway error: ${res.status}`);
  return res.json() as Promise<MandateStatus>;
}

/** Fetch the last N entries from the HCS audit trail. */
export async function fetchHcsAudit(limit = 10): Promise<HcsEntry[]> {
  const res = await fetch(`${GATEWAY_URL}/audit?limit=${limit}`);
  if (!res.ok) throw new Error(`Gateway error: ${res.status}`);
  return res.json() as Promise<HcsEntry[]>;
}
