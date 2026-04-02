"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";

type PageLoadingStateProps = {
  title?: string;
  message?: string;
  minHeight?: string;
};

type PageErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  homeHref?: string;
  minHeight?: string;
};

type InlineStateProps = {
  message: string;
  action?: ReactNode;
};

export function PageLoadingState({
  title = "Cargando",
  message = "Espera un momento...",
  minHeight = "65vh",
}: PageLoadingStateProps) {
  return (
    <main id="main-content" className="page-state-shell" style={{ minHeight }}>
      <section className="page-state-card" style={{ maxWidth: 560 }}>
        <Loader2
          size={26}
          style={{ margin: "0 auto 0.8rem", color: "var(--accent-secondary)", animation: "spin 1s linear infinite" }}
        />
        <h1 className="auth-title" style={{ marginBottom: "0.45rem" }}>
          {title}
        </h1>
        <p className="auth-subtitle">{message}</p>
      </section>
    </main>
  );
}

export function PageErrorState({
  title = "No pudimos completar esta acción",
  message,
  onRetry,
  homeHref = "/",
  minHeight = "65vh",
}: PageErrorStateProps) {
  return (
    <main id="main-content" className="page-state-shell" style={{ minHeight }}>
      <section className="page-state-card" style={{ maxWidth: 560, borderColor: "rgba(244,63,94,0.35)" }}>
        <AlertCircle size={26} color="#fda4af" style={{ margin: "0 auto 0.8rem" }} />
        <h1 className="auth-title" style={{ marginBottom: "0.45rem" }}>
          {title}
        </h1>
        <p className="auth-subtitle">{message}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
          {onRetry ? (
            <button type="button" onClick={onRetry} className="btn-primary">
              <RotateCcw size={14} />
              Reintentar
            </button>
          ) : null}
          <Link href={homeHref} className="btn-secondary" style={{ textDecoration: "none" }}>
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}

export function InlineLoadingState({ message }: InlineStateProps) {
  return (
    <div
      style={{
        minHeight: 300,
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-xl)",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        color: "var(--text-muted)",
      }}
    >
      <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
      {message}
    </div>
  );
}

export function InlineErrorState({ message, action }: InlineStateProps) {
  return (
    <div
      style={{
        padding: "1rem 1.25rem",
        borderRadius: "var(--radius-xl)",
        background: "rgba(244,63,94,0.08)",
        border: "1px solid rgba(244,63,94,0.2)",
        color: "#fda4af",
        display: "flex",
        gap: "0.75rem",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
      }}
    >
      <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
        <AlertCircle size={16} /> {message}
      </span>
      {action}
    </div>
  );
}
