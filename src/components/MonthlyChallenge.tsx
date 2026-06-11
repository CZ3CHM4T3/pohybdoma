"use client";

import { useEffect, useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Challenge = { id: string; title: string; body: string | null; video_uid?: string | null };

export function MonthlyChallenge() {
  const supabase = createClient();
  const [uid, setUid] = useState<string | null>(null);
  const [ch, setCh] = useState<Challenge | null>(null);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("challenges")
        .select("id, title, body")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!c) return;
      setCh(c as Challenge);

      // Video (Cloudflare UID) – načítá se měkce; když sloupec ještě není, přeskočí se.
      supabase.from("challenges").select("video_uid").eq("id", (c as Challenge).id).maybeSingle().then(({ data }) => {
        const vid = (data as { video_uid: string | null } | null)?.video_uid;
        if (vid) setCh((prev) => (prev ? { ...prev, video_uid: vid } : prev));
      });

      const { count: cnt } = await supabase
        .from("challenge_done")
        .select("*", { count: "exact", head: true })
        .eq("challenge_id", (c as Challenge).id);
      setCount(cnt ?? 0);

      const { data: au } = await supabase.auth.getUser();
      if (au.user) {
        setUid(au.user.id);
        const { data: mine } = await supabase
          .from("challenge_done")
          .select("challenge_id")
          .eq("challenge_id", (c as Challenge).id)
          .eq("user_id", au.user.id)
          .maybeSingle();
        setDone(!!mine);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ch) return null;

  async function toggle() {
    if (!uid || !ch || busy) return;
    setBusy(true);
    if (done) {
      await supabase.from("challenge_done").delete().eq("challenge_id", ch.id).eq("user_id", uid);
      setDone(false);
      setCount((n) => Math.max(0, n - 1));
    } else {
      await supabase.from("challenge_done").insert({ challenge_id: ch.id, user_id: uid });
      setDone(true);
      setCount((n) => n + 1);
    }
    setBusy(false);
  }

  return (
    <div className="card p-5 mb-6 bg-gradient-to-br from-amber-50 to-white border border-amber-100">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Sparkles className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Měsíční výzva</p>
          <h3 className="text-base font-semibold text-brand-dark">{ch.title}</h3>
          {ch.body && <p className="mt-0.5 text-sm text-gray-600">{ch.body}</p>}
          {ch.video_uid && (
            <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-xl bg-brand-dark">
              <iframe
                src={`https://iframe.videodelivery.net/${ch.video_uid}`}
                className="absolute inset-0 h-full w-full"
                style={{ border: "none" }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
                title={ch.title}
              />
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={toggle}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                done ? "bg-emerald-100 text-emerald-700" : "bg-brand-blue text-white hover:opacity-90"
              }`}
            >
              <Check className="h-4 w-4" /> {done ? "Splněno!" : "Beru výzvu"}
            </button>
            {count > 0 && <span className="text-xs text-gray-500">{count} {count === 1 ? "člověk se přidal" : count < 5 ? "lidé se přidali" : "lidí se přidalo"} 🙌</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
