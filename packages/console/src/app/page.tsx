"use client";

import { useState, useEffect, useCallback } from "react";
import { IDKitWidget, VerificationLevel, type ISuccessResult } from "@worldcoin/idkit";
import type {
  MandateStatus,
  HcsEntry,
  PayResult,
  WorldIdConfig,
  WorldIdVerifyResult,
} from "../lib/api";
import {
  fetchMandateStatus,
  fetchHcsAudit,
  createMandate,
  executePay,
  fetchWorldIdConfig,
  verifyWorldId,
} from "../lib/api";
import type { Language } from "../lib/i18n";
import { translations } from "../lib/i18n";

/**
 * Stage fallback (documented in docs/world-identity-check-test-report.md):
 * NEXT_PUBLIC_SKIP_WORLDID=true turns the tier cards into a pre-applied tier
 * selector — clicking a card submits a mock proof to POST /worldid/verify,
 * which the gateway answers in WORLD_MOCK mode. The demo never depends on
 * World portal / simulator reachability.
 */
const SKIP_WORLDID = process.env.NEXT_PUBLIC_SKIP_WORLDID === "true";

const DEMO_BRCODE =
  "00020126400014BR.GOV.BCB.PIX0118teste@pixport.demo52040000530398654041.005802BR5912PIXPORT Demo6006Lisboa62070503***630462EF";
const DEMO_PIX_KEY = "teste@pixport.demo";
const DEMO_PAYER = "0.0.9743531";

