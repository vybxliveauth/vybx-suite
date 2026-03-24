"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Event } from "@/types";
import { TicketSidebar } from "@/components/features/event-detail/TicketSidebar";
import { ReservationTimer } from "@/components/features/event-detail/ReservationTimer";
import { CartButton, CartDrawer } from "@/components/features/CartDrawer";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Zap,
  ChevronLeft,
  Share2,
  Heart,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLong(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ onCartOpen }: { onCartOpen: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`} style={{ zIndex: 100 }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
        <Zap size={22} color="var(--accent-primary)" />
        <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.5px", color: "var(--text-light)" }}>
          vybx
        </span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <CartButton onClick={onCartOpen} />
        <Link href="/" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1.1rem", fontSize: "0.88rem", textDecoration: "none" }}>
          <ChevronLeft size={15} />
          Volver
        </Link>
        <button className="btn-secondary" style={{ padding: "0.5rem 1.1rem", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Share2 size={15} />
          Compartir
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
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `url(${event.imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        animation: "slowDrift 20s infinite alternate ease-in-out",
      }} />
      {/* Overlays */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(5,5,8,0.97) 35%, rgba(5,5,8,0.55) 70%, rgba(5,5,8,0.2) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,5,8,0.92) 0%, transparent 50%)" }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, padding: "0 5%", width: "100%", maxWidth: 800 }}>
        <div className="badge-featured" style={{ marginBottom: "1.2rem" }}>
          <Zap size={11} />
          {event.tags[0]}
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
      <button style={{
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

        @media (max-width: 900px) {
          .event-detail-grid {
            grid-template-columns: 1fr;
            padding: 0 5% 4rem;
          }
          .sidebar-sticky {
            position: static !important;
          }
        }
        @media (max-width: 540px) {
          .event-detail-grid {
            padding: 0 4% 3rem;
          }
          .facts-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <Navbar onCartOpen={() => setCartOpen(true)} />

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
          </div>
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="sidebar-sticky" style={{ position: "sticky", top: 105, alignSelf: "start" }}>
          <TicketSidebar event={event} />
        </div>
      </div>

      <ReservationTimer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
