import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { Footer } from "@/components/features/Footer";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
