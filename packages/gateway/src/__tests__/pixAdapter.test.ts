/**
 * Unit tests for EfiPixAdapter — all HTTP mocked, no real PSP calls.
 */

import { describe, it, expect, vi } from "vitest";
import { EfiPixAdapter } from "../pix/efiAdapter.js";
import type { HttpFn, HttpResult } from "../pix/efiAdapter.js";
import type { PixCredentials } from "../pix/types.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_CREDS: PixCredentials = {
  apiBaseUrl: "https://pix-h.api.efipay.com.br",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  certPath: "", // empty → mTLS skipped in adapter
  keyPath: "",
  pixKey: "test-pix-key@example.com",
};

function makeOAuthOk(): HttpResult {
  return {
    status: 200,
    body: JSON.stringify({
      access_token: "tok_sandbox_123",
      token_type: "Bearer",
      expires_in: 3600,
    }),
  };
}

function makePixOk(): HttpResult {
  return {
    status: 200,
    body: JSON.stringify({
      status: "ATIVA",
      horario: { criacao: "2026-01-01T12:00:00.000Z" },
      pix: [
        {
          endToEndId: "E00038166202601011200000000001",
          txid: "abc123def456ghi789jkl012mno345",
          valor: "10.50",
          horario: "2026-01-01T12:00:00.000Z",
        },
      ],
    }),
  };
}

function makeMock(...results: HttpResult[]): HttpFn {
  const fn = vi.fn<HttpFn>();
  for (const r of results) fn.mockResolvedValueOnce(r);
  return fn;
}

// ── Success path ──────────────────────────────────────────────────────────────

describe("EfiPixAdapter — success", () => {
  it("calls OAuth then pix payout and returns endToEndId", async () => {
    const mockHttp = makeMock(makeOAuthOk(), makePixOk());
    const adapter = new EfiPixAdapter(MOCK_CREDS, mockHttp);
    const result = await adapter.pay({
      destinationKey: "payee@example.com",
      amount: "10.50",
      txid: "123e4567-e89b-12d3-a456-426614174000",
      description: "PIXPORT mandate m-001",
    });

    expect(result.endToEndId).toBe("E00038166202601011200000000001");
    expect(result.status).toBe("ATIVA");
    expect(result.createdAt).toBe("2026-01-01T12:00:00.000Z");
    expect(mockHttp).toHaveBeenCalledTimes(2);
  });

  it("sends OAuth with Basic auth header", async () => {
    const mockHttp = makeMock(makeOAuthOk(), makePixOk());
    const adapter = new EfiPixAdapter(MOCK_CREDS, mockHttp);
    await adapter.pay({ destinationKey: "k@x.com", amount: "1.00", txid: "uuid-1" });

    const calls = vi.mocked(mockHttp).mock.calls;
    const [oauthUrl, oauthOpts] = calls[0];
    expect(oauthUrl).toContain("/oauth/token");
    const expected =
      "Basic " +
      Buffer.from("test-client-id:test-client-secret").toString("base64");
    expect(oauthOpts.headers["Authorization"]).toBe(expected);
  });

  it("strips hyphens from txid and truncates to 35 chars", async () => {
    const mockHttp = makeMock(makeOAuthOk(), makePixOk());
    const adapter = new EfiPixAdapter(MOCK_CREDS, mockHttp);
    await adapter.pay({
      destinationKey: "k@x.com",
      amount: "1.00",
      txid: "123e4567-e89b-12d3-a456-426614174000",
    });

    const calls = vi.mocked(mockHttp).mock.calls;
    const [, pixOpts] = calls[1];
    const body = pixOpts.body as { pix: Array<{ txid: string }> };
    expect(body.pix[0].txid).not.toContain("-");
    expect(body.pix[0].txid.length).toBeLessThanOrEqual(35);
  });

  it("sends pix payout with Bearer token", async () => {
    const mockHttp = makeMock(makeOAuthOk(), makePixOk());
    const adapter = new EfiPixAdapter(MOCK_CREDS, mockHttp);
    await adapter.pay({ destinationKey: "k@x.com", amount: "5.00", txid: "uuid-2" });

    const calls = vi.mocked(mockHttp).mock.calls;
    const [, pixOpts] = calls[1];
    expect(pixOpts.headers["Authorization"]).toBe("Bearer tok_sandbox_123");
  });
});

// ── Error paths ───────────────────────────────────────────────────────────────

describe("EfiPixAdapter — OAuth errors", () => {
  it("throws on 401 from OAuth endpoint", async () => {
    const mockHttp = makeMock({
      status: 401,
      body: JSON.stringify({ error: "invalid_client" }),
    });
    const adapter = new EfiPixAdapter(MOCK_CREDS, mockHttp);
    await expect(
      adapter.pay({ destinationKey: "k@x.com", amount: "1.00", txid: "x" }),
    ).rejects.toThrow(/Efí OAuth error 401/);
  });

  it("throws when access_token is absent in OAuth response", async () => {
    const mockHttp = makeMock({
      status: 200,
      body: JSON.stringify({ token_type: "Bearer" }), // missing access_token
    });
    const adapter = new EfiPixAdapter(MOCK_CREDS, mockHttp);
    await expect(
      adapter.pay({ destinationKey: "k@x.com", amount: "1.00", txid: "x" }),
    ).rejects.toThrow(/missing access_token/);
  });
});

describe("EfiPixAdapter — PSP payout errors", () => {
  it("throws on 422 from pix payout endpoint", async () => {
    const mockHttp = makeMock(makeOAuthOk(), {
      status: 422,
      body: JSON.stringify({
        title: "Chave pix inválida",
        detail: "A chave pix informada não existe.",
      }),
    });
    const adapter = new EfiPixAdapter(MOCK_CREDS, mockHttp);
    await expect(
      adapter.pay({ destinationKey: "invalid@x.com", amount: "1.00", txid: "x" }),
    ).rejects.toThrow(/Efí pix payout error 422/);
  });

  it("throws when pix array is empty in success response", async () => {
    const mockHttp = makeMock(makeOAuthOk(), {
      status: 200,
      body: JSON.stringify({
        status: "ATIVA",
        horario: { criacao: "2026-01-01T00:00:00Z" },
        pix: [],
      }),
    });
    const adapter = new EfiPixAdapter(MOCK_CREDS, mockHttp);
    await expect(
      adapter.pay({ destinationKey: "k@x.com", amount: "1.00", txid: "x" }),
    ).rejects.toThrow(/missing endToEndId/);
  });

  it("throws on 500 from pix payout endpoint", async () => {
    const mockHttp = makeMock(makeOAuthOk(), {
      status: 500,
      body: "Internal Server Error",
    });
    const adapter = new EfiPixAdapter(MOCK_CREDS, mockHttp);
    await expect(
      adapter.pay({ destinationKey: "k@x.com", amount: "1.00", txid: "x" }),
    ).rejects.toThrow(/Efí pix payout error 500/);
  });
});
