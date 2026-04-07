"use client";

import { useEffect, useState } from "react";
import { X, Share, PlusSquare } from "lucide-react";

const DISMISS_KEY = "vybx-pwa-dismiss";

type BannerMode = "android" | "ios" | null;

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    (window.navigator as { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function PwaInstallBanner() {
  const [mode, setMode] = useState<BannerMode>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return; // already installed

    const dismissed =
      typeof localStorage !== "undefined" &&
      localStorage.getItem(DISMISS_KEY) === "1";
    if (dismissed) return;

    if (isIos()) {
      setMode("ios");
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setMode("android");
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setMode(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      const prompt = deferredPrompt as BeforeInstallPromptEvent;
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        setMode(null);
      } else {
        setInstalling(false);
      }
    } catch {
      setInstalling(false);
    }
  }

  if (!mode) return null;

  return (
    <div
      role="complementary"
      aria-label="Instalar aplicación"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2000,
        padding: "0 0 env(safe-area-inset-bottom, 0px)",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          margin: "0 0.75rem 0.75rem",
          background:
            "linear-gradient(160deg, color-mix(in oklab, #1a0533 90%, transparent), color-mix(in oklab, #090913 96%, transparent))",
          border: "1px solid rgba(124,58,237,0.35)",
          borderRadius: "1rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(124,58,237,0.12) inset",
          padding: "1rem 1.1rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.85rem",
          pointerEvents: "auto",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* App icon */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "linear-gradient(135deg, #7c3aed, #ff2a5f)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            fontWeight: 900,
            color: "#fff",
            flexShrink: 0,
            fontFamily: "sans-serif",
            letterSpacing: "-0.04em",
          }}
        >
          V
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              fontWeight: 700,
              color: "#f1f5f9",
              fontFamily: "var(--font-heading, sans-serif)",
            }}
          >
            Instala Vybx
          </p>

          {mode === "android" && (
            <>
              <p
                style={{
                  margin: "0.2rem 0 0.7rem",
                  fontSize: "0.78rem",
                  color: "#94a3b8",
                  lineHeight: 1.4,
                }}
              >
                Acceso rápido a tus tickets desde la pantalla de inicio.
              </p>
              <button
                onClick={() => void handleInstall()}
                disabled={installing}
                style={{
                  padding: "0.5rem 1.1rem",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(90deg, #7c3aed, #ff2a5f)",
                  color: "#fff",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: installing ? "default" : "pointer",
                  opacity: installing ? 0.7 : 1,
                  fontFamily: "var(--font-body, sans-serif)",
                }}
              >
                {installing ? "Instalando…" : "Instalar"}
              </button>
            </>
          )}

          {mode === "ios" && (
            <p
              style={{
                margin: "0.2rem 0 0",
                fontSize: "0.78rem",
                color: "#94a3b8",
                lineHeight: 1.5,
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.2rem",
              }}
            >
              Toca{" "}
              <Share
                size={13}
                style={{ display: "inline", verticalAlign: "middle", color: "#60a5fa", flexShrink: 0 }}
              />{" "}
              Compartir y luego{" "}
              <PlusSquare
                size={13}
                style={{ display: "inline", verticalAlign: "middle", color: "#a78bfa", flexShrink: 0 }}
              />{" "}
              <strong style={{ color: "#f1f5f9" }}>Añadir a inicio</strong>
            </p>
          )}
        </div>

        <button
          onClick={dismiss}
          aria-label="Cerrar"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#64748b",
            padding: "0.15rem",
            display: "flex",
            flexShrink: 0,
            marginTop: "0.1rem",
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// Augment window type for the install prompt event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
