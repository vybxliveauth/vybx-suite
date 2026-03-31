"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setReconnecting(true);
      // Brief delay so user sees the "reconnecting" state
      setTimeout(() => {
        setOffline(false);
        setReconnecting(false);
      }, 800);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    // Check initial state
    if (!navigator.onLine) setOffline(true);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1700,
        padding: "0.65rem 1rem",
        background: reconnecting
          ? "linear-gradient(135deg, rgba(34,197,94,0.95), rgba(22,163,74,0.95))"
          : "linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.6rem",
        fontSize: "0.84rem",
        fontWeight: 600,
        color: "#fff",
        fontFamily: "var(--font-body)",
        transition: "background 0.3s ease",
      }}
    >
      {reconnecting ? (
        <>
          <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} />
          Reconectando...
        </>
      ) : (
        <>
          <WifiOff size={15} />
          Sin conexión a internet
          <button
            onClick={() => window.location.reload()}
            style={{
              marginLeft: "0.5rem",
              padding: "0.25rem 0.7rem",
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "var(--radius-pill)",
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            Reintentar
          </button>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
