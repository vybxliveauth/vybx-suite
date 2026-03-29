import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeSyncProvider } from "@/components/providers/ThemeSyncProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VybeTickets — Panel de promotor",
  description: "Gestiona tus eventos y ventas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a href="#main-content" className="skip-to-main">Saltar al contenido</a>
        <ThemeSyncProvider />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
