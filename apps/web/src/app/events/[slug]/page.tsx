import type { Metadata } from "next";
import { EventDetailRouteClient } from "./EventDetailRouteClient";

interface Props {
  params: Promise<{ slug: string }>;
}

function humanizeSlug(slug: string): string {
  const base = slug.includes("__") ? slug.slice(0, slug.lastIndexOf("__")) : slug;
  const normalized = base
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "Detalle de evento";
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = humanizeSlug(slug);
  return {
    title: `${title} | Vybx`,
    description: "Detalles del evento, tickets disponibles y compra segura en Vybx.",
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  return <EventDetailRouteClient slug={slug} />;
}
