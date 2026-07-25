#!/usr/bin/env bash
# PIXPORT — Hedera Testnet Activation Script
#
# Usage (after pasting credentials from portal.hedera.com):
#
#   HEDERA_OPERATOR_ID=0.0.12345 HEDERA_OPERATOR_KEY=302e... bash scripts/hedera-activate.sh
#
# OR: put credentials in .env first, then:
#   bash scripts/hedera-activate.sh
#
# What it does:
#   1. Writes HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY to .env
#   2. Runs npm run setup  (creates HTS token + HCS topic)
#   3. Runs npm run allowance (HIP-336: approve → transfer → RECUSA)
#   4. Runs npm run scheduled (Scheduled Transaction demo)
#   5. Prints all HashScan URLs for the README

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

# Load existing .env if present
if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE" 2>/dev/null || true
fi

# Override from command-line env vars if provided
OP_ID="${HEDERA_OPERATOR_ID:-}"
OP_KEY="${HEDERA_OPERATOR_KEY:-}"

if [ -z "$OP_ID" ] || [ -z "$OP_KEY" ]; then
  echo "❌ Missing credentials."
  echo ""
  echo "Get a free Hedera testnet account at https://portal.hedera.com/"
  echo "Then run:"
  echo "  HEDERA_OPERATOR_ID=0.0.XXXXX HEDERA_OPERATOR_KEY=302e... bash scripts/hedera-activate.sh"
  exit 1
fi

# Write credentials to .env (safe append/replace)
if [ -f "$ENV_FILE" ]; then
  # Update existing file
  sed -i "s|^HEDERA_OPERATOR_ID=.*|HEDERA_OPERATOR_ID=$OP_ID|" "$ENV_FILE" 2>/dev/null || true
  sed -i "s|^HEDERA_OPERATOR_KEY=.*|HEDERA_OPERATOR_KEY=$OP_KEY|" "$ENV_FILE" 2>/dev/null || true
  # Add if not present
  grep -q "^HEDERA_OPERATOR_ID=" "$ENV_FILE" || echo "HEDERA_OPERATOR_ID=$OP_ID" >> "$ENV_FILE"
  grep -q "^HEDERA_OPERATOR_KEY=" "$ENV_FILE" || echo "HEDERA_OPERATOR_KEY=$OP_KEY" >> "$ENV_FILE"
  # Also set the agent aliases
  grep -q "^HEDERA_ACCOUNT_ID=" "$ENV_FILE" || echo "HEDERA_ACCOUNT_ID=$OP_ID" >> "$ENV_FILE"
  grep -q "^HEDERA_PRIVATE_KEY=" "$ENV_FILE" || echo "HEDERA_PRIVATE_KEY=$OP_KEY" >> "$ENV_FILE"
else
  # Create .env from template
  cp "$REPO_ROOT/.env.example" "$ENV_FILE" 2>/dev/null || touch "$ENV_FILE"
  {
    echo "HEDERA_OPERATOR_ID=$OP_ID"
    echo "HEDERA_OPERATOR_KEY=$OP_KEY"
    echo "HEDERA_ACCOUNT_ID=$OP_ID"
    echo "HEDERA_PRIVATE_KEY=$OP_KEY"
    echo "HEDERA_NETWORK=testnet"
  } >> "$ENV_FILE"
fi

echo "✅ Credentials written to .env"
echo ""

# Install dependencies if needed
cd "$REPO_ROOT/packages/hedera"
if [ ! -d "node_modules" ]; then
  echo "Installing hedera package dependencies..."
  npm install --silent
fi

echo "═══════════════════════════════════════════════════"
echo "  Step 1/3: Creating HTS token + HCS topic"
echo "═══════════════════════════════════════════════════"
npm run setup 2>&1 | tee /tmp/setup_output.txt

# Extract token ID and topic ID from output and update .env
TOKEN_ID=$(grep "HTS_TOKEN_ID=" /tmp/setup_output.txt | tail -1 | cut -d= -f2 | tr -d ' ')
TOPIC_ID=$(grep "HCS_TOPIC_ID=" /tmp/setup_output.txt | tail -1 | cut -d= -f2 | tr -d ' ')

if [ -n "$TOKEN_ID" ]; then
  sed -i "s|^HTS_TOKEN_ID=.*|HTS_TOKEN_ID=$TOKEN_ID|" "$REPO_ROOT/.env" 2>/dev/null || echo "HTS_TOKEN_ID=$TOKEN_ID" >> "$REPO_ROOT/.env"
  sed -i "s|^HEDERA_HTS_TOKEN_ID=.*|HEDERA_HTS_TOKEN_ID=$TOKEN_ID|" "$REPO_ROOT/.env" 2>/dev/null || echo "HEDERA_HTS_TOKEN_ID=$TOKEN_ID" >> "$REPO_ROOT/.env"
  echo "  Token ID saved: $TOKEN_ID"
fi

if [ -n "$TOPIC_ID" ]; then
  sed -i "s|^HCS_TOPIC_ID=.*|HCS_TOPIC_ID=$TOPIC_ID|" "$REPO_ROOT/.env" 2>/dev/null || echo "HCS_TOPIC_ID=$TOPIC_ID" >> "$REPO_ROOT/.env"
  sed -i "s|^HEDERA_HCS_TOPIC_ID=.*|HEDERA_HCS_TOPIC_ID=$TOPIC_ID|" "$REPO_ROOT/.env" 2>/dev/null || echo "HEDERA_HCS_TOPIC_ID=$TOPIC_ID" >> "$REPO_ROOT/.env"
  echo "  Topic ID saved: $TOPIC_ID"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Step 2/3: HIP-336 Allowance Demo + RECUSA"
echo "═══════════════════════════════════════════════════"
npm run allowance

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Step 3/3: Scheduled Transaction"
echo "═══════════════════════════════════════════════════"
npm run scheduled

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ ALL BLOCK 1 DELIVERABLES COMPLETE"
echo "  Copy all HashScan URLs above to the README"
echo "═══════════════════════════════════════════════════"
