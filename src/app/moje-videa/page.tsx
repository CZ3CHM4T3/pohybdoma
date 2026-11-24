"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Video as VideoIcon, Upload, Download, Trash2, PlayCircle, X, Wand2, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type MyVideo = { id: string; title: string | null; note: string | null; source: string; created_at: string };

export default function MojeVideaPage() {
  const supabase = createClient();
  const [phase, setPhase] = useState<"loading" | "anon" | "ready">("loading");

  const [mine, setMine] = useState<MyVideo[]>([]);
  const [linked, setLinked] = useState(false);
  const [sub, setSub] = useState<"all" | "admin" | "client">("all");

  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const [playing, setPlaying] = useState<MyVideo | null>(null);
  const [playToken, setPlayToken] = useState<string | null>(null);

  // ── Načtení seznamu ─────────────────────────────────────────────────────────
  async function loadMine() {
    const r = await fetch("/api/me/videos", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    setMine(j?.videos ?? []);
    setLinked(Boolean(j?.linked));
  }

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      if (!au.user) { setPhase("anon"); return; }
      await loadMine();
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Token pro právě přehrávané video ────────────────────────────────────────
  useEffect(() => {
    setPlayToken(null);
    if (!playing) return;
    let alive = true;
    fetch(`/api/me/video-token/${encodeURIComponent(playing.id)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { token?: string } | null) => { if (alive && d?.token) setPlayToken(d.token); })
      .catch(() => {});
    return () => { alive = false; };
  }, [playing]);

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
    if (r.ok) { if (playing?.id === v.id) setPlaying(null); await loadMine(); }
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

  const mineFiltered = useMemo(
    () => mine.filter((v) => (sub === "all" ? true : v.source === sub)),
    [mine, sub]
  );

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
            <p className="text-sm text-gray-500">Tvoje osobní videa na jednom místě – přehraj si je nebo nahraj vlastní.</p>
          </div>
        </div>

        {/* Přehrávač jednoho videa */}
        {playing && (
          <div className="card p-6 mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="truncate text-sm font-semibold text-brand-dark">{playing.title || "Moje video"}</h2>
              <button onClick={() => setPlaying(null)} aria-label="Zavřít" className="text-gray-400 hover:text-brand-dark"><X className="h-5 w-5" /></button>
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              {playToken ? (
                <iframe
                  key={playing.id}
                  src={`https://iframe.cloudflarestream.com/${playToken}?autoplay=true`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/60"><p className="text-sm">Načítám video…</p></div>
              )}
            </div>
          </div>
        )}

        <div className="card p-6">
          {/* Filtry + nahrát */}
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
              {mineFiltered.map((v) => (
                <li key={v.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                  <button onClick={() => setPlaying(v)} title="Přehrát" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100">
                    <PlayCircle className="h-5 w-5" />
                  </button>
                  <button onClick={() => setPlaying(v)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-medium text-brand-dark">{v.title || "Bez názvu"}</span>
                    <span className="text-xs text-gray-400">
                      {v.source === "client" ? "Nahráno tebou" : "Od Honzy"} · {new Date(v.created_at).toLocaleDateString("cs-CZ")}
                    </span>
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
              ))}
            </ul>
          )}
        </div>

        {/* Odkaz do Mixéru – skládání cvičení žije tam */}
        <Link href="/klub/mixer" className="card card-3d mt-6 flex items-center gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-white shadow-sm">
            <Wand2 className="h-6 w-6" strokeWidth={2} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-brand-dark">Chceš si z videí poskládat cvičení?</span>
            <span className="block text-xs text-gray-400">Otevři Mixér – namixuj svoje i knihovní videa za sebe do jedné lekce.</span>
          </span>
        </Link>
      </div>
    </div>
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
