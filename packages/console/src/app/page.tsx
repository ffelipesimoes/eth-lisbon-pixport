"use client";

import { useState, useEffect, useCallback } from "react";
import type { MandateStatus, HcsEntry, PayResult } from "../lib/api";
import { fetchMandateStatus, fetchHcsAudit, createMandate, executePay } from "../lib/api";

// Sample BR Code from BACEN spec — Pix key: 123e4567-e12b-12d1-a456-426655440000
const DEMO_BRCODE =
  "00020126580014BR.GOV.BCB.PIX0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304F01B";
const DEMO_PIX_KEY = "123e4567-e12b-12d1-a456-426655440000";
const DEMO_PAYER = "0.0.9742864";
const HCS_TOPIC_ID = "0.0.9742958";

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
  // ── Create Mandate ───────────────────────────────────────────────────────
  const [newPayeePixKey, setNewPayeePixKey] = useState("");
  const [newPayerAccountId, setNewPayerAccountId] = useState("");
  const [newMaxAmount, setNewMaxAmount] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [createdMandate, setCreatedMandate] = useState<MandateStatus | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // ── Execute Pay ──────────────────────────────────────────────────────────
  const [payBrCode, setPayBrCode] = useState("");
  const [payPayerAccountId, setPayPayerAccountId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMandateId, setPayMandateId] = useState("");
  const [payResult, setPayResult] = useState<PayResult | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  // ── Mandate lookup ───────────────────────────────────────────────────────
  const [mandateId, setMandateId] = useState("");
  const [mandate, setMandate] = useState<MandateStatus | null>(null);
  const [mandateError, setMandateError] = useState<string | null>(null);
  const [loadingMandate, setLoadingMandate] = useState(false);

  // ── Gateway health ───────────────────────────────────────────────────────
  const [gatewayOffline, setGatewayOffline] = useState(false);

  // ── HCS audit ────────────────────────────────────────────────────────────
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

  // Initial load + auto-poll every 10 s
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
        memo: newMemo || undefined,
      });
      setCreatedMandate(data);
      // Auto-fill pay section
      setPayMandateId(data.mandateId);
      setPayPayerAccountId(newPayerAccountId);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }, [newPayeePixKey, newPayerAccountId, newMaxAmount, newMemo]);

  const handlePay = useCallback(async () => {
    if (!payBrCode || !payPayerAccountId || !payAmount || !payMandateId) return;
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
      // Refresh HCS audit 2 s after pay to capture the new record
      setTimeout(() => { void refreshHcs(); }, 2_000);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPaying(false);
    }
  }, [payBrCode, payPayerAccountId, payAmount, payMandateId, refreshHcs]);

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

  return (
    <div className="container">
      <header>
        <h1>PIXPORT Console</h1>
        <p>Hedera mandate layer for Pix payments — Testnet · HCS topic {HCS_TOPIC_ID}</p>
      </header>

      {gatewayOffline && (
        <div className="card" style={{ borderColor: "#f59e0b", background: "#1c1007" }}>
          <p style={{ color: "#f59e0b", fontWeight: 600 }}>
            ⚠ Gateway offline
          </p>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.4rem" }}>
            Run <code style={{ color: "#fbbf24" }}>npm run demo</code> in the project root to start the gateway on port 3001.
            The console will reconnect automatically.
          </p>
        </div>
      )}

      {/* ── STEP 1: Create Mandate ─────────────────────────────────────── */}
      <div className="card">
        <h2>
          <span className="step-num">1</span>
          Create Mandate <span className="endpoint">POST /mandates</span>
        </h2>
        <div className="input-row">
          <input
            type="text"
            placeholder="Payee Pix key"
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
            title="Use treasury account"
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
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
        {createError && <p className="error">{createError}</p>}
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
          Execute Payment <span className="endpoint">POST /pay</span>
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
            title="Fill demo BR Code (Pix key: 123e4567-...)"
          >
            Sample
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
            placeholder="Amount BRL (e.g. 50.00)"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          <input
            type="text"
            placeholder="Mandate ID (auto-fills from Step 1)"
            value={payMandateId}
            onChange={(e) => setPayMandateId(e.target.value)}
          />
        </div>
        <button
          className="btn-pay"
          onClick={() => { void handlePay(); }}
          disabled={paying || !payBrCode || !payPayerAccountId || !payAmount || !payMandateId}
        >
          {paying ? "Processing…" : "▶ Pay"}
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
                <span className="dim">Payee: {payResult.payeePixKey}</span>
              )}
              {payResult.endToEndId && (
                <span className="dim">E2E: <span className="mono">{payResult.endToEndId}</span></span>
              )}
              {payResult.hcsSequenceNumber && (
                <span className="dim">HCS #{payResult.hcsSequenceNumber}</span>
              )}
              {payResult.hashscanUrl && (
                <a href={payResult.hashscanUrl} target="_blank" rel="noreferrer">
                  View on HashScan ↗
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Mandate Lookup (utility) ──────────────────────────────────── */}
      <div className="card">
        <h2>Mandate Status <span className="endpoint">GET /mandates/:id</span></h2>
        <div className="input-row">
          <input
            type="text"
            placeholder="Mandate ID"
            value={mandateId}
            onChange={(e) => setMandateId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void lookupMandate()}
          />
          <button onClick={() => { void lookupMandate(); }} disabled={loadingMandate || !mandateId.trim()}>
            {loadingMandate ? "Loading…" : "Look up"}
          </button>
        </div>
        {mandateError && <p className="error">{mandateError}</p>}
        {mandate && (
          <>
            <div className="field"><label>Status</label><span><span className={`badge badge-${mandate.status}`}>{mandate.status.toUpperCase()}</span></span></div>
            <div className="field"><label>Payee Pix Key</label><span>{mandate.payeePixKey}</span></div>
            <div className="field"><label>Payer Account</label><span>{mandate.payerAccountId}</span></div>
            <div className="field"><label>Max Amount (BRL)</label><span>{mandate.maxAmount}</span></div>
            <div className="field"><label>Created At</label><span>{new Date(mandate.createdAt).toLocaleString()}</span></div>
          </>
        )}
        {!mandate && !mandateError && !loadingMandate && (
          <p className="empty">Enter a mandate ID above to check its status.</p>
        )}
      </div>

      {/* ── HCS Audit Trail ──────────────────────────────────────────── */}
      <div className="card">
        <h2>
          HCS Audit Trail
          <span className="dim" style={{ fontWeight: 400, fontSize: "0.8rem", marginLeft: "0.5rem" }}>
            {lastHcsRefresh ? `updated ${lastHcsRefresh.toLocaleTimeString()}` : "loading…"}
          </span>
          <button
            onClick={() => { void refreshHcs(); }}
            disabled={loadingHcs}
            style={{ marginLeft: "0.75rem", padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
          >
            {loadingHcs ? "…" : "Refresh"}
          </button>
        </h2>
        {hcsError && <p className="error">{hcsError}</p>}
        {!hcsError && hcsEntries.length === 0 && !loadingHcs && (
          <p className="empty">No HCS records yet — execute a payment to see the audit trail.</p>
        )}
        {hcsEntries.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Consensus Time</th>
                <th>Event</th>
                <th>HashScan</th>
              </tr>
            </thead>
            <tbody>
              {hcsEntries.map((entry) => (
                <tr key={entry.sequenceNumber}>
                  <td>{entry.sequenceNumber}</td>
                  <td>{new Date(
                    Number(entry.consensusTimestamp.replace(".", "").slice(0, 13))
                  ).toLocaleTimeString()}</td>
                  <td style={{ maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
        )}
      </div>
    </div>
  );
}
