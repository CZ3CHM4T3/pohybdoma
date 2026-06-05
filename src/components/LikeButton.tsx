"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Tlačítko lajku pro článek. Počet lajků se ukládá v Supabase (tabulka
 * post_likes + funkce adjust_likes – viz supabase/likes.sql).
 * Stav "už jsem lajkl" si pamatuje prohlížeč (localStorage).
 */
export function LikeButton({ slug }: { slug: string }) {
  const supabase = createClient();
  const [likes, setLikes] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from("post_likes")
      .select("likes")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setLikes(data?.likes ?? 0);
      });
    try {
      setLiked(localStorage.getItem(`liked:${slug}`) === "1");
    } catch {}
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function toggle() {
    if (busy || likes === null) return;
    const nextLiked = !liked;
    const delta = nextLiked ? 1 : -1;
    setBusy(true);
    // optimisticky
    setLiked(nextLiked);
    setLikes((v) => Math.max(0, (v ?? 0) + delta));
    try {
      localStorage.setItem(`liked:${slug}`, nextLiked ? "1" : "0");
    } catch {}

    const { data, error } = await supabase.rpc("adjust_likes", {
      p_slug: slug,
      p_delta: delta,
    });
    setBusy(false);
    if (error) {
      // revert
      setLiked(!nextLiked);
      setLikes((v) => Math.max(0, (v ?? 0) - delta));
      try {
        localStorage.setItem(`liked:${slug}`, !nextLiked ? "1" : "0");
      } catch {}
      return;
    }
    if (typeof data === "number") setLikes(data);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || likes === null}
      aria-pressed={liked}
      aria-label={liked ? "Odebrat lajk" : "Lajknout článek"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
        liked
          ? "border-red-200 bg-red-50 text-red-600"
          : "border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500"
      }`}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21s-7.5-4.6-10-9.2C.6 8.9 2 5.5 5.2 5.5c1.9 0 3.2 1.1 3.8 2.3.6-1.2 1.9-2.3 3.8-2.3 3.2 0 4.6 3.4 3.2 6.3C19.5 16.4 12 21 12 21z"
        />
      </svg>
      <span className="tabular-nums">{likes ?? "–"}</span>
    </button>
  );
}
