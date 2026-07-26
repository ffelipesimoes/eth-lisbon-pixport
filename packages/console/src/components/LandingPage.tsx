"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "../lib/i18n";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import anime from "animejs";

interface LandingPageProps {
  lang: Language;
  setLang: (l: Language) => void;
  onStartDemo: () => void;
}

const copy = {
  en: {
    badge: "Hedera Testnet · Topic 0.0.9742958",
    h1a: "Programmable Pix Mandates",
    h1b: "for Autonomous AI",
    h1c: "Zero Over-Spend Risk. Zero Solidity.",
    sub: "Machine-speed BRL payouts secured by Hedera HIP-336 native token allowances and World ID Zero-Knowledge proof verification.",
    startDemo: "⚡ Launch Interactive Demo",
    github: "GitHub ↗",
    talk: "Try Demo",
    sectionProblem: "THE PROBLEM & SOLUTION",
    problemTitle: "Traditional OTC Desks vs.",
    problemTitleGrad: "PIXPORT AI Gateway",
    humanTitle: "❌ Human OTC Desk Today",
    humanDesc: "Manual WhatsApp approvals, 4-hour settlement delays, rogue trader over-spends, and zero real-time auditability. Human-managed BRL limits invite fraud and error.",
    aiTitle: "✅ PIXPORT Autonomous Agent",
    aiDesc: "Sub-second finality. Limits enforced directly on Hedera via HIP-336 native allowances. Over-spend attempts trigger instant on-chain RECUSA before Pix executes.",
    rowSpeed: "Settlement Speed",
    rowRisk: "Over-Spend Risk",
    rowAudit: "Audit Trail",
    rowProtocol: "Protocol Standard",
    humanSpeed: "1–4 Hours",
    humanRisk: "HIGH",
    humanAudit: "Excel / Email",
    humanProtocol: "Legacy Bank API",
    aiSpeed: "< 1 Second",
    aiRisk: "0% — RECUSA",
    aiAudit: "Immutable HCS",
    aiProtocol: "HTTP 402 x402",
    sectionHow: "HOW IT WORKS",
    howTitle: "4-Step On-Chain Execution Pipeline",
    s1n: "STEP 01", s1t: "World ID ZK Gate", s1d: "Every request evaluates ZK proofs. Orb-verified humans unlock HIGH Tier limits. Unverified identity gets blocked.", s1f: "verifyCloudProof()",
    s2n: "STEP 02", s2t: "HIP-336 Allowance", s2d: "Mandate creation submits AccountAllowanceApproveTransaction on Hedera — setting exact BRL token allowance on-chain. Zero Solidity.", s2f: "AccountAllowanceApproveTransaction()",
    s3n: "STEP 03", s3t: "Mirror Node Check", s3d: "Before any Pix payout, Gateway queries Mirror Node REST API for current allowance. Exceeded → RECUSA. Approved → Pix executes.", s3f: "GET /api/v1/accounts/.../allowances",
    s4n: "STEP 04", s4t: "HCS Audit Trail", s4d: "Every decision is logged to HCS Topic 0.0.9742958 with consensus timestamp. Fully verifiable on HashScan.", s4f: "TopicMessageSubmitTransaction()",
    sectionHttp: "PROTOCOL STANDARD",
    httpTitle: "HTTP 402 Payment Required (x402)",
    httpDesc: "HTTP 402 is the native web standard for machine-to-machine payments. When an AI Agent calls POST /pay without active mandate or over limit, PIXPORT returns HTTP 402 with Hedera mandate headers — instructing the agent to refresh its ZK proof.",
    ctaTitle1: "The Future of",
    ctaTitle2: "Autonomous Treasury",
    ctaTitle3: "is Live On-Chain.",
    ctaSub: "Test PIXPORT in action — run the 4-step wizard, trigger a real on-chain RECUSA, and watch Hedera HCS log every decision in real-time.",
    launchDemo: "⚡ Launch Interactive Demo",
    hashscan: "View HCS on HashScan ↗",
    footerCopy: "© 2026 PIXPORT — Built for ETHLisbon Hackathon · Lusion-inspired Interactive WebGL",
  },
  pt: {
    badge: "Hedera Testnet · Topic 0.0.9742958",
    h1a: "Mandatos Pix Programáveis",
    h1b: "para IA Autônoma",
    h1c: "Zero Risco de Estouro. Zero Solidity.",
    sub: "Pagamentos Pix em velocidade de máquina protegidos por allowances nativos HIP-336 na Hedera e verificação ZK do World ID.",
    startDemo: "⚡ Iniciar Demo Interativa",
    github: "GitHub ↗",
    talk: "Testar Demo",
    sectionProblem: "PROBLEMA E SOLUÇÃO",
    problemTitle: "Mesa OTC Tradicional vs.",
    problemTitleGrad: "PIXPORT AI Gateway",
    humanTitle: "❌ Mesa OTC Humana Hoje",
    humanDesc: "Aprovações manuais via WhatsApp, atrasos de 4 horas, estouros por rogue traders e zero auditabilidade em tempo real. Limites humanos causam fraudes e falhas.",
    aiTitle: "✅ Agente Autônomo PIXPORT",
    aiDesc: "Liquidação em sub-segundo. Limites aplicados diretamente no consenso Hedera via HIP-336. Tentativas de estouro disparam RECUSA on-chain antes do Pix.",
    rowSpeed: "Velocidade de Liquidação",
    rowRisk: "Risco de Estouro",
    rowAudit: "Trilha de Auditoria",
    rowProtocol: "Padrão do Protocolo",
    humanSpeed: "1–4 Horas",
    humanRisk: "ALTO",
    humanAudit: "Excel / E-mail",
    humanProtocol: "API Bancária Legada",
    aiSpeed: "< 1 Segundo",
    aiRisk: "0% — RECUSA",
    aiAudit: "HCS Imutável",
    aiProtocol: "HTTP 402 x402",
    sectionHow: "COMO FUNCIONA",
    howTitle: "Pipeline de Execução On-Chain em 4 Etapas",
    s1n: "ETAPA 01", s1t: "Gate ZK World ID", s1d: "Toda requisição valida prova ZK. Verificados Orb liberam limite HIGH Tier. Sem prova = bloqueio imediato.", s1f: "verifyCloudProof()",
    s2n: "ETAPA 02", s2t: "Allowance HIP-336", s2d: "Criação do mandato envia AccountAllowanceApproveTransaction na Hedera — definindo limite exato do token BRL. Sem Solidity.", s2f: "AccountAllowanceApproveTransaction()",
    s3n: "ETAPA 03", s3t: "Checagem Mirror Node", s3d: "Antes do Pix, o Gateway consulta a API do Mirror Node. Excedido → RECUSA. Aprovado → Pix executado instantaneamente.", s3f: "GET /api/v1/accounts/.../allowances",
    s4n: "ETAPA 04", s4t: "Trilha Imutável HCS", s4d: "Cada decisão é registrada no HCS Topic 0.0.9742958 com timestamp de consenso. Verificável no HashScan.", s4f: "TopicMessageSubmitTransaction()",
    sectionHttp: "PADRÃO DE PROTOCOLO",
    httpTitle: "HTTP 402 Payment Required (x402)",
    httpDesc: "HTTP 402 é o padrão nativo para pagamentos máquina-a-máquina. Quando um Agente IA chama POST /pay sem mandato ativo, o PIXPORT retorna HTTP 402 com cabeçalhos Hedera — orientando o agente a renovar a prova ZK.",
    ctaTitle1: "O Futuro da",
    ctaTitle2: "Tesouraria Autônoma",
    ctaTitle3: "já está On-Chain.",
    ctaSub: "Teste o PIXPORT na prática — rode o wizard de 4 passos, dispare uma RECUSA on-chain real e veja o HCS auditando cada transação ao vivo.",
    launchDemo: "⚡ Iniciar Demo Interativa",
    hashscan: "Ver HCS no HashScan ↗",
    footerCopy: "© 2026 PIXPORT — ETHLisbon Hackathon · Design Interativo Estilo Lusion.co",
  },
};

