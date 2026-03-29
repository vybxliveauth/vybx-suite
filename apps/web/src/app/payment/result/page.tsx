"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Confetti from "react-confetti";
import { useCartStore } from "@/store/useCartStore";
import { CheckCircle2, XCircle, Loader2, Ticket } from "lucide-react";
import { resolveApiBaseUrl } from "@vybx/api-client";

const API = resolveApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004/api/v1",
);

type Status = "loading" | "success" | "failed" | "cancelled";

interface QueueState {
  nextUrl: string;
  done: number;
  total: number;
}

function PaymentResultInner() {
  const params = useSearchParams();
  const { clearCart } = useCartStore();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [queue, setQueue] = useState<QueueState | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const reference = params.get("reference") ?? "";
  const rawStatus = params.get("status") ?? "";

  useEffect(() => {
    if (!reference) { setStatus("failed"); return; }

    if (rawStatus === "cancelled") {
      setStatus("cancelled");
      return;
    }

    // Verify with backend
    fetch(`${API}/payments/status/${reference}/success`, {
      credentials: "include",
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message ?? "Error verificando pago");
        if (data.successful) {
          // Check if there are more items to pay
          const remaining: string[] = JSON.parse(sessionStorage.getItem("vybx_checkout_queue") ?? "[]");
          const total = parseInt(sessionStorage.getItem("vybx_checkout_total") ?? "1");

          if (remaining.length > 0) {
            const [nextUrl, ...rest] = remaining;
            sessionStorage.setItem("vybx_checkout_queue", JSON.stringify(rest));
            setQueue({ nextUrl, done: total - remaining.length, total });
          } else {
            sessionStorage.removeItem("vybx_checkout_queue");
            sessionStorage.removeItem("vybx_checkout_total");
            clearCart();
          }
          setStatus("success");
        } else {
          setErrorMsg(`Estado: ${data.status}`);
          setStatus("failed");
        }
      })
      .catch((e) => {
        setErrorMsg(e.message);
        setStatus("failed");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, rawStatus]);

  useEffect(() => {
    const syncViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    syncViewport();
    window.addEventListener("resize", syncViewport, { passive: true });
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (status === "success" && !queue) {
      setConfettiActive(true);
      const timeoutId = window.setTimeout(() => setConfettiActive(false), 6500);
      return () => window.clearTimeout(timeoutId);
    }
    setConfettiActive(false);
  }, [status, queue]);

  const showFinalConfetti = status === "success" && !queue;

  if (status === "loading") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <Loader2 size={40} color="var(--accent-secondary)" style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
          Verificando tu pago. Esto toma solo unos segundos...
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <>
        {showFinalConfetti && (
          <Confetti
            width={viewport.width}
            height={viewport.height}
            numberOfPieces={confettiActive ? 260 : 0}
            recycle={confettiActive}
            gravity={0.24}
            tweenDuration={9000}
            style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 5 }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", textAlign: "center" }}>
          <div style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: "rgba(34,197,94,0.12)",
            border: "2px solid rgba(34,197,94,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "popIn 0.5s cubic-bezier(0.16,1,0.3,1)",
          }}>
            <CheckCircle2 size={42} color="#4ade80" />
          </div>
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2.2rem", fontWeight: 900, color: "var(--text-light)", letterSpacing: "-1px", marginBottom: "0.5rem" }}>
              {queue ? `Pago ${queue.done} de ${queue.total} completado` : "¡Pago completado!"}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: 360 }}>
              {queue
                ? `Falta${queue.total - queue.done > 1 ? "n" : ""} ${queue.total - queue.done} pago${queue.total - queue.done > 1 ? "s" : ""} más para completar tu pedido.`
                : "Tus tickets han sido emitidos. También puedes verlos ahora en Mis tickets."}
            </p>
            {queue && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.4rem", opacity: 0.85 }}>
                No cierres esta ventana hasta completar todos los pagos.
              </p>
            )}
          </div>
          <div style={{
            padding: "0.65rem 1.25rem",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-pill)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            <Ticket size={14} color="var(--accent-primary)" />
            <code style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
              {reference}
            </code>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            {queue ? (
              <button
                onClick={() => { window.location.href = queue.nextUrl; }}
                className="btn-primary"
                style={{ textDecoration: "none" }}
              >
                Continuar con pago {queue.done + 1} de {queue.total}
              </button>
            ) : (
              <>
                <Link href="/" className="btn-primary" style={{ textDecoration: "none" }}>
                  Volver al inicio
                </Link>
                <Link href="/my-tickets" className="btn-secondary" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Ticket size={15} /> Mis tickets
                </Link>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  if (status === "cancelled") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", textAlign: "center" }}>
        <div style={{
          width: 88,
          height: 88,
          borderRadius: "50%",
          background: "rgba(244,63,94,0.1)",
          border: "2px solid rgba(244,63,94,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <XCircle size={42} color="#f43f5e" />
        </div>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 900, color: "var(--text-light)", letterSpacing: "-1px", marginBottom: "0.5rem" }}>
            Pago cancelado
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
            Cancelaste el proceso de pago. Tu reserva fue liberada.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/checkout" className="btn-primary" style={{ textDecoration: "none" }}>
            Reintentar compra
          </Link>
          <Link href="/" className="btn-secondary" style={{ textDecoration: "none" }}>
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  // failed
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", textAlign: "center" }}>
      <div style={{
        width: 88,
        height: 88,
        borderRadius: "50%",
        background: "rgba(244,63,94,0.1)",
        border: "2px solid rgba(244,63,94,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <XCircle size={42} color="#f43f5e" />
      </div>
      <div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 900, color: "var(--text-light)", letterSpacing: "-1px", marginBottom: "0.5rem" }}>
          Pago fallido
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: 360 }}>
          {errorMsg || "Hubo un problema procesando tu pago. Puedes intentarlo otra vez ahora."}
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <Link href="/checkout" className="btn-primary" style={{ textDecoration: "none" }}>
          Intentar de nuevo
        </Link>
        <Link href="/" className="btn-secondary" style={{ textDecoration: "none" }}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}>
        <Suspense fallback={
          <Loader2 size={32} color="var(--accent-secondary)" style={{ animation: "spin 1s linear infinite" }} />
        }>
          <PaymentResultInner />
        </Suspense>
      </div>
    </>
  );
}
