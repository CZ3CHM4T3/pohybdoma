"use client";

import { useMemo, useState } from "react";
import type { BookingLite, LessonRow } from "./MonthCalendar";

export type BlockOcc = { id: string; date: string; start_time: string; end_time: string; label: string; category: string };

const START_H = 7;
const END_H = 22;
const HOUR_PX = 46;
const TOTAL_PX = (END_H - START_H) * HOUR_PX;
const HOURS = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
const WD_CS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // pondělí
  return x;
}
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function toMin(t: string): number { return parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5) || "0", 10); }

type Item = {
  id: string; startMin: number; endMin: number; name: string; time: string;
  color: string; kind: "fitness" | "block" | "rezervace" | "volno"; deletable: boolean; recurring: boolean; lane: number; lanes: number;
};

export function WeekCalendar({
  bookings,
  lessons,
  blocks,
  open = [],
  catColors,
  clientNames = [],
  onAddLesson,
  onAddRecurring,
  onDeleteLesson,
  onCancelOccurrence,
  onCancelBlock,
  onOpenOnce,
  onOpenWeekly,
  onCloseOpen,
}: {
  bookings: BookingLite[];
  lessons: LessonRow[];
  blocks: BlockOcc[];
  open?: { date: string; time: string }[];
  catColors: Record<string, string>;
  clientNames?: string[];
  onAddLesson: (date: string, time: string, clientName: string, note: string, priceKc: number | null) => Promise<void>;
  onAddRecurring?: (weekday: number, time: string, clientName: string, note: string, priceKc: number | null) => Promise<void>;
  onDeleteLesson: (id: string) => Promise<void>;
  onCancelOccurrence?: (recId: string, date: string) => Promise<void>;
  onCancelBlock?: (blockId: string, date: string) => Promise<void>;
  onOpenOnce?: (date: string, time: string) => Promise<void>;
  onOpenWeekly?: (weekday: number, time: string) => Promise<void>;
  onCloseOpen?: (date: string, time: string) => Promise<void>;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const minWeek = useMemo(() => addDays(startOfWeek(today), -7 * 20), [today]); // ~5 měsíců dozadu (zpětné zapisování)
  const maxWeek = useMemo(() => addDays(startOfWeek(today), 7 * 77), [today]);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(startOfDay(new Date()))); // aktuální týden
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Formulář na lekci
  const [lTime, setLTime] = useState("15:00");
  const [lName, setLName] = useState("");
  const [lNote, setLNote] = useState("");
  const [lPrice, setLPrice] = useState("1000");
  const [lRepeat, setLRepeat] = useState(false);
  const [lSaving, setLSaving] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const canPrev = weekStart > minWeek;
  const canNext = weekStart < maxWeek;

  function itemsForDay(d: Date): Item[] {
    const key = dateKey(d);
    const raw: Omit<Item, "lane" | "lanes">[] = [];
    for (const l of lessons) {
      if (l.date !== key) continue;
      const s = toMin(l.time);
      raw.push({ id: l.id, startMin: s, endMin: s + 60, name: l.client_name || "Lekce", time: l.time, color: catColors.fitness, kind: "fitness", deletable: !l.recurring, recurring: !!l.recurring });
    }
    for (const b of blocks) {
      if (b.date !== key) continue;
      raw.push({ id: b.id, startMin: toMin(b.start_time), endMin: toMin(b.end_time), name: b.label, time: b.start_time, color: catColors[b.category] || catColors.jine, kind: "block", deletable: false, recurring: false });
    }
    for (const bk of bookings) {
      if (bk.date !== key || bk.status === "cancelled" || bk.status === "no_show") continue;
      const s = toMin(bk.time);
      raw.push({ id: bk.id, startMin: s, endMin: s + 60, name: bk.contact_name, time: bk.time, color: catColors.rezervace, kind: "rezervace", deletable: false, recurring: false });
    }
    const seenOpen = new Set<string>();
    for (const o of open) {
      if (o.date !== key || seenOpen.has(o.time)) continue;
      seenOpen.add(o.time);
      const s = toMin(o.time);
      raw.push({ id: `open:${key}:${o.time}`, startMin: s, endMin: s + 60, name: "volno", time: o.time, color: "#10b981", kind: "volno", deletable: false, recurring: false });
    }
    // Rozvržení do sloupců (lanes) při překryvu
    raw.sort((a, b) => a.startMin - b.startMin);
    const laneEnds: number[] = [];
    const withLane = raw.map((it) => {
      let lane = laneEnds.findIndex((end) => end <= it.startMin);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.endMin); }
      else laneEnds[lane] = it.endMin;
      return { ...it, lane };
    });
    const lanes = Math.max(1, laneEnds.length);
    return withLane.map((it) => ({ ...it, lanes }));
  }

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, d: Date) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let min = START_H * 60 + Math.round(((y / HOUR_PX) * 60) / 15) * 15; // zaokrouhli na 15 min
    min = Math.max(START_H * 60, Math.min(END_H * 60 - 15, min));
    setSelectedDay(d);
    setLTime(`${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`);
  }

  async function submitLesson() {
    if (!selectedDay || !lName.trim() || !lTime) return;
    setLSaving(true);
    const priceKc = lPrice.trim() === "" ? null : Number(lPrice);
    const p = Number.isFinite(priceKc as number) ? priceKc : null;
    if (lRepeat && onAddRecurring) await onAddRecurring(selectedDay.getDay(), lTime, lName.trim(), lNote.trim(), p);
    else await onAddLesson(dateKey(selectedDay), lTime, lName.trim(), lNote.trim(), p);
    setLSaving(false);
    setLName(""); setLNote(""); setLRepeat(false);
  }

  const rangeLabel = `${days[0].toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })} – ${days[6].toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}`;
  const dayItems = selectedDay ? itemsForDay(selectedDay) : [];

  return (
    <div>
      {/* Navigace */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" disabled={!canPrev} onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-2 rounded-lg text-brand-dark hover:bg-brand-light disabled:opacity-30" aria-label="Předchozí týden">←</button>
        <h3 className="font-semibold text-brand-dark text-sm">{rangeLabel}</h3>
        <button type="button" disabled={!canNext} onClick={() => setWeekStart(addDays(weekStart, 7))} className="p-2 rounded-lg text-brand-dark hover:bg-brand-light disabled:opacity-30" aria-label="Další týden">→</button>
      </div>

      <p className="text-xs text-gray-500 mb-3">Přehled celého týdne na časové ose – výška = délka lekce, mezery = volno. <strong>Klikni do prázdného místa v ose</strong> (nebo na datum dne) a dole přidáš lekci na ten čas.</p>

      {/* Časová osa */}
      <div className="overflow-x-auto">
        <div className="flex" style={{ minWidth: 700 }}>
          {/* Osa hodin */}
          <div className="w-10 shrink-0">
            <div className="h-7" />
            <div className="relative" style={{ height: TOTAL_PX }}>
              {HOURS.map((h, i) => (
                <div key={h} className="absolute right-1 text-[10px] text-gray-400" style={{ top: i * HOUR_PX - 6 }}>{h}:00</div>
              ))}
            </div>
          </div>

          {/* Dny */}
          {days.map((d) => {
            const isToday = dateKey(d) === dateKey(today);
            const isSel = selectedDay && dateKey(d) === dateKey(selectedDay);
            const items = itemsForDay(d);
            return (
              <div key={d.toISOString()} className="flex-1 min-w-[86px] border-l border-gray-100">
                <button type="button" onClick={() => setSelectedDay(d)} className={`h-7 w-full text-center transition-colors ${isSel ? "bg-brand-blue text-white" : "hover:bg-brand-light"}`}>
                  <span className={`text-xs font-semibold ${isSel ? "text-white" : isToday ? "text-brand-blue" : "text-gray-500"}`}>{WD_CS[(d.getDay() + 6) % 7]} {d.getDate()}.{d.getMonth() + 1}.</span>
                </button>
                <div className="relative cursor-pointer" style={{ height: TOTAL_PX }} onClick={(e) => handleColumnClick(e, d)} title="Klikni pro přidání lekce na tento čas">
                  {HOURS.map((h, i) => (
                    <div key={h} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: i * HOUR_PX }} />
                  ))}
                  {items.map((it) => {
                    const top = ((it.startMin - START_H * 60) / 60) * HOUR_PX;
                    const height = Math.max(15, ((it.endMin - it.startMin) / 60) * HOUR_PX - 2);
                    const w = 100 / it.lanes;
                    return (
                      <div
                        key={it.id}
                        title={`${it.time} ${it.name}`}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute rounded px-1 py-0.5 text-[9px] font-semibold text-white overflow-hidden leading-tight cursor-default"
                        style={{ top, height, left: `calc(${it.lane * w}% + 1px)`, width: `calc(${w}% - 2px)`, background: it.color }}
                      >
                        <span className="block opacity-90">{it.time}</span>
                        <span className="block truncate">{it.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded inline-block" style={{ background: "#10b981" }} /> volno</span>
        {[["fitness", "fitness (klient)"], ["rezervace", "rezervace z webu"], ["msgem", "MS GEM"], ["tenis", "příprava tenistů"], ["skolka", "školka"], ["krouzek", "kroužek"], ["kruhac", "kruhový trénink"], ["jine", "jiné"]].map(([k, label]) => (
          <span key={k} className="flex items-center gap-1"><span className="h-3 w-3 rounded inline-block" style={{ background: catColors[k] }} /> {label}</span>
        ))}
      </div>

      {/* Panel dne */}
      {selectedDay && (
        <div className="mt-5 rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-brand-dark capitalize mb-3">
            {selectedDay.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          {dayItems.length > 0 ? (
            <div className="space-y-1.5 mb-4">
              {dayItems.map((it) => (
                <div key={it.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs" style={{ background: it.color + "18" }}>
                  <span className="rounded px-1.5 py-0.5 font-bold text-white" style={{ background: it.color }}>{it.time}</span>
                  <span className="font-semibold text-brand-dark">{it.name}</span>
                  {it.recurring && onCancelOccurrence ? (
                    <button
                      type="button"
                      onClick={() => { const p = it.id.split(":"); onCancelOccurrence(p[1], p[2]); }}
                      title="Zrušit tento termín (uvolní se + klientovi přijde mail)"
                      className="ml-auto rounded border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50"
                    >
                      Zrušit termín
                    </button>
                  ) : it.kind === "block" && onCancelBlock ? (
                    <button
                      type="button"
                      onClick={() => { const p = it.id.split(":"); onCancelBlock(p[1], p[2]); }}
                      title="Tento den blok není – zrušit (nebude se počítat)"
                      className="ml-auto rounded border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50"
                    >
                      Zrušit tento den
                    </button>
                  ) : it.kind === "volno" && onCloseOpen && selectedDay ? (
                    <button
                      type="button"
                      onClick={() => onCloseOpen(dateKey(selectedDay), it.time)}
                      title="Zavřít – přestat nabízet veřejnosti"
                      className="ml-auto rounded border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-500 hover:bg-gray-50"
                    >
                      Zavřít
                    </button>
                  ) : it.deletable ? (
                    <button type="button" onClick={() => onDeleteLesson(it.id)} title="Smazat lekci" className="ml-auto text-gray-300 hover:text-red-500">×</button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-4">Tento den zatím nikoho nemáš.</p>
          )}

          {(
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-semibold text-brand-dark mb-2">
                + Přidat lekci{startOfDay(selectedDay) < today ? " (zpětně)" : ""}
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-0.5">Čas</label>
                  <input type="time" value={lTime} onChange={(e) => setLTime(e.target.value)} className="rounded-md border border-gray-200 px-2 py-1.5 text-xs" />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-[11px] text-gray-400 mb-0.5">Klient</label>
                  <input type="text" list="wc-client-names" value={lName} onChange={(e) => setLName(e.target.value)} placeholder="Jméno" className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs" />
                  <datalist id="wc-client-names">{clientNames.map((n) => <option key={n} value={n} />)}</datalist>
                </div>
                <div className="flex-1 min-w-[110px]">
                  <label className="block text-[11px] text-gray-400 mb-0.5">Poznámka (nepovinné)</label>
                  <input type="text" value={lNote} onChange={(e) => setLNote(e.target.value)} placeholder="např. záda" className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs" />
                </div>
                <div className="w-20">
                  <label className="block text-[11px] text-gray-400 mb-0.5">Cena Kč</label>
                  <input type="number" value={lPrice} onChange={(e) => setLPrice(e.target.value)} placeholder="1000" className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs" />
                </div>
                <button type="button" onClick={submitLesson} disabled={lSaving || !lName.trim()} className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-40">
                  {lSaving ? "Ukládám…" : "Přidat"}
                </button>
              </div>
              {onAddRecurring && (
                <label className="mt-2 flex items-center gap-2 text-xs text-brand-dark">
                  <input type="checkbox" checked={lRepeat} onChange={(e) => setLRepeat(e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300 text-brand-blue" />
                  Opakovat každý týden (stálý klient)
                </label>
              )}
              {(onOpenOnce || onOpenWeekly) && selectedDay && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2 text-xs">
                  <span className="text-gray-500">Nebo otevřít hodinu <strong>{lTime}</strong> pro veřejnost:</span>
                  {onOpenOnce && (
                    <button type="button" onClick={() => onOpenOnce(dateKey(selectedDay), lTime)} className="rounded-md border border-emerald-300 px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-50">
                      Jen tento den
                    </button>
                  )}
                  {onOpenWeekly && (
                    <button type="button" onClick={() => onOpenWeekly(selectedDay.getDay(), lTime)} className="rounded-md border border-emerald-300 px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-50">
                      Každý týden
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
