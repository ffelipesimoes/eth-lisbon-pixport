#!/usr/bin/env bash
# PIXPORT — One-command demo launcher
#
# Usage:
#   npm run demo          (from repo root)
#   bash scripts/demo.sh  (directly)
#
# Starts:
#   - Gateway API      → http://localhost:3001   (Node/Express + Hedera)
#   - Next.js Console  → http://localhost:3000   (single-page UI)
#
# Requires: Node >= 20, .env filled in from .env.example

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# ── Load .env ──────────────────────────────────────────────────────────────
if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -o allexport && source .env && set +o allexport
else
  echo ""
  echo "⚠️  No .env file found."
  echo "   Copy .env.example → .env and fill in HEDERA_OPERATOR_ID + HEDERA_OPERATOR_KEY"
  echo ""
  echo "   cp .env.example .env"
  echo "   # then edit .env"
  echo ""
fi

# ── Check Node version ─────────────────────────────────────────────────────
NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])" 2>/dev/null || echo "0")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "❌  Node >= 20 required (found: $(node --version 2>/dev/null || echo 'not found'))"
  exit 1
fi

# ── Install deps if needed ─────────────────────────────────────────────────
if [ ! -d node_modules ]; then
  echo "📦  Installing dependencies…"
  npm install --silent
fi

GATEWAY_PORT="${GATEWAY_PORT:-3001}"
CONSOLE_PORT=3000

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║              PIXPORT Demo Launcher                   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Gateway  → http://localhost:${GATEWAY_PORT}"
echo "  Console  → http://localhost:${CONSOLE_PORT}"
echo ""
echo "  Press Ctrl+C to stop both services."
echo ""

# ── Cleanup trap ───────────────────────────────────────────────────────────
GATEWAY_PID=""
CONSOLE_PID=""

cleanup() {
  echo ""
  echo "Stopping services…"
  [ -n "$GATEWAY_PID" ] && kill "$GATEWAY_PID" 2>/dev/null || true
  [ -n "$CONSOLE_PID" ] && kill "$CONSOLE_PID" 2>/dev/null || true
  # Kill any lingering tsx / next processes we spawned
  kill 0 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Start Gateway ──────────────────────────────────────────────────────────
echo "▶  Starting gateway (port ${GATEWAY_PORT})…"
GATEWAY_PORT="$GATEWAY_PORT" \
  node_modules/.bin/tsx packages/gateway/src/index.ts 2>&1 | sed 's/^/[gateway] /' &
GATEWAY_PID=$!

# Give the gateway a moment to bind before Next.js starts making rewrite calls
sleep 1

# ── Start Console ──────────────────────────────────────────────────────────
echo "▶  Starting console (port ${CONSOLE_PORT})…"
(
  cd packages/console
  GATEWAY_URL="http://localhost:${GATEWAY_PORT}" \
  PORT="$CONSOLE_PORT" \
    ../../node_modules/.bin/next dev -p "$CONSOLE_PORT" 2>&1 | sed 's/^/[console] /'
) &
CONSOLE_PID=$!

# ── Wait ───────────────────────────────────────────────────────────────────
wait
