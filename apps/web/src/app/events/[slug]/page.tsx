import type { Metadata } from "next";
import { EventDetailRouteClient } from "./EventDetailRouteClient";
import { fetchEventById } from "@/lib/api";

interface Props {
  params: Promise<{ slug: string }>;
}

// Mirrors the logic in EventDetailRouteClient so we can fetch server-side
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

function humanizeSlug(slug: string): string {
  const base = slug.includes("__") ? slug.slice(0, slug.lastIndexOf("__")) : slug;
  const normalized = base.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return "Detalles del evento";
  return normalized.replace(/\b\w/g, (l) => l.toUpperCase());
}

const FALLBACK: Metadata = {
  title: "Evento | Vybx",
  description:
    "Compra tickets para experiencias en vivo. Rápido, seguro y sin complicaciones.",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = extractId(slug);
  if (!id) return { ...FALLBACK, title: `${humanizeSlug(slug)} | Vybx` };

  try {
    const event = await fetchEventById(id);

    const dateStr = new Intl.DateTimeFormat("es-DO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(event.startDate));

    const minPrice =
      event.tiers.length > 0
        ? Math.min(...event.tiers.map((t) => t.price))
        : null;

    const description =
      event.description.trim().slice(0, 155) ||
      `${dateStr} · ${event.venue.name}, ${event.venue.city}${minPrice != null ? ` · Desde $${minPrice}` : ""}`;

    const images = event.imageUrl
      ? [{ url: event.imageUrl, width: 1200, height: 630, alt: event.title }]
      : [];

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vybxlive.com";

    return {
      title: `${event.title} | Vybx`,
      description,
      openGraph: {
        title: event.title,
        description,
        type: "website",
        url: `${siteUrl}/events/${slug}`,
        siteName: "Vybx",
        locale: "es_DO",
        images,
      },
      twitter: {
        card: "summary_large_image",
        title: event.title,
        description,
        images: event.imageUrl ? [event.imageUrl] : [],
      },
    };
  } catch {
    return { ...FALLBACK, title: `${humanizeSlug(slug)} | Vybx` };
  }
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const id = extractId(slug);

  // JSON-LD — schema.org/Event for Google rich results
  let jsonLd: Record<string, unknown> | null = null;
  if (id) {
    try {
      const event = await fetchEventById(id);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vybxlive.com";
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Event",
        name: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        image: event.imageUrl ?? undefined,
        url: `${siteUrl}/events/${slug}`,
        location: {
          "@type": "Place",
          name: event.venue.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: event.venue.address ?? undefined,
            addressLocality: event.venue.city,
            addressCountry: "US",
          },
        },
        offers: event.tiers.map((tier) => ({
          "@type": "Offer",
          name: tier.name,
          price: tier.price,
          priceCurrency: tier.currency ?? "USD",
          availability:
            tier.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/SoldOut",
          url: `${siteUrl}/events/${slug}`,
        })),
        organizer: {
          "@type": "Organization",
          name: "Vybx",
          url: siteUrl,
        },
      };
    } catch {
      // JSON-LD is non-critical — skip silently if API unavailable
    }
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <EventDetailRouteClient slug={slug} />
    </>
  );
}
