import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vybx — Tickets en vivo",
    short_name: "Vybx",
    description: "Descubre y compra tickets para los mejores eventos en vivo. Rápido, seguro y sin complicaciones.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#090913",
    theme_color: "#7c3aed",
    orientation: "portrait-primary",
    categories: ["entertainment", "lifestyle"],
    lang: "es",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mis tickets", short_name: "Tickets", url: "/my-tickets", description: "Ver mis tickets comprados" },
      { name: "Explorar eventos", short_name: "Eventos", url: "/events", description: "Descubrir eventos cerca de ti" },
    ],
    screenshots: [],
  };
}
