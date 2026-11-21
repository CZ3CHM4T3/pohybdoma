import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { LAUNCH_MODE } from "@/lib/launch";

const BASE = "https://pohybdoma.cz";
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Veřejně hotové stránky (v launch módu jen tyto).
  const publicPaths = ["", "/o-mne", "/recenze", "/kontakt", "/rezervace", "/produkty", "/produkty/pohybovy-audit"];
  // Zatím „připravuje se" – do sitemapy až po spuštění.
  const comingSoon = ["/clenstvi", "/videoknihovna", "/kurzy", "/blog"];
  // Právní stránky – patří do indexu, ale s nízkou prioritou.
  const legalPaths = ["/zdravotni-upozorneni", "/obchodni-podminky", "/gdpr"];

  const staticPaths = LAUNCH_MODE ? publicPaths : [...publicPaths, ...comingSoon];
  const out: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: BASE + (p || "/"),
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));
  for (const p of legalPaths) {
    out.push({ url: BASE + p, changeFrequency: "yearly", priority: 0.2 });
  }

  // Blogové články jen mimo launch mód (v launch módu je /blog „připravuje se").
  if (!LAUNCH_MODE) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.from("blog_posts").select("slug, updated_at").eq("published", true);
      for (const b of (data ?? []) as { slug: string; updated_at: string }[]) {
        out.push({ url: `${BASE}/blog/${b.slug}`, lastModified: b.updated_at, changeFrequency: "monthly", priority: 0.6 });
      }
    } catch { /* DB nedostupná → jen statické cesty */ }
  }
  return out;
}
