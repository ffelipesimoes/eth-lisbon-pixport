/**
 * Allowlist module — approved payee Pix key identifiers.
 *
 * In Block 2 this will be backed by HCS state and HTS on-chain allowances.
 * For now it uses an in-process Set as a placeholder.
 */

const approved = new Set<string>();

/** Add a Pix key to the allowlist. */
export function addToAllowlist(pixKey: string): void {
  approved.add(pixKey.trim().toLowerCase());
}

/** Check if a Pix key is on the allowlist. */
export function isAllowed(pixKey: string): boolean {
  return approved.has(pixKey.trim().toLowerCase());
}

/** Return a snapshot of all allowlisted keys (for admin/debug). */
export function listAllowlist(): string[] {
  return Array.from(approved);
}
