import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://vybxlive.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/terminos`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/privacidad`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  // Fetch published events for dynamic routes
  try {
    const apiUrl =
      process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3004/api/v1";
    const res = await fetch(`${apiUrl}/events?limit=200`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        data?: Array<{ slug?: string; updatedAt?: string }>;
      };
      const events = data?.data ?? [];
      const eventRoutes: MetadataRoute.Sitemap = events
        .filter((e) => e.slug)
        .map((e) => ({
          url: `${BASE_URL}/events/${e.slug}`,
          lastModified: e.updatedAt ? new Date(e.updatedAt) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }));
      return [...staticRoutes, ...eventRoutes];
    }
  } catch {
    // Graceful fallback — return static routes only if API is unavailable
  }

  return staticRoutes;
}
