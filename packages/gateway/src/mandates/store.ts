/** In-memory mandate store with cumulative spending tracking. */

export interface Mandate {
  mandateId: string;
  status: "pending" | "approved" | "rejected";
  payeePixKey: string;
  payerAccountId: string;
  maxAmount: string;
  spentAmount: string;
  memo?: string;
  hcsTopicId?: string;
  hcsSequenceNumber?: number;
  createdAt: string;
}

const store = new Map<string, Mandate>();

export function saveMandateRecord(mandate: Omit<Mandate, "spentAmount"> & { spentAmount?: string }): Mandate {
  const record: Mandate = {
    ...mandate,
    spentAmount: mandate.spentAmount ?? "0.00",
  };
  store.set(record.mandateId, record);
  return record;
}

export function getMandateRecord(mandateId: string): Mandate | undefined {
  return store.get(mandateId);
}

export function updateMandateSpent(mandateId: string, additionalAmountBrl: number): Mandate | undefined {
  const record = store.get(mandateId);
  if (!record) return undefined;
  const currentSpent = parseFloat(record.spentAmount ?? "0");
  const newSpent = currentSpent + additionalAmountBrl;
  record.spentAmount = newSpent.toFixed(2);
  store.set(mandateId, record);
  return record;
}

export function listMandates(): Mandate[] {
  return Array.from(store.values());
}
