/**
 * Unit tests for BitpagPixAdapter — all HTTP mocked, no real PSP calls.
 */

import { describe, it, expect, vi } from "vitest";
import {
  BitpagPixAdapter,
  brlToCentavos,
  detectPixKeyType,
} from "../pix/bitpagAdapter.js";
import type { HttpFn, HttpResult } from "../pix/efiAdapter.js";
import type { PixCredentials } from "../pix/types.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_CREDS: PixCredentials = {
  apiBaseUrl: "https://api.bitpag.xyz",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  certPath: "",
  keyPath: "",
  pixKey: "payer@example.com",
};
const MOCK_API_KEY = "long-lived-api-key-123";

function makeAuthOk(): HttpResult {
  return {
    status: 200,
    body: JSON.stringify({ access_token: "short_lived_jwt_abc", token_type: "Bearer" }),
  };
}

function makePixOutOk(): HttpResult {
  return {
    status: 200,
    body: JSON.stringify({
      id: "bitpag-tx-999",
      endToEndId: "E999000000001",
      externalId: "test-txid-123",
      status: "APPROVED",
      amount: 1050,
      pixKey: "payee@example.com",
      pixKeyType: "EMAIL",
      createdAt: "2026-07-25T10:00:00.000Z",
    }),
  };
}

