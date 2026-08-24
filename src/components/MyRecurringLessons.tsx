"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Rec = { id: string; client_name: string; weekday: number; time: string; note: string | null };
type Occ = { recId: string; date: string; time: string; label: string };

const WD = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Nejbližší výskyty daného dne v týdnu na příštích `horizon` dní.
function upcoming(weekday: number, horizonDays: number): Date[] {
  const out: Date[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i <= horizonDays; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    if (d.getDay() === weekday) out.push(d);
  }
  return out;
}

export function MyRecurringLessons() {
  const [occs, setOccs] = useState<Occ[]>([]);
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: recs } = await supabase.from("recurring_lessons").select("id, client_name, weekday, time, note").eq("active", true);
    const list = (recs ?? []) as Rec[];
    if (list.length === 0) { setLoaded(true); return; }
    const ids = list.map((r) => r.id);
    const { data: cans } = await supabase.from("recurring_cancellations").select("recurring_id, date").in("recurring_id", ids);
    setCancelled(new Set((cans ?? []).map((c) => `${c.recurring_id}|${c.date}`)));

    const built: Occ[] = [];
    for (const r of list) {
      // ~4 měsíce dopředu, ať se dá omluvit i dovolená v předstihu
      for (const d of upcoming(r.weekday, 120)) {
        built.push({ recId: r.id, date: dateKey(d), time: r.time, label: r.note || r.client_name || "Lekce" });
      }
    }
    built.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    setOccs(built);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function cancel(o: Occ) {
    const key = `${o.recId}|${o.date}`;
    setBusyKey(key);
    setErr(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("recurring_cancellations").insert({ recurring_id: o.recId, date: o.date, cancelled_by: user?.id ?? null });
    setBusyKey(null);
    if (error) {
      console.error("Omluva selhala:", error);
      setErr("Omluvu se nepodařilo uložit: " + error.message);
      return;
    }
    setCancelled((prev) => new Set(prev).add(key));
  }

  if (!loaded) return null;
  if (occs.length === 0) return null; // nemá žádné pravidelné lekce → nic nezobrazuj

  return (
    <div className="card p-6 mt-6">
      <div className="mb-4 flex flex-col items-center text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <CalendarClock className="h-5 w-5" strokeWidth={2} />
        </span>
        <h2 className="mt-2 text-xl font-bold text-brand-dark">Moje pravidelné lekce</h2>
        <span className="text-xs text-gray-500">Omluvit se jde nejpozději 24 h předem. Pak lekce propadá.</span>
      </div>

      {err && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</p>
      )}

      {(() => {
        const MONTHS = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
        const groups = new Map<string, Occ[]>();
        for (const o of occs) {
          const mk = o.date.slice(0, 7);
          if (!groups.has(mk)) groups.set(mk, []);
          groups.get(mk)!.push(o);
        }
        return [...groups.entries()].map(([mk, items]) => {
          const md = new Date(mk + "-01T00:00:00");
          return (
            <div key={mk} className="mb-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 capitalize">
                {MONTHS[md.getMonth()]} {md.getFullYear()}
              </p>
              <div className="space-y-2">
                {items.map((o) => {
          const key = `${o.recId}|${o.date}`;
          const isCancelled = cancelled.has(key);
          const dt = new Date(o.date + "T" + o.time + ":00");
          const canCancel = dt.getTime() - Date.now() >= 24 * 3600 * 1000;
          const d = new Date(o.date + "T00:00:00");
          const dateLabel = `${WD[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`;
          return (
            <div key={key} className={`flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm ${isCancelled ? "border-gray-100 bg-gray-50 opacity-60" : "border-gray-100"}`}>
              <span className="rounded bg-brand-blue px-2 py-0.5 font-bold text-white">{o.time}</span>
              <span className="capitalize font-medium text-brand-dark">{dateLabel}</span>
              <span className="text-gray-500 truncate">· {o.label}</span>
              <span className="ml-auto">
                {isCancelled ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500"><Check className="h-3.5 w-3.5" /> Omluveno</span>
                ) : canCancel ? (
                  <button
                    type="button"
                    onClick={() => cancel(o)}
                    disabled={busyKey === key}
                    className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busyKey === key ? "Omlouvám…" : "Omluvit se"}
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">nelze omluvit (méně než 24 h)</span>
                )}
              </span>
            </div>
          );
                })}
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
}
