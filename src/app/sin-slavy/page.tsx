"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Pin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TRACKS, trackState, TIER_LABEL, type Stats, type Track } from "@/lib/badges";
import { BadgeMedal } from "@/components/BadgeMedal";
import { BadgePins } from "@/components/BadgePins";

const EMPTY: Stats = { lessons: 0, diary: 0, favorites: 0, buddies: 0, brags: 0, challenges: 0, circlesCreated: 0, circlesJoined: 0, membershipDays: 0 };
const CATS = ["Pohyb", "Návyk", "Komunita", "Věrnost"];

export default function SinSlavyPage() {
  const supabase = createClient();
  const [phase, setPhase] = useState<"loading" | "anon" | "ready">("loading");
  const [name, setName] = useState("");
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [pinned, setPinned] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const user = au.user;
      if (!user) { setPhase("anon"); return; }

      const { data: prof } = await supabase
        .from("profiles").select("full_name, tier_since, pinned_badges").eq("id", user.id).maybeSingle();
      setName((prof?.full_name as string) || (user.user_metadata?.full_name as string) || user.email || "");
      setPinned((prof?.pinned_badges as string[]) ?? []);

      const [lp, dia, fav, chd, br, cir, bud, cjoin] = await Promise.all([
        supabase.from("lesson_progress").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true),
        supabase.from("diary_entries").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("video_favorites").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("challenge_done").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("brags").select("*", { count: "exact", head: true }).eq("author_id", user.id),
        supabase.from("circles").select("*", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.rpc("my_buddies"),
        supabase.from("circle_members").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      const buddies = ((bud.data ?? []) as { status: string }[]).filter((b) => b.status === "accepted").length;
      const membershipDays = prof?.tier_since
        ? Math.max(0, Math.floor((Date.now() - new Date(prof.tier_since as string).getTime()) / 86400000))
        : 0;
      setStats({
        lessons: lp.count ?? 0, diary: dia.count ?? 0, favorites: fav.count ?? 0, challenges: chd.count ?? 0,
        brags: br.count ?? 0, circlesCreated: cir.count ?? 0, circlesJoined: cjoin.count ?? 0, buddies, membershipDays,
      });
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePin(id: string) {
    setPinned((prev) => {
      let next: string[];
      if (prev.includes(id)) next = prev.filter((x) => x !== id);
      else { if (prev.length >= 3) return prev; next = [...prev, id]; }
      supabase.rpc("set_pinned_badges", { p_ids: next });
      return next;
    });
  }

  if (phase === "loading") return <Centered><p className="text-gray-400">Načítám…</p></Centered>;
  if (phase === "anon") {
    return (
      <Centered>
        <Trophy className="mx-auto mb-3 h-10 w-10 text-amber-500" strokeWidth={1.8} />
        <h1 className="text-xl font-semibold text-brand-dark mb-2">Síň slávy</h1>
        <p className="text-sm text-gray-500 mb-5">Tvoje odznaky uvidíš po přihlášení.</p>
        <Link href="/ucet" className="btn-primary">Přihlásit se</Link>
      </Centered>
    );
  }

  const started = TRACKS.filter((t) => trackState(t, stats).level > 0).length;

  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Trophy className="h-6 w-6" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-brand-dark">Síň slávy</h1>
            <p className="text-sm text-gray-500">
              Rozjel jsi {started} z {TRACKS.length} sbírek. Každý medailon se sám upgraduje na vyšší stupeň. Přišpendli si až 3. 📌
            </p>
          </div>
        </div>

        {/* Moje vizitka */}
        <div className="card p-4 mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-sm font-semibold text-white">{(name[0] ?? "U").toUpperCase()}</span>
          <span className="font-semibold text-brand-dark">{name}</span>
          <BadgePins ids={pinned} size={28} />
          {pinned.length === 0 && <span className="text-xs text-gray-400">— zatím nic přišpendleného</span>}
        </div>

        {CATS.map((cat) => {
          const list = TRACKS.filter((t) => t.cat === cat);
          if (list.length === 0) return null;
          return (
            <div key={cat} className="mb-8">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">{cat}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {list.map((t) => (
                  <TrackTile key={t.id} t={t} stats={stats} pinned={pinned} canPin={pinned.length < 3} onPin={togglePin} />
                ))}
              </div>
            </div>
          );
        })}

        <p className="text-center text-[11px] text-gray-400">
          Některé sbírky (série dní, % knihovny, kurzy, osobní trénink) se rozjedou, až spustíme jejich měření.
        </p>
      </div>
    </div>
  );
}

function TrackTile({ t, stats, pinned, canPin, onPin }: { t: Track; stats: Stats; pinned: string[]; canPin: boolean; onPin: (id: string) => void }) {
  const ts = trackState(t, stats);
  const earned = ts.level > 0;
  const showId = earned ? ts.current!.id : ts.next!.id;
  const isPinned = earned && pinned.includes(ts.current!.id);

  return (
    <div className="card p-5 text-center">
      <div className="mx-auto mb-3 transition-transform hover:scale-105" style={{ width: 84 }}>
        <BadgeMedal id={showId} earned={earned} size={84} />
      </div>

      <h3 className={`text-sm font-semibold ${earned ? "text-brand-dark" : "text-gray-500"}`}>
        {earned ? ts.current!.name : t.label}
      </h3>
      {earned && (
        <span className="mt-0.5 inline-block text-[11px] font-bold uppercase tracking-wide text-amber-600">
          {TIER_LABEL[ts.current!.tier]} · stupeň {ts.level}/{t.steps.length}
        </span>
      )}
      <p className="mt-0.5 text-xs text-gray-400">{(earned ? ts.current! : ts.next!).sub}</p>

      {earned ? (
        <button
          onClick={() => onPin(ts.current!.id)}
          disabled={!isPinned && !canPin}
          className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-40 ${
            isPinned ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-light hover:text-brand-blue"
          }`}
        >
          <Pin className="h-3.5 w-3.5" /> {isPinned ? "Přišpendleno" : "Přišpendlit"}
        </button>
      ) : ts.next?.manual ? (
        <p className="mt-3 text-[11px] text-gray-400">připravujeme</p>
      ) : (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-brand-blue" style={{ width: `${ts.max ? Math.min(100, Math.round((ts.now / ts.max) * 100)) : 0}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">{ts.now}/{ts.max}</p>
        </div>
      )}

      {/* progress k dalšímu stupni, i když už něco máš */}
      {earned && !ts.maxed && ts.next && !ts.next.manual && (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${ts.max ? Math.min(100, Math.round((ts.now / ts.max) * 100)) : 0}%` }} />
          </div>
          <p className="mt-0.5 text-[10px] text-gray-400">do „{ts.next.name}": {ts.now}/{ts.max}</p>
        </div>
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
