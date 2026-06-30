"use client";

import { useMemo, useState } from "react";
import type { WeeklyRow, OverrideRow, BookingLite, LessonRow } from "./MonthCalendar";

const HOURS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
];
const WD_CS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
/** Pondělí daného týdne. */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const offset = (x.getDay() + 6) % 7; // pondělí = 0
  x.setDate(x.getDate() - offset);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

type EffStatus = "free" | "booked";

export function WeekCalendar({
  weekly,
  overrides,
  bookings,
  lessons,
  onSetOverride,
  onResetOverride,
}: {
  weekly: WeeklyRow[];
  overrides: OverrideRow[];
  bookings: BookingLite[];
  lessons: LessonRow[];
  onSetOverride: (date: string, time: string, status: EffStatus) => Promise<void>;
  onResetOverride: (date: string, time: string) => Promise<void>;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const minWeek = useMemo(() => startOfWeek(today), [today]);
  const maxWeek = useMemo(() => addDays(minWeek, 7 * 77), [minWeek]); // ~18 měsíců

  const [weekStart, setWeekStart] = useState<Date>(minWeek);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const canPrev = weekStart > minWeek;
  const canNext = weekStart < maxWeek;

  function weeklyStatus(wd: number, time: string): EffStatus | null {
    const r = weekly.find((x) => x.weekday === wd && x.time === time);
    if (!r) return null;
    return r.is_free ? "free" : "booked";
  }
  function effective(date: Date, time: string): { status: EffStatus; overridden: boolean } {
    const key = dateKey(date);
    const ov = overrides.find((o) => o.date === key && o.time === time);
    if (ov) return { status: ov.status, overridden: true };
    const w = weeklyStatus(date.getDay(), time);
    return { status: w ?? "booked", overridden: false };
  }
  function takenAt(date: Date, time: string): { name: string; kind: "lekce" | "rezervace" } | null {
    const key = dateKey(date);
    const l = lessons.find((x) => x.date === key && x.time === time);
    if (l) return { name: l.client_name || "Lekce", kind: "lekce" };
    const b = bookings.find((x) => x.date === key && x.time === time);
    if (b) return { name: b.contact_name, kind: "rezervace" };
    return null;
  }

  async function toggle(date: Date, time: string) {
    const key = `${dateKey(date)}-${time}`;
    const eff = effective(date, time);
    const next: EffStatus = eff.status === "free" ? "booked" : "free";
    setSavingCell(key);
    await onSetOverride(dateKey(date), time, next);
    setSavingCell(null);
  }
  async function reset(date: Date, time: string) {
    const key = `${dateKey(date)}-${time}`;
    setSavingCell(key);
    await onResetOverride(dateKey(date), time);
    setSavingCell(null);
  }

  const rangeLabel = `${days[0].toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })} – ${days[6].toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}`;

  return (
    <div>
      {/* Navigace týdnů */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="p-2 rounded-lg text-brand-dark hover:bg-brand-light disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Předchozí týden"
        >
          ←
        </button>
        <h3 className="font-semibold text-brand-dark text-sm">{rangeLabel}</h3>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="p-2 rounded-lg text-brand-dark hover:bg-brand-light disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Další týden"
        >
          →
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Naklikej, které hodiny jsou <span className="text-emerald-600 font-medium">tento týden volné</span> pro
        klienty. Platí jen pro tato data – příští týden si přepneš a nastavíš jinak. Obsazené hodiny
        (lekce/rezervace) jsou označené a nejdou přepnout.
      </p>

      {/* Mřížka: hodiny × dny */}
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-12"></th>
              {days.map((d) => {
                const isToday = dateKey(d) === dateKey(today);
                return (
                  <th key={d.toISOString()} className="min-w-[64px] pb-1">
                    <div className={`text-xs font-semibold ${isToday ? "text-brand-blue" : "text-gray-500"}`}>
                      {WD_CS[(d.getDay() + 6) % 7]}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {d.getDate()}.{d.getMonth() + 1}.
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((time) => (
              <tr key={time}>
                <td className="text-[11px] text-gray-400 pr-1 text-right align-middle">{time}</td>
                {days.map((d) => {
                  const past = startOfDay(d) < today;
                  const taken = takenAt(d, time);
                  const { status, overridden } = effective(d, time);
                  const free = status === "free";
                  const cellKey = `${dateKey(d)}-${time}`;
                  const saving = savingCell === cellKey;

                  if (taken) {
                    return (
                      <td key={cellKey}>
                        <div
                          title={`${taken.name} (${taken.kind})`}
                          className={`h-9 min-w-[64px] rounded-md text-[10px] font-semibold text-white flex items-center justify-center px-1 truncate ${
                            taken.kind === "lekce" ? "bg-violet-600" : "bg-brand-blue"
                          }`}
                        >
                          {taken.name}
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={cellKey} className="relative">
                      <button
                        type="button"
                        onClick={() => toggle(d, time)}
                        disabled={saving || past}
                        className={`h-9 w-full min-w-[64px] rounded-md text-xs font-semibold transition-all ${
                          past
                            ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                            : free
                              ? "bg-emerald-500 text-white hover:bg-emerald-600"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        } ${saving ? "opacity-50" : ""}`}
                      >
                        {free ? "volno" : "—"}
                      </button>
                      {overridden && !past && (
                        <button
                          type="button"
                          onClick={() => reset(d, time)}
                          disabled={saving}
                          title="Vrátit na běžné volné hodiny"
                          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> volno</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-blue inline-block" /> rezervace</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-600 inline-block" /> moje lekce</span>
        <span className="flex items-center gap-1.5"><span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">×</span> výjimka jen pro tento den</span>
      </div>
    </div>
  );
}
