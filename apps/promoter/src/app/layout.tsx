import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeSyncProvider } from "@/components/providers/ThemeSyncProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vybx — Panel Promoter",
  description: "Gestiona tus eventos y ventas en Vybx",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        <a href="#main-content" className="skip-to-main">Saltar al contenido</a>
        <ThemeSyncProvider />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
