import type { PixCredentials } from "./types.js";

/**
 * Load Pix credentials from environment variables.
 * Throws if any required variable is missing so the gateway fails fast at startup.
 */
export function loadPixCredentials(): PixCredentials {
  const required = {
    apiBaseUrl: process.env.PIX_API_BASE_URL,
    clientId: process.env.PIX_CLIENT_ID,
    clientSecret: process.env.PIX_CLIENT_SECRET,
    certPath: process.env.PIX_CERT_PATH,
    keyPath: process.env.PIX_KEY_PATH,
    pixKey: process.env.PIX_KEY,
  };

  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Pix environment variables: ${missing.join(", ")}. ` +
        "See .env.example for required fields."
    );
  }

  return required as PixCredentials;
}
