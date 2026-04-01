"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Event } from "@/types";
import { Drawer } from "vaul";
import { TicketSidebar } from "@/components/features/event-detail/TicketSidebar";
import { EventCountdown } from "@/components/features/event-detail/EventCountdown";
import { RelatedEvents } from "@/components/features/event-detail/RelatedEvents";
import { AddToCalendarButton } from "@/components/features/AddToCalendarButton";
import { ReservationTimer } from "@/components/features/event-detail/ReservationTimer";
import { CartButton, CartDrawer } from "@/components/features/CartDrawer";
import { SafeEventImage } from "@/components/features/SafeEventImage";
import { ActionFeedback } from "@vybx/ui";
import {
  SEAT_ACTION_FEEDBACK_EVENT,
  type SeatActionState,
} from "@/hooks/useSeatSelection";
import { formatPrice } from "@/lib/utils";
import { VybxLogo } from "@/components/ui/VybxLogo";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Zap,
  ChevronLeft,
  Share2,
  Heart,
  ShoppingCart,
  Navigation,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLong(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ onCartOpen, eventTitle }: { onCartOpen: () => void; eventTitle?: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`} style={{ zIndex: 100 }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        <VybxLogo size={26} textSize="1.5rem" />
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <CartButton onClick={onCartOpen} />
        <Link href="/" className="btn-secondary event-detail-nav-btn" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1.1rem", fontSize: "0.88rem", textDecoration: "none" }}>
          <ChevronLeft size={15} />
          <span className="event-detail-nav-label">Volver</span>
        </Link>
        <button
          className="btn-secondary event-detail-nav-btn"
          style={{ padding: "0.5rem 1.1rem", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
          onClick={() => {
            if (navigator.share) {
              void navigator.share({ title: eventTitle, url: window.location.href });
            } else {
              void navigator.clipboard.writeText(window.location.href);
              toast.success("Enlace copiado");
            }
          }}
        >
          <Share2 size={15} />
          <span className="event-detail-nav-label">Compartir</span>
        </button>
      </div>
    </nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function EventHero({ event }: { event: Event }) {
  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "62vh",
      minHeight: 420,
      display: "flex",
      alignItems: "flex-end",
      paddingBottom: "3rem",
      overflow: "hidden",
    }}>
      {/* BG image */}
      <SafeEventImage
        src={event.imageUrl}
        alt={event.title}
        loading="eager"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          animation: "slowDrift 20s infinite alternate ease-in-out",
        }}
      />
      {/* Overlays */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(5,5,8,0.97) 35%, rgba(5,5,8,0.55) 70%, rgba(5,5,8,0.2) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,5,8,0.92) 0%, transparent 50%)" }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, padding: "0 5%", width: "100%", maxWidth: 800 }}>
        <div className="badge-featured" style={{ marginBottom: "1.2rem" }}>
          <Zap size={11} />
          {event.isFeatured ? "Destacado" : event.tags[0]}
        </div>

        <h1 style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(2.2rem, 5vw, 4.5rem)",
          fontWeight: 900,
          letterSpacing: "-2px",
          lineHeight: 1.02,
          color: "#fff",
          textShadow: "0 4px 32px rgba(0,0,0,0.6)",
          marginBottom: "1.25rem",
        }}>
          {event.title}
        </h1>

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem 1.5rem", fontSize: "0.92rem", fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <CalendarDays size={14} color="var(--accent-primary)" />
            {formatDateLong(event.startDate)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Clock size={14} color="var(--accent-primary)" />
            {formatTime(event.startDate)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <MapPin size={14} color="var(--accent-primary)" />
            {event.venue.name}, {event.venue.city}
          </span>
        </div>
      </div>

      {/* Wishlist */}
      <button className="event-hero-wishlist" style={{
        position: "absolute",
        top: "8rem",
        right: "2rem",
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 2,
        transition: "background 0.2s",
      }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,42,95,0.2)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
      >
        <Heart size={18} color="rgba(255,255,255,0.7)" />
      </button>
    </div>
  );
}

// ─── Fact Card ────────────────────────────────────────────────────────────────

function FactCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div style={{
      padding: "1rem",
      border: "1px solid var(--glass-border)",
      borderRadius: "var(--radius-xl)",
      background: "rgba(255,255,255,0.02)",
      display: "flex",
      alignItems: "flex-start",
      gap: "0.9rem",
    }}>
      <div style={{
        width: 46,
        height: 46,
        borderRadius: 12,
        background: "rgba(124, 58, 237, 0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: "var(--accent-primary)",
      }}>
        <Icon size={20} />
      </div>
      <div>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.9px" }}>
          {label}
        </p>
        <p style={{ margin: "0.15rem 0 0", fontSize: "0.95rem", fontWeight: 650, color: "var(--text-light)", textTransform: "capitalize" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function EventDetailClient({ event }: { event: Event }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [ticketSheetOpen, setTicketSheetOpen] = useState(false);
  const [seatFeedback, setSeatFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const handleSeatFeedback = (nativeEvent: globalThis.Event) => {
      const customEvent = nativeEvent as CustomEvent<SeatActionState>;
      const payload = customEvent.detail;
      if (!payload || payload.status === "idle" || !payload.message) return;

      setSeatFeedback({
        status: payload.status,
        message: payload.message,
      });
    };

    window.addEventListener(SEAT_ACTION_FEEDBACK_EVENT, handleSeatFeedback as EventListener);
    return () => {
      window.removeEventListener(
        SEAT_ACTION_FEEDBACK_EVENT,
        handleSeatFeedback as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!seatFeedback) return;
    const timer = window.setTimeout(() => setSeatFeedback(null), 4500);
    return () => window.clearTimeout(timer);
  }, [seatFeedback]);

  return (
    <>
      <style>{`
        @keyframes slowDrift {
          0% { transform: scale(1.05); }
          100% { transform: scale(1.15); }
        }

        .event-detail-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(320px, 420px);
          gap: 3rem;
          align-items: start;
          padding: 0 5% 6rem;
          margin-top: -3rem;
          position: relative;
          z-index: 10;
        }

        .mobile-ticket-cta {
          display: none;
        }

        @media (max-width: 900px) {
          .event-detail-grid {
            grid-template-columns: 1fr;
            padding: 0 5% calc(5rem + env(safe-area-inset-bottom));
          }
          .sidebar-sticky {
            display: none;
          }
          .mobile-ticket-cta {
            display: flex;
          }
        }
        @media (max-width: 540px) {
          .event-detail-grid {
            padding: 0 4% 3rem;
          }
          .facts-grid {
            grid-template-columns: 1fr !important;
          }
          .event-detail-nav-btn {
            min-width: 38px;
            justify-content: center;
            padding: 0.5rem !important;
          }
          .event-detail-nav-label {
            display: none;
          }
          .event-hero-wishlist {
            top: 5.25rem !important;
            right: 1rem !important;
            width: 38px !important;
            height: 38px !important;
          }
        }
      `}</style>

      <Navbar onCartOpen={() => setCartOpen(true)} eventTitle={event.title} />
      {seatFeedback && (
        <div style={{ padding: "1rem 5% 0", position: "relative", zIndex: 12 }}>
          <ActionFeedback
            status={seatFeedback.status}
            message={seatFeedback.message}
          />
        </div>
      )}

      <EventHero event={event} />

      <div className="event-detail-grid">
        {/* ── Left: Content ── */}
        <div style={{ paddingTop: "3rem" }}>

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.75rem" }}>
            {event.tags.map((tag) => (
              <span key={tag} style={{
                padding: "0.4rem 1rem",
                borderRadius: "var(--radius-pill)",
                background: "rgba(124, 58, 237, 0.35)",
                border: "1px solid rgba(124, 58, 237, 0.65)",
                color: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "1px",
                backdropFilter: "blur(10px)",
              }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Countdown */}
          <EventCountdown startDate={event.startDate} />

          {/* Facts grid */}
          <div className="facts-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem", marginBottom: "2.5rem" }}>
            <FactCard
              icon={CalendarDays}
              label="Fecha"
              value={formatDateLong(event.startDate)}
            />
            <FactCard
              icon={Clock}
              label="Apertura de puertas"
              value={formatTime(event.doorsOpen)}
            />
            <FactCard
              icon={MapPin}
              label="Lugar"
              value={`${event.venue.name}, ${event.venue.city}`}
            />
            <FactCard
              icon={Users}
              label="Capacidad"
              value={`${event.venue.capacity.toLocaleString()} personas`}
            />
          </div>

          {/* Venue directions */}
          {(event.venue.mapUrl || event.venue.address) && (
            <a
              href={
                event.venue.mapUrl
                  ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue.name}, ${event.venue.address ?? ""}, ${event.venue.city}`)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 1.15rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-pill)",
                color: "var(--text-muted)",
                fontSize: "0.84rem",
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.2s",
                marginBottom: "2rem",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(6,182,212,0.1)";
                e.currentTarget.style.borderColor = "rgba(6,182,212,0.3)";
                e.currentTarget.style.color = "var(--accent-tertiary)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.borderColor = "var(--glass-border)";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              <Navigation size={15} />
              Cómo llegar
            </a>
          )}

          {/* About */}
          <div style={{ maxWidth: "75ch" }}>
            <h2 style={{
              fontSize: "1.2rem",
              fontWeight: 700,
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--text-light)",
              letterSpacing: "-0.2px",
              fontFamily: "var(--font-heading)",
            }}>
              <Zap size={18} color="var(--accent-primary)" />
              Sobre el evento
            </h2>
            <p style={{
              color: "var(--text-muted)",
              fontSize: "1rem",
              lineHeight: 1.85,
              whiteSpace: "pre-wrap",
            }}>
              {event.description}
            </p>

            {/* Add to calendar */}
            <div style={{ marginTop: "1.5rem" }}>
              <AddToCalendarButton
                event={{
                  title: event.title,
                  startDate: event.startDate,
                  endDate: event.endDate,
                  location: `${event.venue.name}, ${event.venue.address ?? ""}, ${event.venue.city}`,
                  description: event.description.slice(0, 300),
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="sidebar-sticky" style={{ position: "sticky", top: 105, alignSelf: "start" }}>
          <TicketSidebar event={event} />
        </div>
      </div>

      {/* ── Related Events ── */}
      <RelatedEvents currentEvent={event} />

      {/* ── Mobile sticky CTA bar ── */}
      <div
        className="mobile-ticket-cta"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 90,
          padding: "0.7rem 1rem calc(0.7rem + env(safe-area-inset-bottom))",
          background: "linear-gradient(to top, rgba(10,10,18,0.98), rgba(10,10,18,0.85))",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid var(--glass-border)",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <div>
          <p style={{
            margin: 0,
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}>
            Desde
          </p>
          <p style={{
            margin: 0,
            fontFamily: "var(--font-heading)",
            fontSize: "1.4rem",
            fontWeight: 800,
            color: "var(--text-light)",
            lineHeight: 1.1,
          }}>
            {formatPrice(
              Math.min(...event.tiers.filter(t => t.stock > 0).map(t => t.price)),
              event.tiers[0]?.currency ?? "USD",
            )}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setTicketSheetOpen(true)}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            whiteSpace: "nowrap",
          }}
        >
          <ShoppingCart size={18} />
          Comprar
        </button>
      </div>

      {/* ── Mobile ticket bottom sheet ── */}
      <Drawer.Root open={ticketSheetOpen} onOpenChange={setTicketSheetOpen}>
        <Drawer.Portal>
          <Drawer.Overlay
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 1300,
            }}
          />
          <Drawer.Content
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1400,
              background: "var(--bg-dark)",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Drag handle */}
            <div style={{
              display: "flex",
              justifyContent: "center",
              padding: "0.75rem 0 0.5rem",
              flexShrink: 0,
            }}>
              <div style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: "var(--glass-border)",
              }} />
            </div>

            <Drawer.Title style={{
              padding: "0 1.25rem 0.75rem",
              fontSize: "1.1rem",
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              color: "var(--text-light)",
              flexShrink: 0,
            }}>
              Seleccionar entradas
            </Drawer.Title>

            <div style={{
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              padding: "0 0.75rem 1.5rem",
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
            }}>
              <TicketSidebar event={event} />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <ReservationTimer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
