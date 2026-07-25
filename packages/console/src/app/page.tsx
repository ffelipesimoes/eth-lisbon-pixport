"use client";

import { useState, useEffect, useCallback } from "react";
import type { MandateStatus, HcsEntry, PayResult } from "../lib/api";
import { fetchMandateStatus, fetchHcsAudit, createMandate, executePay } from "../lib/api";
import type { Language } from "../lib/i18n";
import { translations } from "../lib/i18n";

const DEMO_BRCODE =
  "00020126400014BR.GOV.BCB.PIX0118teste@pixport.demo52040000530398654041.005802BR5912PIXPORT Demo6006Lisboa62070503***630462EF";
const DEMO_PIX_KEY = "teste@pixport.demo";
const DEMO_PAYER = "0.0.9743531";
const HCS_TOPIC_ID = "0.0.9742958";

export type WorldLevel = "orb" | "device" | "none";

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
  // ── i18n Language State ──────────────────────────────────────────────────
  const [lang, setLang] = useState<Language>("pt");
  const t = translations[lang];

  // ── Wizard Step State ────────────────────────────────────────────────────
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

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

  // ── Reset Helpers ────────────────────────────────────────────────────────
  const handleClearStep2 = useCallback(() => {
    setNewPayeePixKey("");
    setNewPayerAccountId("");
    setNewMaxAmount("");
    setNewMemo("");
    setCreatedMandate(null);
    setCreateError(null);
  }, []);

  const handleClearStep3 = useCallback(() => {
    setPayBrCode("");
    setPayAmount("");
    setPayResult(null);
    setPayError(null);
  }, []);

  const handleResetAll = useCallback(() => {
    handleClearStep2();
    handleClearStep3();
    setPayMandateId("");
    setPayPayerAccountId("");
    setMandateId("");
    setMandate(null);
    setMandateError(null);
    setSelectedWorldLevel("orb");
    setActiveStep(1);
  }, [handleClearStep2, handleClearStep3]);

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
      setActiveStep(3);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }, [newPayeePixKey, newPayerAccountId, newMaxAmount, newMemo, selectedWorldLevel]);

  const handlePay = useCallback(async () => {
    if (!payBrCode || !payPayerAccountId || !payAmount || !payMandateId) return;

    if (selectedWorldLevel === "none") {
      setPayError(lang === "pt" ? "Verificação World ID falhou: Identidade não verificada (ZERO Tier) não pode executar pagamentos Pix." : "World Identity Check failed: Unverified identity (ZERO Tier) cannot execute Pix payments.");
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
  }, [payBrCode, payPayerAccountId, payAmount, payMandateId, selectedWorldLevel, lang, refreshHcs]);

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
      {/* ── Header Branding & i18n Switcher ──────────────────────────────── */}
      <header>
        <div className="header-top">
          <h1 className="brand-title">
            <span>⚡ {t.headerTitle}</span>
            <span className="dim" style={{ fontSize: "1rem", fontWeight: 400 }}>Wizard</span>
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              className="btn-secondary"
              onClick={handleResetAll}
              title={t.btnResetWizard}
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem" }}
            >
              {t.btnResetWizard}
            </button>

            <div className="header-tags">
              <span className="tag-pill tag-hedera">{t.tagHedera}</span>
              <span className="tag-pill tag-solidity">{t.tagSolidity}</span>
              <span className="tag-pill tag-world">{t.tagWorld}</span>
            </div>

            {/* Language Switcher */}
            <div className="lang-switcher">
              <button
                className={`lang-btn ${lang === "pt" ? "active" : ""}`}
                onClick={() => setLang("pt")}
              >
                🇵🇹 PT
              </button>
              <button
                className={`lang-btn ${lang === "en" ? "active" : ""}`}
                onClick={() => setLang("en")}
              >
                🇬🇧 EN
              </button>
            </div>
          </div>
        </div>
        <p className="header-subtitle">{t.headerDesc}</p>
      </header>

      {/* ── Gateway Health Alert ───────────────────────────────────────── */}
      {gatewayOffline && (
        <div className="card" style={{ borderColor: "#f59e0b", background: "rgba(245, 158, 11, 0.1)" }}>
          <p style={{ color: "#fbbf24", fontWeight: 700, fontSize: "0.95rem" }}>
            ⚠️ {t.gatewayOffline}
          </p>
          <p style={{ color: "#cbd5e1", fontSize: "0.85rem", marginTop: "0.3rem" }}>
            {t.gatewayOfflineDesc}
          </p>
        </div>
      )}

      {/* ── Wizard Stepper Bar (Interactive 4-Step Timeline) ───────────── */}
      <div className="wizard-stepper">
        <div
          className={`step-tab ${activeStep === 1 ? "active" : ""} ${activeStep > 1 ? "completed" : ""}`}
          onClick={() => setActiveStep(1)}
        >
          <div className="step-icon">{activeStep > 1 ? "✓" : "1"}</div>
          <div className="step-info">
            <div className="step-title">{t.step1Title}</div>
            <div className="step-sub">{t.step1Sub}</div>
          </div>
        </div>

        <div
          className={`step-tab ${activeStep === 2 ? "active" : ""} ${activeStep > 2 ? "completed" : ""}`}
          onClick={() => setActiveStep(2)}
        >
          <div className="step-icon">{activeStep > 2 ? "✓" : "2"}</div>
          <div className="step-info">
            <div className="step-title">{t.step2Title}</div>
            <div className="step-sub">{t.step2Sub}</div>
          </div>
        </div>

        <div
          className={`step-tab ${activeStep === 3 ? "active" : ""} ${activeStep > 3 ? "completed" : ""}`}
          onClick={() => setActiveStep(3)}
        >
          <div className="step-icon">{activeStep > 3 ? "✓" : "3"}</div>
          <div className="step-info">
            <div className="step-title">{t.step3Title}</div>
            <div className="step-sub">{t.step3Sub}</div>
          </div>
        </div>

        <div
          className={`step-tab ${activeStep === 4 ? "active" : ""}`}
          onClick={() => setActiveStep(4)}
        >
          <div className="step-icon">4</div>
          <div className="step-info">
            <div className="step-title">{t.step4Title}</div>
            <div className="step-sub">{t.step4Sub}</div>
          </div>
        </div>
      </div>

      {/* ── STEP 1: World Identity Check (Beta) ─────────────────────────── */}
      {activeStep === 1 && (
        <div className="card">
          <h2>
            <span className="step-num">1</span>
            {t.worldPanelTitle}
          </h2>

          <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "1rem" }}>
            {t.worldDesc}
          </p>

          <div className="world-tier-grid">
            <div
              className={`world-tier-card ${selectedWorldLevel === "orb" ? "selected-orb" : ""}`}
              onClick={() => setSelectedWorldLevel("orb")}
            >
              <div className="tier-name" style={{ color: "#34d399" }}>
                <span>{t.orbTitle}</span>
                <span className="badge badge-approved">{t.orbBadge}</span>
              </div>
              <div className="tier-limit">{t.orbSpend}</div>
              <div className="tier-desc">{t.orbDesc}</div>
            </div>

            <div
              className={`world-tier-card ${selectedWorldLevel === "device" ? "selected-device" : ""}`}
              onClick={() => setSelectedWorldLevel("device")}
            >
              <div className="tier-name" style={{ color: "#fbbf24" }}>
                <span>{t.deviceTitle}</span>
                <span className="badge badge-pending">{t.deviceBadge}</span>
              </div>
              <div className="tier-limit">{t.deviceSpend}</div>
              <div className="tier-desc">{t.deviceDesc}</div>
            </div>

            <div
              className={`world-tier-card ${selectedWorldLevel === "none" ? "selected-none" : ""}`}
              onClick={() => setSelectedWorldLevel("none")}
            >
              <div className="tier-name" style={{ color: "#f87171" }}>
                <span>{t.noneTitle}</span>
                <span className="badge badge-rejected">{t.noneBadge}</span>
              </div>
              <div className="tier-limit">{t.noneSpend}</div>
              <div className="tier-desc">{t.noneDesc}</div>
            </div>
          </div>

          <div style={{ marginTop: "1.25rem", padding: "0.55rem 0.85rem", background: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: "8px", fontSize: "0.78rem", color: "#f0abfc", fontWeight: 600 }}>
            {t.step1Badge}
          </div>

          <div className="wizard-nav">
            <span className="dim" style={{ fontSize: "0.8rem" }}>
              {lang === "pt" ? "Nível de identidade selecionado: " : "Selected identity level: "}
              <strong style={{ color: "#f0abfc" }}>{selectedWorldLevel.toUpperCase()}</strong>
            </span>
            <button onClick={() => setActiveStep(2)}>
              {t.btnNextStep2}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Create Mandate / Policy ────────────────────────────── */}
      {activeStep === 2 && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>
              <span className="step-num">2</span>
              {t.mandateTitle} <span className="endpoint">POST /mandates</span>
            </h2>
            <button
              className="btn-secondary"
              onClick={handleClearStep2}
              title={t.btnClearFields}
              style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
            >
              {t.btnClearFields}
            </button>
          </div>

          <div style={{ marginBottom: "1rem", fontSize: "0.82rem", color: "#a78bfa" }}>
            {t.linkedWorldTier} <span className="mono" style={{ fontWeight: 700, color: "#f0abfc" }}>{selectedWorldLevel.toUpperCase()} ({selectedWorldLevel === "orb" ? "HIGH Tier 10k" : selectedWorldLevel === "device" ? "MEDIUM Tier 1k" : "ZERO Tier 0"})</span>
          </div>

          <div className="input-row">
            <input
              type="text"
              placeholder={t.payeeKeyPlaceholder}
              value={newPayeePixKey}
              onChange={(e) => setNewPayeePixKey(e.target.value)}
            />
            <button
              className="btn-secondary"
              onClick={() => setNewPayeePixKey(DEMO_PIX_KEY)}
              title="Use demo Pix key"
            >
              {t.btnDemoKey}
            </button>
          </div>

          <div className="input-row">
            <input
              type="text"
              placeholder={t.payerAccountPlaceholder}
              value={newPayerAccountId}
              onChange={(e) => setNewPayerAccountId(e.target.value)}
            />
            <button
              className="btn-secondary"
              onClick={() => setNewPayerAccountId(DEMO_PAYER)}
              title="Use spender account"
            >
              {t.btnDemoAccount}
            </button>
          </div>

          <div className="input-row">
            <input
              type="text"
              placeholder={t.maxAmountPlaceholder}
              value={newMaxAmount}
              onChange={(e) => setNewMaxAmount(e.target.value)}
            />
            <input
              type="text"
              placeholder={t.memoPlaceholder}
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
            />
            <button
              onClick={() => { void handleCreateMandate(); }}
              disabled={creating || !newPayeePixKey || !newPayerAccountId || !newMaxAmount}
            >
              {creating ? t.btnCreating : t.btnCreateMandate}
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

          <div style={{ marginTop: "1.25rem", padding: "0.55rem 0.85rem", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "8px", fontSize: "0.78rem", color: "#93c5fd", fontWeight: 600 }}>
            {t.step2Badge}
          </div>

          <div className="wizard-nav">
            <button className="btn-secondary" onClick={() => setActiveStep(1)}>
              {t.btnPrev}
            </button>
            <button onClick={() => setActiveStep(3)}>
              {t.btnNextStep3}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Execute Payment ────────────────────────────────────── */}
      {activeStep === 3 && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>
              <span className="step-num">3</span>
              {t.payTitle} <span className="endpoint">POST /pay</span>
            </h2>
            <button
              className="btn-secondary"
              onClick={handleClearStep3}
              title={t.btnClearFields}
              style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
            >
              {t.btnClearFields}
            </button>
          </div>

          <div className="input-row">
            <input
              type="text"
              className="mono-input"
              placeholder={t.brCodePlaceholder}
              value={payBrCode}
              onChange={(e) => setPayBrCode(e.target.value)}
            />
            <button
              className="btn-secondary"
              onClick={() => setPayBrCode(DEMO_BRCODE)}
              title="Fill CRC-valid demo BR Code"
            >
              {t.btnSampleBrCode}
            </button>
          </div>

          <div className="input-row">
            <input
              type="text"
              placeholder={t.payerAccountPlaceholder}
              value={payPayerAccountId}
              onChange={(e) => setPayPayerAccountId(e.target.value)}
            />
            <input
              type="text"
              placeholder={t.amountPlaceholder}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <input
              type="text"
              placeholder={t.mandateIdPlaceholder}
              value={payMandateId}
              onChange={(e) => setPayMandateId(e.target.value)}
            />
          </div>

          <button
            className="btn-pay"
            onClick={() => { void handlePay(); }}
            disabled={paying || !payBrCode || !payPayerAccountId || !payAmount || !payMandateId}
          >
            {paying ? t.btnProcessingPay : t.btnExecutePay}
          </button>

          {payError && <p className="error" style={{ marginTop: "0.75rem" }}>{payError}</p>}

          {payResult && (
            <div className={`decision-box decision-${payResult.decision}`}>
              <div className="decision-header">
                <span className={`badge badge-${payResult.decision}`}>
                  {payResult.decision === "approved" ? t.decisionApproved : t.decisionRejected}
                </span>
                <span className="decision-reason">{payResult.reason}</span>
              </div>
              <div className="decision-meta">
                {payResult.payeePixKey && (
                  <span className="dim">{t.payeeKeyLabel} <span className="mono">{payResult.payeePixKey}</span></span>
                )}
                {payResult.endToEndId && (
                  <span className="dim">{t.e2eIdLabel} <span className="mono">{payResult.endToEndId}</span></span>
                )}
                {payResult.hcsSequenceNumber && (
                  <span className="dim">{t.hcsSeqLabel} #{payResult.hcsSequenceNumber}</span>
                )}
                {payResult.hashscanUrl && (
                  <a href={payResult.hashscanUrl} target="_blank" rel="noreferrer">
                    {t.viewHashscan}
                  </a>
                )}
              </div>
            </div>
          )}

          <div style={{ marginTop: "1.25rem", padding: "0.55rem 0.85rem", background: "rgba(52, 211, 153, 0.1)", border: "1px solid rgba(52, 211, 153, 0.3)", borderRadius: "8px", fontSize: "0.78rem", color: "#6ee7b7", fontWeight: 600 }}>
            {t.step3Badge}
          </div>

          <div className="wizard-nav">
            <button className="btn-secondary" onClick={() => setActiveStep(2)}>
              {t.btnPrev}
            </button>
            <button onClick={() => setActiveStep(4)}>
              {t.btnNextStep4}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: HCS Audit Trail & Mandate Lookup ───────────────────── */}
      {activeStep === 4 && (
        <>
          {/* HCS Audit Trail */}
          <div className="card">
            <h2>
              <span>{t.auditTitle}</span>
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
                {loadingHcs ? "…" : t.btnRefreshFeed}
              </button>
            </h2>

            {hcsError && <p className="error">{hcsError}</p>}

            {!hcsError && hcsEntries.length === 0 && !loadingHcs && (
              <p className="empty">{t.noAuditRecords}</p>
            )}

            {hcsEntries.length > 0 && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>{t.seqHeader}</th>
                      <th>{t.timeHeader}</th>
                      <th>{t.eventHeader}</th>
                      <th>{t.hashscanHeader}</th>
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

            <div style={{ marginTop: "1.25rem", padding: "0.55rem 0.85rem", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "8px", fontSize: "0.78rem", color: "#fde047", fontWeight: 600 }}>
              {t.step4Badge}
            </div>
          </div>

          {/* Mandate Lookup Utility */}
          <div className="card">
            <h2>
              {t.lookupTitle} <span className="endpoint">GET /mandates/:id</span>
            </h2>
            <div className="input-row">
              <input
                type="text"
                placeholder={t.mandateIdPlaceholder}
                value={mandateId}
                onChange={(e) => setMandateId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void lookupMandate()}
              />
              <button onClick={() => { void lookupMandate(); }} disabled={loadingMandate || !mandateId.trim()}>
                {loadingMandate ? t.lookupLoading : t.lookupBtn}
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
          </div>

          <div className="wizard-nav" style={{ marginTop: "0.5rem" }}>
            <button className="btn-secondary" onClick={() => setActiveStep(3)}>
              {t.btnPrev}
            </button>
            <button onClick={handleResetAll}>
              {t.btnResetWizard}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
