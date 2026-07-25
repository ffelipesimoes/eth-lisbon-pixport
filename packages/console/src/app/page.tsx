"use client";

import { useState, useEffect, useCallback } from "react";
import type { MandateStatus, HcsEntry, PayResult } from "../lib/api";
import { fetchMandateStatus, fetchHcsAudit, createMandate, executePay } from "../lib/api";

const DEMO_BRCODE =
  "00020126400014BR.GOV.BCB.PIX0118teste@pixport.demo52040000530398654041.005802BR5912PIXPORT Demo6006Lisboa62070503***630462EF";
const DEMO_PIX_KEY = "teste@pixport.demo";
const DEMO_PAYER = "0.0.9743531";
const HCS_TOPIC_ID = "0.0.9742958";

export type WorldLevel = "orb" | "device" | "none";

interface WorldTierInfo {
  level: WorldLevel;
  name: string;
  badge: string;
  maxSpend: string;
  tierName: string;
  description: string;
}

const WORLD_TIERS: Record<WorldLevel, WorldTierInfo> = {
  orb: {
    level: "orb",
    name: "Orb Verified",
    badge: "Identity Check ✓",
    maxSpend: "10,000.00 BRL",
    tierName: "HIGH Tier",
    description: "Verified unique human via physical Orb device ZK proof",
  },
  device: {
    level: "device",
    name: "Device Verified",
    badge: "Device Only",
    maxSpend: "1,000.00 BRL",
    tierName: "MEDIUM Tier",
    description: "Verified World App mobile device (not full Identity Check)",
  },
  none: {
    level: "none",
    name: "Unverified",
    badge: "No Proof",
    maxSpend: "0.00 BRL",
    tierName: "ZERO Tier",
    description: "Proof absent or failed — immediate mandate rejection (TIER_INSUFFICIENT)",
  },
};

function parseHcsMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const event = String(parsed.event ?? parsed.decision ?? "?");
    const payee = String(parsed.payeePixKey ?? parsed.payee ?? "");
    const reason = parsed.reason ? ` — ${String(parsed.reason)}` : "";
    return `[${event}] ${payee}${reason}`.trim();
  } catch {
    return raw.slice(0, 100);
  }
}

