import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { Footer } from "@/components/features/Footer";
import { PwaServiceWorker } from "@/components/features/PwaServiceWorker";
import { PwaInstallBanner } from "@/components/features/PwaInstallBanner";
import { resolveServerApiBaseUrl } from "@/lib/api-base-url";
import "./globals.css";

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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#7c3aed" },
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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

const API_BASE_URL = resolveServerApiBaseUrl();

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

type MaintenanceProbe = {
  enabled: boolean;
  source: "ok" | "http_error" | "invalid_payload" | "fetch_error" | "forced_env";
  statusCode?: number;
  baseUrl?: string;
  detail?: string;
};

async function getMaintenanceModeProbe(): Promise<MaintenanceProbe> {
  if (
    parseBoolean(process.env.NEXT_PUBLIC_FORCE_MAINTENANCE_MODE, false) ||
    parseBoolean(process.env.FORCE_MAINTENANCE_MODE, false)
  ) {
    return {
      enabled: true,
      source: "forced_env",
      baseUrl: API_BASE_URL,
      detail: "forced_by_env",
    };
  }

  const baseUrl = API_BASE_URL;
  try {
    const response = await fetch(`${baseUrl}/config/MAINTENANCE_MODE`, {
      cache: "no-store",
      next: { revalidate: 0 },
      headers: {
        accept: "application/json",
        origin: "https://www.vybxlive.com",
        referer: "https://www.vybxlive.com/",
      },
    });

    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      return {
        enabled: false,
        source: "http_error",
        statusCode: response.status,
        baseUrl,
        detail: raw.slice(0, 120),
      };
    }
    const payload = (await response.json()) as { value?: string | boolean };
    if (!Object.prototype.hasOwnProperty.call(payload ?? {}, "value")) {
      return {
        enabled: false,
        source: "invalid_payload",
      };
    }
    return {
      enabled: parseBoolean(payload?.value, false),
      source: "ok",
      statusCode: response.status,
      baseUrl,
    };
  } catch {
    return {
      enabled: false,
      source: "fetch_error",
      baseUrl,
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const maintenanceProbe = await getMaintenanceModeProbe();
  const maintenanceModeEnabled = maintenanceProbe.enabled;

  return (
    <html
      lang="es"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col"
        data-maintenance-mode={maintenanceModeEnabled ? "on" : "off"}
        data-maintenance-source={maintenanceProbe.source}
        data-maintenance-status={maintenanceProbe.statusCode ?? "na"}
        data-maintenance-base={maintenanceProbe.baseUrl ?? "na"}
        data-maintenance-detail={maintenanceProbe.detail ?? "na"}
      >
        <a
          href="#main-content"
          className="skip-to-main"
        >
          Saltar al contenido
        </a>
        <PwaServiceWorker />
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
              <PwaInstallBanner />
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}
