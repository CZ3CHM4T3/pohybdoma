import { createClient } from "@/lib/supabase/server";
import { rowToVideo, VIDEO_COLS, type VideoRow } from "@/lib/content";
import type { Video } from "@/types";

/** Všechna zveřejněná videa (pro server komponenty). */
export async function getVideos(): Promise<Video[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("videos")
      .select(VIDEO_COLS)
      .eq("published", true)
      .order("position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => rowToVideo(r as VideoRow));
  } catch {
    return [];
  }
}

export async function getVideoBySlug(slug: string): Promise<Video | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("videos").select(VIDEO_COLS).eq("slug", slug).maybeSingle();
    return data ? rowToVideo(data as VideoRow) : null;
  } catch {
    return null;
  }
}
