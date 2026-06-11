import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE = "https://pohybdoma.cz";
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ["", "/o-mne", "/clenstvi", "/recenze", "/blog", "/kontakt", "/videoknihovna", "/kurzy", "/rezervace", "/zdravotni-upozorneni", "/obchodni-podminky", "/gdpr"];
  const out: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: BASE + (p || "/"),
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("blog_posts").select("slug, updated_at").eq("published", true);
    for (const b of (data ?? []) as { slug: string; updated_at: string }[]) {
      out.push({ url: `${BASE}/blog/${b.slug}`, lastModified: b.updated_at, changeFrequency: "monthly", priority: 0.6 });
    }
  } catch { /* DB nedostupná → jen statické cesty */ }
  return out;
}
