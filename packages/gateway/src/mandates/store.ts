/** In-memory mandate store. */

export interface Mandate {
  mandateId: string;
  status: "pending" | "approved" | "rejected";
  payeePixKey: string;
  payerAccountId: string;
  maxAmount: string;
  memo?: string;
  hcsTopicId?: string;
  hcsSequenceNumber?: number;
  createdAt: string;
}

const store = new Map<string, Mandate>();

export function saveMandateRecord(mandate: Mandate): void {
  store.set(mandate.mandateId, mandate);
}

export function getMandateRecord(mandateId: string): Mandate | undefined {
  return store.get(mandateId);
}

export function listMandates(): Mandate[] {
  return Array.from(store.values());
}
