"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEvent } from "@/hooks/useEvents";
import { EventDetailClient } from "./EventDetailClient";

function extractId(slug: string): string | null {
  const delimiter = "__";
  if (slug.includes(delimiter)) {
    const encodedId = slug.slice(slug.lastIndexOf(delimiter) + delimiter.length);
    if (encodedId.length > 0) {
      try {
        return decodeURIComponent(encodedId);
      } catch {
        return encodedId;
      }
    }
  }

  const fullUuidRegex =
    /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
  const match = slug.match(fullUuidRegex);
  if (match?.[1]) return match[1];
  if (fullUuidRegex.test(slug)) return slug;
  return null;
}

function EventMissingState() {
  return (
    <div
      style={{
        minHeight: "65vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Evento no encontrado</h1>
      <p style={{ color: "var(--text-muted)", maxWidth: 420 }}>
        El enlace del evento no es valido o ya no esta disponible.
      </p>
      <Link href="/" className="btn-primary" style={{ textDecoration: "none" }}>
        <ArrowLeft size={16} /> Volver al inicio
      </Link>
    </div>
  );
}

export function EventDetailRouteClient({ slug }: { slug: string }) {
  const eventId = useMemo(() => extractId(slug), [slug]);
  const query = useEvent(eventId ?? "");

  if (!eventId) {
    return <EventMissingState />;
  }

  if (query.isLoading) {
    return (
      <div
        style={{
          minHeight: "65vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.65rem",
          color: "var(--text-muted)",
        }}
      >
        <Loader2 size={18} className="animate-spin" />
        Cargando evento...
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <EventMissingState />;
  }

  return <EventDetailClient event={query.data} />;
}