function makeMock(...results: HttpResult[]): HttpFn {
  const fn = vi.fn<HttpFn>();
  for (const r of results) fn.mockResolvedValueOnce(r);
  return fn;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

describe("brlToCentavos", () => {
  it("converts '10.50' to 1050", () => expect(brlToCentavos("10.50")).toBe(1050));
  it("converts '0.01' to 1", () => expect(brlToCentavos("0.01")).toBe(1));
  it("converts '200' to 20000", () => expect(brlToCentavos("200")).toBe(20000));
  it("rounds correctly for floating point edge cases", () => {
    expect(brlToCentavos("5.005")).toBe(501); // Math.round(500.5) = 501
  });
});

describe("detectPixKeyType", () => {
  it("detects RANDOM (UUID key)", () => {
    expect(detectPixKeyType("123e4567-e89b-12d3-a456-426614174000")).toBe("RANDOM");
  });
  it("detects EMAIL", () => {
    expect(detectPixKeyType("user@example.com")).toBe("EMAIL");
  });
  it("detects CPF (11 digits)", () => {
    expect(detectPixKeyType("12345678909")).toBe("CPF");
    expect(detectPixKeyType("123.456.789-09")).toBe("CPF");
  });
  it("detects CNPJ (14 digits)", () => {
    expect(detectPixKeyType("12345678000195")).toBe("CNPJ");
  });
  it("falls back to PHONE", () => {
    expect(detectPixKeyType("+5511999999999")).toBe("PHONE");
  });
});

// ── Success path ──────────────────────────────────────────────────────────────

describe("BitpagPixAdapter — success", () => {
  it("calls /api/auth then /api/payments/pix-out and returns endToEndId", async () => {
    const mockHttp = makeMock(makeAuthOk(), makePixOutOk());
    const adapter = new BitpagPixAdapter(MOCK_CREDS, MOCK_API_KEY, mockHttp);

    const result = await adapter.pay({
      destinationKey: "payee@example.com",
      amount: "10.50",
      txid: "test-txid-123",
      description: "PIXPORT mandate m-001",
    });

    expect(result.endToEndId).toBe("E999000000001");
    expect(result.status).toBe("APPROVED");
    expect(result.createdAt).toBe("2026-07-25T10:00:00.000Z");
    expect(mockHttp).toHaveBeenCalledTimes(2);
  });

  it("sends long-lived API key as Bearer in auth call", async () => {
    const mockHttp = makeMock(makeAuthOk(), makePixOutOk());
    const adapter = new BitpagPixAdapter(MOCK_CREDS, MOCK_API_KEY, mockHttp);
    await adapter.pay({ destinationKey: "k@x.com", amount: "1.00", txid: "t1" });

    const calls = vi.mocked(mockHttp).mock.calls;
    const [authUrl, authOpts] = calls[0];
    expect(authUrl).toContain("/api/auth");
    expect(authOpts.headers["Authorization"]).toBe(`Bearer ${MOCK_API_KEY}`);
    expect((authOpts.body as Record<string, string>)["client_id"]).toBe("test-client-id");
  });

  it("sends short-lived token as Bearer in pix-out call", async () => {
    const mockHttp = makeMock(makeAuthOk(), makePixOutOk());
    const adapter = new BitpagPixAdapter(MOCK_CREDS, MOCK_API_KEY, mockHttp);
    await adapter.pay({ destinationKey: "k@x.com", amount: "5.00", txid: "t2" });

    const calls = vi.mocked(mockHttp).mock.calls;
    const [, pixOpts] = calls[1];
    expect(pixOpts.headers["Authorization"]).toBe("Bearer short_lived_jwt_abc");
  });

  it("converts BRL string to centavos in pix-out body", async () => {
    const mockHttp = makeMock(makeAuthOk(), makePixOutOk());
    const adapter = new BitpagPixAdapter(MOCK_CREDS, MOCK_API_KEY, mockHttp);
    await adapter.pay({ destinationKey: "k@x.com", amount: "12.34", txid: "t3" });

    const calls = vi.mocked(mockHttp).mock.calls;
    const [, pixOpts] = calls[1];
    const body = pixOpts.body as Record<string, unknown>;
    expect(body["amount"]).toBe(1234);
  });

  it("detects and sends correct pixKeyType", async () => {
    const mockHttp = makeMock(makeAuthOk(), makePixOutOk());
    const adapter = new BitpagPixAdapter(MOCK_CREDS, MOCK_API_KEY, mockHttp);
    await adapter.pay({ destinationKey: "payee@example.com", amount: "1.00", txid: "t4" });

    const calls = vi.mocked(mockHttp).mock.calls;
    const [, pixOpts] = calls[1];
    const body = pixOpts.body as Record<string, unknown>;
    expect(body["pixKeyType"]).toBe("EMAIL");
  });

  it("falls back to id when endToEndId absent from response", async () => {
    const mockHttp = makeMock(makeAuthOk(), {
      status: 200,
      body: JSON.stringify({ id: "fallback-id-999", status: "APPROVED", createdAt: "2026-01-01T00:00:00Z" }),
    });
    const adapter = new BitpagPixAdapter(MOCK_CREDS, MOCK_API_KEY, mockHttp);
    const result = await adapter.pay({ destinationKey: "k@x.com", amount: "1.00", txid: "t5" });
    expect(result.endToEndId).toBe("fallback-id-999");
  });
});

// ── Error paths ───────────────────────────────────────────────────────────────

describe("BitpagPixAdapter — auth errors", () => {
  it("throws on 401 from /api/auth", async () => {
    const mockHttp = makeMock({ status: 401, body: JSON.stringify({ message: "Unauthorized" }) });
    const adapter = new BitpagPixAdapter(MOCK_CREDS, MOCK_API_KEY, mockHttp);
    await expect(
      adapter.pay({ destinationKey: "k@x.com", amount: "1.00", txid: "x" }),
    ).rejects.toThrow(/Bitpag auth error 401/);
  });

  it("throws when access_token absent in auth response", async () => {
    const mockHttp = makeMock({ status: 200, body: JSON.stringify({ token_type: "Bearer" }) });
    const adapter = new BitpagPixAdapter(MOCK_CREDS, MOCK_API_KEY, mockHttp);
    await expect(
      adapter.pay({ destinationKey: "k@x.com", amount: "1.00", txid: "x" }),
    ).rejects.toThrow(/missing access_token/);
  });
});

describe("BitpagPixAdapter — pix-out errors", () => {
  it("throws on 422 from /api/payments/pix-out", async () => {
    const mockHttp = makeMock(makeAuthOk(), {
      status: 422,
      body: JSON.stringify({ message: "Chave Pix inválida" }),
    });
    const adapter = new BitpagPixAdapter(MOCK_CREDS, MOCK_API_KEY, mockHttp);
    await expect(
      adapter.pay({ destinationKey: "invalid", amount: "1.00", txid: "x" }),
    ).rejects.toThrow(/Bitpag pix-out error 422/);
  });

  it("throws on 500 from /api/payments/pix-out", async () => {
    const mockHttp = makeMock(makeAuthOk(), { status: 500, body: "Internal Server Error" });
    const adapter = new BitpagPixAdapter(MOCK_CREDS, MOCK_API_KEY, mockHttp);
    await expect(
      adapter.pay({ destinationKey: "k@x.com", amount: "1.00", txid: "x" }),
    ).rejects.toThrow(/Bitpag pix-out error 500/);
  });
});
