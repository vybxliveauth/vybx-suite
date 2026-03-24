"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { ShieldCheck, CreditCard, Loader2, X, Lock } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004";

// ─── Inner component (needs useSearchParams) ──────────────────────────────────

function MockGatewayInner() {
  const params = useSearchParams();
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvv, setCvv] = useState("123");

  const reference    = params.get("reference") ?? "";
  const amount       = params.get("amount") ?? "0";
  const currency     = params.get("currency") ?? "DOP";
  const returnUrl    = params.get("return_url") ?? "/";
  const cancelUrl    = params.get("cancel_url") ?? "/";
  const mockTxApproved  = params.get("mock_tx_approved") ?? "";
  const mockSigApproved = params.get("mock_sig_approved") ?? "";
  const mockTxCancelled  = params.get("mock_tx_cancelled") ?? "";
  const mockSigCancelled = params.get("mock_sig_cancelled") ?? "";

  async function sendCallback(status: "APPROVED" | "CANCELLED") {
    const transactionId = status === "APPROVED" ? mockTxApproved : mockTxCancelled;
    const signature     = status === "APPROVED" ? mockSigApproved : mockSigCancelled;

    await fetch(`${API}/payments/rd/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, status, transactionId, signature }),
    }).catch(() => {/* non-blocking */});
  }

  async function handlePay() {
    setProcessing(true);
    await sendCallback("APPROVED");
    window.location.href = returnUrl;
  }

  async function handleCancel() {
    setProcessing(true);
    await sendCallback("CANCELLED");
    window.location.href = cancelUrl;
  }

  const formatted = new Intl.NumberFormat("es-DO", {
    style: "currency", currency, minimumFractionDigits: 0,
  }).format(Number(amount));

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      background: "var(--bg-dark)",
    }}>
      <div style={{
        width: "min(480px, 100%)",
        background: "var(--card-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-2xl)",
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.5rem 1.75rem",
          borderBottom: "1px solid var(--glass-border)",
          background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(255,42,95,0.08))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <ShieldCheck size={16} color="#4ade80" />
              <span style={{ fontSize: "0.75rem", color: "#4ade80", fontWeight: 600 }}>Pago seguro simulado</span>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              Ref: <code style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{reference.slice(0, 16)}…</code>
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.15rem" }}>Total a pagar</p>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 900, color: "var(--text-light)", lineHeight: 1 }}>
              {formatted}
            </p>
          </div>
        </div>

        {/* Card form */}
        <div style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <CreditCard size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-light)" }}>Datos de la tarjeta</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {/* Card number */}
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "0.3rem" }}>
                Número de tarjeta
              </label>
              <input
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value)}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                style={{
                  width: "100%",
                  padding: "0.7rem 0.9rem",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-lg)",
                  color: "var(--text-light)",
                  fontSize: "1rem",
                  fontFamily: "monospace",
                  outline: "none",
                  letterSpacing: "2px",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "0.3rem" }}>
                  Vencimiento
                </label>
                <input
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  placeholder="MM/AA"
                  maxLength={5}
                  style={{
                    width: "100%",
                    padding: "0.7rem 0.9rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-lg)",
                    color: "var(--text-light)",
                    fontSize: "0.95rem",
                    fontFamily: "monospace",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "0.3rem" }}>
                  CVV
                </label>
                <input
                  value={cvv}
                  onChange={e => setCvv(e.target.value)}
                  placeholder="123"
                  maxLength={4}
                  type="password"
                  style={{
                    width: "100%",
                    padding: "0.7rem 0.9rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-lg)",
                    color: "var(--text-light)",
                    fontSize: "0.95rem",
                    fontFamily: "monospace",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Nota */}
          <div style={{
            marginTop: "1.25rem",
            padding: "0.65rem 0.9rem",
            background: "rgba(124,58,237,0.08)",
            border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: "var(--radius-lg)",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            display: "flex",
            gap: "0.5rem",
            alignItems: "flex-start",
          }}>
            <Lock size={12} color="var(--accent-secondary)" style={{ flexShrink: 0, marginTop: 1 }} />
            Este es un gateway simulado para desarrollo local. Ningún cobro real será procesado.
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginTop: "1.5rem" }}>
            <button
              onClick={handlePay}
              disabled={processing}
              className="btn-primary btn-lg"
              style={{ justifyContent: "center", width: "100%" }}
            >
              {processing
                ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Procesando...</>
                : <><ShieldCheck size={18} /> Confirmar pago {formatted}</>
              }
            </button>
            <button
              onClick={handleCancel}
              disabled={processing}
              style={{
                background: "transparent",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-pill)",
                padding: "0.7rem",
                cursor: processing ? "not-allowed" : "pointer",
                color: "var(--text-muted)",
                fontSize: "0.88rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                transition: "all 0.2s",
                fontFamily: "var(--font-body)",
              }}
              onMouseEnter={e => { if (!processing) e.currentTarget.style.borderColor = "#f43f5e"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--glass-border)"; }}
            >
              <X size={14} /> Cancelar compra
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function MockGatewayPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent-secondary)" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <MockGatewayInner />
    </Suspense>
  );
}
