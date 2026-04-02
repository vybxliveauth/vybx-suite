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
import { Footer } from "@/components/features/Footer";
import {
  CalendarDays,
  Clock,
  MapPin,
  Zap,
  ChevronLeft,
  Share2,
  Heart,
  ShoppingCart,
  Navigation,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLong(iso: string) {
  return new Intl.DateTimeFormat("es-DO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-DO", {
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
          textWrap: "balance",
        }}>
          {event.title}
        </h1>

        {/* Meta row — date+time combined, then venue */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem 1.5rem", fontSize: "0.92rem", fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <CalendarDays size={14} color="var(--accent-primary)" />
            {formatDateLong(event.startDate)} · {formatTime(event.startDate)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <MapPin size={14} color="var(--accent-primary)" />
            {event.venue.name}{event.venue.city ? `, ${event.venue.city}` : ""}
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

// ─── Compact venue + doors-open info card ────────────────────────────────────

function EventInfoCard({ event }: { event: Event }) {
  const mapsUrl = event.venue.mapUrl
    ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      [event.venue.name, event.venue.address, event.venue.city].filter(Boolean).join(", ")
    )}`;
  const hasLocation = !!(event.venue.mapUrl || event.venue.address);

  return (
    <div className="event-info-card">
      {/* Doors open */}
      <div className="event-info-item">
        <span className="event-info-icon">
          <Clock size={16} />
        </span>
        <div>
          <p className="event-info-label">Apertura de puertas</p>
          <p className="event-info-value">{formatTime(event.doorsOpen)}</p>
        </div>
      </div>

      <div className="event-info-divider" />

      {/* Venue address + directions */}
      <div className="event-info-item">
        <span className="event-info-icon">
          <MapPin size={16} />
        </span>
        <div style={{ minWidth: 0 }}>
          <p className="event-info-label">{event.venue.name}</p>
          <p className="event-info-value" style={{ opacity: event.venue.address ? 1 : 0.5 }}>
            {event.venue.address ? `${event.venue.address}, ${event.venue.city}` : event.venue.city}
          </p>
          {hasLocation && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="event-directions-link"
            >
              <Navigation size={11} />
              Cómo llegar
            </a>
          )}
        </div>
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
          .event-info-card {
            flex-direction: column !important;
          }
          .event-info-divider {
            width: 100% !important;
            height: 1px !important;
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
              <span key={tag} className="event-tag">{tag}</span>
            ))}
          </div>

          {/* Countdown */}
          <EventCountdown startDate={event.startDate} />

          {/* Compact info card: doors open + venue/address */}
          <EventInfoCard event={event} />

          {/* About */}
          <div style={{ maxWidth: "75ch", marginTop: "2.5rem" }}>
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
              color: "var(--text-secondary)",
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

      <Footer />

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
            color: "var(--text-secondary)",
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
