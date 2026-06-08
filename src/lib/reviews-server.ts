import { createClient } from "@/lib/supabase/server";
import type { Review } from "@/lib/reviews";

/** Schválené recenze pro veřejné zobrazení (homepage, /recenze). */
export async function getApprovedReviews(): Promise<Review[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("reviews")
      .select("author_name, place, rating, text")
      .eq("approved", true)
      .order("position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({
      name: r.author_name as string,
      place: (r.place as string | null) ?? undefined,
      rating: r.rating as number,
      text: r.text as string,
    }));
  } catch {
    return [];
  }
}
