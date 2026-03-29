"use client";

import { useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/utils";
import { Event, TicketTier } from "@/types";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Zap,
} from "lucide-react";

// ─── Tier Card ────────────────────────────────────────────────────────────────

function TierCard({
  tier,
  selected,
  onSelect,
}: {
  tier: TicketTier;
  selected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const soldOut = tier.stock === 0;

  return (
    <div
      onClick={soldOut ? undefined : onSelect}
      style={{
        border: `1px solid ${selected ? "var(--accent-secondary)" : "var(--glass-border)"}`,
        background: selected
          ? "rgba(124, 58, 237, 0.12)"
          : "rgba(255,255,255,0.03)",
        boxShadow: selected ? "inset 0 0 0 1px rgba(124,58,237,0.35)" : "none",
        borderRadius: "var(--radius-xl)",
        padding: "0.85rem",
        cursor: soldOut ? "not-allowed" : "pointer",
        opacity: soldOut ? 0.5 : 1,
        transition: "all 0.2s ease",
        position: "relative",
      }}
      onMouseEnter={e => {
        if (!selected && !soldOut) {
          (e.currentTarget as HTMLDivElement).style.background = "var(--glass-bg)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.22)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--glass-border)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }
      }}
    >
      {/* Selected checkmark */}
      {selected && (
        <div style={{
          position: "absolute",
          top: "0.7rem",
          right: "0.7rem",
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "var(--accent-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Check size={12} color="#fff" />
        </div>
      )}

      {/* Tier name + price */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.2rem" }}>
            {tier.name === "VIP" && <Star size={12} color="var(--accent-primary)" fill="var(--accent-primary)" />}
            <span style={{
              fontSize: "0.88rem",
              fontWeight: 700,
              color: "var(--text-light)",
              fontFamily: "var(--font-heading)",
            }}>
              {tier.name}
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {soldOut ? "Agotado" : `${tier.stock.toLocaleString()} disponibles`}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.1rem",
            fontWeight: 800,
            color: "var(--text-light)",
            lineHeight: 1,
          }}>
            {formatPrice(tier.price, tier.currency)}
          </p>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>por persona</span>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4, marginBottom: "0.5rem" }}>
        {tier.description}
      </p>

      {/* Benefits toggle */}
      {tier.benefits.length > 0 && (
        <button
          onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--accent-secondary)",
            fontSize: "0.72rem",
            fontWeight: 600,
            padding: 0,
          }}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? "Ocultar" : "Ver"} beneficios
        </button>
      )}

      {expanded && (
        <ul style={{ marginTop: "0.6rem", paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {tier.benefits.map((b) => (
            <li key={b} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              <Check size={11} color="var(--accent-secondary)" />
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Quantity Picker ──────────────────────────────────────────────────────────

function QuantityPicker({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0",
      border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-pill)",
      overflow: "hidden",
      width: "fit-content",
    }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        style={{
          width: 38,
          height: 38,
          background: "transparent",
          border: "none",
          cursor: value <= min ? "not-allowed" : "pointer",
          color: value <= min ? "var(--text-muted)" : "var(--text-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { if (value > min) (e.currentTarget as HTMLButtonElement).style.background = "var(--glass-bg)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <Minus size={14} />
      </button>
      <span style={{
        width: 40,
        textAlign: "center",
        fontFamily: "var(--font-heading)",
        fontWeight: 800,
        fontSize: "1rem",
        color: "var(--text-light)",
        userSelect: "none",
      }}>
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        style={{
          width: 38,
          height: 38,
          background: "transparent",
          border: "none",
          cursor: value >= max ? "not-allowed" : "pointer",
          color: value >= max ? "var(--text-muted)" : "var(--text-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { if (value < max) (e.currentTarget as HTMLButtonElement).style.background = "var(--glass-bg)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function TicketSidebar({ event }: { event: Event }) {
  const [selectedTierId, setSelectedTierId] = useState<string>(
    event.tiers.find((t) => t.stock > 0)?.id ?? event.tiers[0].id
  );
  const [quantity, setQuantity] = useState(1);
  const [cartWarning, setCartWarning] = useState<string | null>(null);
  const { addItem, clearCart, session } = useCartStore();

  const selectedTier = event.tiers.find((t) => t.id === selectedTierId)!;
  const subtotal = selectedTier.price * quantity;
  const fees = Math.round(subtotal * 0.05);
  const total = subtotal + fees;

  const alreadyInCart = session?.items.some(
    (i) => i.tierId === selectedTierId && i.eventId === event.id
  );
  const cartRootEvent = session?.items[0];
  const cartHasDifferentEvent = Boolean(
    cartRootEvent && cartRootEvent.eventId !== event.id
  );

  function buildCurrentCartItem() {
    return {
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.startDate,
      tierId: selectedTier.id,
      tierName: selectedTier.name,
      quantity,
      unitPrice: selectedTier.price,
      currency: selectedTier.currency,
    };
  }

  function handleAddToCart() {
    const result = addItem(buildCurrentCartItem());
    if (!result.ok && result.reason === "DIFFERENT_EVENT") {
      setCartWarning(
        `Tu carrito ya contiene entradas de "${result.currentEventTitle}". Finaliza o vacía el carrito antes de cambiar de evento.`
      );
      return;
    }
    setCartWarning(null);
  }

  function handleReplaceCartEvent() {
    clearCart();
    const result = addItem(buildCurrentCartItem());
    if (!result.ok && result.reason === "DIFFERENT_EVENT") {
      setCartWarning(
        `No se pudo cambiar el carrito al nuevo evento. Intenta de nuevo.`
      );
      return;
    }
    setCartWarning(null);
  }

  return (
    <div style={{
      background: "var(--card-bg)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-2xl)",
      padding: "1.6rem",
      boxShadow: "0 24px 46px rgba(0,0,0,0.28)",
      position: "relative",
    }}>
      {/* Ticket punch-out decoration */}
      <div style={{ position: "absolute", top: "50%", left: -8, width: 16, height: 16, borderRadius: "50%", background: "var(--bg-dark)", border: "1px solid var(--glass-border)", transform: "translateY(-50%)" }} />
      <div style={{ position: "absolute", top: "50%", right: -8, width: 16, height: 16, borderRadius: "50%", background: "var(--bg-dark)", border: "1px solid var(--glass-border)", transform: "translateY(-50%)" }} />

      {/* Price header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontSize: "clamp(2rem, 4vw, 2.5rem)", fontFamily: "var(--font-heading)", fontWeight: 800, color: "var(--text-light)", lineHeight: 1 }}>
            {formatPrice(selectedTier.price, selectedTier.currency)}
          </p>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
            precio por persona
          </p>
        </div>
        {selectedTier.stock < 100 && selectedTier.stock > 0 && (
          <span className="badge-demand" style={{ fontSize: "0.7rem" }}>
            ¡Últimos {selectedTier.stock}!
          </span>
        )}
      </div>

      {/* Dashed divider */}
      <div style={{ borderTop: "1px dashed var(--glass-border)", margin: "0 -1.6rem 1.35rem -1.6rem" }} />

      {/* Tier selection */}
      <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-light)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <Zap size={14} color="var(--accent-primary)" />
        Tipo de entrada
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.5rem" }}>
        {event.tiers.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            selected={tier.id === selectedTierId}
            onSelect={() => { setSelectedTierId(tier.id); setQuantity(1); }}
          />
        ))}
      </div>

      {/* Dashed divider */}
      <div style={{ borderTop: "1px dashed var(--glass-border)", margin: "0 -1.6rem 1.35rem -1.6rem" }} />

      {/* Quantity */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-light)" }}>
          Cantidad
          <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.4rem" }}>
            (máx. {selectedTier.maxPerOrder})
          </span>
        </p>
        <QuantityPicker
          value={quantity}
          min={1}
          max={selectedTier.maxPerOrder}
          onChange={setQuantity}
        />
      </div>

      {/* Price breakdown */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-lg)",
        padding: "0.85rem 1rem",
        marginBottom: "1.25rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.45rem" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            {quantity} × {formatPrice(selectedTier.price, selectedTier.currency)}
          </span>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            {formatPrice(subtotal, selectedTier.currency)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", marginBottom: "0.6rem", borderBottom: "1px solid var(--glass-border)" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Cargo por servicio (5%)</span>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{formatPrice(fees, selectedTier.currency)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-light)" }}>Total</span>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", fontWeight: 800, color: "var(--text-light)" }}>
            {formatPrice(total, selectedTier.currency)}
          </span>
        </div>
      </div>

      {/* CTA */}
      <button
        className="btn-primary"
        onClick={handleAddToCart}
        style={{ width: "100%", justifyContent: "center", padding: "0.9rem 1.5rem", fontSize: "1rem" }}
        disabled={selectedTier.stock === 0 || cartHasDifferentEvent}
      >
        <ShoppingCart size={18} />
        {cartHasDifferentEvent
          ? "Carrito de otro evento"
          : alreadyInCart
            ? "Actualizar reserva"
            : "Reservar ahora"}
      </button>

      {(cartWarning || cartHasDifferentEvent) && (
        <>
          <p style={{ marginTop: "0.75rem", fontSize: "0.74rem", color: "#fda4af", display: "flex", gap: "0.35rem", alignItems: "flex-start", lineHeight: 1.35 }}>
            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            {cartWarning ??
              `Tu carrito ya tiene entradas de "${cartRootEvent?.eventTitle}". Solo se permite un evento por checkout.`}
          </p>
          {cartHasDifferentEvent && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleReplaceCartEvent}
              style={{
                width: "100%",
                justifyContent: "center",
                marginTop: "0.6rem",
                padding: "0.7rem 1rem",
                fontSize: "0.82rem",
              }}
            >
              Vaciar carrito y cambiar evento
            </button>
          )}
        </>
      )}

      <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
        Tu reserva se guarda por 10 minutos · Sin cargos hasta confirmar
      </p>
    </div>
  );
}
