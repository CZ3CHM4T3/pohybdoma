"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CFPlayer = {
  currentTime: number;
  paused: boolean;
  addEventListener: (event: string, cb: () => void) => void;
};
type CFStream = (el: HTMLIFrameElement) => CFPlayer;

// Cloudflare Stream přehrávač. cf_uid se do prohlížeče NEposílá přímo – nejdřív
// si od /api/stream-token/<slug> vyžádáme přehrávací token (server ověří, že na
// video máš). Měří SKUTEČNĚ přehrané sekundy a posílá je do log_video_watch.
export function StreamPlayer({ slug, title }: { slug: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // 1) Vyžádej přehrávací token podle slugu (server ověří přístup).
  useEffect(() => {
    let alive = true;
    fetch(`/api/stream-token/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { token?: string } | null) => {
        if (!alive) return;
        if (d?.token) setToken(d.token);
        else setFailed(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  // 2) Jakmile máme token a iframe, nasaď měření přehraných sekund.
  useEffect(() => {
    if (!token) return;
    const supabase = createClient();
    let acc = 0; // nasčítané reálně přehrané sekundy od posledního odeslání
    let last = 0; // poslední currentTime
    let timer: ReturnType<typeof setInterval> | null = null;

    function flush() {
      const s = Math.round(acc);
      if (s > 0) {
        supabase.rpc("log_video_watch", { p_slug: slug, p_seconds: s });
        acc = 0;
      }
    }

    function init() {
      const Stream = (window as unknown as { Stream?: CFStream }).Stream;
      if (!Stream || !iframeRef.current) return;
      const player = Stream(iframeRef.current);
      const sync = () => {
        last = player.currentTime;
      };
      player.addEventListener("play", sync);
      player.addEventListener("seeking", sync);
      player.addEventListener("timeupdate", () => {
        if (player.paused) return;
        const t = player.currentTime;
        const delta = t - last;
        last = t;
        if (delta > 0 && delta < 5) acc += delta; // ignoruj přetáčení/skoky
      });
      player.addEventListener("pause", flush);
      player.addEventListener("ended", flush);
      timer = setInterval(flush, 15000);
    }

    const existing = document.querySelector("script[data-cf-stream]");
    if ((window as unknown as { Stream?: CFStream }).Stream) {
      init();
    } else if (existing) {
      existing.addEventListener("load", init);
    } else {
      const s = document.createElement("script");
      s.src = "https://embed.cloudflarestream.com/embed/sdk.latest.js";
      s.async = true;
      s.setAttribute("data-cf-stream", "1");
      s.addEventListener("load", init);
      document.body.appendChild(s);
    }

    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      flush();
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [token, slug]);

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-center text-white/60">
        <div>
          <p className="font-semibold">Video se nepodařilo načíst</p>
          <p className="text-sm opacity-70">Zkus to prosím za chvíli nebo obnov stránku.</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-white/50">
        <p className="text-sm">Načítám video…</p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={`https://iframe.videodelivery.net/${token}`}
      className="absolute inset-0 h-full w-full"
      style={{ border: "none" }}
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
      allowFullScreen
      title={title}
    />
  );
}
