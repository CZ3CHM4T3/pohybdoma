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
  onSetOverride,
  onResetOverride,
}: {
  weekly: WeeklyRow[];
  overrides: OverrideRow[];
  events: EventRow[];
  bookings: BookingLite[];
  onSetOverride: (date: string, time: string, status: EffStatus) => Promise<void>;
  onResetOverride: (date: string, time: string) => Promise<void>;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const minMonth = useMemo(() => startOfMonth(today), [today]);
  const maxMonth = useMemo(() => addMonths(minMonth, 11), [minMonth]);

  const [viewMonth, setViewMonth] = useState<Date>(minMonth);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);

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
  function dayHasFree(date: Date): boolean {
    return HOURS.some((t) => effective(date, t).status === "free");
  }
  function eventsFor(date: Date) {
    const key = dateKey(date);
    return events.filter((e) => e.date === key);
  }
  function bookingsFor(date: Date) {
    const key = dateKey(date);
    return bookings.filter((b) => b.date === key);
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

  const selPast = selectedDate ? startOfDay(selectedDate) < today : false;

  return (
    <div>
      {/* Navigace měsíců */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => setViewMonth(addMonths(viewMonth, -1))}
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
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
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
          const free = inMonth && dayHasFree(d);
          const eventDay = inMonth && eventsFor(d).length > 0;
          const hasBooking = inMonth && bookingsFor(d).length > 0;
          const clickable = inMonth && !isPast;
          const isSelected = selectedDate && sameDay(d, selectedDate);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={!clickable}
              onClick={() => setSelectedDate(d)}
              className={`relative aspect-square rounded-lg text-sm font-medium transition-all ${
                !inMonth
                  ? "text-gray-300"
                  : isSelected
                    ? "bg-brand-blue text-white shadow-md"
                    : isPast
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-brand-dark hover:bg-brand-light"
              }`}
            >
              {d.getDate()}
              {!isSelected && inMonth && (free || eventDay || hasBooking) && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {free && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  {eventDay && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  {hasBooking && <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> volný termín
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> akce
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-blue inline-block" /> rezervace
        </span>
      </div>

      {/* Editor vybraného dne */}
      {selectedDate && (
        <div className="mt-6 rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-brand-dark capitalize mb-1">
            {selectedDate.toLocaleDateString("cs-CZ", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>

          {selPast ? (
            <p className="text-sm text-gray-400">Tento den už proběhl – nelze upravovat.</p>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">
                Klikni na hodinu = přepneš <span className="text-emerald-600 font-medium">volno</span> /{" "}
                <span className="text-gray-400 font-medium">obsazeno</span> jen pro tento den. Hodina s
                výjimkou má štítek – „×" ji vrátí na týdenní rozvrh.
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

              {/* Rezervace v tento den */}
              {bookingsFor(selectedDate).length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-brand-dark mb-2">Rezervace tento den</p>
                  <div className="space-y-1.5">
                    {bookingsFor(selectedDate).map((b) => (
                      <div key={b.id} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="rounded bg-brand-light px-1.5 py-0.5 font-semibold text-brand-blue">
                          {b.time}
                        </span>
                        <span className="font-medium text-brand-dark">{b.service_name}</span>
                        <span>· {b.contact_name}</span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">{b.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Akce v tento den */}
              {eventsFor(selectedDate).length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-brand-dark mb-2">Akce tento den</p>
                  <div className="space-y-1.5">
                    {eventsFor(selectedDate).map((e) => (
                      <div key={e.id} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 font-semibold text-white">
                          {e.kind}
                        </span>
                        {e.time && <span className="text-amber-800">{e.time}</span>}
                        <span className="font-medium text-brand-dark">{e.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
