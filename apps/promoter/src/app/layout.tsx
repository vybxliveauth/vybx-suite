import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeSyncProvider } from "@/components/providers/ThemeSyncProvider";
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

export const metadata: Metadata = {
  title: "Vybx — Panel Promoter",
  description: "Gestiona tus eventos y ventas en Vybx",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${outfit.variable} ${inter.variable} antialiased`}>
        <a href="#main-content" className="skip-to-main">Saltar al contenido</a>
        <ThemeSyncProvider />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
