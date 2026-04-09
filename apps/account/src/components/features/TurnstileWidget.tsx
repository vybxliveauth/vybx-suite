"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setClientTurnstileToken } from "@/lib/turnstile";

type TurnstileOptions = {
  sitekey: string;
  action?: string;
  theme?: "light" | "dark" | "auto";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

type TurnstileApi = {
  render: (element: HTMLElement, options: TurnstileOptions) => string;
  remove?: (widgetId: string) => void;
};

type TurnstileWindow = typeof window & {
  turnstile?: TurnstileApi;
};

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptLoadPromise: Promise<void> | null = null;

function ensureTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const runtimeWindow = window as TurnstileWindow;
  if (runtimeWindow.turnstile) return Promise.resolve();

  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Turnstile script failed to load")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile script failed to load"));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export function TurnstileWidget({
  action,
  className,
}: {
  action: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const siteKey = useMemo(
    () => process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "",
    [],
  );

  useEffect(() => {
    setClientTurnstileToken(action, null);

    if (!siteKey) {
      setError("Turnstile no configurado: define NEXT_PUBLIC_TURNSTILE_SITE_KEY.");
      return;
    }

    let cancelled = false;
    let widgetId: string | null = null;

    void ensureTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;

        const runtimeWindow = window as TurnstileWindow;
        if (!runtimeWindow.turnstile) {
          setError("No se pudo inicializar Turnstile.");
          return;
        }

        setError(null);
        widgetId = runtimeWindow.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: "dark",
          callback: (token: string) => setClientTurnstileToken(action, token),
          "expired-callback": () => setClientTurnstileToken(action, null),
          "error-callback": () => setClientTurnstileToken(action, null),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError("No se pudo cargar Turnstile. Revisa tu conexion e intenta de nuevo.");
        }
      });

    return () => {
      cancelled = true;
      setClientTurnstileToken(action, null);

      if (widgetId) {
        const runtimeWindow = window as TurnstileWindow;
        if (runtimeWindow.turnstile?.remove) {
          runtimeWindow.turnstile.remove(widgetId);
        }
      }
    };
  }, [action, siteKey]);

  return (
    <div className={className}>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <div ref={containerRef} />
      )}
    </div>
  );
}
