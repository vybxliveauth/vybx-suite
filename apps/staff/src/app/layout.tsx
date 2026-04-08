import type { Metadata, Viewport } from "next";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeSyncProvider } from "@/components/providers/ThemeSyncProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vybx Staff — Scanner",
  description: "Acceso del equipo de escaneo",
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeSyncProvider />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
