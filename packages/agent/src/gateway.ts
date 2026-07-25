/**
 * PIXPORT Gateway client — calls POST /pay on GatewayEngineer's Express server.
 *
 * The agent never executes payments directly; it delegates to the gateway,
 * which owns the Pix API credentials and Hedera operator keys.
 */

import type { GatewayPayRequest, GatewayPayResponse } from "./types.js";

export interface GatewayConfig {
  baseUrl: string;
  apiKey?: string;
}

export function loadGatewayConfig(): GatewayConfig {
  const baseUrl = process.env.GATEWAY_URL ?? "http://localhost:3001";
  const apiKey = process.env.GATEWAY_API_KEY;
  return { baseUrl, apiKey };
}

export class GatewayError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

/**
 * POST /pay — execute a Pix payment via the PIXPORT gateway.
 *
 * Throws GatewayError when the gateway returns a non-2xx status.
 */
export async function callGatewayPay(
  request: GatewayPayRequest,
  config: GatewayConfig,
): Promise<GatewayPayResponse> {
  const url = `${config.baseUrl}/pay`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });
  } catch (err) {
    throw new GatewayError(
      `Gateway unreachable at ${url}: ${err instanceof Error ? err.message : String(err)}`,
      0,
      null,
    );
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new GatewayError(
      `Gateway returned HTTP ${response.status}: ${JSON.stringify(body)}`,
      response.status,
      body,
    );
  }

  return body as GatewayPayResponse;
}
