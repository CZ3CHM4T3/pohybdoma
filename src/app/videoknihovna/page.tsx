"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, SlidersHorizontal, Shuffle, Lock } from "lucide-react";
import type { UserTier, AccessLevel, Video } from "@/types";
import { VideoCard } from "@/components/VideoCard";
import { TIER_STYLES, normalizeTier } from "@/lib/tiers";
import { rowToVideo, VIDEO_COLS, type VideoRow } from "@/lib/content";
import { canAccess } from "@/lib/access";
import {
  FILTER_DIFFICULTIES, FILTER_BODY, FILTER_SYSTEMS, FILTER_PROPS, FILTER_GOALS, FILTER_SUITABILITY,
} from "@/lib/filters";
import { createClient } from "@/lib/supabase/client";

// ── Skupiny filtrů ──────────────────────────────────────────────────────────
type Group = { key: string; title: string; options: { value: string; label: string }[]; access?: boolean };
const opt = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));

const GROUPS: Group[] = [
  {
    key: "access",
    title: "Přístup",
    access: true,
    options: (["FREE", "MEMBER", "VIP", "VIP_PLUS"] as AccessLevel[]).map((v) => ({ value: v, label: TIER_STYLES[v].label })),
  },
  { key: "difficulty", title: "Obtížnost", options: opt(FILTER_DIFFICULTIES) },
  { key: "duration", title: "Délka", options: opt(["do 10 min", "10–20 min", "20+ min"]) },
  { key: "body", title: "Část těla", options: opt(FILTER_BODY) },
  { key: "system", title: "Systém", options: opt(FILTER_SYSTEMS) },
  { key: "props", title: "Co dům dá", options: opt(FILTER_PROPS) },
  { key: "goal", title: "Cíl", options: opt(FILTER_GOALS) },
  { key: "suitability", title: "Vhodnost (skryje nevhodné)", options: opt(FILTER_SUITABILITY) },
];

function durationBucket(sec: number): string {
  if (sec < 600) return "do 10 min";
  if (sec <= 1200) return "10–20 min";
  return "20+ min";
}

