import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://vybxlive.com";

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3004/api/v1";

const REVALIDATE = 3600; // 1 hour

async function fetchAllEvents(): Promise<Array<{ slug?: string; updatedAt?: string }>> {
  const PAGE_SIZE = 100;
  const results: Array<{ slug?: string; updatedAt?: string }> = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `${API_URL}/events?page=${page}&limit=${PAGE_SIZE}&status=APPROVED`,
      { next: { revalidate: REVALIDATE } }
    );
    if (!res.ok) break;
    const data = (await res.json()) as {
      data?: Array<{ slug?: string; updatedAt?: string }>;
      total?: number;
      page?: number;
      pageSize?: number;
    };
    const items = data?.data ?? [];
    results.push(...items);

    const total = data?.total ?? 0;
    const fetched = page * PAGE_SIZE;
    if (fetched >= total || items.length < PAGE_SIZE) break;
    page++;
  }

  return results;
}

async function fetchCategories(): Promise<Array<{ slug?: string; name?: string; updatedAt?: string }>> {
  const res = await fetch(`${API_URL}/categories?limit=100`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    data?: Array<{ slug?: string; name?: string; updatedAt?: string }>;
  };
  return data?.data ?? [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/terminos`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacidad`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  try {
    const [events, categories] = await Promise.all([
      fetchAllEvents(),
      fetchCategories(),
    ]);

    const eventRoutes: MetadataRoute.Sitemap = events
      .filter((e) => e.slug)
      .map((e) => ({
        url: `${BASE_URL}/events/${e.slug}`,
        lastModified: e.updatedAt ? new Date(e.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

    const categoryRoutes: MetadataRoute.Sitemap = categories
      .filter((c) => c.slug || c.name)
      .map((c) => ({
        url: `${BASE_URL}/?categoria=${encodeURIComponent(c.slug ?? c.name ?? "")}`,
        lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));

    return [...staticRoutes, ...eventRoutes, ...categoryRoutes];
  } catch {
    // Graceful fallback — return static routes only if API is unavailable
    return staticRoutes;
  }
}
