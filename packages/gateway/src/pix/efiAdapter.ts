/**
 * Concrete Efí (Gerencianet) Pix payout adapter.
 *
 * Flow: OAuth 2.0 mTLS client-credentials → POST /v2/gn/pix → return endToEndId.
 * Set PIX_SANDBOX=true to use the Efí homologação endpoint.
 * All credentials come from PixCredentials (injected, never hardcoded).
 */

import https from "https";
import fs from "fs";
import type {
  PixCredentials,
  PixPaymentRequest,
  PixPaymentResult,
  PixPayoutAdapter,
} from "./types.js";

// ── HTTP transport types (injectable for testing) ────────────────────────────

export interface HttpOptions {
  method: "POST" | "PUT" | "GET";
  headers: Record<string, string>;
  body?: unknown;
  /** mTLS client certificate (PEM buffer). Omit to skip mutual TLS. */
  certPem?: Buffer;
  /** mTLS private key (PEM buffer). Omit to skip mutual TLS. */
  keyPem?: Buffer;
}

export interface HttpResult {
  status: number;
  body: string;
}

export type HttpFn = (url: string, opts: HttpOptions) => Promise<HttpResult>;

// ── Default transport: Node built-in https (supports mTLS) ──────────────────

export function nodeHttpsFn(url: string, opts: HttpOptions): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOpts: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 443,
      path: parsed.pathname + parsed.search,
      method: opts.method,
      headers: opts.headers,
    };
    if (opts.certPem && opts.keyPem) {
      reqOpts.cert = opts.certPem;
      reqOpts.key = opts.keyPem;
      reqOpts.rejectUnauthorized = true;
    }

    const req = https.request(reqOpts, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer | string) => (data += chunk.toString()));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
    });
    req.on("error", reject);
    if (opts.body !== undefined) {
      req.write(JSON.stringify(opts.body));
    }
    req.end();
  });
}

// ── Efí API response shapes ──────────────────────────────────────────────────

interface EfiTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface EfiPixEntry {
  endToEndId: string;
  txid: string;
  valor: string;
  horario: string;
}

interface EfiPixPayoutResponse {
  status: string;
  horario: { criacao: string };
  pix: EfiPixEntry[];
}

// ── Adapter ──────────────────────────────────────────────────────────────────

const EFI_PROD_URL = "https://pix.api.efipay.com.br";
const EFI_SANDBOX_URL = "https://pix-h.api.efipay.com.br";

export class EfiPixAdapter implements PixPayoutAdapter {
  private readonly baseUrl: string;
  private certPem?: Buffer;
  private keyPem?: Buffer;

  /**
   * @param creds  Credential bundle from env (injected, never hardcoded).
   * @param httpFn HTTP transport — replace with a mock for unit tests.
   */
  constructor(
    private readonly creds: PixCredentials,
    private readonly httpFn: HttpFn = nodeHttpsFn,
  ) {
    const sandbox = process.env.PIX_SANDBOX === "true";
    this.baseUrl =
      creds.apiBaseUrl ||
      (sandbox ? EFI_SANDBOX_URL : EFI_PROD_URL);

    if (creds.certPath && creds.keyPath) {
      this.certPem = fs.readFileSync(creds.certPath);
      this.keyPem = fs.readFileSync(creds.keyPath);
    }
  }

  async pay(request: PixPaymentRequest): Promise<PixPaymentResult> {
    const token = await this.getAccessToken();
    return this.sendPix(token, request);
  }

  // ── OAuth 2.0 client-credentials with mTLS ────────────────────────────────

  private async getAccessToken(): Promise<string> {
    const basicAuth = Buffer.from(
      `${this.creds.clientId}:${this.creds.clientSecret}`,
    ).toString("base64");

    const result = await this.httpFn(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: { grant_type: "client_credentials" },
      certPem: this.certPem,
      keyPem: this.keyPem,
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(
        `Efí OAuth error ${result.status}: ${result.body}`,
      );
    }

    const data = JSON.parse(result.body) as EfiTokenResponse;
    if (!data.access_token) {
      throw new Error(`Efí OAuth response missing access_token: ${result.body}`);
    }
    return data.access_token;
  }

  // ── POST /v2/gn/pix — send money out ─────────────────────────────────────

  private async sendPix(
    token: string,
    req: PixPaymentRequest,
  ): Promise<PixPaymentResult> {
    // Efí txid: alphanumeric only, 26–35 chars
    const txid = req.txid.replace(/-/g, "").substring(0, 35);

    const result = await this.httpFn(`${this.baseUrl}/v2/gn/pix`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: {
        valor: req.amount,
        pix: [
          {
            chave: req.destinationKey,
            txid,
            valor: req.amount,
            infoPagador: req.description ?? "PIXPORT payout",
          },
        ],
      },
      certPem: this.certPem,
      keyPem: this.keyPem,
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(
        `Efí pix payout error ${result.status}: ${result.body}`,
      );
    }

    const data = JSON.parse(result.body) as EfiPixPayoutResponse;
    const first = data.pix?.[0];
    if (!first?.endToEndId) {
      throw new Error(
        `Efí pix payout response missing endToEndId: ${result.body}`,
      );
    }

    return {
      endToEndId: first.endToEndId,
      status: data.status ?? "ATIVA",
      createdAt: data.horario?.criacao ?? new Date().toISOString(),
    };
  }
}
