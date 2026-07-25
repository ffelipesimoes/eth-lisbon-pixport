"use client";

import { useState, useEffect, useCallback } from "react";
import type { MandateStatus, HcsEntry } from "@/lib/api";
import { fetchMandateStatus, fetchHcsAudit } from "@/lib/api";

export default function ConsolePage() {
  const [mandateId, setMandateId] = useState("");
  const [mandate, setMandate] = useState<MandateStatus | null>(null);
  const [mandateError, setMandateError] = useState<string | null>(null);
  const [loadingMandate, setLoadingMandate] = useState(false);

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

      {/* Mandate lookup */}
      <div className="card">
        <h2>Mandate Status</h2>
        <div className="input-row">
          <input
            type="text"
            placeholder="Mandate ID"
            value={mandateId}
            onChange={(e) => setMandateId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookupMandate()}
          />
          <button onClick={lookupMandate} disabled={loadingMandate || !mandateId.trim()}>
            {loadingMandate ? "Loading…" : "Look up"}
          </button>
        </div>

        {mandateError && <p className="error">{mandateError}</p>}

        {mandate && (
          <>
            <div className="field">
              <label>Status</label>
              <span>
                <span className={`badge badge-${mandate.status}`}>
                  {mandate.status.toUpperCase()}
                </span>
              </span>
            </div>
            <div className="field">
              <label>Payee Pix Key</label>
              <span>{mandate.payeePixKey}</span>
            </div>
            <div className="field">
              <label>Payer Account</label>
              <span>{mandate.payerAccountId}</span>
            </div>
            <div className="field">
              <label>Max Amount (BRL)</label>
              <span>{mandate.maxAmount}</span>
            </div>
            {mandate.hcsTopicId && (
              <div className="field">
                <label>HCS Topic</label>
                <span>{mandate.hcsTopicId}</span>
              </div>
            )}
            <div className="field">
              <label>Created At</label>
              <span>{new Date(mandate.createdAt).toLocaleString()}</span>
            </div>
          </>
        )}

        {!mandate && !mandateError && !loadingMandate && (
          <p className="empty">Enter a mandate ID above to check its status.</p>
        )}
      </div>

      {/* HCS audit trail */}
      <div className="card">
        <h2>
          HCS Audit Trail
          <button
            onClick={refreshHcs}
            disabled={loadingHcs}
            style={{ marginLeft: "0.75rem", padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
          >
            {loadingHcs ? "…" : "Refresh"}
          </button>
        </h2>

        {hcsError && <p className="error">{hcsError}</p>}

        {!hcsError && hcsEntries.length === 0 && !loadingHcs && (
          <p className="empty">No HCS records yet. Gateway integration comes in Block 2.</p>
        )}

        {hcsEntries.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Topic</th>
                <th>Timestamp</th>
                <th>Message</th>
                <th>HashScan</th>
              </tr>
            </thead>
            <tbody>
              {hcsEntries.map((entry) => (
                <tr key={entry.sequenceNumber}>
                  <td>{entry.sequenceNumber}</td>
                  <td>{entry.topicId}</td>
                  <td>{new Date(entry.consensusTimestamp).toLocaleString()}</td>
                  <td>{entry.message}</td>
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
