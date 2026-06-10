"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Flame, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Row = { user_id: string; name: string; minutes: number; rank: number };

function fmtMin(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function Leaderboard() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [winner, setWinner] = useState<Row | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      setMeId(au.user?.id ?? null);
      const [now, last] = await Promise.all([
        supabase.rpc("video_leaderboard", { p_scope: "this_month", p_limit: 10 }),
        supabase.rpc("video_leaderboard", { p_scope: "last_month", p_limit: 1 }),
      ]);
      setRows((now.data ?? []) as Row[]);
      setWinner(((last.data ?? [])[0] as Row) ?? null);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  const top3 = rows.slice(0, 3);
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  return (
    <div className="card p-5 mb-6">
      <div className="mb-4 flex flex-col items-center text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Trophy className="h-5 w-5" strokeWidth={2} />
        </span>
        <h2 className="mt-2 text-xl font-bold text-brand-dark">Žebříček</h2>
        <span className="text-xs text-gray-400">nejvíc odcvičených minut tento měsíc</span>
      </div>

      {/* Dříč měsíce – vítěz minulého měsíce */}
      {winner && (
        <Link
          href={`/profil/${winner.user_id}`}
          className="mb-4 flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/40 px-3 py-2.5 ring-1 ring-amber-200 hover:ring-amber-300"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white">
            <Crown className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">🏆 Dříč minulého měsíce</p>
            <p className="truncate text-sm font-semibold text-brand-dark">
              {winner.name} <span className="font-normal text-gray-400">· {fmtMin(winner.minutes)}</span>
            </p>
          </div>
        </Link>
      )}

      {rows.length === 0 && (
        <p className="mb-3 flex items-center gap-2 text-xs text-gray-400">
          <Flame className="h-4 w-4 text-amber-400" /> Tento měsíc zatím nikdo necvičil — buď první!
        </p>
      )}

      {/* Pódium – vždy 1.–3. (i prázdné) */}
      <div className="mb-2">
        <Podium row={first ?? null} place={1} meId={meId} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Podium row={second ?? null} place={2} meId={meId} />
          <Podium row={third ?? null} place={3} meId={meId} />
        </div>
      </div>

      {/* 4.–10. místo – vždy 7 řádků */}
      <ul className="mt-3 space-y-1">
        {Array.from({ length: 7 }).map((_, i) => {
          const rank = i + 4;
          const r = rows.find((x) => x.rank === rank) ?? null;
          const isMe = !!r && meId === r.user_id;
          const inner = (
            <div
              className={`flex items-center gap-3 rounded-lg px-3 py-1.5 ring-1 transition ${
                r ? "hover:bg-gray-50" : ""
              } ${isMe ? "ring-brand-blue bg-brand-light/40" : "ring-transparent"}`}
            >
              <span className="w-5 shrink-0 text-center text-sm font-bold text-gray-400">{rank}.</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {r ? (
                  <span className="text-brand-dark">{r.name}</span>
                ) : (
                  <span className="text-gray-300">zatím nikdo</span>
                )}
                {isMe && <span className="ml-1.5 text-xs font-bold text-brand-blue">(ty)</span>}
              </span>
              <span className="shrink-0 text-sm font-semibold text-gray-500">{r ? fmtMin(r.minutes) : "—"}</span>
            </div>
          );
          return (
            <li key={rank}>
              {r ? <Link href={`/profil/${r.user_id}`} className="block">{inner}</Link> : inner}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-center text-xs text-gray-400">
        Na konci měsíce vyhlásíme nového <strong className="text-amber-600">dříče měsíce</strong> 💪
      </p>
    </div>
  );
}

const MAT = {
  1: { from: "from-amber-300", via: "via-amber-400", to: "to-amber-300", ring: "ring-amber-300", text: "text-amber-600", joke: "na zlaté karimatce 🧘‍♂️✨" },
  2: { from: "from-gray-200", via: "via-gray-300", to: "to-gray-200", ring: "ring-gray-300", text: "text-gray-500", joke: "stříbrná podložka" },
  3: { from: "from-orange-200", via: "via-orange-300", to: "to-orange-200", ring: "ring-orange-300", text: "text-orange-500", joke: "bronzová žíněnka" },
} as const;

function Podium({ row, place, meId }: { row: Row | null; place: 1 | 2 | 3; meId: string | null }) {
  const m = MAT[place];
  const big = place === 1;
  const isMe = !!row && meId === row.user_id;
  const inner = (
    <div
      className={`flex flex-col items-center rounded-xl px-2 ${big ? "pt-3 pb-2" : "pt-2 pb-1.5"} ring-1 transition ${
        row ? "hover:bg-gray-50" : ""
      } ${isMe ? "ring-brand-blue bg-brand-light/40" : "ring-transparent"}`}
    >
      <div className="relative">
        <span
          className={`flex items-center justify-center rounded-full font-semibold ring-2 ${m.ring} ${
            big ? "h-14 w-14 text-xl" : "h-10 w-10 text-base"
          } ${row ? (big ? "bg-amber-400 text-white" : "bg-gray-400 text-white") : "bg-gray-100 text-gray-300"}`}
        >
          {row ? (row.name[0] ?? "Č").toUpperCase() : "–"}
        </span>
        {big && row && <Crown className="absolute -top-3 left-1/2 h-5 w-5 -translate-x-1/2 text-amber-500 drop-shadow" strokeWidth={2.5} />}
        <span
          className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-extrabold text-white ring-2 ring-white ${
            place === 1 ? "bg-amber-500" : place === 2 ? "bg-gray-400" : "bg-orange-400"
          }`}
        >
          {place}
        </span>
      </div>
      <p className={`mt-1.5 max-w-full truncate font-semibold ${big ? "text-sm" : "text-xs"} ${row ? "text-brand-dark" : "text-gray-300"}`}>
        {row ? row.name : "zatím nikdo"}
        {isMe && <span className="ml-1 text-[11px] font-bold text-brand-blue">(ty)</span>}
      </p>
      <p className={`font-bold ${big ? "text-sm" : "text-xs"} ${row ? m.text : "text-gray-300"}`}>{row ? fmtMin(row.minutes) : "—"}</p>
      {/* karimatka */}
      <div className={`mt-1 ${big ? "h-2.5 w-24" : "h-2 w-16"} rounded-full bg-gradient-to-r ${m.from} ${m.via} ${m.to} ${row ? "shadow" : "opacity-50"}`} />
      {big && <p className="mt-1 text-[10px] italic text-amber-500">{row ? m.joke : "tady bude jednička"}</p>}
    </div>
  );
  return row ? <Link href={`/profil/${row.user_id}`} className="block">{inner}</Link> : inner;
}
