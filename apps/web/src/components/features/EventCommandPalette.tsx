"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Calendar,
  Home,
  MapPin,
  ReceiptText,
  Search,
  Sparkles,
  Ticket,
} from "lucide-react";
import { Event } from "@/types";
import { formatPrice } from "@/lib/utils";

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
  });
}

function minPriceLabel(event: Event) {
  if (!event.tiers.length) return "Gratis";
  const min = Math.min(...event.tiers.map((tier) => tier.price));
  return formatPrice(min, event.tiers[0].currency);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function scoreEvent(event: Event, rawQuery: string) {
  const query = normalizeText(rawQuery);
  const title = normalizeText(event.title);
  const venue = normalizeText(event.venue.name);
  const city = normalizeText(event.venue.city || "");
  const tags = event.tags.map(normalizeText);

  // Default ordering when no query: featured/live first, then near upcoming.
  if (!query) {
    const now = Date.now();
    const eventTime = new Date(event.startDate).getTime();
    const diffDays = Math.floor((eventTime - now) / (1000 * 60 * 60 * 24));
    let score = 0;
    if (event.isFeatured) score += 60;
    score += Math.min(45, Math.max(0, (event.trendingScore ?? 0) / 4));
    if (event.status === "live") score += 45;
    if (diffDays >= 0) score += Math.max(0, 25 - Math.min(25, diffDays));
    return score;
  }

  let score = 0;
  if (title === query) score += 180;
  if (title.startsWith(query)) score += 110;
  if (title.includes(query)) score += 70;
  if (venue.startsWith(query)) score += 55;
  if (venue.includes(query)) score += 30;
  if (city.startsWith(query)) score += 35;
  if (city.includes(query)) score += 18;
  if (tags.some((tag) => tag === query)) score += 45;
  if (tags.some((tag) => tag.includes(query))) score += 22;

  if (score > 0) {
    if (event.isFeatured) score += 10;
    score += Math.min(20, Math.max(0, (event.trendingScore ?? 0) / 8));
    if (event.status === "live") score += 8;
  }

  return score;
}

export function EventCommandPalette({
  events,
  open,
  onOpenChange,
}: {
  events: Event[];
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      } else if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const filteredEvents = useMemo(() => {
    return events
      .map((event) => ({
        event,
        score: scoreEvent(event, query),
      }))
      .filter(({ score }) => {
        if (!query.trim()) return true;
        return score > 0;
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.event.startDate).getTime() - new Date(b.event.startDate).getTime();
      })
      .slice(0, 8)
      .map(({ event }) => event);
  }, [events, query]);

  const topResult = filteredEvents[0] ?? null;

  if (!open) return null;

  return (
    <>
      <div
        onClick={() => onOpenChange(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2200,
          background: "rgba(4,6,12,0.72)",
          backdropFilter: "blur(8px)",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: "10vh",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(760px, calc(100vw - 1.5rem))",
          zIndex: 2201,
          borderRadius: "var(--radius-2xl)",
          background: "var(--bg-dark)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        <Command
          label="Búsqueda de eventos"
          shouldFilter={false}
          style={{ width: "100%" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.82rem 0.95rem",
              borderBottom: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <Search size={16} color="var(--text-muted)" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Busca eventos por artista, ciudad, venue o categoría..."
              autoFocus
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                color: "var(--text-light)",
                fontSize: "0.95rem",
                fontFamily: "var(--font-body)",
              }}
            />
            <span
              style={{
                fontSize: "0.68rem",
                color: "var(--text-muted)",
                border: "1px solid var(--glass-border)",
                borderRadius: 999,
                padding: "0.15rem 0.45rem",
                whiteSpace: "nowrap",
              }}
            >
              Esc
            </span>
          </div>

          <Command.List style={{ maxHeight: "65vh", overflowY: "auto", padding: "0.45rem" }}>
            <Command.Empty
              style={{
                padding: "1.4rem 0.85rem",
                color: "var(--text-muted)",
                fontSize: "0.86rem",
                textAlign: "center",
              }}
            >
              No encontramos eventos con ese término.
            </Command.Empty>

            <Command.Group
              heading="Eventos"
              style={{
                padding: "0.4rem 0.35rem",
              }}
            >
              {filteredEvents.map((event) => (
                <Command.Item
                  key={event.id}
                  value={`${event.title} ${event.venue.name} ${event.venue.city} ${event.tags.join(" ")}`}
                  onSelect={() => {
                    onOpenChange(false);
                    router.push(`/events/${event.slug}`);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.7rem",
                    padding: "0.72rem",
                    borderRadius: "var(--radius-lg)",
                    cursor: "pointer",
                    marginBottom: "0.2rem",
                    border: "1px solid transparent",
                    transition: "background 0.16s ease, border-color 0.16s ease",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: "var(--text-light)",
                        marginBottom: "0.2rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {event.title}
                    </p>
                    <p
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                        <MapPin size={12} />
                        {event.venue.city || event.venue.name}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                        <Calendar size={12} />
                        {formatShortDate(event.startDate)}
                      </span>
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-secondary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {minPriceLabel(event)}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>

            <div style={{ borderTop: "1px solid var(--glass-border)", margin: "0.35rem 0.4rem 0.2rem" }} />

            <Command.Group heading="Accesos rápidos" style={{ padding: "0.4rem 0.35rem 0.2rem" }}>
              {topResult && query.trim() && (
                <Command.Item
                  value="mejor-resultado abrir"
                  onSelect={() => {
                    onOpenChange(false);
                    router.push(`/events/${topResult.slug}`);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    padding: "0.7rem",
                    borderRadius: "var(--radius-lg)",
                    cursor: "pointer",
                    color: "var(--text-light)",
                  }}
                >
                  <Sparkles size={14} /> Abrir mejor resultado
                </Command.Item>
              )}
              <Command.Item
                value="inicio"
                onSelect={() => {
                  onOpenChange(false);
                  router.push("/");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.7rem",
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                  color: "var(--text-light)",
                }}
              >
                <Home size={14} /> Ir al inicio
              </Command.Item>
              <Command.Item
                value="checkout"
                onSelect={() => {
                  onOpenChange(false);
                  router.push("/checkout");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.7rem",
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                  color: "var(--text-light)",
                }}
              >
                <ReceiptText size={14} /> Ir a checkout
              </Command.Item>
              <Command.Item
                value="mis tickets"
                onSelect={() => {
                  onOpenChange(false);
                  router.push("/my-tickets");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.7rem",
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                  color: "var(--text-light)",
                }}
              >
                <Ticket size={14} /> Ver mis tickets
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </>
  );
}
