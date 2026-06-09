"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, Lock, ArrowLeft, Calendar, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { normalizeTier } from "@/lib/tiers";

type Stream = {
  id: string;
  title: string;
  description: string | null;
  embed_url: string | null;
  recording_url: string | null;
  starts_at: string;
};

const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 h = "živě"
const RECORDING_DAYS = 7;

function embedSrc(url: string | null): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

function fmt(d: string): string {
  return new Date(d).toLocaleString("cs-CZ", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export default function LivePage() {
  const supabase = createClient();
  const [phase, setPhase] = useState<"loading" | "anon" | "locked" | "ready">("loading");
  const [streams, setStreams] = useState<Stream[]>([]);

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const user = au.user;
      if (!user) { setPhase("anon"); return; }
      const { data: p } = await supabase.from("profiles").select("tier").eq("id", user.id).maybeSingle();
      const ok = normalizeTier(p?.tier as string | undefined) === "VIP_PLUS" || isAdminEmail(user.email);
      if (!ok) { setPhase("locked"); return; }
      const { data } = await supabase
        .from("streams")
        .select("id, title, description, embed_url, recording_url, starts_at")
        .order("starts_at", { ascending: false });
      setStreams((data ?? []) as Stream[]);
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "loading") return <Centered><p className="text-gray-400">Načítám…</p></Centered>;
  if (phase === "anon") {
    return (
      <Centered>
        <Radio className="mx-auto mb-3 h-10 w-10 text-amber-500" strokeWidth={1.8} />
        <h1 className="text-xl font-semibold text-brand-dark mb-2">LIVE</h1>
        <p className="text-sm text-gray-500 mb-5">Pro živé lekce se přihlas.</p>
        <Link href="/ucet" className="btn-primary">Přihlásit se</Link>
      </Centered>
    );
  }
  if (phase === "locked") {
    return (
      <Centered>
        <Lock className="mx-auto mb-3 h-10 w-10 text-amber-500" strokeWidth={1.8} />
        <h1 className="text-xl font-semibold text-brand-dark mb-2">LIVE je pro VIP+</h1>
        <p className="text-sm text-gray-500 mb-5">Živé lekce a záznamy jsou součást VIP+.</p>
        <Link href="/clenstvi" className="btn-primary">Zobrazit členství</Link>
      </Centered>
    );
  }

  const now = Date.now();
  const live = streams.filter((s) => {
    const t = new Date(s.starts_at).getTime();
    return now >= t && now <= t + LIVE_WINDOW_MS;
  });
  const upcoming = streams
    .filter((s) => new Date(s.starts_at).getTime() > now)
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const recordings = streams.filter((s) => {
    const t = new Date(s.starts_at).getTime();
    return s.recording_url && now > t + LIVE_WINDOW_MS && now <= t + RECORDING_DAYS * 86400000;
  });

  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/klub" className="inline-flex items-center gap-2 text-sm text-brand-blue font-semibold mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Zpět do Klubu
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Radio className="h-6 w-6" strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-brand-dark">LIVE</h1>
            <p className="text-sm text-gray-500">Živé lekce se mnou + záznamy dostupné týden zpětně.</p>
          </div>
        </div>

        {/* Živě teď */}
        {live.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-red-600">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-600" /> ŽIVĚ TEĎ
            </h2>
            <div className="space-y-4">{live.map((s) => <StreamCard key={s.id} s={s} mode="live" />)}</div>
          </section>
        )}

        {/* Nadcházející */}
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Nadcházející</h2>
          {upcoming.length === 0 ? (
            <p className="card p-5 text-sm text-gray-500">Zatím není naplánovaný žádný stream. Mrkni sem brzy. 🙂</p>
          ) : (
            <div className="space-y-3">{upcoming.map((s) => <StreamCard key={s.id} s={s} mode="upcoming" />)}</div>
          )}
        </section>

        {/* Záznamy */}
        {recordings.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Záznamy (dostupné týden)</h2>
            <div className="space-y-4">{recordings.map((s) => <StreamCard key={s.id} s={s} mode="recording" />)}</div>
          </section>
        )}
      </div>
    </div>
  );
}

function StreamCard({ s, mode }: { s: Stream; mode: "live" | "upcoming" | "recording" }) {
  const url = mode === "recording" ? s.recording_url : s.embed_url;
  const embed = embedSrc(url);
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-brand-dark">{s.title}</h3>
        {mode === "live" && <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">ŽIVĚ</span>}
      </div>
      <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-gray-500">
        <Calendar className="h-3.5 w-3.5" /> {fmt(s.starts_at)}
      </p>
      {s.description && <p className="mt-2 text-sm text-gray-600">{s.description}</p>}

      {mode !== "upcoming" && (
        embed ? (
          <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg bg-black">
            <iframe src={embed} title={s.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="h-full w-full" />
          </div>
        ) : url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3 inline-flex items-center gap-2 text-sm">
            <ExternalLink className="h-4 w-4" /> {mode === "live" ? "Otevřít živý přenos" : "Přehrát záznam"}
          </a>
        ) : (
          <p className="mt-3 text-xs text-gray-400">Odkaz na přenos bude doplněn.</p>
        )
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center px-4">
      <div className="card p-8 text-center max-w-sm">{children}</div>
    </div>
  );
}
