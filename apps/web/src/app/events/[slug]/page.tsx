import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchEventById } from "@/lib/api";
import { EventDetailClient } from "./EventDetailClient";

interface Props {
  params: Promise<{ slug: string }>;
}

// Extract backend event ID from slug format "event-title__<encoded-id>".
// Keeps backward compatibility with legacy UUID-tail slugs.
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

async function getEvent(slug: string) {
  // Fetch from backend by id encoded in slug.
  const eventId = extractId(slug);
  if (!eventId) return null;

  try {
    return await fetchEventById(eventId);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: "Evento no encontrado" };
  return {
    title: event.title,
    description: event.description.slice(0, 155),
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();
  return <EventDetailClient event={event} />;
}
