import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeSyncProvider } from "@/components/providers/ThemeSyncProvider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

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
      <body className={`${outfit.variable} ${inter.variable} antialiased`}>
        <ThemeSyncProvider />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
