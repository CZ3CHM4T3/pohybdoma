"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeTier } from "@/lib/tiers";

export function ReviewForm() {
  const supabase = createClient();
  const [phase, setPhase] = useState<"loading" | "anon" | "free" | "ok" | "done">("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) { setPhase("anon"); return; }
      setUserId(u.id);
      const { data: p } = await supabase.from("profiles").select("tier, full_name").eq("id", u.id).maybeSingle();
      setName(
        (p?.full_name as string | undefined) ||
          (u.user_metadata?.full_name as string | undefined) ||
          ""
      );
      setPhase(normalizeTier(p?.tier as string | undefined) === "FREE" ? "free" : "ok");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !name.trim() || !text.trim()) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("reviews").insert({
      user_id: userId,
      author_name: name.trim(),
      place: place.trim() || null,
      rating,
      text: text.trim(),
      approved: false,
    });
    setBusy(false);
    if (error) { setErr("Nepodařilo se odeslat: " + error.message); return; }
    setPhase("done");
  }

  if (phase === "loading") return null;
  if (phase === "done") {
    return (
      <div className="card p-6 text-center text-sm text-emerald-700">
        Děkuju! Recenze čeká na schválení a brzy se objeví. 🙂
      </div>
    );
  }
  if (phase === "anon") {
    return (
      <div className="card p-6 text-center text-sm text-gray-600">
        Recenzi mohou napsat přihlášení členové.{" "}
        <Link href="/ucet" className="text-brand-blue hover:underline">Přihlásit se</Link>
      </div>
    );
  }
  if (phase === "free") {
    return (
      <div className="card p-6 text-center text-sm text-gray-600">
        Psát recenze mohou členové od úrovně <strong>MEMBER</strong>.{" "}
        <Link href="/clenstvi" className="text-brand-blue hover:underline">Zobrazit členství →</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-3 text-left">
      <h3 className="font-semibold text-brand-dark">Napiš svůj ohlas</h3>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jméno"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Obec (nepovinné)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
      </div>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        <span className="mr-1 text-sm text-gray-500">Hodnocení:</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} className="p-0.5" aria-label={`${n} z 5`}>
            <Star className={`h-6 w-6 ${n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Jak ti spolupráce pomohla? Buď konkrétní – pomůže to ostatním."
        className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
      />
      <button type="submit" disabled={busy || !name.trim() || !text.trim()} className="btn-primary text-sm disabled:opacity-50">
        {busy ? "Odesílám…" : "Odeslat ke schválení"}
      </button>
      <p className="text-xs text-gray-400">Recenzi před zveřejněním schválí lektor.</p>
    </form>
  );
}
