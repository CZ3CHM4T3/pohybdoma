"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Crown, Medal, Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Row = { user_id: string; name: string; minutes: number; rank: number };

const PODIUM = [
  { ring: "ring-amber-300", bg: "bg-amber-50", text: "text-amber-600", Icon: Crown, label: "1." },
  { ring: "ring-gray-300", bg: "bg-gray-50", text: "text-gray-500", Icon: Medal, label: "2." },
  { ring: "ring-orange-300", bg: "bg-orange-50", text: "text-orange-500", Icon: Medal, label: "3." },
];

function fmtMin(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function Leaderboard() {
  const supabase = createClient();
  const [top, setTop] = useState<Row[]>([]);
  const [winner, setWinner] = useState<Row | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      setMeId(au.user?.id ?? null);
      const [now, last] = await Promise.all([
        supabase.rpc("video_leaderboard", { p_scope: "this_month", p_limit: 3 }),
        supabase.rpc("video_leaderboard", { p_scope: "last_month", p_limit: 1 }),
      ]);
      setTop((now.data ?? []) as Row[]);
      setWinner(((last.data ?? [])[0] as Row) ?? null);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  return (
    <div className="card p-5 mb-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <Trophy className="h-4 w-4" strokeWidth={2} />
        </span>
        <h2 className="font-semibold text-brand-dark">Žebříček dříčů</h2>
        <span className="text-xs text-gray-400">nejvíc odcvičených minut tento měsíc</span>
      </div>

      {/* Dříč měsíce (vítěz minulého měsíce) */}
      {winner && (
        <Link
          href={`/profil/${winner.user_id}`}
          className="mb-3 flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/40 px-3 py-2.5 ring-1 ring-amber-200 hover:ring-amber-300"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white">
            <Crown className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">🏆 Dříč měsíce</p>
            <p className="truncate text-sm font-semibold text-brand-dark">
              {winner.name} <span className="font-normal text-gray-400">· {fmtMin(winner.minutes)}</span>
            </p>
          </div>
        </Link>
      )}

      {top.length === 0 ? (
        <p className="flex items-center gap-2 py-3 text-sm text-gray-400">
          <Flame className="h-4 w-4 text-amber-400" /> Tento měsíc ještě nikdo nezačal — buď první v žebříčku!
        </p>
      ) : (
        <ul className="space-y-1.5">
          {top.map((r) => {
            const p = PODIUM[r.rank - 1] ?? PODIUM[2];
            const isMe = meId === r.user_id;
            return (
              <li key={r.user_id}>
                <Link
                  href={`/profil/${r.user_id}`}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 ring-1 transition hover:bg-gray-50 ${
                    isMe ? "ring-brand-blue bg-brand-light/40" : "ring-transparent"
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 ${p.ring} ${p.bg} ${p.text}`}>
                    <p.Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-dark">
                    {r.name}
                    {isMe && <span className="ml-1.5 text-xs font-bold text-brand-blue">(ty)</span>}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-brand-dark">{fmtMin(r.minutes)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-center text-xs text-gray-400">
        Na konci měsíce vyhlásíme nového <strong className="text-amber-600">dříče měsíce</strong> 💪
      </p>
    </div>
  );
}
