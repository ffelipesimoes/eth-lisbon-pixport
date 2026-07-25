"use client";

import { useState, useEffect, useCallback } from "react";
import type { MandateStatus, HcsEntry, PayResult } from "@/lib/api";
import { fetchMandateStatus, fetchHcsAudit, createMandate, executePay } from "@/lib/api";

export default function ConsolePage() {
  // ── Mandate lookup ───────────────────────────────────────────────────────
  const [mandateId, setMandateId] = useState("");
  const [mandate, setMandate] = useState<MandateStatus | null>(null);
  const [mandateError, setMandateError] = useState<string | null>(null);
  const [loadingMandate, setLoadingMandate] = useState(false);

  // ── Mandate creation ─────────────────────────────────────────────────────
  const [newPayeePixKey, setNewPayeePixKey] = useState("");
  const [newPayerAccountId, setNewPayerAccountId] = useState("");
  const [newMaxAmount, setNewMaxAmount] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [createdMandate, setCreatedMandate] = useState<MandateStatus | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // ── Pay ──────────────────────────────────────────────────────────────────
  const [payBrCode, setPayBrCode] = useState("");
  const [payPayerAccountId, setPayPayerAccountId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMandateId, setPayMandateId] = useState("");
  const [payResult, setPayResult] = useState<PayResult | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  // ── HCS audit ────────────────────────────────────────────────────────────
  const [hcsEntries, setHcsEntries] = useState<HcsEntry[]>([]);
  const [hcsError, setHcsError] = useState<string | null>(null);
  const [loadingHcs, setLoadingHcs] = useState(false);

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
      // Refresh HCS audit after a pay attempt
      setTimeout(refreshHcs, 2000);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPaying(false);
    }
  }, [payBrCode, payPayerAccountId, payAmount, payMandateId]);

  const refreshHcs = useCallback(async () => {
    setLoadingHcs(true);
    setHcsError(null);
    try {
      const data = await fetchHcsAudit(10);
      setHcsEntries(data);
    } catch (err) {
      setHcsError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingHcs(false);
    }
  }, []);

  useEffect(() => {
    refreshHcs();
  }, [refreshHcs]);

  return (
    <div className="container">
      <header>
        <h1>PIXPORT Console</h1>
        <p>Hedera mandate layer for Pix payments — Testnet</p>
      </header>

      {/* ── Create Mandate ──────────────────────────────────────────────── */}
      <div className="card">
        <h2>Create Mandate (POST /mandates)</h2>
        <div className="input-row">
          <input type="text" placeholder="Payee Pix key" value={newPayeePixKey} onChange={(e) => setNewPayeePixKey(e.target.value)} />
          <input type="text" placeholder="Payer Hedera account (0.0.XXXXX)" value={newPayerAccountId} onChange={(e) => setNewPayerAccountId(e.target.value)} />
        </div>
        <div className="input-row">
          <input type="text" placeholder="Max amount BRL (e.g. 100.00)" value={newMaxAmount} onChange={(e) => setNewMaxAmount(e.target.value)} />
          <input type="text" placeholder="Memo (optional)" value={newMemo} onChange={(e) => setNewMemo(e.target.value)} />
          <button onClick={handleCreateMandate} disabled={creating || !newPayeePixKey || !newPayerAccountId || !newMaxAmount}>
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
        {createError && <p className="error">{createError}</p>}
        {createdMandate && (
          <div>
            <div className="field"><label>Mandate ID</label><span style={{fontFamily:"monospace"}}>{createdMandate.mandateId}</span></div>
            <div className="field"><label>Status</label><span><span className={`badge badge-${createdMandate.status}`}>{createdMandate.status.toUpperCase()}</span></span></div>
            <div className="field"><label>Payee Pix Key</label><span>{createdMandate.payeePixKey}</span></div>
            {createdMandate.hcsSequenceNumber && (
              <div className="field"><label>HCS #</label><span>{createdMandate.hcsSequenceNumber}</span></div>
            )}
          </div>
        )}
      </div>

      {/* ── Execute Payment ─────────────────────────────────────────────── */}
      <div className="card">
        <h2>Execute Payment (POST /pay)</h2>
        <div className="input-row">
          <input type="text" placeholder="BR Code (EMV QR string)" value={payBrCode} onChange={(e) => setPayBrCode(e.target.value)} style={{fontFamily:"monospace",fontSize:"0.75rem"}} />
        </div>
        <div className="input-row">
          <input type="text" placeholder="Payer account (0.0.XXXXX)" value={payPayerAccountId} onChange={(e) => setPayPayerAccountId(e.target.value)} />
          <input type="text" placeholder="Amount BRL (e.g. 50.00)" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          <input type="text" placeholder="Mandate ID" value={payMandateId} onChange={(e) => setPayMandateId(e.target.value)} />
          <button onClick={handlePay} disabled={paying || !payBrCode || !payPayerAccountId || !payAmount || !payMandateId}>
            {paying ? "Paying…" : "Pay"}
          </button>
        </div>
        {payError && <p className="error">{payError}</p>}
        {payResult && (
          <div>
            <div className="field">
              <label>Decision</label>
              <span>
                <span className={`badge badge-${payResult.decision === "approved" ? "approved" : "rejected"}`}>
                  {payResult.decision.toUpperCase()}
                </span>
              </span>
            </div>
            <div className="field"><label>Reason</label><span>{payResult.reason}</span></div>
            {payResult.endToEndId && <div className="field"><label>E2E ID</label><span style={{fontFamily:"monospace"}}>{payResult.endToEndId}</span></div>}
            {payResult.hcsSequenceNumber && <div className="field"><label>HCS #</label><span>{payResult.hcsSequenceNumber}</span></div>}
            {payResult.hashscanUrl && (
              <div className="field">
                <label>HashScan</label>
                <span><a href={payResult.hashscanUrl} target="_blank" rel="noreferrer">View topic ↗</a></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Mandate lookup ──────────────────────────────────────────────── */}
      <div className="card">
        <h2>Mandate Status (GET /mandates/:id)</h2>
        <div className="input-row">
          <input type="text" placeholder="Mandate ID" value={mandateId} onChange={(e) => setMandateId(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookupMandate()} />
          <button onClick={lookupMandate} disabled={loadingMandate || !mandateId.trim()}>
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
            {mandate.hcsTopicId && <div className="field"><label>HCS Topic</label><span>{mandate.hcsTopicId}</span></div>}
            <div className="field"><label>Created At</label><span>{new Date(mandate.createdAt).toLocaleString()}</span></div>
          </>
        )}
        {!mandate && !mandateError && !loadingMandate && (
          <p className="empty">Enter a mandate ID above to check its status.</p>
        )}
      </div>

      {/* ── HCS audit trail ─────────────────────────────────────────────── */}
      <div className="card">
        <h2>
          HCS Audit Trail (topic 0.0.9742958)
          <button onClick={refreshHcs} disabled={loadingHcs} style={{ marginLeft: "0.75rem", padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}>
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
                <th>Timestamp</th>
                <th>Message</th>
                <th>HashScan</th>
              </tr>
            </thead>
            <tbody>
              {hcsEntries.map((entry) => (
                <tr key={entry.sequenceNumber}>
                  <td>{entry.sequenceNumber}</td>
                  <td>{new Date(entry.consensusTimestamp).toLocaleString()}</td>
                  <td style={{maxWidth:"300px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {(() => {
                      try {
                        const parsed = JSON.parse(entry.message) as Record<string, unknown>;
                        return `[${String(parsed.event ?? "?")}] ${parsed.payeePixKey ?? parsed.mandateId ?? ""}`;
                      } catch {
                        return entry.message.slice(0, 80);
                      }
                    })()}
                  </td>
                  <td><a href={entry.hashScanUrl} target="_blank" rel="noreferrer">View ↗</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
