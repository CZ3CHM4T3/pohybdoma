"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PartyPopper, Lock, Send, ImagePlus, X, Trash2, Hand } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { normalizeTier } from "@/lib/tiers";

type Brag = { id: string; author_id: string; author_name: string | null; body: string; image_url: string | null; created_at: string };

export default function ChlubirnaPage() {
  const supabase = createClient();
  const [phase, setPhase] = useState<"loading" | "anon" | "locked" | "ready">("loading");
  const [uid, setUid] = useState<string | null>(null);

  const [brags, setBrags] = useState<Brag[]>([]);
  const [cheers, setCheers] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());

  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadBrags(userId: string | null) {
    const { data } = await supabase
      .from("brags")
      .select("id, author_id, author_name, body, image_url, created_at")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Brag[];
    setBrags(list);
    const counts: Record<string, number> = {};
    const me = new Set<string>();
    if (list.length) {
      const ids = list.map((b) => b.id);
      const { data: ch } = await supabase.from("brag_cheers").select("brag_id, user_id").in("brag_id", ids);
      for (const r of (ch ?? []) as { brag_id: string; user_id: string }[]) {
        counts[r.brag_id] = (counts[r.brag_id] ?? 0) + 1;
        if (r.user_id === userId) me.add(r.brag_id);
      }
    }
    setCheers(counts);
    setMine(me);
  }

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const user = au.user;
      if (!user) { setPhase("anon"); return; }
      const { data: p } = await supabase.from("profiles").select("tier").eq("id", user.id).maybeSingle();
      const tier = normalizeTier(p?.tier as string | undefined);
      const ok = tier !== "FREE" || isAdminEmail(user.email);
      if (!ok) { setPhase("locked"); return; }
      setUid(user.id);
      await loadBrags(user.id);
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickImage(f: File) { setFile(f); setPreview(URL.createObjectURL(f)); }
  function clearImage() { setFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); }

  async function send() {
    if (!uid || sending || (!body.trim() && !file)) return;
    setSending(true); setError(null);
    let imageUrl: string | null = null;
    if (file) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `chlubirna/${uid}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("community").upload(path, file, { upsert: true });
      if (upErr) { setSending(false); setError("Nahrání obrázku selhalo: " + upErr.message); return; }
      imageUrl = supabase.storage.from("community").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("brags").insert({ author_id: uid, body: body.trim(), image_url: imageUrl });
    setSending(false);
    if (error) { setError("Odeslání selhalo: " + error.message); return; }
    setBody(""); clearImage();
    await loadBrags(uid);
  }

  async function toggleCheer(id: string) {
    if (!uid) return;
    if (mine.has(id)) {
      await supabase.from("brag_cheers").delete().eq("brag_id", id).eq("user_id", uid);
      setMine((s) => { const n = new Set(s); n.delete(id); return n; });
      setCheers((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 1) - 1) }));
    } else {
      await supabase.from("brag_cheers").insert({ brag_id: id, user_id: uid });
      setMine((s) => new Set(s).add(id));
      setCheers((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    }
  }

  async function remove(id: string) {
    await supabase.from("brags").delete().eq("id", id);
    setBrags((arr) => arr.filter((b) => b.id !== id));
  }

  if (phase === "loading") return <Centered><p className="text-gray-400">Načítám…</p></Centered>;
  if (phase === "anon") {
    return (
      <Centered>
        <PartyPopper className="mx-auto mb-3 h-10 w-10 text-brand-blue" strokeWidth={1.8} />
        <h1 className="text-xl font-semibold text-brand-dark mb-2">Chlubírna</h1>
        <p className="text-sm text-gray-500 mb-5">Pochlub se pokrokem – přihlas se.</p>
        <Link href="/ucet" className="btn-primary">Přihlásit se</Link>
      </Centered>
    );
  }
  if (phase === "locked") {
    return (
      <Centered>
        <Lock className="mx-auto mb-3 h-10 w-10 text-brand-blue" strokeWidth={1.8} />
        <h1 className="text-xl font-semibold text-brand-dark mb-2">Chlubírna je pro členy</h1>
        <p className="text-sm text-gray-500 mb-5">Sdílení pokroku je od úrovně MEMBER.</p>
        <Link href="/clenstvi" className="btn-primary">Zobrazit členství</Link>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <PartyPopper className="h-6 w-6" strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-brand-dark">Chlubírna</h1>
            <p className="text-sm text-gray-500">Pochlub se pokrokem a povzbuď ostatní. Každý úspěch se počítá! 🙌</p>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {/* Composer */}
        <div className="card p-5 mb-6">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Čím se dnes pochlubíš? (třeba: poprvé dřep bez bolesti! 🎉)"
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          {preview && (
            <div className="relative mt-2 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="max-h-40 rounded-lg" />
              <button onClick={clearImage} className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow ring-1 ring-black/10" aria-label="Odebrat obrázek"><X className="h-3.5 w-3.5 text-gray-500" /></button>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline">
              <ImagePlus className="h-4 w-4" /> Fotka
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); e.target.value = ""; }} />
            </label>
            <button onClick={send} disabled={sending || (!body.trim() && !file)} className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50">
              <Send className="h-4 w-4" /> {sending ? "Sdílím…" : "Pochlubit se"}
            </button>
          </div>
        </div>

        {/* Feed */}
        {brags.length === 0 ? (
          <p className="text-center text-sm text-gray-400">Zatím prázdno – buď první, kdo se pochlubí! 🙂</p>
        ) : (
          <div className="space-y-4">
            {brags.map((b) => (
              <div key={b.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-sm font-semibold text-white">
                    {(b.author_name?.[0] ?? "Č").toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold text-brand-dark">{b.author_name ?? "Člen"}</span>{" "}
                      <span className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "long" })}</span>
                    </p>
                    {b.body && <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700">{b.body}</p>}
                    {b.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.image_url} alt="" className="mt-2 max-h-80 rounded-lg" />
                    )}
                    <button
                      onClick={() => toggleCheer(b.id)}
                      className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        mine.has(b.id) ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500 hover:bg-amber-50"
                      }`}
                    >
                      <Hand className="h-3.5 w-3.5" /> Povzbudit{cheers[b.id] ? ` · ${cheers[b.id]}` : ""}
                    </button>
                  </div>
                  {b.author_id === uid && (
                    <button onClick={() => remove(b.id)} className="shrink-0 text-gray-300 hover:text-red-500" aria-label="Smazat"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
