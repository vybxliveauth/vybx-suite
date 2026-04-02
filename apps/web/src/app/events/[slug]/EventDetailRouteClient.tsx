"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useEvent } from "@/hooks/useEvents";
import { EventDetailClient } from "./EventDetailClient";
import { PageLoadingState } from "@/components/features/StateSurface";

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
    <main id="main-content" className="page-state-shell" style={{ minHeight: "65vh" }}>
      <section className="page-state-card" style={{ maxWidth: 560 }}>
      <h1 className="auth-title" style={{ marginBottom: "0.55rem" }}>Evento no encontrado</h1>
      <p className="auth-subtitle" style={{ maxWidth: 420, margin: "0 auto" }}>
        El enlace del evento no es valido o ya no esta disponible.
      </p>
      <Link href="/" className="btn-primary" style={{ textDecoration: "none", marginTop: "1rem" }}>
        <ArrowLeft size={16} /> Volver al inicio
      </Link>
      </section>
    </main>
  );
}

export function EventDetailRouteClient({ slug }: { slug: string }) {
  const eventId = useMemo(() => extractId(slug), [slug]);
  const query = useEvent(eventId ?? "");

  if (!eventId) {
    return <EventMissingState />;
  }

  if (query.isLoading) {
    return <PageLoadingState title="Cargando evento" message="Estamos preparando los detalles..." />;
  }

  if (query.isError || !query.data) {
    return <EventMissingState />;
  }

  return (
    <main id="main-content">
      <EventDetailClient event={query.data} />
    </main>
  );
}
