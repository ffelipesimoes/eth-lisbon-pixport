/** One parsed TLV field from an EMV QR Code. */
export interface EmvField {
  id: string;
  length: number;
  value: string;
}

/** Parsed BR Code (BACEN EMV QR Code). */
export interface BrCode {
  /** Raw QR string (original input, CRC validated). */
  raw: string;
  /** Payload format indicator — should be "01". */
  payloadFormatIndicator: string;
  /** Point of initiation method: 11 = static, 12 = dynamic. */
  pointOfInitiationMethod?: string;
  /** Merchant Account Information (ID 26). */
  merchantAccount?: {
    gui: string;
    key?: string;
    additionalInfo?: string;
    fss?: string;
  };
  /** Merchant category code (MCC). */
  merchantCategoryCode: string;
  /** ISO 4217 transaction currency. */
  transactionCurrency: string;
  /** Transaction amount (may be absent for "any amount"). */
  transactionAmount?: string;
  /** Country code — "BR". */
  countryCode: string;
  /** Merchant name (max 25 chars). */
  merchantName: string;
  /** Merchant city (max 15 chars). */
  merchantCity: string;
  /** Postal code (optional). */
  postalCode?: string;
  /** Additional data field template (ID 62). */
  additionalData?: {
    referenceLabel?: string;
  };
  /** All parsed raw fields for advanced consumers. */
  fields: EmvField[];
}
