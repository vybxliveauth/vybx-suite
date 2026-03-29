"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { Clock, X } from "lucide-react";
import { FlipCountdown } from "@/components/features/FlipCountdown";

export function ReservationTimer() {
  const { session, remainingSeconds, clearCart, isReservationActive } = useCartStore();
  const [seconds, setSeconds] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!session) {
      setVisible(false);
      setSeconds(0);
      return;
    }

    // Sync immediately to avoid a transient "expired" state on fresh reservations.
    setSeconds(remainingSeconds());
    setVisible(true);
    const id = setInterval(() => {
      setSeconds(remainingSeconds());
    }, 500);
    return () => clearInterval(id);
  }, [session, remainingSeconds]);

  if (!visible || !session) return null;

  const isExpired = session.isExpired || !isReservationActive();
  const isUrgent = seconds < 120 && !isExpired; // under 2 min

  return (
    <div style={{
      position: "fixed",
      bottom: "1.5rem",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 200,
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.75rem 1.25rem",
      borderRadius: "var(--radius-pill)",
      background: isExpired
        ? "rgba(244, 63, 94, 0.15)"
        : isUrgent
          ? "rgba(244, 63, 94, 0.12)"
          : "rgba(20, 20, 28, 0.85)",
      border: `1px solid ${isExpired || isUrgent ? "rgba(244,63,94,0.5)" : "rgba(255,255,255,0.12)"}`,
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      boxShadow: isUrgent || isExpired
        ? "0 8px 32px rgba(244,63,94,0.25)"
        : "0 8px 32px rgba(0,0,0,0.4)",
      minWidth: 260,
      animation: "fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
    }}>
      <Clock
        size={16}
        color={isExpired || isUrgent ? "#ffd4dd" : "var(--accent-primary)"}
        style={{ flexShrink: 0, ...(isUrgent && !isExpired ? { animation: "pulse 1s infinite" } : {}) }}
      />

      <div style={{ flex: 1 }}>
        {isExpired ? (
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#ffd4dd" }}>
            Tu reserva expiró — los tickets fueron liberados
          </span>
        ) : (
          <>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", lineHeight: 1.2 }}>
              Tu reserva expira en
            </span>
            <span style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.1rem",
              fontWeight: 800,
              color: isUrgent ? "#ffd4dd" : "var(--text-light)",
              letterSpacing: "0.5px",
              display: "inline-flex",
            }}>
              <FlipCountdown seconds={seconds} urgent={isUrgent} />
            </span>
          </>
        )}
      </div>

      {isReservationActive() && (
        <div style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
        }}>
          <span style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            borderRight: "1px solid var(--glass-border)",
            paddingRight: "0.5rem",
          }}>
            {session.items.reduce((a, i) => a + i.quantity, 0)} tickets
          </span>
        </div>
      )}

      <button
        onClick={clearCart}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          padding: "0.2rem",
          borderRadius: "50%",
          transition: "color 0.2s",
        }}
        title="Cancel reservation"
        onMouseEnter={e => (e.currentTarget.style.color = "var(--text-light)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
      >
        <X size={15} />
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
