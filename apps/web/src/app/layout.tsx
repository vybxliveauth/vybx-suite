import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { Footer } from "@/components/features/Footer";
import { resolveApiBaseUrl } from "@vybx/api-client";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

function resolveMetadataBase(): URL {
  const fallback = "http://localhost:3000";
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return new URL(fallback);
  try {
    return new URL(raw);
  } catch {
    return new URL(fallback);
  }
}

export const metadata: Metadata = {
  title: {
    default: "Vybx - Tickets para experiencias en vivo",
    template: "%s | Vybx",
  },
  description:
    "Descubre y compra tickets para los mejores eventos en vivo. Rápido, seguro y sin complicaciones.",
  keywords: [
    "tickets",
    "eventos en vivo",
    "conciertos",
    "festivales",
    "Vybx",
  ],
  metadataBase: resolveMetadataBase(),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_DO",
    siteName: "Vybx",
    title: "Vybx - Tickets para experiencias en vivo",
    description:
      "Descubre y compra tickets para los mejores eventos en vivo. Rápido, seguro y sin complicaciones.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Vybx - Tickets para experiencias en vivo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vybx - Tickets para experiencias en vivo",
    description:
      "Descubre y compra tickets para los mejores eventos en vivo.",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_BASE_URL =
  process.env.API_URL?.trim() ??
  process.env.NEXT_PUBLIC_API_URL?.trim() ??
  "http://localhost:3004/api/v1";

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

async function getMaintenanceModeEnabled(): Promise<boolean> {
  try {
    const baseUrl = resolveApiBaseUrl(API_BASE_URL);
    const response = await fetch(`${baseUrl}/config/MAINTENANCE_MODE`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) return false;
    const payload = (await response.json()) as { value?: string | boolean };
    return parseBoolean(payload?.value, false);
  } catch {
    return false;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const maintenanceModeEnabled = await getMaintenanceModeEnabled();

  return (
    <html
      lang="es"
      className={`${outfit.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="skip-to-main"
        >
          Saltar al contenido
        </a>
        <Providers>
          {maintenanceModeEnabled ? (
            <main
              id="main-content"
              className="flex min-h-screen flex-1 items-center justify-center px-6 py-24"
            >
              <section className="mx-auto w-full max-w-2xl rounded-2xl border border-white/15 bg-black/35 p-8 text-center backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-300">
                  Modo Mantenimiento
                </p>
                <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
                  Estamos mejorando la plataforma
                </h1>
                <p className="mt-4 text-sm text-white/80 sm:text-base">
                  Vybx está temporalmente en mantenimiento. Regresa en unos minutos para continuar
                  comprando tus tickets.
                </p>
              </section>
            </main>
          ) : (
            <>
              {children}
              <Footer />
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}
