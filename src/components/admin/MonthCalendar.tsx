"use client";

import { useMemo, useState } from "react";

const MONTHS_CS = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];
const WEEKDAYS_CS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const HOURS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
];

export type WeeklyRow = { weekday: number; time: string; is_free: boolean };
export type OverrideRow = { id: string; date: string; time: string; status: "free" | "booked" };
export type EventRow = {
  id: string;
  date: string;
  title: string;
  kind: string;
  time: string | null;
};
export type BookingLite = {
  id: string;
  date: string;
  time: string;
  service_name: string;
  contact_name: string;
  status: string;
};
export type LessonRow = {
  id: string;
  date: string;
  time: string;
  client_name: string;
  note: string | null;
};

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
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
/** 6týdenní mřížka začínající pondělím. */
function buildCalendar(view: Date): Date[] {
  const first = startOfMonth(view);
  const offset = (first.getDay() + 6) % 7; // pondělí = 0
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

type EffStatus = "free" | "booked";

export function MonthCalendar({
  weekly,
  overrides,
  events,
  bookings,
  lessons,
  onSetOverride,
  onResetOverride,
  onAddLesson,
  onDeleteLesson,
}: {
  weekly: WeeklyRow[];
  overrides: OverrideRow[];
  events: EventRow[];
  bookings: BookingLite[];
  lessons: LessonRow[];
  onSetOverride: (date: string, time: string, status: EffStatus) => Promise<void>;
  onResetOverride: (date: string, time: string) => Promise<void>;
  onAddLesson: (date: string, time: string, clientName: string, note: string) => Promise<void>;
  onDeleteLesson: (id: string) => Promise<void>;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const minMonth = useMemo(() => startOfMonth(today), [today]);
  const maxMonth = useMemo(() => addMonths(minMonth, 17), [minMonth]);

  const [viewMonth, setViewMonth] = useState<Date>(minMonth);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [showHours, setShowHours] = useState(false);

  // Formulář na přidání vlastní lekce
  const [lTime, setLTime] = useState("15:00");
  const [lName, setLName] = useState("");
  const [lNote, setLNote] = useState("");
  const [lSaving, setLSaving] = useState(false);

  const days = useMemo(() => buildCalendar(viewMonth), [viewMonth]);
  const canPrev = startOfMonth(viewMonth) > minMonth;
  const canNext = startOfMonth(viewMonth) < maxMonth;

  function weeklyStatus(wd: number, time: string): EffStatus | null {
    const r = weekly.find((x) => x.weekday === wd && x.time === time);
    if (!r) return null;
    return r.is_free ? "free" : "booked";
  }
  function overrideAt(key: string, time: string): OverrideRow | undefined {
    return overrides.find((o) => o.date === key && o.time === time);
  }
  /** Efektivní stav hodiny: výjimka > týdenní rozvrh > zavřeno. */
  function effective(date: Date, time: string): { status: EffStatus; overridden: boolean } {
    const key = dateKey(date);
    const ov = overrideAt(key, time);
    if (ov) return { status: ov.status, overridden: true };
    const w = weeklyStatus(date.getDay(), time);
    return { status: w ?? "booked", overridden: false };
  }
  function dayFreeCount(date: Date): number {
    return HOURS.filter((t) => effective(date, t).status === "free").length;
  }
  function eventsFor(date: Date) {
    const key = dateKey(date);
    return events.filter((e) => e.date === key);
  }
  function bookingsFor(date: Date) {
    const key = dateKey(date);
    return bookings.filter((b) => b.date === key).sort((a, b2) => a.time.localeCompare(b2.time));
  }
  function lessonsFor(date: Date) {
    const key = dateKey(date);
    return lessons.filter((l) => l.date === key).sort((a, b) => a.time.localeCompare(b.time));
  }

  async function toggleHour(date: Date, time: string) {
    const key = `${dateKey(date)}-${time}`;
    const eff = effective(date, time);
    const next: EffStatus = eff.status === "free" ? "booked" : "free";
    setSavingCell(key);
    await onSetOverride(dateKey(date), time, next);
    setSavingCell(null);
  }
  async function resetHour(date: Date, time: string) {
    const key = `${dateKey(date)}-${time}`;
    setSavingCell(key);
    await onResetOverride(dateKey(date), time);
    setSavingCell(null);
  }

  async function submitLesson() {
    if (!selectedDate || !lName.trim() || !lTime) return;
    setLSaving(true);
    await onAddLesson(dateKey(selectedDate), lTime, lName.trim(), lNote.trim());
    setLSaving(false);
    setLName("");
    setLNote("");
  }

  const selPast = selectedDate ? startOfDay(selectedDate) < today : false;

  return (
    <div>
      {/* Navigace měsíců */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => { setViewMonth(addMonths(viewMonth, -1)); setSelectedDate(null); }}
          className="p-2 rounded-lg text-brand-dark hover:bg-brand-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Předchozí měsíc"
        >
          ←
        </button>
        <h3 className="font-semibold text-brand-dark capitalize">
          {MONTHS_CS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </h3>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => { setViewMonth(addMonths(viewMonth, 1)); setSelectedDate(null); }}
          className="p-2 rounded-lg text-brand-dark hover:bg-brand-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Další měsíc"
        >
          →
        </button>
      </div>

      {/* Hlavička dnů */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_CS.map((w) => (
          <div key={w} className="text-center text-xs font-semibold text-gray-400 py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Dny */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = d.getMonth() === viewMonth.getMonth();
          const isPast = startOfDay(d) < today;
          const freeCount = inMonth ? dayFreeCount(d) : 0;
          const eventDay = inMonth && eventsFor(d).length > 0;
          const dayBookings = inMonth ? bookingsFor(d).length : 0;
          const dayLessons = inMonth ? lessonsFor(d).length : 0;
          const taken = dayBookings + dayLessons;
          const clickable = inMonth;
          const isSelected = selectedDate && sameDay(d, selectedDate);
          const isToday = sameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={!clickable}
              onClick={() => { setSelectedDate(d); setShowHours(false); }}
              className={`relative aspect-square rounded-lg text-sm font-medium transition-all flex flex-col items-center justify-center ${
                !inMonth
                  ? "text-gray-300"
                  : isSelected
                    ? "bg-brand-blue text-white shadow-md"
                    : isPast
                      ? "text-gray-300 hover:bg-gray-50"
                      : isToday
                        ? "text-brand-dark bg-brand-light ring-1 ring-brand-blue/40"
                        : "text-brand-dark hover:bg-brand-light"
              }`}
            >
              <span>{d.getDate()}</span>
              {/* Počet obsazených (rezervace + lekce) jako malé číslo */}
              {!isSelected && inMonth && taken > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue px-1 text-[10px] font-bold text-white">
                  {taken}
                </span>
              )}
              {!isSelected && inMonth && (freeCount > 0 || eventDay) && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {freeCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  {eventDay && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> mám volné hodiny
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue px-1 text-[10px] font-bold text-white">2</span> obsazeno (lekce/rezervace)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> akce
        </span>
      </div>

      {/* Detail vybraného dne */}
      {selectedDate && (
        <div className="mt-6 rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-brand-dark capitalize mb-3">
            {selectedDate.toLocaleDateString("cs-CZ", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>

          {/* ── Koho tu máš (lekce + rezervace) ── */}
          {(lessonsFor(selectedDate).length > 0 || bookingsFor(selectedDate).length > 0) ? (
            <div className="space-y-1.5 mb-4">
              {lessonsFor(selectedDate).map((l) => (
                <div key={l.id} className="flex items-center gap-2 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs">
                  <span className="rounded bg-violet-600 px-1.5 py-0.5 font-bold text-white">{l.time}</span>
                  <span className="font-semibold text-brand-dark">{l.client_name || "Lekce"}</span>
                  {l.note && <span className="text-gray-500 truncate">· {l.note}</span>}
                  <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">moje lekce</span>
                  <button
                    type="button"
                    onClick={() => onDeleteLesson(l.id)}
                    title="Smazat lekci"
                    className="text-gray-300 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
              {bookingsFor(selectedDate).map((b) => (
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

          {/* Akce v tento den */}
          {eventsFor(selectedDate).length > 0 && (
            <div className="mb-4 space-y-1.5">
              {eventsFor(selectedDate).map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 font-semibold text-white">{e.kind}</span>
                  {e.time && <span className="text-amber-800">{e.time}</span>}
                  <span className="font-medium text-brand-dark">{e.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Přidat vlastní lekci ── */}
          {!selPast && (
            <div className="rounded-lg bg-gray-50 p-3 mb-4">
              <p className="text-xs font-semibold text-brand-dark mb-2">+ Přidat vlastní lekci</p>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-0.5">Čas</label>
                  <input
                    type="time"
                    value={lTime}
                    onChange={(e) => setLTime(e.target.value)}
                    className="rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-[11px] text-gray-400 mb-0.5">Klient</label>
                  <input
                    type="text"
                    value={lName}
                    onChange={(e) => setLName(e.target.value)}
                    placeholder="Jméno"
                    className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-[11px] text-gray-400 mb-0.5">Poznámka (nepovinné)</label>
                  <input
                    type="text"
                    value={lNote}
                    onChange={(e) => setLNote(e.target.value)}
                    placeholder="např. masáž zad"
                    className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={submitLesson}
                  disabled={lSaving || !lName.trim()}
                  className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
                >
                  {lSaving ? "Ukládám…" : "Přidat"}
                </button>
              </div>
            </div>
          )}

          {/* ── Volné hodiny pro klienty (výjimky) – schované pod tlačítkem ── */}
          {!selPast && (
            <div>
              <button
                type="button"
                onClick={() => setShowHours((v) => !v)}
                className="text-xs font-semibold text-brand-blue hover:underline"
              >
                {showHours ? "Skrýt volné hodiny" : "Upravit volné hodiny pro klienty tento den ▾"}
              </button>

              {showHours && (
                <>
                  <p className="text-[11px] text-gray-500 mt-2 mb-2">
                    Zeleně = klient si může zarezervovat. Klik přepne volno/zavřeno jen pro tento den.
                    Štítek „×" vrátí hodinu na běžný týdenní rozvrh.
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {HOURS.map((time) => {
                      const { status, overridden } = effective(selectedDate, time);
                      const free = status === "free";
                      const cellKey = `${dateKey(selectedDate)}-${time}`;
                      const saving = savingCell === cellKey;
                      return (
                        <div key={time} className="relative">
                          <button
                            type="button"
                            onClick={() => toggleHour(selectedDate, time)}
                            disabled={saving}
                            className={`w-full h-10 rounded-md text-xs font-semibold transition-all ${
                              free
                                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            } ${saving ? "opacity-50" : ""}`}
                          >
                            {time}
                          </button>
                          {overridden && (
                            <button
                              type="button"
                              onClick={() => resetHour(selectedDate, time)}
                              disabled={saving}
                              title="Vrátit na týdenní rozvrh"
                              className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {selPast && (
            <p className="text-xs text-gray-400">Tento den už proběhl – jen k nahlédnutí.</p>
          )}
        </div>
      )}
    </div>
  );
}
