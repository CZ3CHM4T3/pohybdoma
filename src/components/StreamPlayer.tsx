"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type CFPlayer = {
  currentTime: number;
  paused: boolean;
  addEventListener: (event: string, cb: () => void) => void;
};
type CFStream = (el: HTMLIFrameElement) => CFPlayer;

// Cloudflare Stream přehrávač, který měří SKUTEČNĚ přehrané sekundy
// (ne čas strávený na stránce) a posílá je do log_video_watch.
export function StreamPlayer({ uid, slug, title }: { uid: string; slug: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!uid) return;
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
      const sync = () => { last = player.currentTime; };
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

    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      flush();
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [uid, slug]);

  return (
    <iframe
      ref={iframeRef}
      src={`https://iframe.videodelivery.net/${uid}`}
      className="absolute inset-0 h-full w-full"
      style={{ border: "none" }}
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
      allowFullScreen
      title={title}
    />
  );
}