export type WorldLevel = "orb" | "device" | "none";
export type MainView = "overview" | "wizard";

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

  // ── View State (Overview vs Wizard) ──────────────────────────────────────
  const [mainView, setMainView] = useState<MainView>("overview");

  // ── Wizard Step State ────────────────────────────────────────────────────
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // ── World Identity Check state ───────────────────────────────────────────
  const [selectedWorldLevel, setSelectedWorldLevel] = useState<WorldLevel>("orb");
  /** Backend verification result — the ONLY trusted source for the tier cap. */
  const [worldVerify, setWorldVerify] = useState<WorldIdVerifyResult | null>(null);
  const [worldConfig, setWorldConfig] = useState<WorldIdConfig | null>(null);
  const [identityPayer, setIdentityPayer] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

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
    setWorldVerify(null);
    setVerifyError(null);
    setIdentityPayer("");
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

  // Fetch World widget config (app_id/action/mock) from the gateway — single source of truth.
  useEffect(() => {
    fetchWorldIdConfig()
      .then(setWorldConfig)
      .catch(() => setWorldConfig(null)); // gateway-offline banner already covers this
  }, []);

  /**
   * Backend verification — the ONLY source of truth for the tier.
   * The widget's client-side result is never trusted: the proof goes to
   * POST /worldid/verify, which runs verifyCloudProof() against the Cloud API
   * (or trusts the level in WORLD_MOCK stage-fallback mode) and returns the
   * allowance tier. The displayed/selected level follows the server response.
   */
  const runBackendVerify = useCallback(
    async (proof: ISuccessResult, signal: string) => {
      setVerifying(true);
      setVerifyError(null);
      try {
        const data = await verifyWorldId({
          proof: {
            proof: proof.proof,
            merkle_root: proof.merkle_root,
            nullifier_hash: proof.nullifier_hash,
            verification_level: proof.verification_level as "orb" | "device",
          },
          signal,
        });
        setWorldVerify(data);
        setSelectedWorldLevel(data.verified && data.verificationLevel ? data.verificationLevel : "none");
        if (data.verified && signal) {
          // Identity is bound to this payer — carry it into the next steps.
          setNewPayerAccountId(signal);
          setPayPayerAccountId(signal);
          // Pick up the IDENTITY_CHECK record in the audit trail (Step 4).
          setTimeout(() => { void refreshHcs(); }, 2_000);
        }
      } catch (err) {
        setVerifyError(err instanceof Error ? err.message : "Unknown error");
        setWorldVerify(null);
      } finally {
        setVerifying(false);
      }
    },
    [refreshHcs],
  );

  /**
   * Tier-card click. Stage fallback (NEXT_PUBLIC_SKIP_WORLDID=true): the card
   * IS the pre-applied tier selector — a mock proof goes to the backend so the
   * server still resolves the tier. Live mode: client-side pre-selection only,
   * explicitly tagged "not verified" until the IDKit flow runs.
   */
  const handleCardSelect = useCallback(
    (level: WorldLevel) => {
      if (SKIP_WORLDID) {
        if (level === "none") {
          setWorldVerify(null);
          setSelectedWorldLevel("none");
          return;
        }
        if (!identityPayer) {
          setVerifyError(t.worldSignalRequired);
          return;
        }
        const mockProof = {
          proof: "0x0000000000000000000000000000000000000000000000000000000000000000",
          merkle_root: "0x0000000000000000000000000000000000000000000000000000000000000000",
          // Unique per run so mock sessions stay distinguishable in the HCS trail
          nullifier_hash: `0xmock${Date.now().toString(16)}`,
          verification_level: level as VerificationLevel,
        } as ISuccessResult;
        void runBackendVerify(mockProof, identityPayer);
        return;
      }
      // Live mode: pre-selection only — backend verification happens via the widget.
      setSelectedWorldLevel(level);
      setWorldVerify(null);
    },
    [identityPayer, runBackendVerify, t.worldSignalRequired],
  );

  /** True when the requested amount exceeds the backend-verified tier cap. */
  const amountExceedsTierCap = (() => {
    if (!worldVerify?.verified || !payAmount) return false;
    const parsed = parseFloat(payAmount);
    if (isNaN(parsed)) return false;
    try {
      return BigInt(Math.round(parsed * 100)) > BigInt(worldVerify.tier.maxSpendUnits);
    } catch {
      return false;
    }
  })();

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
      setMainView("wizard");
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

    // Backend-verified tier cap enforcement — rejected before the Pix call,
    // same RECUSA pattern as the ZERO-tier path above.
    if (worldVerify?.verified) {
      const parsed = parseFloat(payAmount);
      if (!isNaN(parsed)) {
        try {
          if (BigInt(Math.round(parsed * 100)) > BigInt(worldVerify.tier.maxSpendUnits)) {
            const msg = lang === "pt"
              ? `Valor excede o teto do tier ${worldVerify.tier.name} (R$ ${worldVerify.tier.maxSpendBrl}) verificado pelo backend.`
              : `Amount exceeds the backend-verified ${worldVerify.tier.name} tier cap (R$ ${worldVerify.tier.maxSpendBrl}).`;
            setPayError(msg);
            setPayResult({
              decision: "rejected",
              reason: `TIER_INSUFFICIENT: amount ${payAmount} BRL > ${worldVerify.tier.name} tier cap ${worldVerify.tier.maxSpendBrl} BRL (backend-verified) — rejected before Pix call`,
              decidedAt: new Date().toISOString(),
            });
            return;
          }
        } catch { /* fall through to gateway validation */ }
      }
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
  }, [payBrCode, payPayerAccountId, payAmount, payMandateId, selectedWorldLevel, worldVerify, lang, refreshHcs]);

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
            <span className="dim" style={{ fontSize: "0.95rem", fontWeight: 400 }}>
              {mainView === "overview" ? "Landing & OTC Impact" : "Wizard"}
            </span>
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

      {/* ── View Switcher Bar (Overview vs Wizard) ────────────────────── */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          className={mainView === "overview" ? "" : "btn-secondary"}
          onClick={() => setMainView("overview")}
          style={{ flex: 1, padding: "0.75rem", fontSize: "0.95rem", fontWeight: 700 }}
        >
          {t.navOverview}
        </button>
        <button
          className={mainView === "wizard" ? "" : "btn-secondary"}
          onClick={() => setMainView("wizard")}
          style={{ flex: 1, padding: "0.75rem", fontSize: "0.95rem", fontWeight: 700 }}
        >
          {t.navWizard}
        </button>
      </div>

      {/* ── Gateway Health Alert ───────────────────────────────────────── */}
      {gatewayOffline && (
        <div className="card" style={{ borderColor: "#f59e0b", background: "rgba(245, 158, 11, 0.1)", marginBottom: "1.5rem" }}>
          <p style={{ color: "#fbbf24", fontWeight: 700, fontSize: "0.95rem" }}>
            ⚠️ {t.gatewayOffline}
          </p>
          <p style={{ color: "#cbd5e1", fontSize: "0.85rem", marginTop: "0.3rem" }}>
            {t.gatewayOfflineDesc}
          </p>
        </div>
      )}

      {/* ── VIEW 1: LANDING PAGE & $100M OFFER OVERVIEW ──────────────── */}
      {mainView === "overview" && (
        <div>
          {/* $100M Offer Grand Slam Hero Card */}
          <div className="card" style={{ background: "linear-gradient(135deg, rgba(147, 51, 234, 0.15), rgba(59, 130, 246, 0.15))", borderColor: "rgba(168, 85, 247, 0.4)", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", color: "#f3e8ff", marginBottom: "0.5rem" }}>
              💎 {t.offerHeadline}
            </h2>
            <p style={{ fontSize: "0.95rem", color: "#cbd5e1", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              {t.offerSub}
            </p>
            <button
              onClick={() => { setMainView("wizard"); setActiveStep(1); }}
              style={{ fontSize: "0.95rem", padding: "0.65rem 1.25rem" }}
            >
              ⚡ {lang === "pt" ? "Testar Wizard ao Vivo Agora" : "Test Live Wizard Now"} →
            </button>
          </div>

          {/* Pain vs Solution (OTC Human Desk vs Agent OTC Desk) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="card" style={{ borderColor: "rgba(239, 68, 68, 0.3)", background: "rgba(239, 68, 68, 0.05)" }}>
              <h3 style={{ color: "#f87171", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                ❌ {t.painTitle}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                {t.painDesc}
              </p>
            </div>

            <div className="card" style={{ borderColor: "rgba(52, 211, 153, 0.3)", background: "rgba(52, 211, 153, 0.05)" }}>
              <h3 style={{ color: "#34d399", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                ✅ {t.solutionTitle}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                {t.solutionDesc}
              </p>
            </div>
          </div>

          {/* OTC Desk Comparison Matrix */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
              📊 {lang === "pt" ? "Matriz Comparativa: Mesa OTC Humana vs. Agente IA PIXPORT" : "Comparative Matrix: Human OTC Desk vs. PIXPORT AI Agent"}
            </h2>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>{t.compHeaderFeature}</th>
                    <th style={{ color: "#f87171" }}>{t.compHeaderHuman}</th>
                    <th style={{ color: "#34d399" }}>{t.compHeaderAgent}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 700 }}>{t.compRow1}</td>
                    <td style={{ color: "#fca5a5" }}>{t.compVal1Human}</td>
                    <td className="mono" style={{ color: "#6ee7b7", fontWeight: 700 }}>{t.compVal1Agent}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>{t.compRow2}</td>
                    <td style={{ color: "#fca5a5" }}>{t.compVal2Human}</td>
                    <td className="mono" style={{ color: "#6ee7b7", fontWeight: 700 }}>{t.compVal2Agent}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>{t.compRow3}</td>
                    <td style={{ color: "#fca5a5" }}>{t.compVal3Human}</td>
                    <td className="mono" style={{ color: "#6ee7b7", fontWeight: 700 }}>{t.compVal3Agent}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>{t.compRow4}</td>
                    <td style={{ color: "#fca5a5" }}>{t.compVal4Human}</td>
                    <td className="mono" style={{ color: "#6ee7b7", fontWeight: 700 }}>{t.compVal4Agent}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>{t.compRow5}</td>
                    <td style={{ color: "#fca5a5" }}>{t.compVal5Human}</td>
                    <td className="mono" style={{ color: "#f0abfc", fontWeight: 700 }}>{t.compVal5Agent}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Hooked Framework Section */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
              🧲 {t.hookedTitle}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ padding: "0.85rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ color: "#f0abfc", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.3rem" }}>{t.hookedTriggerTitle}</div>
                <div style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>{t.hookedTriggerDesc}</div>
              </div>
              <div style={{ padding: "0.85rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ color: "#f0abfc", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.3rem" }}>{t.hookedActionTitle}</div>
                <div style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>{t.hookedActionDesc}</div>
              </div>
              <div style={{ padding: "0.85rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ color: "#f0abfc", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.3rem" }}>{t.hookedRewardTitle}</div>
                <div style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>{t.hookedRewardDesc}</div>
              </div>
              <div style={{ padding: "0.85rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ color: "#f0abfc", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.3rem" }}>{t.hookedInvestmentTitle}</div>
                <div style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>{t.hookedInvestmentDesc}</div>
              </div>
            </div>
          </div>

          {/* HTTP 402 Protocol Explanation Box */}
          <div className="card" style={{ borderColor: "rgba(59, 130, 246, 0.4)", background: "rgba(59, 130, 246, 0.08)" }}>
            <h3 style={{ color: "#93c5fd", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              🌐 {t.http402Title}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.6 }}>
              {t.http402Desc}
            </p>
          </div>
        </div>
      )}

      {/* ── VIEW 2: INTERACTIVE MANDATE WIZARD ──────────────────────────── */}
      {mainView === "wizard" && (
        <>
          {/* Wizard Stepper Bar (Interactive 4-Step Timeline) ───────────── */}
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
        </>
      )}
    </div>
  );
}
