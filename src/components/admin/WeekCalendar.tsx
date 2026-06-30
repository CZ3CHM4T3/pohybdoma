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
  onAddLesson,
  onDeleteLesson,
}: {
  weekly: WeeklyRow[];
  overrides: OverrideRow[];
  bookings: BookingLite[];
  lessons: LessonRow[];
  onSetOverride: (date: string, time: string, status: EffStatus) => Promise<void>;
  onResetOverride: (date: string, time: string) => Promise<void>;
  onAddLesson: (date: string, time: string, clientName: string, note: string, priceKc: number | null) => Promise<void>;
  onDeleteLesson: (id: string) => Promise<void>;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const minWeek = useMemo(() => startOfWeek(today), [today]);
  const maxWeek = useMemo(() => addDays(minWeek, 7 * 77), [minWeek]); // ~18 měsíců

  const [weekStart, setWeekStart] = useState<Date>(minWeek);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Formulář na vlastní lekci
  const [lTime, setLTime] = useState("15:00");
  const [lName, setLName] = useState("");
  const [lNote, setLNote] = useState("");
  const [lPrice, setLPrice] = useState("1000");
  const [lSaving, setLSaving] = useState(false);

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

  function lessonsForDay(date: Date) {
    const key = dateKey(date);
    return lessons.filter((l) => l.date === key).sort((a, b) => a.time.localeCompare(b.time));
  }
  function bookingsForDay(date: Date) {
    const key = dateKey(date);
    return bookings.filter((b) => b.date === key).sort((a, b) => a.time.localeCompare(b.time));
  }
  async function submitLesson() {
    if (!selectedDay || !lName.trim() || !lTime) return;
    setLSaving(true);
    const priceKc = lPrice.trim() === "" ? null : Number(lPrice);
    await onAddLesson(dateKey(selectedDay), lTime, lName.trim(), lNote.trim(), Number.isFinite(priceKc as number) ? priceKc : null);
    setLSaving(false);
    setLName("");
    setLNote("");
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
                const isSel = selectedDay && dateKey(d) === dateKey(selectedDay);
                return (
                  <th key={d.toISOString()} className="min-w-[64px] pb-1">
                    <button
                      type="button"
                      onClick={() => setSelectedDay(d)}
                      title="Otevřít den (přidat lekci)"
                      className={`w-full rounded-md py-1 transition-colors ${isSel ? "bg-brand-blue text-white" : "hover:bg-brand-light"}`}
                    >
                      <div className={`text-xs font-semibold ${isSel ? "text-white" : isToday ? "text-brand-blue" : "text-gray-500"}`}>
                        {WD_CS[(d.getDay() + 6) % 7]}
                      </div>
                      <div className={`text-[11px] ${isSel ? "text-white/80" : "text-gray-400"}`}>
                        {d.getDate()}.{d.getMonth() + 1}.
                      </div>
                    </button>
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

      {/* Panel vybraného dne – lekce + přidání */}
      {selectedDay && (
        <div className="mt-5 rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-brand-dark capitalize mb-3">
            {selectedDay.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>

          {(lessonsForDay(selectedDay).length > 0 || bookingsForDay(selectedDay).length > 0) ? (
            <div className="space-y-1.5 mb-4">
              {lessonsForDay(selectedDay).map((l) => (
                <div key={l.id} className="flex items-center gap-2 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs">
                  <span className="rounded bg-violet-600 px-1.5 py-0.5 font-bold text-white">{l.time}</span>
                  <span className="font-semibold text-brand-dark">{l.client_name || "Lekce"}</span>
                  {l.note && <span className="text-gray-500 truncate">· {l.note}</span>}
                  {l.price_kc != null && <span className="text-violet-700 font-semibold">· {l.price_kc} Kč</span>}
                  <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">moje lekce</span>
                  <button type="button" onClick={() => onDeleteLesson(l.id)} title="Smazat lekci" className="text-gray-300 hover:text-red-500">×</button>
                </div>
              ))}
              {bookingsForDay(selectedDay).map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded-lg bg-brand-light px-2.5 py-1.5 text-xs">
                  <span className="rounded bg-brand-blue px-1.5 py-0.5 font-bold text-white">{b.time}</span>
                  <span className="font-semibold text-brand-dark">{b.contact_name}</span>
                  <span className="text-gray-500 truncate">· {b.service_name}</span>
                  <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{b.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-4">Tento den zatím nikoho nemáš.</p>
          )}

          {startOfDay(selectedDay) >= today && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-semibold text-brand-dark mb-2">+ Přidat vlastní lekci</p>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-0.5">Čas</label>
                  <input type="time" value={lTime} onChange={(e) => setLTime(e.target.value)} className="rounded-md border border-gray-200 px-2 py-1.5 text-xs" />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-[11px] text-gray-400 mb-0.5">Klient</label>
                  <input type="text" value={lName} onChange={(e) => setLName(e.target.value)} placeholder="Jméno" className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs" />
                </div>
                <div className="flex-1 min-w-[110px]">
                  <label className="block text-[11px] text-gray-400 mb-0.5">Poznámka (nepovinné)</label>
                  <input type="text" value={lNote} onChange={(e) => setLNote(e.target.value)} placeholder="např. masáž zad" className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs" />
                </div>
                <div className="w-20">
                  <label className="block text-[11px] text-gray-400 mb-0.5">Cena Kč</label>
                  <input type="number" value={lPrice} onChange={(e) => setLPrice(e.target.value)} placeholder="1000" className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs" />
                </div>
                <button type="button" onClick={submitLesson} disabled={lSaving || !lName.trim()} className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40">
                  {lSaving ? "Ukládám…" : "Přidat"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
