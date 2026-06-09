"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Loguje odcvičené minuty videa. Dokud není reálný přehrávač (Cloudflare),
// počítá čas strávený na stránce přehrávání po 30s blocích.
// Server (log_video_watch) si hlídá strop = délka videa, takže se nedá nafouknout.
// Až bude Cloudflare přehrávač, stačí volat stejnou RPC s reálnými sekundami.
const STEP = 30;

export function WatchLogger({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    let active = true;

    function tick() {
      if (!active || document.visibilityState !== "visible") return;
      supabase.rpc("log_video_watch", { p_slug: slug, p_seconds: STEP });
    }

    // první blok hned po krátké chvíli (ať se nepočítá jen prolétnutí)
    const first = setTimeout(tick, 8000);
    const id = setInterval(tick, STEP * 1000);

    return () => {
      active = false;
      clearTimeout(first);
      clearInterval(id);
    };
  }, [slug]);

  return null;
}
