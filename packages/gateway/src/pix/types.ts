/** Pix payment credentials injected via environment variables — never hardcoded. */
export interface PixCredentials {
  apiBaseUrl: string;
  clientId: string;
  clientSecret: string;
  /** Path to mTLS client certificate (PEM). */
  certPath: string;
  /** Path to mTLS private key (PEM). */
  keyPath: string;
  /** The payer's Pix key (e-mail, phone, CPF, or random UUID). */
  pixKey: string;
}

/** Input for initiating a Pix payment. */
export interface PixPaymentRequest {
  /** Destination Pix key from the decoded BR Code. */
  destinationKey: string;
  /** Amount in BRL as a string (e.g. "10.50"). */
  amount: string;
  /** External idempotency key to prevent duplicate charges. */
  txid: string;
  /** Optional description / payer info. */
  description?: string;
}

/** Result returned by the Pix payout adapter after initiating a payment. */
export interface PixPaymentResult {
  /** Provider-assigned end-to-end identifier (E2E). */
  endToEndId: string;
  /** Status returned by the PSP. */
  status: "ATIVA" | "CONCLUIDA" | "DEVOLVIDA" | string;
  /** ISO 8601 timestamp of the charge creation. */
  createdAt: string;
}

/**
 * Pix payout adapter interface.
 *
 * Implementations MUST read all credentials from PixCredentials (env-injected).
 * Do not hardcode secrets, client IDs, or Pix keys.
 */
export interface PixPayoutAdapter {
  /**
   * Initiate a Pix payment.
   * @throws Error if the PSP rejects the payment or credentials are invalid.
   */
  pay(request: PixPaymentRequest): Promise<PixPaymentResult>;
}