export default function VideoknihovnaPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTier, setUserTier] = useState<UserTier>("FREE");
  const [search, setSearch] = useState("");
  const [onlyNew, setOnlyNew] = useState(false);
  const [open, setOpen] = useState(false); // mobil: zobrazit filtry
  const [sel, setSel] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g.key, new Set<string>()]))
  );
  const canFilter = canAccess(userTier, "VIP"); // chytré filtry jsou od VIP
  const canRandom = canAccess(userTier, "MEMBER"); // náhodné přehrání je od MEMBER
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("tier").eq("id", data.user.id).maybeSingle();
      setUserTier(normalizeTier(p?.tier as string | undefined));
    });
    supabase
      .from("videos")
      .select(VIDEO_COLS)
      .eq("published", true)
      .order("position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setVideos((data ?? []).map((r) => rowToVideo(r as VideoRow)));
        setLoading(false);
      });
  }, []);

  function toggle(group: string, value: string) {
    setSel((prev) => {
      const s = new Set(prev[group]);
      if (s.has(value)) s.delete(value);
      else s.add(value);
      return { ...prev, [group]: s };
    });
  }
  function clearAll() {
    setSel(Object.fromEntries(GROUPS.map((g) => [g.key, new Set<string>()])));
    setOnlyNew(false);
    setSearch("");
  }

  const activeCount = GROUPS.reduce((n, g) => n + sel[g.key].size, 0) + (onlyNew ? 1 : 0);

  const filtered = useMemo(() => {
    if (onlyNew) {
      return [...videos]
        .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
        .slice(0, 10);
    }
    return videos.filter((v) => {
      if (sel.access.size && !sel.access.has(v.accessLevel)) return false;
      if (sel.difficulty.size && !sel.difficulty.has(v.difficulty)) return false;
      if (sel.duration.size && !sel.duration.has(durationBucket(v.durationSeconds))) return false;
      if (sel.body.size && !v.bodyParts.some((b) => sel.body.has(b))) return false;
      if (sel.system.size && !(v.systems ?? []).some((s) => sel.system.has(s))) return false;
      if (sel.props.size && !(v.props ?? []).some((p) => sel.props.has(p))) return false;
      if (sel.goal.size && !v.problemTypes.some((g) => sel.goal.has(g))) return false;
      if (sel.suitability.size && (v.unsuitableFor ?? []).some((u) => sel.suitability.has(u))) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!v.title.toLowerCase().includes(q) && !v.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [videos, sel, onlyNew, search]);

  function playRandom() {
    // náhodně z aktuálně vyfiltrovaných (a přístupných) videí; když nic, ze všech přístupných
    const inFilter = filtered.filter((v) => canAccess(userTier, v.accessLevel));
    const pool = inFilter.length ? inFilter : videos.filter((v) => canAccess(userTier, v.accessLevel));
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    router.push(`/videoknihovna/${pick.slug}`);
  }

  return (
    <section className="bg-brand-light min-h-screen py-10 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-2">Knihovna pohybu</p>
        <h1 className="text-3xl lg:text-4xl font-semibold text-brand-dark mb-6">Najdi přesně to svoje</h1>

        {/* Hledání + filtry toggle (mobil) */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hledat video…"
              className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          <button
            type="button"
            onClick={() => setOnlyNew((v) => !v)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${onlyNew ? "bg-brand-blue text-white" : "bg-white text-brand-dark hover:bg-brand-light"}`}
          >
            ✨ Novinky
          </button>
          {canRandom ? (
            <button
              type="button"
              onClick={playRandom}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-light"
              title="Přehraj náhodné video"
            >
              <Shuffle className="h-4 w-4 text-brand-blue" strokeWidth={2} /> Náhodně
            </button>
          ) : (
            <Link
              href="/clenstvi"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-400 transition-colors hover:bg-brand-light"
              title="Náhodné přehrávání je od úrovně MEMBER"
            >
              <Lock className="h-4 w-4" strokeWidth={2} /> Náhodně
            </Link>
          )}
          {canFilter && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-dark"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filtry{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          {/* Sidebar filtrů (chytré filtry = od VIP) */}
          {!canFilter ? (
            <aside className="hidden lg:block">
              <div className="card p-5 lg:sticky lg:top-24 text-center">
                <SlidersHorizontal className="mx-auto mb-2 h-7 w-7 text-brand-blue" strokeWidth={1.8} />
                <h2 className="text-sm font-semibold text-brand-dark">Chytré filtry</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Třídění podle části těla, systému, délky i toho, co máš doma, odemkne <strong>VIP</strong>.
                </p>
                <Link href="/clenstvi" className="btn-primary mt-3 inline-flex text-xs">Zobrazit členství</Link>
                <p className="mt-3 text-[11px] text-gray-400">Vyhledávání nahoře funguje i bez VIP.</p>
              </div>
            </aside>
          ) : (
          <aside className={`${open ? "block" : "hidden"} lg:block`}>
            <div className="card p-5 lg:sticky lg:top-24 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-brand-dark">Filtry</h2>
                {activeCount > 0 && (
                  <button type="button" onClick={clearAll} className="text-xs font-semibold text-brand-blue hover:underline">
                    Vymazat vše
                  </button>
                )}
              </div>
              {GROUPS.map((g) => (
                <div key={g.key}>
                  <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">{g.title}</h3>
                  <div className="space-y-1">
                    {g.options.map((o) => {
                      const checked = sel[g.key].has(o.value);
                      return (
                        <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm text-brand-dark">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(g.key, o.value)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                          />
                          {g.access && (
                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${TIER_STYLES[o.value as AccessLevel].dot}`} />
                          )}
                          <span className={g.access ? TIER_STYLES[o.value as AccessLevel].accentText : ""}>{o.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
          )}

          {/* Výsledky */}
          <div>
            {/* Aktivní filtry */}
            {activeCount > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {onlyNew && (
                  <button onClick={() => setOnlyNew(false)} className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">
                    Novinky <X className="h-3 w-3" />
                  </button>
                )}
                {GROUPS.flatMap((g) =>
                  [...sel[g.key]].map((val) => (
                    <button key={g.key + val} onClick={() => toggle(g.key, val)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-dark ring-1 ring-gray-200">
                      {val} <X className="h-3 w-3 text-gray-400" />
                    </button>
                  ))
                )}
              </div>
            )}

            <p className="mb-4 text-sm text-gray-500">{loading ? "Načítám…" : `${filtered.length} videí`}</p>

            {loading ? (
              <p className="py-20 text-center text-sm text-gray-400">Načítám videa…</p>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((video) => (
                  <VideoCard key={video.id} video={video} userTier={userTier} />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <p className="font-semibold">Zatím tu nejsou žádná videa</p>
                <p className="text-sm mt-1">Brzy je doplním. 🙂</p>
              </div>
            ) : (
              <div className="py-20 text-center text-gray-400">
                <p className="font-semibold">Nic neodpovídá filtrům</p>
                <button onClick={clearAll} className="mt-2 text-sm font-semibold text-brand-blue hover:underline">Vymazat filtry</button>
              </div>
            )}

            {/* VIP upsell */}
            <div className="mt-12 p-6 lg:p-8 rounded-2xl bg-gradient-to-r from-brand-dark to-[#1256c0] text-white flex flex-col sm:flex-row items-center gap-6 justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-1">Chceš přístup ke všem videím?</h3>
                <p className="text-white/75 text-sm">Knihovna roste každý týden. Členství od 199 Kč / měsíc.</p>
              </div>
              <Link href="/clenstvi" className="btn-primary shrink-0 bg-white text-brand-dark hover:opacity-90 py-3 px-6">
                Zobrazit členství
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
