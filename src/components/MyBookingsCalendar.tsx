"use client";

import { useMemo, useState } from "react";
import { MapPin, MonitorPlay } from "lucide-react";

export type MyBooking = {
  id: string;
  service_name: string;
  date: string;
  time: string;
  status: string;
  mode: string;
  municipality?: string | null;
  address?: string | null;
  reason?: string | null;
  price_kc?: number | null;
};

const MONTHS_CS = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];
const WEEKDAYS_CS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

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
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function buildCalendar(view: Date): Date[] {
  const first = startOfMonth(view);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function MyBookingsCalendar({
  bookings,
  onCancel,
}: {
  bookings: MyBooking[];
  onCancel?: (id: string) => void;
}) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const [view, setView] = useState<Date>(() => startOfMonth(new Date()));
  const [sel, setSel] = useState<Date | null>(null);

  const byDay = useMemo(() => {
    const m: Record<string, MyBooking[]> = {};
    for (const b of bookings) (m[b.date] ??= []).push(b);
    return m;
  }, [bookings]);

  const days = useMemo(() => buildCalendar(view), [view]);
  const selKey = sel ? dateKey(sel) : null;
  const selBookings = selKey ? byDay[selKey] ?? [] : [];

  return (
    <div>
      {/* Navigace měsíců */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setView(addMonths(view, -1))}
          className="p-2 rounded-lg text-brand-dark hover:bg-brand-light transition-colors"
          aria-label="Předchozí měsíc"
        >
          ←
        </button>
        <h3 className="font-semibold text-brand-dark capitalize">
          {MONTHS_CS[view.getMonth()]} {view.getFullYear()}
        </h3>
        <button
          type="button"
          onClick={() => setView(addMonths(view, 1))}
          className="p-2 rounded-lg text-brand-dark hover:bg-brand-light transition-colors"
          aria-label="Další měsíc"
        >
          →
        </button>
      </div>

      {/* Hlavička dnů */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_CS.map((w) => (
          <div key={w} className="text-center text-xs font-semibold text-gray-400 py-1">{w}</div>
        ))}
      </div>

      {/* Dny */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = d.getMonth() === view.getMonth();
          const has = inMonth && (byDay[dateKey(d)]?.length ?? 0) > 0;
          const isToday = sameDay(d, today);
          const isSel = sel && sameDay(d, sel);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={!has}
              onClick={() => setSel(d)}
              className={`relative aspect-square rounded-lg text-sm font-medium transition-all ${
                !inMonth
                  ? "text-gray-300"
                  : isSel
                    ? "bg-brand-blue text-white shadow-md"
                    : has
                      ? "text-brand-dark hover:bg-brand-light"
                      : "text-gray-300 cursor-default"
              } ${isToday && !isSel ? "ring-1 ring-brand-blue/40" : ""}`}
            >
              {d.getDate()}
              {has && !isSel && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-blue" />
              )}
            </button>
          );
        })}
      </div>

      {/* Detail vybraného dne */}
      {sel && (
        <div className="mt-4 rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-brand-dark capitalize mb-2">
            {sel.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          {selBookings.length === 0 ? (
            <p className="text-xs text-gray-400">V tento den nemáš žádnou rezervaci.</p>
          ) : (
            <div className="space-y-2">
              {selBookings.map((b) => {
                const cancelled = b.status === "cancelled" || b.status === "zrušeno";
                const dt = new Date(`${b.date}T${(b.time || "00:00")}:00`);
                const canCancel =
                  !!onCancel && !cancelled && dt.getTime() - Date.now() > 24 * 60 * 60 * 1000;
                return (
                  <div key={b.id} className={`rounded-lg p-3 ${cancelled ? "bg-gray-100 opacity-70" : "bg-brand-light/50"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold ${cancelled ? "text-gray-400 line-through" : "text-brand-dark"}`}>
                        {b.time} · {b.service_name}
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cancelled ? "bg-gray-200 text-gray-500" : "bg-amber-100 text-amber-700"}`}>
                        {cancelled ? "zrušeno" : b.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        {b.mode === "online" ? <MonitorPlay className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                        {b.mode === "online" ? "Online" : "Osobně"}
                      </span>
                      {b.municipality && <span>{b.address}, {b.municipality}</span>}
                      {b.price_kc != null && <span>{b.price_kc} Kč</span>}
                    </div>
                    {b.reason && <p className="mt-1 text-xs text-gray-500 italic">„{b.reason}"</p>}
                    {!cancelled && (
                      canCancel ? (
                        <button
                          type="button"
                          onClick={() => onCancel!(b.id)}
                          className="mt-2 text-xs font-semibold text-red-500 hover:text-red-700"
                        >
                          Zrušit rezervaci
                        </button>
                      ) : (
                        onCancel && <p className="mt-2 text-[11px] text-gray-400">Zrušení už není možné (méně než 24 h předem).</p>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {bookings.length === 0 && (
        <p className="mt-4 text-center text-xs text-gray-400">
          Zatím žádné rezervace. Termín si vybereš v sekci Rezervace.
        </p>
      )}
    </div>
  );
}
