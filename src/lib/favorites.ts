"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Sdílený klientský store oblíbených videí.
 * Načte se jednou za načtení stránky (jeden dotaz), všechna srdíčka z něj čtou.
 */
let favs: Set<string> | null = null;
let loading: Promise<void> | null = null;
let userId: string | null = null;
const subs = new Set<() => void>();

function emit() {
  subs.forEach((f) => f());
}

async function load() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  userId = user?.id ?? null;
  if (!user) {
    favs = new Set();
    emit();
    return;
  }
  const { data } = await supabase
    .from("video_favorites")
    .select("video_slug")
    .eq("user_id", user.id);
  favs = new Set((data ?? []).map((r: { video_slug: string }) => r.video_slug));
  emit();
}

function ensure() {
  if (!favs && !loading) loading = load();
}

export function useFavorite(slug: string) {
  const [, force] = useState(0);
  useEffect(() => {
    ensure();
    const cb = () => force((x) => x + 1);
    subs.add(cb);
    return () => {
      subs.delete(cb);
    };
  }, []);

  const ready = favs !== null;
  const loggedIn = !!userId;
  const isFavorite = !!favs?.has(slug);

  async function toggle() {
    if (!favs || !userId) return;
    const supabase = createClient();
    if (favs.has(slug)) {
      favs.delete(slug);
      emit();
      await supabase
        .from("video_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("video_slug", slug);
    } else {
      favs.add(slug);
      emit();
      await supabase.from("video_favorites").insert({ user_id: userId, video_slug: slug });
    }
  }

  return { isFavorite, toggle, ready, loggedIn };
}