export default function ConsolePage() {
  // ── World Identity Check state ───────────────────────────────────────────
  const [selectedWorldLevel, setSelectedWorldLevel] = useState<WorldLevel>("orb");

  // ── Create Mandate state ──────────────────────────────────────────────────
  const [newPayeePixKey, setNewPayeePixKey] = useState("");
  const [newPayerAccountId, setNewPayerAccountId] = useState("");
  const [newMaxAmount, setNewMaxAmount] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [createdMandate, setCreatedMandate] = useState<MandateStatus | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // ── Execute Pay state ─────────────────────────────────────────────────────
  const [payBrCode, setPayBrCode] = useState("");
  const [payPayerAccountId, setPayPayerAccountId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMandateId, setPayMandateId] = useState("");
  const [payResult, setPayResult] = useState<PayResult | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  // ── Mandate lookup state ──────────────────────────────────────────────────
  const [mandateId, setMandateId] = useState("");
  const [mandate, setMandate] = useState<MandateStatus | null>(null);
  const [mandateError, setMandateError] = useState<string | null>(null);
  const [loadingMandate, setLoadingMandate] = useState(false);

  // ── Gateway health state ──────────────────────────────────────────────────
  const [gatewayOffline, setGatewayOffline] = useState(false);

  // ── HCS audit state ───────────────────────────────────────────────────────
  const [hcsEntries, setHcsEntries] = useState<HcsEntry[]>([]);
  const [hcsError, setHcsError] = useState<string | null>(null);
  const [loadingHcs, setLoadingHcs] = useState(false);
  const [lastHcsRefresh, setLastHcsRefresh] = useState<Date | null>(null);

  const refreshHcs = useCallback(async () => {
    setLoadingHcs(true);
    setHcsError(null);
    try {
      const data = await fetchHcsAudit(10);
      setHcsEntries(data);
      setLastHcsRefresh(new Date());
      setGatewayOffline(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("Gateway offline")) {
        setGatewayOffline(true);
        setHcsError(null);
      } else {
        setHcsError(msg);
      }
    } finally {
      setLoadingHcs(false);
    }
  }, []);

  useEffect(() => {
    void refreshHcs();
    const id = setInterval(() => { void refreshHcs(); }, 10_000);
    return () => clearInterval(id);
  }, [refreshHcs]);

  const handleCreateMandate = useCallback(async () => {
    if (!newPayeePixKey || !newPayerAccountId || !newMaxAmount) return;
    setCreating(true);
    setCreateError(null);
    setCreatedMandate(null);
    try {
      const data = await createMandate({
        payeePixKey: newPayeePixKey,
        payerAccountId: newPayerAccountId,
        maxAmount: newMaxAmount,
        memo: newMemo ? `[World: ${selectedWorldLevel}] ${newMemo}` : `[World: ${selectedWorldLevel}] Mandate created`,
      });
      setCreatedMandate(data);
      setPayMandateId(data.mandateId);
      setPayPayerAccountId(newPayerAccountId);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }, [newPayeePixKey, newPayerAccountId, newMaxAmount, newMemo, selectedWorldLevel]);

  const handlePay = useCallback(async () => {
    if (!payBrCode || !payPayerAccountId || !payAmount || !payMandateId) return;

    // Check World ID Unverified gate before sending
    if (selectedWorldLevel === "none") {
      setPayError("World Identity Check failed: Unverified identity (ZERO Tier) cannot execute Pix payments.");
      setPayResult({
        decision: "rejected",
        reason: "TIER_INSUFFICIENT: Unverified identity level (ZERO Tier) rejected before Pix call",
        decidedAt: new Date().toISOString(),
      });
      return;
    }

    setPaying(true);
    setPayError(null);
    setPayResult(null);
    try {
      const data = await executePay({
        brCode: payBrCode,
        payerAccountId: payPayerAccountId,
        amount: payAmount,
        mandateId: payMandateId,
      });
      setPayResult(data);
      setTimeout(() => { void refreshHcs(); }, 2_000);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPaying(false);
    }
  }, [payBrCode, payPayerAccountId, payAmount, payMandateId, selectedWorldLevel, refreshHcs]);

  const lookupMandate = useCallback(async () => {
    if (!mandateId.trim()) return;
    setLoadingMandate(true);
    setMandateError(null);
    setMandate(null);
    try {
      const data = await fetchMandateStatus(mandateId.trim());
      setMandate(data);
    } catch (err) {
      setMandateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingMandate(false);
    }
  }, [mandateId]);

  const currentTier = WORLD_TIERS[selectedWorldLevel];

  return (
    <div className="container">
      {/* ── Header Branding ───────────────────────────────────────────── */}
      <header>
        <div className="header-top">
          <h1 className="brand-title">
            <span>⚡ PIXPORT</span>
            <span className="dim" style={{ fontSize: "1rem", fontWeight: 400 }}>Console</span>
          </h1>
          <div className="header-tags">
            <span className="tag-pill tag-hedera">
              <span className="pulse-dot" style={{ width: 6, height: 6 }}></span>
              Hedera Testnet
            </span>
            <span className="tag-pill tag-solidity">No Solidity</span>
            <span className="tag-pill tag-world">World ID Beta</span>
          </div>
        </div>
        <p className="header-subtitle">
          On-Chain Pix Mandate Layer powered by Hedera HIP-336, HCS Topic <span className="mono">{HCS_TOPIC_ID}</span>, and World Identity Check.
        </p>
      </header>

      {/* ── Gateway Health Alert ───────────────────────────────────────── */}
      {gatewayOffline && (
        <div className="card" style={{ borderColor: "#f59e0b", background: "rgba(245, 158, 11, 0.1)" }}>
          <p style={{ color: "#fbbf24", fontWeight: 700, fontSize: "0.95rem" }}>
            ⚠️ Gateway Offline
          </p>
          <p style={{ color: "#cbd5e1", fontSize: "0.85rem", marginTop: "0.3rem" }}>
            Run <code style={{ color: "#fef08a" }}>npm run demo</code> or <code style={{ color: "#fef08a" }}>npm run dev -w packages/gateway</code> to start the Gateway on port 3001. The console will automatically reconnect.
          </p>
        </div>
      )}

      {/* ── World Identity Check (Beta) Panel ───────────────────────────── */}
      <div className="world-panel">
        <div className="world-header">
          <div className="world-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="4"></circle>
              <line x1="12" y1="2" x2="12" y2="4"></line>
              <line x1="12" y1="20" x2="12" y2="22"></line>
            </svg>
            World Identity Check (Beta) — ZK Proof Gate
          </div>
          <span className="badge badge-approved" style={{ background: "rgba(192, 132, 252, 0.2)", color: "#f0abfc", borderColor: "rgba(192, 132, 252, 0.4)" }}>
            {currentTier.badge}
          </span>
        </div>

        <p style={{ fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.4 }}>
          Every payment decision is evaluated against the payer&apos;s World Identity Check level (<code className="mono">verifyCloudProof</code>).
          The ZK proof level determines the HIP-336 allowance tier on Hedera.
        </p>

        <div className="world-tier-grid">
          <div
            className={`world-tier-card ${selectedWorldLevel === "orb" ? "selected-orb" : ""}`}
            onClick={() => setSelectedWorldLevel("orb")}
          >
            <div className="tier-name" style={{ color: "#34d399" }}>
              <span>Orb Verified ✓</span>
              <span className="badge badge-approved">HIGH</span>
            </div>
            <div className="tier-limit">{WORLD_TIERS.orb.maxSpend}</div>
            <div className="tier-desc">Verified unique human via physical Orb. Max spending capacity.</div>
          </div>

          <div
            className={`world-tier-card ${selectedWorldLevel === "device" ? "selected-device" : ""}`}
            onClick={() => setSelectedWorldLevel("device")}
          >
            <div className="tier-name" style={{ color: "#fbbf24" }}>
              <span>Device Verified</span>
              <span className="badge badge-pending">MEDIUM</span>
            </div>
            <div className="tier-limit">{WORLD_TIERS.device.maxSpend}</div>
            <div className="tier-desc">Verified World App device only (not full Identity Check).</div>
          </div>

          <div
            className={`world-tier-card ${selectedWorldLevel === "none" ? "selected-none" : ""}`}
            onClick={() => setSelectedWorldLevel("none")}
          >
            <div className="tier-name" style={{ color: "#f87171" }}>
              <span>Unverified</span>
              <span className="badge badge-rejected">ZERO</span>
            </div>
            <div className="tier-limit">{WORLD_TIERS.none.maxSpend}</div>
            <div className="tier-desc">No ZK proof — immediate refusal before Pix call.</div>
          </div>
        </div>
      </div>

      {/* ── STEP 1: Create Mandate ─────────────────────────────────────── */}
      <div className="card">
        <h2>
          <span className="step-num">1</span>
          Create Mandate <span className="endpoint">POST /mandates</span>
        </h2>
        <div className="input-row">
          <input
            type="text"
            placeholder="Payee Pix key (e.g. teste@pixport.demo)"
            value={newPayeePixKey}
            onChange={(e) => setNewPayeePixKey(e.target.value)}
          />
          <button
            className="btn-secondary"
            onClick={() => setNewPayeePixKey(DEMO_PIX_KEY)}
            title="Use demo Pix key"
          >
            Demo key
          </button>
        </div>
        <div className="input-row">
          <input
            type="text"
            placeholder="Payer Hedera account (0.0.XXXXX)"
            value={newPayerAccountId}
            onChange={(e) => setNewPayerAccountId(e.target.value)}
          />
          <button
            className="btn-secondary"
            onClick={() => setNewPayerAccountId(DEMO_PAYER)}
            title="Use spender account"
          >
            Demo account
          </button>
        </div>
        <div className="input-row">
          <input
            type="text"
            placeholder="Max amount BRL (e.g. 100.00)"
            value={newMaxAmount}
            onChange={(e) => setNewMaxAmount(e.target.value)}
          />
          <input
            type="text"
            placeholder="Memo (optional)"
            value={newMemo}
            onChange={(e) => setNewMemo(e.target.value)}
          />
          <button
            onClick={() => { void handleCreateMandate(); }}
            disabled={creating || !newPayeePixKey || !newPayerAccountId || !newMaxAmount}
          >
            {creating ? "Creating…" : "Create Mandate"}
          </button>
        </div>

        {createError && <p className="error" style={{ marginTop: "0.5rem" }}>{createError}</p>}

        {createdMandate && (
          <div className="result-row">
            <span className={`badge badge-${createdMandate.status}`}>{createdMandate.status.toUpperCase()}</span>
            <span className="mono">{createdMandate.mandateId}</span>
            {createdMandate.hcsSequenceNumber && (
              <span className="dim">HCS #{createdMandate.hcsSequenceNumber}</span>
            )}
          </div>
        )}
      </div>

      {/* ── STEP 2: Execute Payment ────────────────────────────────────── */}
      <div className="card">
        <h2>
          <span className="step-num">2</span>
          Execute Payment &amp; HIP-336 Allowance Check <span className="endpoint">POST /pay</span>
        </h2>
        <div className="input-row">
          <input
            type="text"
            className="mono-input"
            placeholder="BR Code (EMV QR string — paste or scan)"
            value={payBrCode}
            onChange={(e) => setPayBrCode(e.target.value)}
          />
          <button
            className="btn-secondary"
            onClick={() => setPayBrCode(DEMO_BRCODE)}
            title="Fill CRC-valid demo BR Code"
          >
            Sample BR Code
          </button>
        </div>
        <div className="input-row">
          <input
            type="text"
            placeholder="Payer account (0.0.XXXXX)"
            value={payPayerAccountId}
            onChange={(e) => setPayPayerAccountId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Amount BRL (e.g. 1.00 for approve, 999.00 for RECUSA)"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          <input
            type="text"
            placeholder="Mandate ID (auto-filled from Step 1)"
            value={payMandateId}
            onChange={(e) => setPayMandateId(e.target.value)}
          />
        </div>
        <button
          className="btn-pay"
          onClick={() => { void handlePay(); }}
          disabled={paying || !payBrCode || !payPayerAccountId || !payAmount || !payMandateId}
        >
          {paying ? "Processing Hedera Ledger Check…" : "▶ Execute Pix Payment"}
        </button>

        {payError && <p className="error" style={{ marginTop: "0.75rem" }}>{payError}</p>}

        {payResult && (
          <div className={`decision-box decision-${payResult.decision}`}>
            <div className="decision-header">
              <span className={`badge badge-${payResult.decision}`}>
                {payResult.decision.toUpperCase()}
              </span>
              <span className="decision-reason">{payResult.reason}</span>
            </div>
            <div className="decision-meta">
              {payResult.payeePixKey && (
                <span className="dim">Payee Key: <span className="mono">{payResult.payeePixKey}</span></span>
              )}
              {payResult.endToEndId && (
                <span className="dim">Pix E2E ID: <span className="mono">{payResult.endToEndId}</span></span>
              )}
              {payResult.hcsSequenceNumber && (
                <span className="dim">HCS Audit Sequence: #{payResult.hcsSequenceNumber}</span>
              )}
              {payResult.hashscanUrl && (
                <a href={payResult.hashscanUrl} target="_blank" rel="noreferrer">
                  View Topic on HashScan ↗
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── STEP 3: Mandate Lookup ──────────────────────────────────────── */}
      <div className="card">
        <h2>
          <span className="step-num">3</span>
          Mandate Lookup <span className="endpoint">GET /mandates/:id</span>
        </h2>
        <div className="input-row">
          <input
            type="text"
            placeholder="Paste Mandate ID"
            value={mandateId}
            onChange={(e) => setMandateId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void lookupMandate()}
          />
          <button onClick={() => { void lookupMandate(); }} disabled={loadingMandate || !mandateId.trim()}>
            {loadingMandate ? "Loading…" : "Look Up Mandate"}
          </button>
        </div>

        {mandateError && <p className="error">{mandateError}</p>}

        {mandate && (
          <div style={{ marginTop: "0.75rem" }}>
            <div className="field"><label>Status</label><span><span className={`badge badge-${mandate.status}`}>{mandate.status.toUpperCase()}</span></span></div>
            <div className="field"><label>Payee Pix Key</label><span className="mono">{mandate.payeePixKey}</span></div>
            <div className="field"><label>Payer Account</label><span className="mono">{mandate.payerAccountId}</span></div>
            <div className="field"><label>Max Amount</label><span>{mandate.maxAmount} BRL</span></div>
            <div className="field"><label>Created At</label><span>{new Date(mandate.createdAt).toLocaleString()}</span></div>
          </div>
        )}

        {!mandate && !mandateError && !loadingMandate && (
          <p className="empty">Enter a mandate ID above to view its on-chain status.</p>
        )}
      </div>

      {/* ── STEP 4: HCS Audit Trail ─────────────────────────────────────── */}
      <div className="card">
        <h2>
          <span>HCS Audit Trail (Hedera Consensus Service)</span>
          <span className="dim" style={{ fontWeight: 400, fontSize: "0.8rem", marginLeft: "auto" }}>
            <span className="pulse-dot"></span>
            {lastHcsRefresh ? `updated ${lastHcsRefresh.toLocaleTimeString()}` : "loading…"}
          </span>
          <button
            onClick={() => { void refreshHcs(); }}
            disabled={loadingHcs}
            className="btn-secondary"
            style={{ marginLeft: "0.75rem" }}
          >
            {loadingHcs ? "…" : "Refresh Feed"}
          </button>
        </h2>

        {hcsError && <p className="error">{hcsError}</p>}

        {!hcsError && hcsEntries.length === 0 && !loadingHcs && (
          <p className="empty">No HCS audit records retrieved yet. Execute a payment to see live consensus entries.</p>
        )}

        {hcsEntries.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Seq #</th>
                  <th>Consensus Time</th>
                  <th>Event Summary</th>
                  <th>HashScan</th>
                </tr>
              </thead>
              <tbody>
                {hcsEntries.map((entry) => (
                  <tr key={entry.sequenceNumber}>
                    <td className="mono" style={{ fontWeight: 700 }}>#{entry.sequenceNumber}</td>
                    <td className="dim">
                      {new Date(
                        Number(entry.consensusTimestamp.replace(".", "").slice(0, 13))
                      ).toLocaleTimeString()}
                    </td>
                    <td style={{ maxWidth: "420px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {parseHcsMessage(entry.message)}
                    </td>
                    <td>
                      <a href={entry.hashScanUrl} target="_blank" rel="noreferrer">
                        View ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
