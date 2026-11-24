"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Video as VideoIcon, Upload, Plus, Download, Trash2, PlayCircle,
  X, GripVertical, Film, ListVideo, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { normalizeTier } from "@/lib/tiers";
import { rowToVideo, VIDEO_COLS_PUBLIC, type VideoRow } from "@/lib/content";
import { canAccess } from "@/lib/access";
import type { Video, UserTier } from "@/types";

type StreamPlayer = { addEventListener: (e: string, cb: () => void) => void; removeEventListener: (e: string, cb: () => void) => void };
type StreamFn = (el: Element) => StreamPlayer;

type MyVideo = { id: string; title: string | null; note: string | null; source: string; created_at: string };
type QueueItem = { key: string; title: string; tokenUrl: string };

export default function MojeVideaPage() {
  const supabase = createClient();
  const [phase, setPhase] = useState<"loading" | "anon" | "ready">("loading");
  const [tier, setTier] = useState<UserTier>("FREE");
  const [isAdmin, setIsAdmin] = useState(false);

  const [mine, setMine] = useState<MyVideo[]>([]);
  const [linked, setLinked] = useState(false);
  const [library, setLibrary] = useState<Video[]>([]);

  const [tab, setTab] = useState<"mine" | "library">("mine");
  const [sub, setSub] = useState<"all" | "admin" | "client">("all");

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [curToken, setCurToken] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const canLibrary = canAccess(tier, "VIP") || isAdmin;

  // ── Načtení dat ───────────────────────────────────────────────────────────
  async function loadMine() {
    const r = await fetch("/api/me/videos", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    setMine(j?.videos ?? []);
    setLinked(Boolean(j?.linked));
  }

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const user = au.user;
      if (!user) { setPhase("anon"); return; }
      const admin = isAdminEmail(user.email);
      setIsAdmin(admin);
      const { data: p } = await supabase.from("profiles").select("tier").eq("id", user.id).maybeSingle();
      const t = normalizeTier(p?.tier as string | undefined);
      setTier(t);

      await loadMine();

      if (canAccess(t, "VIP") || admin) {
        const { data } = await supabase
          .from("videos")
          .select(VIDEO_COLS_PUBLIC)
          .eq("published", true)
          .order("position", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false });
        const vids = (data ?? []).map((r) => rowToVideo(r as VideoRow)).filter((v) => canAccess(t, v.accessLevel) || admin);
        setLibrary(vids);
      }
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Token aktuálního videa ve frontě ────────────────────────────────────────
  useEffect(() => {
    setCurToken(null);
    if (!playing || !queue[cur]) return;
    let alive = true;
    fetch(queue[cur].tokenUrl, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { token?: string } | null) => { if (alive && d?.token) setCurToken(d.token); })
      .catch(() => {});
    return () => { alive = false; };
  }, [playing, cur, queue]);

  // ── Auto-posun na další video po dohrání ────────────────────────────────────
  useEffect(() => {
    if (!playing || !queue[cur] || !curToken) return;
    let cleanup = () => {};
    const bind = () => {
      const w = window as unknown as { Stream?: StreamFn };
      const iframe = document.getElementById("mv-iframe");
      if (!w.Stream || !iframe) return;
      const player = w.Stream(iframe);
      const onEnded = () => setCur((c) => (c + 1 < queue.length ? c + 1 : c));
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
    } else existing.addEventListener("load", bind);
    return () => cleanup();
  }, [playing, cur, curToken, queue]);

  // ── Fronta ──────────────────────────────────────────────────────────────────
  function addToQueue(item: QueueItem) {
    setQueue((q) => (q.some((x) => x.key === item.key) ? q : [...q, item]));
  }
  function removeFromQueue(key: string) {
    setQueue((q) => q.filter((x) => x.key !== key));
  }
  function dropAt(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); return; }
    setQueue((q) => {
      const arr = [...q];
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(targetIdx, 0, moved);
      return arr;
    });
    setDragIdx(null);
  }
  function inQueue(key: string) { return queue.some((x) => x.key === key); }

  // ── Nahrání vlastního videa ──────────────────────────────────────────────────
  async function uploadMine(file: File, title: string) {
    try {
      setUploading(true);
      const r1 = await fetch("/api/me/video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const j1 = await r1.json().catch(() => ({}));
      if (!r1.ok) {
        throw new Error(
          j1?.error === "no_client_card"
            ? "Tvůj účet zatím není spárovaný s kartou klienta. Napiš Honzovi, propojí tě."
            : j1?.error === "cf_not_configured"
            ? "Nahrávání videí ještě není zapnuté. Zkus to prosím později."
            : "Nahrávání se nepodařilo připravit."
        );
      }
      const fd = new FormData();
      fd.append("file", file);
      const r2 = await fetch(j1.uploadURL, { method: "POST", body: fd });
      if (!r2.ok) throw new Error("Nahrávání do úložiště selhalo.");
      const r3 = await fetch("/api/me/video", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cf_uid: j1.uid, title }),
      });
      if (!r3.ok) throw new Error("Uložení videa se nepovedlo.");
      await loadMine();
      window.alert("Video nahráno ✅ (zpracování chvilku trvá, pak půjde přehrát)");
    } catch (e) {
      window.alert((e as Error).message || "Chyba při nahrávání.");
    } finally {
      setUploading(false);
    }
  }
  function pickMine() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const title = window.prompt("Název videa (nepovinné):", "") ?? "";
      await uploadMine(file, title);
    };
    input.click();
  }

  // ── Smazání vlastního nahraného videa ────────────────────────────────────────
  async function deleteMine(v: MyVideo) {
    if (!window.confirm(`Smazat video „${v.title || "bez názvu"}"? Tohle nevrátíš.`)) return;
    const r = await fetch(`/api/me/video?id=${encodeURIComponent(v.id)}`, { method: "DELETE" });
    if (r.ok) { removeFromQueue(`p:${v.id}`); await loadMine(); }
    else window.alert("Smazání se nepovedlo.");
  }

  // ── Stáhnout video (MP4) ─────────────────────────────────────────────────────
  async function download(v: MyVideo) {
    setDownloading(v.id);
    try {
      for (let i = 0; i < 6; i++) {
        const r = await fetch(`/api/me/video-download/${encodeURIComponent(v.id)}`, { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j?.status === "ready" && j?.url) { window.open(j.url, "_blank"); return; }
        if (!r.ok) { window.alert("Stažení se teď nepodařilo. Zkus to prosím za chvíli."); return; }
        await new Promise((res) => setTimeout(res, 3000)); // MP4 se připravuje
      }
      window.alert("Video se ještě připravuje ke stažení. Zkus to prosím za chvíli znovu.");
    } finally {
      setDownloading(null);
    }
  }

  // ── Filtrovaná osobní videa ─────────────────────────────────────────────────
  const mineFiltered = useMemo(
    () => mine.filter((v) => (sub === "all" ? true : v.source === sub)),
    [mine, sub]
  );

  // ── Stavy ─────────────────────────────────────────────────────────────────
  if (phase === "loading") return <Centered><Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-500" /></Centered>;
  if (phase === "anon") {
    return (
      <Centered>
        <VideoIcon className="mx-auto mb-3 h-10 w-10 text-amber-500" strokeWidth={1.8} />
        <h1 className="text-xl font-semibold text-brand-dark mb-2">Moje videa</h1>
        <p className="text-sm text-gray-500 mb-5">Pro svou videoknihovnu se přihlas.</p>
        <Link href="/ucet" className="btn-primary">Přihlásit se</Link>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/klub" className="inline-flex items-center gap-2 text-sm text-brand-blue font-semibold mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Zpět do Klubu
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <VideoIcon className="h-6 w-6" strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-brand-dark">Moje videa</h1>
            <p className="text-sm text-gray-500">Tvoje osobní videa na jednom místě – přehraj, nahraj vlastní, sestav si z nich cvičení.</p>
          </div>
        </div>

        {/* Taby */}
        <div className="mb-5 flex gap-2">
          <TabBtn active={tab === "mine"} onClick={() => setTab("mine")} icon={<VideoIcon className="h-4 w-4" />}>Moje videa</TabBtn>
          {canLibrary && (
            <TabBtn active={tab === "library"} onClick={() => setTab("library")} icon={<Film className="h-4 w-4" />}>Z knihovny</TabBtn>
          )}
        </div>

        {/* ── TAB: Moje videa ── */}
        {tab === "mine" && (
          <div className="card p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                <SubChip active={sub === "all"} onClick={() => setSub("all")}>Vše</SubChip>
                <SubChip active={sub === "admin"} onClick={() => setSub("admin")}>Od Honzy</SubChip>
                <SubChip active={sub === "client"} onClick={() => setSub("client")}>Moje nahrané</SubChip>
              </div>
              <button onClick={pickMine} disabled={uploading} className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Nahrávám…" : "Nahrát video"}
              </button>
            </div>

            {!linked ? (
              <EmptyNote>
                Tvůj účet ještě není propojený s kartou klienta, tak tu zatím nejsou videa od Honzy.
                Vlastní videa si ale můžeš nahrát hned tlačítkem <strong>Nahrát video</strong>.
              </EmptyNote>
            ) : mineFiltered.length === 0 ? (
              <EmptyNote>
                {sub === "client"
                  ? "Zatím sis žádné vlastní video nenahrál/a. Zkus tlačítko Nahrát video."
                  : "Zatím tu nejsou žádná videa. Od Honzy se objeví, jakmile ti nějaké natočí."}
              </EmptyNote>
            ) : (
              <ul className="space-y-2">
                {mineFiltered.map((v) => {
                  const key = `p:${v.id}`;
                  return (
                    <li key={v.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <PlayCircle className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-brand-dark">{v.title || "Bez názvu"}</span>
                        <span className="text-xs text-gray-400">
                          {v.source === "client" ? "Nahráno tebou" : "Od Honzy"} · {new Date(v.created_at).toLocaleDateString("cs-CZ")}
                        </span>
                      </span>
                      <button
                        onClick={() => addToQueue({ key, title: v.title || "Moje video", tokenUrl: `/api/me/video-token/${v.id}` })}
                        disabled={inQueue(key)}
                        title="Přidat do fronty"
                        className="shrink-0 text-brand-blue hover:text-brand-dark disabled:opacity-30"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                      <button onClick={() => download(v)} disabled={downloading === v.id} title="Stáhnout do zařízení" className="shrink-0 text-gray-400 hover:text-brand-dark disabled:opacity-40">
                        {downloading === v.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                      </button>
                      {v.source === "client" && (
                        <button onClick={() => deleteMine(v)} title="Smazat" className="shrink-0 text-gray-300 hover:text-red-500">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ── TAB: Z knihovny ── */}
        {tab === "library" && canLibrary && (
          <div className="card p-6">
            <p className="mb-3 text-xs text-gray-400">Přidej si do fronty i videa z VIP knihovny. Pro hledání a filtry mrkni do <Link href="/videoknihovna" className="font-semibold text-brand-blue hover:underline">knihovny</Link>.</p>
            {library.length === 0 ? (
              <EmptyNote>V knihovně zatím nejsou žádná dostupná videa.</EmptyNote>
            ) : (
              <ul className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                {library.map((v) => {
                  const key = `l:${v.slug}`;
                  return (
                    <li key={v.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand-blue">
                        <Film className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-brand-dark">{v.title}</span>
                      </span>
                      <button
                        onClick={() => addToQueue({ key, title: v.title, tokenUrl: `/api/stream-token/${encodeURIComponent(v.slug)}` })}
                        disabled={inQueue(key) || !v.providerId}
                        title={v.providerId ? "Přidat do fronty" : "Video zatím nemá přehrávatelný soubor"}
                        className="shrink-0 text-brand-blue hover:text-brand-dark disabled:opacity-30"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ── Fronta / sestava ── */}
        <div className="card p-6 mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-brand-dark">
              <ListVideo className="h-4 w-4 text-amber-500" /> Tvoje sestava
            </h2>
            <span className="text-xs text-gray-400">{queue.length} videí</span>
          </div>

          {queue.length === 0 ? (
            <p className="text-sm text-gray-500">Přidej videa tlačítkem <Plus className="inline h-3.5 w-3.5" /> a poskládej si vlastní cvičení. Přehrají se pěkně za sebou.</p>
          ) : (
            <>
              <p className="mb-2 text-xs text-gray-400">Pořadí změníš přetažením za úchyt ⋮⋮ .</p>
              <ol className="space-y-2">
                {queue.map((it, i) => (
                  <li
                    key={it.key}
                    draggable
                    onDragStart={() => setDragIdx(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropAt(i)}
                    onDragEnd={() => setDragIdx(null)}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${dragIdx === i ? "border-brand-blue bg-brand-light/40" : "border-gray-100"}`}
                  >
                    <span className="cursor-grab active:cursor-grabbing text-gray-300"><GripVertical className="h-4 w-4" /></span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-dark">{it.title}</span>
                    <button onClick={() => { setCur(i); setPlaying(true); }} title="Přehrát odtud" className="shrink-0 text-brand-blue"><PlayCircle className="h-5 w-5" /></button>
                    <button onClick={() => removeFromQueue(it.key)} title="Odebrat" className="shrink-0 text-gray-300 hover:text-red-500"><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={() => { setCur(0); setPlaying(true); }} className="btn-primary inline-flex items-center gap-2"><PlayCircle className="h-5 w-5" /> Přehrát sestavu</button>
                <button onClick={() => setQueue([])} className="btn-outline text-sm">Vyprázdnit</button>
              </div>
            </>
          )}
        </div>

        {/* ── Přehrávač ── */}
        {playing && queue[cur] && (
          <div className="card p-6 mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-dark">Přehrávám {cur + 1}/{queue.length}</h2>
              <button onClick={() => setPlaying(false)} aria-label="Zavřít" className="text-gray-400 hover:text-brand-dark"><X className="h-5 w-5" /></button>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              {curToken ? (
                <iframe
                  id="mv-iframe"
                  key={queue[cur].key}
                  src={`https://iframe.cloudflarestream.com/${curToken}?autoplay=true`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/60"><p className="text-sm">Načítám video…</p></div>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-brand-dark">{queue[cur].title}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur === 0} className="btn-outline text-sm disabled:opacity-40">← Předchozí</button>
              <button onClick={() => setCur((c) => Math.min(queue.length - 1, c + 1))} disabled={cur >= queue.length - 1} className="btn-primary text-sm disabled:opacity-40">Další →</button>
              <span className="text-xs text-gray-400">Videa se přehrají sama za sebou.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? "bg-brand-blue text-white" : "bg-white text-brand-dark hover:bg-brand-light"}`}
    >
      {icon}{children}
    </button>
  );
}

function SubChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-light hover:text-brand-blue"}`}
    >
      {children}
    </button>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-gray-500">{children}</p>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center px-4">
      <div className="card p-8 text-center max-w-sm">{children}</div>
    </div>
  );
}
