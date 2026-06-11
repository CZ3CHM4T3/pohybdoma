import type { MetadataRoute } from "next";
import { SITE_GATE_CODE } from "@/lib/gate";

const BASE = "https://pohybdoma.cz";

// Privátní soukromé/členské cesty – ty se neindexují ani po spuštění naveřejno.
const PRIVATE = [
  "/ucet", "/admin", "/klub", "/denik", "/buddies", "/odznaky",
  "/profil", "/chlubirna", "/kruhy", "/vstup", "/obnova-hesla", "/auth",
];

export default function robots(): MetadataRoute.Robots {
  // Dokud je web za bránou (privátní), neindexovat vůbec nic.
  if (SITE_GATE_CODE) {
    return { rules: [{ userAgent: "*", disallow: "/" }], sitemap: `${BASE}/sitemap.xml` };
  }
  // Po vypnutí brány: indexovat výlohu, zakázat členskou část.
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
