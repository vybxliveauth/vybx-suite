"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice, formatCountdown } from "@/lib/utils";
import {
  X,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Clock,
  ArrowRight,
  Ticket,
} from "lucide-react";

// ─── Cart Drawer ──────────────────────────────────────────────────────────────

export function CartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { session, removeItem, updateQuantity, clearCart, remainingSeconds, isReservationActive } =
    useCartStore();
  const [seconds, setSeconds] = useState(0);

  // Live countdown
  useEffect(() => {
    if (!session || session.isExpired) return;
    setSeconds(remainingSeconds());
    const id = setInterval(() => setSeconds(remainingSeconds()), 500);
    return () => clearInterval(id);
  }, [session, remainingSeconds]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const items = session?.items ?? [];
  const isEmpty = items.length === 0;
  const isExpired = session?.isExpired ?? false;
  const isUrgent = seconds < 120 && seconds > 0 && !isExpired;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1100,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 1200,
          width: "min(420px, 100vw)",
          background: "var(--bg-dark)",
          borderLeft: "1px solid var(--glass-border)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid var(--glass-border)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <ShoppingCart size={18} color="var(--accent-primary)" />
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-light)" }}>
              Tu carrito
            </span>
            {items.length > 0 && (
              <span style={{
                background: "var(--accent-primary)",
                color: "#fff",
                fontSize: "0.7rem",
                fontWeight: 700,
                borderRadius: "var(--radius-pill)",
                padding: "0.1rem 0.5rem",
              }}>
                {items.reduce((a, i) => a + i.quantity, 0)}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: "50%",
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-muted)",
              transition: "color 0.2s, background 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-light)"; e.currentTarget.style.background = "var(--card-bg)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "var(--glass-bg)"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Timer bar */}
        {session && !isEmpty && (
          <div style={{
            padding: "0.65rem 1.5rem",
            background: isExpired
              ? "rgba(244,63,94,0.1)"
              : isUrgent
                ? "rgba(244,63,94,0.08)"
                : "rgba(124,58,237,0.08)",
            borderBottom: `1px solid ${isExpired || isUrgent ? "rgba(244,63,94,0.25)" : "rgba(124,58,237,0.2)"}`,
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            flexShrink: 0,
          }}>
            <Clock size={14} color={isExpired || isUrgent ? "#fda4af" : "var(--accent-secondary)"} />
            {isExpired ? (
              <span style={{ fontSize: "0.8rem", color: "#fda4af", fontWeight: 600 }}>
                Reserva expirada — los tickets fueron liberados
              </span>
            ) : (
              <span style={{ fontSize: "0.8rem", color: isUrgent ? "#fda4af" : "var(--text-muted)" }}>
                Reserva expira en{" "}
                <strong style={{ color: isUrgent ? "#fda4af" : "var(--text-light)", fontFamily: "var(--font-heading)" }}>
                  {formatCountdown(seconds)}
                </strong>
              </span>
            )}
          </div>
        )}

        {/* Items */}
        <div className="cart-drawer-content" style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
          {isEmpty ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1rem", paddingBottom: "4rem" }}>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--glass-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Ticket size={28} color="var(--text-muted)" />
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center" }}>
                Tu carrito está vacío.<br />Selecciona un evento para empezar.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {items.map((item) => (
                <div
                  key={`${item.eventId}-${item.tierId}`}
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-xl)",
                    padding: "1rem",
                  }}
                >
                  {/* Event + tier */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div>
                      <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-light)", marginBottom: "0.2rem", lineHeight: 1.3 }}>
                        {item.eventTitle}
                      </p>
                      <span style={{
                        fontSize: "0.72rem",
                        background: "rgba(124,58,237,0.15)",
                        border: "1px solid rgba(124,58,237,0.3)",
                        color: "#c4b5fd",
                        borderRadius: "var(--radius-pill)",
                        padding: "0.15rem 0.55rem",
                        fontWeight: 600,
                      }}>
                        {item.tierName}
                      </span>
                    </div>
                    <button
                      onClick={() => removeItem(item.tierId, item.eventId)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        padding: "0.2rem",
                        display: "flex",
                        borderRadius: "var(--radius-sm)",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#f43f5e")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Qty + price */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {/* Quantity controls */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid var(--glass-border)",
                      borderRadius: "var(--radius-pill)",
                      overflow: "hidden",
                    }}>
                      <button
                        onClick={() => updateQuantity(item.tierId, item.eventId, item.quantity - 1)}
                        style={{ width: 32, height: 32, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ width: 28, textAlign: "center", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-light)" }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.tierId, item.eventId, item.quantity + 1)}
                        style={{ width: 32, height: 32, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <p style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 800, color: "var(--text-light)" }}>
                      {formatPrice(item.unitPrice * item.quantity, item.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isEmpty && (
          <div style={{
            padding: "1.25rem 1.5rem",
            borderTop: "1px solid var(--glass-border)",
            flexShrink: 0,
            background: "var(--bg-fade)",
          }}>
            {/* Price breakdown */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Subtotal</span>
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  {formatPrice(session!.subtotal, session!.currency)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.65rem", marginBottom: "0.65rem", borderBottom: "1px solid var(--glass-border)" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Cargo por servicio (5%)</span>
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  {formatPrice(session!.fees, session!.currency)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-light)" }}>Total</span>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", fontWeight: 800, color: "var(--text-light)" }}>
                  {formatPrice(session!.total, session!.currency)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <Link
                href="/checkout"
                onClick={onClose}
                className="btn-primary"
                style={{ justifyContent: "center", padding: "0.9rem 1.5rem", fontSize: "0.95rem", textDecoration: "none" }}
              >
                Ir al checkout <ArrowRight size={16} />
              </Link>
              <button
                onClick={clearCart}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  padding: "0.4rem",
                  transition: "color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#f43f5e")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                Vaciar carrito
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Cart Button (for Navbar) ─────────────────────────────────────────────────

export function CartButton({ onClick }: { onClick: () => void }) {
  const { session } = useCartStore();
  const count = session?.items.reduce((a, i) => a + i.quantity, 0) ?? 0;
  const hasItems = count > 0;

  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        background: hasItems ? "rgba(255,42,95,0.1)" : "var(--glass-bg)",
        border: `1px solid ${hasItems ? "rgba(255,42,95,0.35)" : "var(--glass-border)"}`,
        borderRadius: "var(--radius-pill)",
        padding: "0.5rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        cursor: "pointer",
        color: hasItems ? "var(--accent-primary)" : "var(--text-muted)",
        fontSize: "0.88rem",
        fontWeight: 600,
        transition: "all 0.2s ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-primary)"; e.currentTarget.style.color = "var(--accent-primary)"; }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = hasItems ? "rgba(255,42,95,0.35)" : "var(--glass-border)";
        e.currentTarget.style.color = hasItems ? "var(--accent-primary)" : "var(--text-muted)";
      }}
    >
      <ShoppingCart size={16} />
      {hasItems ? `${count} ticket${count > 1 ? "s" : ""}` : "Carrito"}
      {hasItems && (
        <span style={{
          position: "absolute",
          top: -6,
          right: -6,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "var(--accent-primary)",
          color: "#fff",
          fontSize: "0.65rem",
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid var(--bg-dark)",
        }}>
          {count}
        </span>
      )}
    </button>
  );
}
