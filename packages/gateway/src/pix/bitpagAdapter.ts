/**
 * Concrete Bitpag Pix payout adapter.
 *
 * Flow: POST /api/auth (long-lived API key → short-lived JWT)
 *       → POST /api/payments/pix-out (cashout)
 *       → return { endToEndId, status, createdAt }
 *
 * No mTLS — Bitpag authenticates via Bearer token + client credentials.
 * Set PIX_API_BASE_URL to override; defaults to https://api.bitpag.xyz.
 */

import { nodeHttpsFn, type HttpFn } from "./efiAdapter.js";
import type {
  PixCredentials,
  PixPaymentRequest,
  PixPaymentResult,
  PixPayoutAdapter,
} from "./types.js";

// ── Bitpag API response shapes ────────────────────────────────────────────────

interface BitpagAuthResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

interface BitpagPixOutResponse {
  /** Bitpag transaction ID — used as endToEndId. */
  id?: string;
  endToEndId?: string;
  externalId?: string;
  /** PENDING | APPROVED | COMPLETED | REJECTED | FAILED */
  status?: string;
  amount?: number;
  pixKey?: string;
  pixKeyType?: string;
  createdAt?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert BRL decimal string ("10.50") to integer centavos (1050). */
export function brlToCentavos(brl: string): number {
  return Math.round(parseFloat(brl) * 100);
}

/** Infer Bitpag pixKeyType from the destination key value. */
export function detectPixKeyType(
  key: string,
): "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP" {
  // UUID random key (EVP)
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)
  ) {
    return "EVP";
  }
  if (key.includes("@")) return "EMAIL";
  const digits = key.replace(/\D/g, "");
  if (digits.length === 14) return "CNPJ";
  if (digits.length === 11) return "CPF";
  return "PHONE";
}

// ── Adapter ───────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = "https://api.bitpag.xyz";

export class BitpagPixAdapter implements PixPayoutAdapter {
  private readonly baseUrl: string;

  /**
   * @param creds  Standard PixCredentials (clientId + clientSecret used; certPath/keyPath unused).
   * @param apiKey Long-lived Bitpag API key sent as Bearer in POST /api/auth.
   * @param httpFn HTTP transport — inject a mock for unit tests.
   */
  constructor(
    private readonly creds: PixCredentials,
    private readonly apiKey: string,
    private readonly httpFn: HttpFn = nodeHttpsFn,
  ) {
    const raw = (creds.apiBaseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
    this.baseUrl = raw.endsWith("/api") ? raw.slice(0, -4) : raw;
  }

  async pay(request: PixPaymentRequest): Promise<PixPaymentResult> {
    const token = await this.getAccessToken();
    return this.pixOut(token, request);
  }

  // ── POST /api/auth — exchange API key + client creds for short-lived JWT ──

  private async getAccessToken(): Promise<string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const result = await this.httpFn(`${this.baseUrl}/api/auth`, {
      method: "POST",
      headers,
      body: {
        client_id: this.creds.clientId,
        client_secret: this.creds.clientSecret,
      },
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Bitpag auth error ${result.status}: ${result.body}`);
    }

    const data = JSON.parse(result.body) as BitpagAuthResponse;
    if (!data.access_token) {
      throw new Error(
        `Bitpag auth response missing access_token: ${result.body}`,
      );
    }
    return data.access_token;
  }

  // ── POST /api/payments/pix-out — send money ───────────────────────────────

  private async pixOut(
    token: string,
    req: PixPaymentRequest,
  ): Promise<PixPaymentResult> {
    const result = await this.httpFn(
      `${this.baseUrl}/api/payments/pix-out`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: {
          amount: brlToCentavos(req.amount),
          pixKeyType: detectPixKeyType(req.destinationKey),
          pixKey: req.destinationKey,
          externalId: req.txid,
        },
      },
    );

    if (result.status < 200 || result.status >= 300) {
      throw new Error(
        `Bitpag pix-out error ${result.status}: ${result.body}`,
      );
    }

    const data = JSON.parse(result.body) as BitpagPixOutResponse;
    // Bitpag may return `endToEndId` or `id` as the transaction reference
    const endToEndId = data.endToEndId ?? data.id ?? req.txid;

    return {
      endToEndId,
      status: data.status ?? "ATIVA",
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
  }
}
