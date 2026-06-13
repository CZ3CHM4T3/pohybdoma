"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Wand2, Lock, Shuffle, Clock, ArrowLeft, PlayCircle, GripVertical, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type StreamPlayer = { addEventListener: (e: string, cb: () => void) => void; removeEventListener: (e: string, cb: () => void) => void };
type StreamFn = (el: Element) => StreamPlayer;
import { isAdminEmail } from "@/lib/admin";
import { normalizeTier } from "@/lib/tiers";
import { rowToVideo, VIDEO_COLS, type VideoRow } from "@/lib/content";
import { formatDuration } from "@/lib/access";
import { FILTER_BODY, FILTER_SYSTEMS, FILTER_GOALS, FILTER_DIFFICULTIES } from "@/lib/filters";
import type { Video } from "@/types";

const DURATIONS = [
  { label: "~10 min", sec: 600 },
  { label: "~20 min", sec: 1200 },
  { label: "~30 min", sec: 1800 },
  { label: "~45 min", sec: 2700 },
  { label: "Co nejvíc", sec: Infinity },
];

export default function MixerPage() {
  const supabase = createClient();
  const [phase, setPhase] = useState<"loading" | "anon" | "locked" | "ready">("loading");
  const [videos, setVideos] = useState<Video[]>([]);

  const [body, setBody] = useState<Set<string>>(new Set());
  const [system, setSystem] = useState<Set<string>>(new Set());
  const [goal, setGoal] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState<string>("");
  const [target, setTarget] = useState<number>(1200);
  const [lesson, setLesson] = useState<Video[] | null>(null);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const user = au.user;
      if (!user) { setPhase("anon"); return; }
      const { data: p } = await supabase.from("profiles").select("tier").eq("id", user.id).maybeSingle();
      const tier = normalizeTier(p?.tier as string | undefined);
      const ok = tier === "VIP_PLUS" || isAdminEmail(user.email);
      if (!ok) { setPhase("locked"); return; }
      const { data } = await supabase
        .from("videos")
        .select(VIDEO_COLS)
        .eq("published", true)
        .order("position", { ascending: true, nullsFirst: false });
      setVideos((data ?? []).map((r) => rowToVideo(r as VideoRow)));
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matching = useMemo(() => {
    return videos.filter((v) => {
      if (body.size && !v.bodyParts.some((b) => body.has(b))) return false;
      if (system.size && !(v.systems ?? []).some((s) => system.has(s))) return false;
      if (goal.size && !v.problemTypes.some((g) => goal.has(g))) return false;
      if (difficulty && v.difficulty !== difficulty) return false;
      return true;
    });
  }, [videos, body, system, goal, difficulty]);

  // Automatické přehrávání za sebou (reálná videa přes Cloudflare Stream)
  useEffect(() => {
    if (!playing || !lesson) return;
    const v = lesson[cur];
    if (!v?.providerId) return; // bez reálného videa řešíme tlačítkem „Další"
    let cleanup = () => {};
    const bind = () => {
      const w = window as unknown as { Stream?: StreamFn };
      const iframe = document.getElementById("mixer-iframe");
      if (!w.Stream || !iframe) return;
      const player = w.Stream(iframe);
      const onEnded = () => setCur((c) => (lesson && c + 1 < lesson.length ? c + 1 : c));
      player.addEventListener("ended", onEnded);
      cleanup = () => player.removeEventListener("ended", onEnded);
    };
    const id = "cf-stream-sdk";
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if ((window as unknown as { Stream?: StreamFn }).Stream) bind();
    else if (!existing) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://embed.cloudflarestream.com/embed/sdk.latest.js";
      s.onload = bind;
      document.body.appendChild(s);
    } else {
      existing.addEventListener("load", bind);
    }
    return () => cleanup();
  }, [playing, cur, lesson]);

  function dropAt(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx || !lesson) { setDragIdx(null); return; }
    const arr = [...lesson];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(targetIdx, 0, moved);
    setLesson(arr);
    setDragIdx(null);
  }

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, val: string) {
    const n = new Set(set);
    if (n.has(val)) n.delete(val); else n.add(val);
    setter(n);
  }

  function build(shuffle = false) {
    let pool = [...matching];
    if (shuffle) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }
    const out: Video[] = [];
    let total = 0;
    for (const v of pool) {
      out.push(v);
      total += v.durationSeconds || 0;
      if (target !== Infinity && total >= target) break;
    }
    setLesson(out);
    setPlaying(false);
    setCur(0);
  }

  if (phase === "loading") return <Centered><p className="text-gray-400">Načítám…</p></Centered>;
  if (phase === "anon") {
    return (
      <Centered>
        <Wand2 className="mx-auto mb-3 h-10 w-10 text-amber-500" strokeWidth={1.8} />
        <h1 className="text-xl font-semibold text-brand-dark mb-2">Mixér</h1>
        <p className="text-sm text-gray-500 mb-5">Pro Mixér se přihlas.</p>
        <Link href="/ucet" className="btn-primary">Přihlásit se</Link>
      </Centered>
    );
  }
  if (phase === "locked") {
    return (
      <Centered>
        <Lock className="mx-auto mb-3 h-10 w-10 text-amber-500" strokeWidth={1.8} />
        <h1 className="text-xl font-semibold text-brand-dark mb-2">Mixér je pro VIP+</h1>
        <p className="text-sm text-gray-500 mb-5">Sestav si vlastní lekci na míru – součást VIP+.</p>
        <Link href="/clenstvi" className="btn-primary">Zobrazit členství</Link>
      </Centered>
    );
  }

  const totalSec = lesson ? lesson.reduce((s, v) => s + (v.durationSeconds || 0), 0) : 0;

  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/klub" className="inline-flex items-center gap-2 text-sm text-brand-blue font-semibold mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Zpět do Klubu
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Wand2 className="h-6 w-6" strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-brand-dark">Mixér</h1>
            <p className="text-sm text-gray-500">Vyber, na co chceš cvičit, a sestavím ti lekci.</p>
          </div>
        </div>

        {/* Volby */}
        <div className="card p-6 space-y-5">
          <ChipGroup title="Část těla" options={FILTER_BODY} selected={body} onToggle={(v) => toggle(body, setBody, v)} />
          <ChipGroup title="Systém" options={FILTER_SYSTEMS} selected={system} onToggle={(v) => toggle(system, setSystem, v)} />
          <ChipGroup title="Cíl" options={FILTER_GOALS} selected={goal} onToggle={(v) => toggle(goal, setGoal, v)} />

          <div>
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">Obtížnost</h3>
            <div className="flex flex-wrap gap-1.5">
              <Chip label="Jakákoliv" active={difficulty === ""} onClick={() => setDifficulty("")} />
              {FILTER_DIFFICULTIES.map((d) => (
                <Chip key={d} label={d} active={difficulty === d} onClick={() => setDifficulty(d)} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">Délka lekce</h3>
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map((d) => (
                <Chip key={d.label} label={d.label} active={target === d.sec} onClick={() => setTarget(d.sec)} />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button onClick={() => build(false)} className="btn-primary text-sm inline-flex items-center gap-2">
              <Wand2 className="h-4 w-4" /> Sestavit lekci
            </button>
            <button onClick={() => build(true)} className="btn-outline text-sm inline-flex items-center gap-2">
              <Shuffle className="h-4 w-4" /> Zamíchat
            </button>
            <span className="text-xs text-gray-400">{matching.length} videí odpovídá výběru</span>
          </div>
        </div>

        {/* Výsledná lekce (fronta) */}
        {lesson && (
          <div className="card p-6 mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-brand-dark">Tvoje lekce</h2>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" /> {formatDuration(totalSec)} · {lesson.length} cviků
              </span>
            </div>

            {lesson.length === 0 ? (
              <p className="text-sm text-gray-500">Tomuhle výběru nic neodpovídá. Zkus ubrat nějaký filtr. 🙂</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-gray-400">Pořadí změníš přetažením za úchyt ⋮⋮ . Pak klikni JDEME NA TO.</p>
                <ol className="space-y-2">
                  {lesson.map((v, i) => (
                    <li
                      key={v.id}
                      draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => dropAt(i)}
                      onDragEnd={() => setDragIdx(null)}
                      className={`flex items-center gap-3 rounded-lg border p-3 ${dragIdx === i ? "border-brand-blue bg-brand-light/40" : "border-gray-100"}`}
                    >
                      <span className="cursor-grab active:cursor-grabbing text-gray-300" title="Přetáhni"><GripVertical className="h-4 w-4" /></span>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-brand-dark">{v.title}</span>
                        <span className="text-xs text-gray-400">{formatDuration(v.durationSeconds || 0)}</span>
                      </span>
                      <button type="button" onClick={() => { setCur(i); setPlaying(true); }} className="shrink-0 text-brand-blue" aria-label="Přehrát od tohoto">
                        <PlayCircle className="h-5 w-5" />
                      </button>
                    </li>
                  ))}
                </ol>
                <button onClick={() => { setCur(0); setPlaying(true); }} className="btn-primary mt-4 inline-flex items-center gap-2">
                  <PlayCircle className="h-5 w-5" /> JDEME NA TO
                </button>
              </>
            )}
          </div>
        )}

        {/* Přehrávač fronty */}
        {playing && lesson && lesson.length > 0 && (
          <div className="card p-6 mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-dark">Přehrávám {cur + 1}/{lesson.length}</h2>
              <button onClick={() => setPlaying(false)} aria-label="Zavřít" className="text-gray-400 hover:text-brand-dark"><X className="h-5 w-5" /></button>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              {lesson[cur].providerId ? (
                <iframe
                  id="mixer-iframe"
                  key={lesson[cur].id}
                  src={`https://iframe.cloudflarestream.com/${lesson[cur].providerId}?autoplay=true`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-6 text-center text-white/70">
                  <div>
                    <PlayCircle className="mx-auto mb-2 h-10 w-10" />
                    <p className="text-sm">„{lesson[cur].title}" – reálné video bude brzy. Klikni „Další →".</p>
                  </div>
                </div>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-brand-dark">{lesson[cur].title}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur === 0} className="btn-outline text-sm disabled:opacity-40">← Předchozí</button>
              <button onClick={() => setCur((c) => Math.min(lesson.length - 1, c + 1))} disabled={cur >= lesson.length - 1} className="btn-primary text-sm disabled:opacity-40">Další →</button>
              <span className="text-xs text-gray-400">Reálná videa se přehrají sama za sebou.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChipGroup({
  title, options, selected, onToggle,
}: {
  title: string; options: string[]; selected: Set<string>; onToggle: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <Chip key={o} label={o} active={selected.has(o)} onClick={() => onToggle(o)} />
        ))}
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-light hover:text-brand-blue"
      }`}
    >
      {label}
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center px-4">
      <div className="card p-8 text-center max-w-sm">{children}</div>
    </div>
  );
}