export default function LandingPage({ lang, setLang, onStartDemo }: LandingPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const c = copy[lang];

  /* ── Lusion-Inspired Audio Visualizer Canvas ── */
  useEffect(() => {
    const canvas = audioCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    canvas.width = 32;
    canvas.height = 18;

    let t = 0;
    function drawAudio() {
      animId = requestAnimationFrame(drawAudio);
      if (!ctx || !canvas) return;
      t += 0.15;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 4;
      const gap = 3;
      const barWidth = 4;

      for (let i = 0; i < bars; i++) {
        const h = isPlayingAudio
          ? Math.max(4, Math.sin(t + i * 1.2) * 8 + 8)
          : 4 + Math.sin(i) * 2;
        ctx.fillStyle = isPlayingAudio ? "#a78bfa" : "#64748b";
        ctx.fillRect(i * (barWidth + gap) + 2, canvas.height - h, barWidth, h);
      }
    }
    drawAudio();

    return () => cancelAnimationFrame(animId);
  }, [isPlayingAudio]);

  /* ── Lusion 3D Interactive WebGL Scene (Three.js) ── */
  useEffect(() => {
    let animId: number;
    let isSubscribed = true;

    async function setupLusionScene() {
      const THREE = await import("three");
      if (!isSubscribed || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
      camera.position.z = 38;

      // 1. Organic Fluid Sculpted Ribbon (Lusion Signature Element)
      const planeGeo = new THREE.PlaneGeometry(65, 45, 72, 72);
      const originalPositions = planeGeo.attributes.position.clone();

      const planeMat = new THREE.MeshPhysicalMaterial({
        color: 0x7c3aed,
        emissive: 0x3b0764,
        roughness: 0.15,
        metalness: 0.85,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
      });

      const fluidMesh = new THREE.Mesh(planeGeo, planeMat);
      fluidMesh.rotation.x = -Math.PI / 3.8;
      fluidMesh.position.set(0, -4, -8);
      scene.add(fluidMesh);

      // 2. Lights
      const light1 = new THREE.PointLight(0xa78bfa, 3, 100);
      light1.position.set(25, 25, 20);
      scene.add(light1);

      const light2 = new THREE.PointLight(0x10b981, 2.5, 100);
      light2.position.set(-25, -20, 20);
      scene.add(light2);

      // 3. Floating Micro Particle Dust
      const pCount = 900;
      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount * 3; i += 3) {
        pPos[i] = (Math.random() - 0.5) * 110;
        pPos[i + 1] = (Math.random() - 0.5) * 90;
        pPos[i + 2] = (Math.random() - 0.5) * 70;
      }
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      const pMat = new THREE.PointsMaterial({
        size: 0.28,
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45
      });
      const particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);

      // Mouse Inertia Physics
      let targetX = 0, targetY = 0;
      let currentX = 0, currentY = 0;

      const handleMouseMove = (e: MouseEvent) => {
        targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetY = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener("mousemove", handleMouseMove);

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", handleResize);

      let time = 0;
      function renderLoop() {
        if (!isSubscribed) return;
        animId = requestAnimationFrame(renderLoop);
        time += 0.012;

        currentX += (targetX - currentX) * 0.04;
        currentY += (targetY - currentY) * 0.04;

        // Wave Vertex Deformation
        const posAttr = planeGeo.attributes.position;
        const origPos = originalPositions.array;

        for (let i = 0; i < posAttr.count; i++) {
          const u = origPos[i * 3];
          const v = origPos[i * 3 + 1];

          const wave1 = Math.sin(u * 0.14 + time * 1.6) * Math.cos(v * 0.14 + time * 1.3) * 3.8;
          const wave2 = Math.sin((u + currentX * 22) * 0.08 - time) * 2.2;

          posAttr.setZ(i, wave1 + wave2);
        }
        posAttr.needsUpdate = true;

        fluidMesh.rotation.z = time * 0.04 + currentX * 0.15;
        particles.rotation.y = time * 0.02 + currentX * 0.08;
        particles.rotation.x = currentY * 0.08;

        renderer.render(scene, camera);
      }
      renderLoop();
    }

    setupLusionScene();

    return () => {
      isSubscribed = false;
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  /* ── Anime.js Stagger Entrance ── */
  useEffect(() => {
    const tl = anime.timeline({
      easing: "easeOutExpo",
      duration: 850
    });

    tl.add({
      targets: ".an-badge",
      opacity: [0, 1],
      translateY: [-20, 0],
      delay: 100
    })
    .add({
      targets: ".an-title",
      opacity: [0, 1],
      translateY: [30, 0],
      delay: anime.stagger(120)
    }, "-=600")
    .add({
      targets: ".an-sub",
      opacity: [0, 1],
      translateY: [20, 0]
    }, "-=500")
    .add({
      targets: ".an-btn",
      opacity: [0, 1],
      scale: [0.9, 1]
    }, "-=400")
    .add({
      targets: ".an-card",
      opacity: [0, 1],
      translateY: [40, 0],
      delay: anime.stagger(100)
    }, "-=400");
  }, []);

  const compareRows = [
    [c.rowSpeed, c.humanSpeed, c.aiSpeed],
    [c.rowRisk, c.humanRisk, c.aiRisk],
    [c.rowAudit, c.humanAudit, c.aiAudit],
    [c.rowProtocol, c.humanProtocol, c.aiProtocol],
    ["Smart Contracts", "N/A", "Zero Solidity"],
    ["Identity Gate", "Manual KYC", "World ID ZK Proof"],
  ];

  const steps = [
    { n: c.s1n, icon: "🌐", t: c.s1t, d: c.s1d, fn: c.s1f },
    { n: c.s2n, icon: "🪙", t: c.s2t, d: c.s2d, fn: c.s2f },
    { n: c.s3n, icon: "⚡", t: c.s3t, d: c.s3d, fn: c.s3f },
    { n: c.s4n, icon: "📜", t: c.s4t, d: c.s4d, fn: c.s4f },
  ];

  return (
    <div style={{ background: "#000000", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#f1f5f9", overflowX: "hidden" }}>
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }} />

      {/* Lusion-Style Header Bar */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 3rem", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Brand Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="20" fill="url(#brandGrad)" />
            <path d="M30 25H70V45H48V75H30V25Z" fill="white" />
            <defs>
              <linearGradient id="brandGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7C3AED" />
                <stop offset="1" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
          </svg>
          <span style={{ fontWeight: 900, fontSize: "1.2rem", letterSpacing: "-0.03em", color: "#ffffff" }}>
            PIXPORT
          </span>
        </div>

        {/* Center / Right Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          {/* Sound / Audio Toggle Visualizer */}
          <button
            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
            title="Toggle Ambient Audio"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "9999px", padding: "0.4rem 0.8rem", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
          >
            <canvas ref={audioCanvasRef} style={{ width: 28, height: 16 }} />
            <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {isPlayingAudio ? "Sound ON" : "Sound OFF"}
            </span>
          </button>

          {/* Language Switcher Toggle */}
          <div style={{ display: "flex", gap: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "9999px", padding: "3px" }}>
            {(["pt", "en"] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding: "0.35rem 0.85rem",
                  borderRadius: "9999px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                  background: lang === l ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "transparent",
                  color: lang === l ? "#ffffff" : "#94a3b8"
                }}
              >
                {l === "pt" ? "🇵🇹 PT" : "🇬🇧 EN"}
              </button>
            ))}
          </div>

          {/* Lusion-Style Interactive Action Button */}
          <button
            onClick={onStartDemo}
            style={{
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              color: "#ffffff",
              border: "none",
              padding: "0.65rem 1.6rem",
              borderRadius: "9999px",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: "0 0 25px rgba(124,58,237,0.4)",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span>{c.startDemo}</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 8H13M13 8L8 3M13 8L8 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", paddingTop: "100px", flexDirection: "column" }}>
        <div style={{ maxWidth: 900, padding: "0 2rem" }}>
          <div className="an-badge" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "9999px", padding: "0.4rem 1.2rem", fontSize: "0.78rem", fontWeight: 600, color: "#c4b5fd", marginBottom: "2.2rem", opacity: 0 }}>
            <span style={{ width: 7, height: 7, background: "#10b981", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 8px #10b981" }} />
            {c.badge}
          </div>

          <h1 style={{ fontSize: "clamp(3rem, 8vw, 6.8rem)", fontWeight: 900, lineHeight: 0.95, letterSpacing: "-0.04em", marginBottom: "1.8rem" }}>
            <span className="an-title" style={{ display: "block", opacity: 0 }}>{c.h1a}</span>
            <span className="an-title" style={{ display: "block", background: "linear-gradient(135deg,#a78bfa,#818cf8,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: 0 }}>{c.h1b}</span>
            <span className="an-title" style={{ display: "block", fontSize: "0.5em", color: "#64748b", fontWeight: 300, letterSpacing: "-0.01em", marginTop: "0.6rem", opacity: 0 }}>{c.h1c}</span>
          </h1>

          <p className="an-sub" style={{ fontSize: "1.2rem", color: "#94a3b8", maxWidth: 640, margin: "0 auto 2.8rem", lineHeight: 1.7, opacity: 0 }}>{c.sub}</p>

          <div className="an-btn" style={{ display: "flex", justifyContent: "center", gap: "1.25rem", flexWrap: "wrap", opacity: 0 }}>
            <button
              onClick={onStartDemo}
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#ffffff", border: "none", padding: "1.05rem 2.6rem", borderRadius: "9999px", fontSize: "1.05rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 0 40px rgba(124,58,237,0.5)", fontFamily: "inherit", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(124,58,237,0.7)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 40px rgba(124,58,237,0.5)"; }}
            >
              {c.startDemo}
            </button>
            <a
              href="https://github.com/ffelipesimoes/eth-lisbon-pixport"
              target="_blank"
              rel="noreferrer"
              style={{ background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.15)", padding: "1.05rem 2.6rem", borderRadius: "9999px", fontSize: "1.05rem", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", transition: "all 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#ffffff"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
            >
              {c.github}
            </a>
          </div>

          {/* Metric Cards */}
          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap", marginTop: "5.5rem" }}>
            {[
              { v: "< 1s", l: lang === "pt" ? "Liquidação Pix" : "Pix Settlement", g: "linear-gradient(135deg,#34d399,#10b981)" },
              { v: "0%", l: lang === "pt" ? "Risco de Estouro" : "Over-Spend Risk", g: "linear-gradient(135deg,#a78bfa,#818cf8)" },
              { v: "∞", l: lang === "pt" ? "Registros HCS" : "HCS Audit Records", g: "linear-gradient(135deg,#f59e0b,#fbbf24)" },
              { v: "0", l: lang === "pt" ? "Linhas de Solidity" : "Lines of Solidity", g: "linear-gradient(135deg,#f0abfc,#c084fc)" },
            ].map(m => (
              <div key={m.l} className="an-card" style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "1.6rem 2.2rem", textAlign: "center", minWidth: 155, boxShadow: "0 25px 60px rgba(0,0,0,0.6)", opacity: 0 }}>
                <div style={{ fontSize: "2.1rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "0.2rem", background: m.g, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{m.v}</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marquee Banner */}
      <div style={{ position: "relative", zIndex: 10, overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0.9rem 0", background: "rgba(0,0,0,0.85)" }}>
        <div style={{ display: "flex", gap: "2.5rem", animation: "lp-marquee 22s linear infinite", width: "max-content" }}>
          {Array(2).fill([
            "AccountAllowanceApproveTransaction()",
            "TopicMessageSubmitTransaction()",
            "verifyCloudProof()",
            "HCS Topic 0.0.9742958",
            "HTS Token 0.0.9742957",
            "HTTP 402 Payment Required",
            "HIP-336 Native Allowance",
            "Mirror Node REST API",
            "World ID ZK Proof Gate"
          ]).flat().map((item, i) => (
            <div key={i} style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", padding: "0 0.5rem", fontFamily: "'JetBrains Mono',monospace", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ width: 5, height: 5, background: "#8b5cf6", borderRadius: "50%", display: "inline-block" }} />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Problem / Solution Grid */}
      <section style={{ position: "relative", zIndex: 10, padding: "8rem 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 2rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a78bfa", marginBottom: "1rem" }}>{c.sectionProblem}</div>
          <h2 style={{ fontSize: "clamp(2.4rem,5vw,4rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "3.5rem" }}>
            {c.problemTitle}<br /><span style={{ background: "linear-gradient(135deg,#a78bfa,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{c.problemTitleGrad}</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 24, padding: "2.2rem" }}>
              <h3 style={{ color: "#f87171", fontSize: "1.15rem", fontWeight: 700, marginBottom: "1rem" }}>{c.humanTitle}</h3>
              <p style={{ fontSize: "0.88rem", color: "#94a3b8", lineHeight: 1.65 }}>{c.humanDesc}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginTop: "1.8rem" }}>
                {[[c.rowSpeed, c.humanSpeed], [c.rowRisk, c.humanRisk], [c.rowAudit, c.humanAudit], [c.rowProtocol, c.humanProtocol]].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0.9rem", background: "rgba(0,0,0,0.4)", borderRadius: 10, fontSize: "0.82rem" }}>
                    <span style={{ color: "#94a3b8" }}>{label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#f87171" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 24, padding: "2.2rem" }}>
              <h3 style={{ color: "#34d399", fontSize: "1.15rem", fontWeight: 700, marginBottom: "1rem" }}>{c.aiTitle}</h3>
              <p style={{ fontSize: "0.88rem", color: "#94a3b8", lineHeight: 1.65 }}>{c.aiDesc}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginTop: "1.8rem" }}>
                {[[c.rowSpeed, c.aiSpeed], [c.rowRisk, c.aiRisk], [c.rowAudit, c.aiAudit], [c.rowProtocol, c.aiProtocol]].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0.9rem", background: "rgba(0,0,0,0.4)", borderRadius: 10, fontSize: "0.82rem" }}>
                    <span style={{ color: "#94a3b8" }}>{label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#34d399" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works 4 Steps */}
      <section style={{ position: "relative", zIndex: 10, padding: "8rem 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 2rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a78bfa", marginBottom: "1rem" }}>{c.sectionHow}</div>
          <h2 style={{ fontSize: "clamp(2.4rem,5vw,4rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "3.5rem" }}>{c.howTitle}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem" }}>
            {steps.map(s => (
              <div key={s.n} style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: "1.85rem 1.5rem", transition: "all 0.3s" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#475569", fontFamily: "'JetBrains Mono',monospace", marginBottom: "0.9rem" }}>{s.n}</div>
                <div style={{ fontSize: "2rem", marginBottom: "0.9rem" }}>{s.icon}</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>{s.t}</div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.65, marginBottom: "1rem" }}>{s.d}</div>
                <div style={{ padding: "0.45rem 0.65rem", background: "rgba(255,255,255,0.04)", borderRadius: 6, fontSize: "0.68rem", fontFamily: "'JetBrains Mono',monospace", color: "#a78bfa", wordBreak: "break-all" }}>{s.fn}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section style={{ position: "relative", zIndex: 10, padding: "8rem 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 2rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: "1.1rem 1.5rem", textAlign: "left", fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>Feature</th>
                <th style={{ padding: "1.1rem 1.5rem", textAlign: "left", fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#f87171" }}>Human OTC</th>
                <th style={{ padding: "1.1rem 1.5rem", textAlign: "left", fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#34d399" }}>PIXPORT AI Gateway</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map(([feat, human, ai]) => (
                <tr key={feat} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "1rem 1.5rem", fontSize: "0.88rem", fontWeight: 600, color: "#94a3b8" }}>{feat}</td>
                  <td style={{ padding: "1rem 1.5rem", fontSize: "0.8rem", color: "#fca5a5", fontFamily: "'JetBrains Mono',monospace" }}>{human}</td>
                  <td style={{ padding: "1rem 1.5rem", fontSize: "0.8rem", color: "#6ee7b7", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{ai}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* HTTP 402 Section */}
      <section style={{ position: "relative", zIndex: 10, padding: "8rem 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 2rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a78bfa", marginBottom: "1rem" }}>{c.sectionHttp}</div>
          <h2 style={{ fontSize: "clamp(2.4rem,5vw,4rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "2.5rem" }}>{c.httpTitle}</h2>
          <div style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.1),rgba(139,92,246,0.1))", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 26, padding: "3.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3.5rem", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "1rem", color: "#94a3b8", lineHeight: 1.75, marginBottom: "1.8rem" }}>{c.httpDesc}</p>
              <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
                {[["#34d399", "rgba(16,185,129,0.1)", "rgba(16,185,129,0.2)", "✓ Machine-native"], ["#a78bfa", "rgba(139,92,246,0.1)", "rgba(139,92,246,0.2)", "✓ AI-agent ready"], ["#93c5fd", "rgba(59,130,246,0.1)", "rgba(59,130,246,0.2)", "✓ Standard HTTP"]].map(([col, bg, border, label]) => (
                  <div key={label} style={{ padding: "0.5rem 1rem", background: bg, border: `1px solid ${border}`, borderRadius: 10, fontSize: "0.78rem", color: col, fontWeight: 700 }}>{label}</div>
                ))}
              </div>
            </div>
            <pre style={{ background: "rgba(0,0,0,0.6)", borderRadius: 14, padding: "1.8rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", lineHeight: 1.85, border: "1px solid rgba(255,255,255,0.08)", overflowX: "auto", margin: 0 }}>
              <span style={{ color: "#475569" }}>{"// Agent calls POST /pay without mandate\n"}</span>
              <span style={{ color: "#f0abfc" }}>HTTP/1.1 </span><span style={{ color: "#fbbf24" }}>402</span>{" Payment Required\n"}
              <span style={{ color: "#f0abfc" }}>WWW-Authenticate: </span><span style={{ color: "#86efac" }}>HederaMandate\n</span>
              {"  "}<span style={{ color: "#f0abfc" }}>topic_id=</span><span style={{ color: "#86efac" }}>"0.0.9742958"\n</span>
              {"  "}<span style={{ color: "#f0abfc" }}>required_tier=</span><span style={{ color: "#86efac" }}>"orb"\n\n</span>
              <span style={{ color: "#475569" }}>{"// Agent presents World ID proof → re-requests\n"}</span>
              <span style={{ color: "#f0abfc" }}>HTTP/1.1 </span><span style={{ color: "#fbbf24" }}>200</span>{" OK\n"}
              <span style={{ color: "#f0abfc" }}>decision: </span><span style={{ color: "#86efac" }}>"approved"\n</span>
              <span style={{ color: "#f0abfc" }}>hcsSeq: </span><span style={{ color: "#fbbf24" }}>72</span>
            </pre>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section style={{ position: "relative", zIndex: 10, padding: "9rem 0", textAlign: "center" }}>
        <div style={{ maxWidth: 850, margin: "0 auto", padding: "0 2rem" }}>
          <h2 style={{ fontSize: "clamp(2.8rem, 6vw, 5.5rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: "1.8rem" }}>
            {c.ctaTitle1}<br />
            <span style={{ background: "linear-gradient(135deg,#a78bfa,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{c.ctaTitle2}</span><br />
            {c.ctaTitle3}
          </h2>
          <p style={{ fontSize: "1.1rem", color: "#94a3b8", maxWidth: 500, margin: "0 auto 2.8rem", lineHeight: 1.7 }}>{c.ctaSub}</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1.25rem", flexWrap: "wrap" }}>
            <button onClick={onStartDemo} style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#ffffff", border: "none", padding: "1.1rem 2.8rem", borderRadius: "9999px", fontSize: "1.1rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 0 35px rgba(124,58,237,0.5)", fontFamily: "inherit" }}>
              {c.launchDemo}
            </button>
            <a href="https://hashscan.io/testnet/topic/0.0.9742958" target="_blank" rel="noreferrer" style={{ background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.15)", padding: "1.1rem 2.8rem", borderRadius: "9999px", fontSize: "1.1rem", fontWeight: 600, textDecoration: "none" }}>
              {c.hashscan}
            </a>
          </div>
        </div>
      </section>

      {/* Lusion Minimal Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "2rem 3rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "#475569" }}>
        <span>{c.footerCopy}</span>
        <div style={{ display: "flex", gap: "1.8rem" }}>
          <a href="https://github.com/ffelipesimoes/eth-lisbon-pixport" target="_blank" rel="noreferrer" style={{ color: "#64748b", textDecoration: "none", transition: "color 0.2s" }}>GitHub</a>
          <a href="https://hashscan.io/testnet/topic/0.0.9742958" target="_blank" rel="noreferrer" style={{ color: "#64748b", textDecoration: "none", transition: "color 0.2s" }}>HashScan</a>
        </div>
      </footer>

      {/* HCS Live Ticker */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(24px)", borderTop: "1px solid rgba(139,92,246,0.3)", padding: "0.6rem 2.5rem", display: "flex", alignItems: "center", gap: "1.25rem", overflow: "hidden" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", borderRadius: 4, padding: "0.2rem 0.55rem", color: "#a78bfa", whiteSpace: "nowrap", flexShrink: 0 }}>● LIVE HCS</div>
        <div style={{ overflow: "hidden", flex: 1 }}>
          <div style={{ display: "flex", gap: "3rem", animation: "lp-marquee 20s linear infinite", width: "max-content" }}>
            {[
              { type: "approved", msg: "[APPROVED] mandate:14e97c4d · 3.00 BRL · seq#70 · 2026-07-26T00:15:19Z" },
              { type: "rejected", msg: "[RECUSA] mandate:14e97c4d · 30.00 BRL · seq#71 · mandate_max_amount_exceeded" },
              { type: "approved", msg: "[APPROVED] mandate:029583d0 · 8.00 BRL · seq#66 · 2026-07-25T22:50:06Z" },
            ].map((e, i) => (
              <div key={i} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: e.type === "approved" ? "#34d399" : "#f87171", whiteSpace: "nowrap" }}>{e.msg}</div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes lp-marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>
    </div>
  );
}
