"use client";

import Link from "next/link";
import { ArrowRight, MapPin, Zap } from "lucide-react";
import { useEvents } from "@/hooks/useEvents";
import { Event } from "@/types";
import { formatPrice } from "@/lib/utils";
import { SafeEventImage } from "@/components/features/SafeEventImage";

function RelatedCard({ event }: { event: Event }) {
  const href = `/events/${event.slug}`;
  const date = new Date(event.startDate);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("es-DO", { month: "short" }).toUpperCase();
  const minPrice = event.tiers.length > 0 ? Math.min(...event.tiers.map((t) => t.price)) : null;

  return (
    <Link href={href} style={{ textDecoration: "none", display: "block", minWidth: 260, maxWidth: 320, flex: "0 0 auto" }}>
      <div style={{
        background: "var(--card-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-2xl)",
        overflow: "hidden",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        cursor: "pointer",
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.3)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div style={{ position: "relative", height: 150, overflow: "hidden" }}>
          <SafeEventImage
            src={event.imageUrl}
            alt={event.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,10,18,0.8) 0%, transparent 60%)" }} />
          <div style={{
            position: "absolute",
            top: "0.6rem",
            right: "0.6rem",
            background: "rgba(10,10,18,0.8)",
            backdropFilter: "blur(8px)",
            borderRadius: "var(--radius-md)",
            padding: "0.3rem 0.55rem",
            textAlign: "center",
            lineHeight: 1.1,
          }}>
            <span style={{ display: "block", fontSize: "0.95rem", fontWeight: 800, color: "#fff", fontFamily: "var(--font-heading)" }}>{day}</span>
            <span style={{ display: "block", fontSize: "0.55rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>{month}</span>
          </div>
        </div>

        <div style={{ padding: "1rem 1.15rem 1.1rem" }}>
          <h4 style={{
            fontFamily: "var(--font-heading)",
            fontSize: "0.95rem",
            fontWeight: 800,
            color: "var(--text-light)",
            lineHeight: 1.2,
            marginBottom: "0.35rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {event.title}
          </h4>
          <p style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.76rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
            <MapPin size={11} color="var(--accent-primary)" />
            {event.venue.name}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 800, color: "var(--text-light)" }}>
              {minPrice != null ? formatPrice(minPrice, event.tiers[0].currency) : "—"}
            </span>
            <ArrowRight size={14} color="var(--accent-primary)" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function RelatedEvents({ currentEvent }: { currentEvent: Event }) {
  const { data } = useEvents(1, 50);
  const events = data?.data ?? [];

  // Find events sharing tags or same venue, excluding current
  const related = events
    .filter((e) => e.id !== currentEvent.id)
    .map((e) => {
      let score = 0;
      const currentTags = new Set(currentEvent.tags.map((t) => t.toLowerCase()));
      e.tags.forEach((t) => { if (currentTags.has(t.toLowerCase())) score += 2; });
      if (e.venue.id === currentEvent.venue.id) score += 3;
      return { event: e, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((r) => r.event);

  if (related.length === 0) return null;

  return (
    <section style={{ padding: "0 5% 4rem", position: "relative", zIndex: 10 }}>
      <h2 style={{
        fontFamily: "var(--font-heading)",
        fontSize: "1.25rem",
        fontWeight: 800,
        color: "var(--text-light)",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: "1.25rem",
        letterSpacing: "-0.3px",
      }}>
        <Zap size={18} color="var(--accent-primary)" />
        También te puede interesar
      </h2>

      <div style={{
        display: "flex",
        gap: "1rem",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        paddingBottom: "0.5rem",
        scrollbarWidth: "none",
      }}>
        {related.map((event) => (
          <RelatedCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
