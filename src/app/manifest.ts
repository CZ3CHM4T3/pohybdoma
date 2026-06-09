import type { MetadataRoute } from "next";

// PWA manifest – umožní „Přidat na plochu" a spuštění jako aplikace.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "POHYB DOMA",
    short_name: "POHYB DOMA",
    description: "Cvič doma, naprav si tělo a vrať si svobodu pohybu. Tvoje cesta na jednom místě.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#062A6B",
    lang: "cs",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
