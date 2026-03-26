"use client";

import Link from "next/link";
import { Event } from "@/types";

// ─── Single marquee item ──────────────────────────────────────────────────────

function MarqueeItem({ event }: { event: Event }) {
  const date = new Date(event.startDate);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("es", { month: "short" }).toUpperCase();

  return (
    <Link
      href={`/events/${event.slug}`}
      style={{ textDecoration: "none", flexShrink: 0 }}
    >
      <div
        style={{
          position: "relative",
          width: 220,
          height: 140,
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          cursor: "pointer",
          transition: "transform 0.35s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.35s ease, border-color 0.35s ease",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(-6px) scale(1.03)";
          el.style.boxShadow = "0 24px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(124,58,237,0.5)";
          el.style.borderColor = "rgba(124,58,237,0.5)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(0) scale(1)";
          el.style.boxShadow = "none";
          el.style.borderColor = "rgba(255,255,255,0.08)";
        }}
      >
        {/* Background image */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${event.thumbnailUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "transform 0.5s ease",
        }} />

        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.1) 100%)",
        }} />

        {/* Date badge */}
        <div style={{
          position: "absolute", top: 10, left: 11,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: "3px 9px",
          display: "flex",
          alignItems: "baseline",
          gap: 3,
        }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
            {day}
          </span>
          <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "var(--accent-primary)" }}>
            {month}
          </span>
        </div>

        {/* Live badge */}
        {event.status === "live" && (
          <div style={{
            position: "absolute", top: 10, right: 10,
            background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
            borderRadius: "var(--radius-pill)",
            padding: "2px 8px",
            fontSize: "0.65rem",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "0.3px",
          }}>
            LIVE
          </div>
        )}

        {/* Event info */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0.6rem 0.75rem" }}>
          <p style={{
            fontFamily: "var(--font-heading)",
            fontSize: "0.88rem",
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.2,
            marginBottom: "0.2rem",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}>
            {event.title}
          </p>
          <p style={{
            fontSize: "0.68rem",
            color: "rgba(255,255,255,0.6)",
            fontWeight: 500,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}>
            {event.venue.city || event.venue.name}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ─── EventMarquee ─────────────────────────────────────────────────────────────

export function EventMarquee({ events }: { events: Event[] }) {
  if (events.length === 0) return null;
  const displayed = events;

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "2rem 0",
        background: "var(--glass-bg)",
        borderTop: "1px solid var(--glass-border)",
        borderBottom: "1px solid var(--glass-border)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
      }}
      onMouseEnter={e => {
        e.currentTarget.querySelectorAll<HTMLDivElement>("[data-track]").forEach(el => {
          el.style.animationPlayState = "paused";
        });
      }}
      onMouseLeave={e => {
        e.currentTarget.querySelectorAll<HTMLDivElement>("[data-track]").forEach(el => {
          el.style.animationPlayState = "running";
        });
      }}
    >
      {/* Left gradient mask */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: "12%", zIndex: 2,
        background: "linear-gradient(to right, var(--bg-dark), transparent)",
        pointerEvents: "none",
      }} />
      {/* Right gradient mask */}
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: "12%", zIndex: 2,
        background: "linear-gradient(to left, var(--bg-dark), transparent)",
        pointerEvents: "none",
      }} />

      <div data-track style={{ display: "flex", gap: "1rem", animation: `marquee ${Math.max(30, displayed.length * 6)}s linear infinite`, willChange: "transform" }}>
        {[...displayed, ...displayed].map((event, i) => (
          <MarqueeItem key={`${event.id}-${i}`} event={event} />
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
