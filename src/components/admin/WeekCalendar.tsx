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
  color: string; kind: "fitness" | "block" | "rezervace" | "volno" | "zruseno"; deletable: boolean; recurring: boolean; byClient?: boolean; lane: number; lanes: number;
};

export function WeekCalendar({
  bookings,
  lessons,
  blocks,
  open = [],
  cancelled = [],
  catColors,
  clientNames = [],
  onAddLesson,
  onAddRecurring,
  onDeleteLesson,
  onCancelOccurrence,
  onMoveOccurrence,
  onCancelBlock,
  onOpenOnce,
  onOpenWeekly,
  onCloseOpen,
  onOfferMakeup,
}: {
  bookings: BookingLite[];
  lessons: LessonRow[];
  blocks: BlockOcc[];
  open?: { date: string; time: string }[];
  cancelled?: { date: string; time: string; name: string; byClient: boolean }[];
  catColors: Record<string, string>;
  clientNames?: string[];
  onAddLesson: (date: string, time: string, clientName: string, note: string, priceKc: number | null) => Promise<void>;
  onAddRecurring?: (weekday: number, time: string, clientName: string, note: string, priceKc: number | null) => Promise<void>;
  onDeleteLesson: (id: string) => Promise<void>;
  onCancelOccurrence?: (recId: string, date: string) => Promise<void>;
  onMoveOccurrence?: (recId: string, origDate: string, newDate: string, newTime: string) => Promise<void>;
  onCancelBlock?: (blockId: string, date: string) => Promise<void>;
  onOpenOnce?: (date: string, time: string) => Promise<void>;
  onOpenWeekly?: (weekday: number, time: string) => Promise<void>;
  onCloseOpen?: (date: string, time: string) => Promise<void>;
  onOfferMakeup?: (clientName: string) => void;
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
  // Přesun lekce lektorem
  const [moveOccId, setMoveOccId] = useState<string | null>(null);
  const [moveOccDate, setMoveOccDate] = useState("");
  const [moveOccTime, setMoveOccTime] = useState("15:00");
  // Bublinové menu na kalendáři (klik na políčko/lekci)
  const [pop, setPop] = useState<{ x: number; y: number; date: string; time: string; item: Item | null } | null>(null);
  const [addMode, setAddMode] = useState(false);
  function closePop() { setPop(null); setAddMode(false); setMoveOccId(null); }

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
    for (const cx of cancelled) {
      if (cx.date !== key) continue;
      const s = toMin(cx.time);
      raw.push({ id: `cx:${key}:${cx.time}`, startMin: s, endMin: s + 60, name: cx.name, time: cx.time, color: "#9ca3af", kind: "zruseno", deletable: false, recurring: false, byClient: cx.byClient });
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
    const time = `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    setLTime(time); setAddMode(false); setMoveOccId(null);
    setPop({ x: e.clientX, y: e.clientY, date: dateKey(d), time, item: null });
  }
  function openItemPop(e: React.MouseEvent, d: Date, it: Item) {
    e.stopPropagation();
    setAddMode(false); setMoveOccId(null); setMoveOccDate(""); setMoveOccTime(it.time);
    setPop({ x: e.clientX, y: e.clientY, date: dateKey(d), time: it.time, item: it });
  }
  async function submitLessonPop() {
    if (!pop || !lName.trim() || !lTime) return;
    setLSaving(true);
    const priceKc = lPrice.trim() === "" ? null : Number(lPrice);
    const p = Number.isFinite(priceKc as number) ? priceKc : null;
    if (lRepeat && onAddRecurring) await onAddRecurring(new Date(pop.date + "T00:00:00").getDay(), lTime, lName.trim(), lNote.trim(), p);
    else await onAddLesson(pop.date, lTime, lName.trim(), lNote.trim(), p);
    setLSaving(false); setLName(""); setLNote(""); setLRepeat(false); closePop();
  }

  const rangeLabel = `${days[0].toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })} – ${days[6].toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}`;

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
                        title={it.kind === "zruseno" ? `Zrušeno: ${it.name}` : `${it.time} ${it.name}`}
                        onClick={(e) => openItemPop(e, d, it)}
                        className={`absolute rounded px-1 py-0.5 text-[9px] font-semibold overflow-hidden leading-tight cursor-pointer ${it.kind === "zruseno" ? "border border-dashed border-gray-400 text-gray-600" : "text-white"}`}
                        style={{ top, height, left: `calc(${it.lane * w}% + 1px)`, width: `calc(${w}% - 2px)`, background: it.kind === "zruseno" ? "#f3f4f6" : it.color }}
                      >
                        <span className="block opacity-90">{it.kind === "zruseno" ? "zrušeno" : it.time}</span>
                        <span className={`block truncate ${it.kind === "zruseno" ? "line-through" : ""}`}>{it.name}</span>
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

      <p className="mt-3 text-[11px] text-gray-400">Klikni na políčko (přidat / otevřít pro veřejnost) nebo na lekci (přesunout / zrušit / nabídnout náhradu).</p>

      {/* Bublinové menu (klik na kalendář) */}
      {pop && (
        <>
          <div className="fixed inset-0 z-40" onClick={closePop} />
          <div
            className="fixed z-50 w-60 rounded-xl border border-gray-200 bg-white p-3 shadow-xl text-xs"
            style={{ left: Math.max(8, Math.min(pop.x, (typeof window !== "undefined" ? window.innerWidth : 1000) - 260)), top: Math.max(8, Math.min(pop.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 320)) }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-brand-dark capitalize">
                {new Date(pop.date + "T00:00:00").toLocaleDateString("cs-CZ", { weekday: "short", day: "numeric", month: "numeric" })} · {pop.item ? pop.item.time : pop.time}
                {pop.item ? ` · ${pop.item.name}` : ""}
              </span>
              <button type="button" onClick={closePop} className="text-gray-300 hover:text-gray-600">✕</button>
            </div>

            {!pop.item && !addMode && (
              <div className="space-y-1.5">
                <button type="button" onClick={() => setAddMode(true)} className="w-full rounded-md bg-teal-600 px-2.5 py-1.5 text-left font-semibold text-white hover:bg-teal-700">+ Přidat lekci</button>
                {(onOpenOnce || onOpenWeekly) && (
                  <div className="rounded-md border border-emerald-200 p-2">
                    <p className="mb-1 text-[11px] text-gray-500">Otevřít {pop.time} pro veřejnost:</p>
                    <div className="flex gap-1.5">
                      {onOpenOnce && <button type="button" onClick={async () => { await onOpenOnce(pop.date, pop.time); closePop(); }} className="flex-1 rounded-md border border-emerald-300 px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-50">Jen dnes</button>}
                      {onOpenWeekly && <button type="button" onClick={async () => { await onOpenWeekly(new Date(pop.date + "T00:00:00").getDay(), pop.time); closePop(); }} className="flex-1 rounded-md border border-emerald-300 px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-50">Každý týden</button>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!pop.item && addMode && (
              <div className="space-y-1.5">
                <input type="time" value={lTime} onChange={(e) => setLTime(e.target.value)} className="w-full rounded-md border border-gray-200 px-2 py-1.5" />
                <input type="text" list="wc-client-names" value={lName} onChange={(e) => setLName(e.target.value)} placeholder="Klient" className="w-full rounded-md border border-gray-200 px-2 py-1.5" />
                <datalist id="wc-client-names">{clientNames.map((n) => <option key={n} value={n} />)}</datalist>
                <div className="flex gap-1.5">
                  <input type="text" value={lNote} onChange={(e) => setLNote(e.target.value)} placeholder="Pozn." className="flex-1 rounded-md border border-gray-200 px-2 py-1.5" />
                  <input type="number" value={lPrice} onChange={(e) => setLPrice(e.target.value)} placeholder="Kč" className="w-16 rounded-md border border-gray-200 px-2 py-1.5" />
                </div>
                {onAddRecurring && (
                  <label className="flex items-center gap-2 text-brand-dark"><input type="checkbox" checked={lRepeat} onChange={(e) => setLRepeat(e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300 text-brand-blue" /> Opakovat (stálý klient)</label>
                )}
                <div className="flex gap-1.5">
                  <button type="button" onClick={submitLessonPop} disabled={lSaving || !lName.trim()} className="flex-1 rounded-md bg-teal-600 px-2.5 py-1.5 font-semibold text-white hover:bg-teal-700 disabled:opacity-40">{lSaving ? "Ukládám…" : "Přidat"}</button>
                  <button type="button" onClick={() => setAddMode(false)} className="rounded-md border border-gray-200 px-2.5 py-1.5 font-semibold text-gray-500">Zpět</button>
                </div>
              </div>
            )}

            {pop.item && pop.item.recurring && (
              <div className="space-y-1.5">
                {moveOccId !== pop.item.id ? (
                  <>
                    {onMoveOccurrence && <button type="button" onClick={() => { setMoveOccId(pop.item!.id); setMoveOccDate(""); }} className="w-full rounded-md border border-brand-blue px-2.5 py-1.5 text-left font-semibold text-brand-blue hover:bg-brand-light">Přesunout</button>}
                    {onCancelOccurrence && <button type="button" onClick={async () => { const p = pop.item!.id.split(":"); await onCancelOccurrence(p[1], p[2]); closePop(); }} className="w-full rounded-md border border-red-200 px-2.5 py-1.5 text-left font-semibold text-red-600 hover:bg-red-50">Zrušit termín</button>}
                  </>
                ) : (
                  <div className="space-y-1.5 rounded-md border border-brand-blue/30 bg-brand-light/40 p-2">
                    <p className="font-semibold text-brand-dark">Přesunout kam?</p>
                    <input type="date" value={moveOccDate} onChange={(e) => setMoveOccDate(e.target.value)} className="w-full rounded-md border border-gray-200 px-2 py-1.5" />
                    <input type="time" value={moveOccTime} onChange={(e) => setMoveOccTime(e.target.value)} className="w-full rounded-md border border-gray-200 px-2 py-1.5" />
                    <div className="flex gap-1.5">
                      <button type="button" disabled={!moveOccDate} onClick={async () => { const p = pop.item!.id.split(":"); await onMoveOccurrence!(p[1], p[2], moveOccDate, moveOccTime); closePop(); }} className="flex-1 rounded-md bg-brand-blue px-2.5 py-1.5 font-semibold text-white disabled:opacity-40">Přesunout</button>
                      <button type="button" onClick={() => setMoveOccId(null)} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-gray-500">Zpět</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {pop.item && !pop.item.recurring && pop.item.deletable && (
              <button type="button" onClick={async () => { await onDeleteLesson(pop.item!.id); closePop(); }} className="w-full rounded-md border border-red-200 px-2.5 py-1.5 text-left font-semibold text-red-600 hover:bg-red-50">Smazat lekci</button>
            )}

            {pop.item && pop.item.kind === "block" && onCancelBlock && (
              <button type="button" onClick={async () => { const p = pop.item!.id.split(":"); await onCancelBlock(p[1], p[2]); closePop(); }} className="w-full rounded-md border border-red-200 px-2.5 py-1.5 text-left font-semibold text-red-600 hover:bg-red-50">Zrušit tento den (blok není)</button>
            )}

            {pop.item && pop.item.kind === "volno" && onCloseOpen && (
              <button type="button" onClick={async () => { await onCloseOpen(pop.date, pop.item!.time); closePop(); }} className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-left font-semibold text-gray-600 hover:bg-gray-50">Zavřít (přestat nabízet)</button>
            )}

            {pop.item && pop.item.kind === "zruseno" && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-gray-400">zrušeno ({pop.item.byClient ? "klient" : "já"})</p>
                {onOfferMakeup && <button type="button" onClick={() => { onOfferMakeup(pop.item!.name); closePop(); }} className="w-full rounded-md border border-teal-300 px-2.5 py-1.5 text-left font-semibold text-teal-700 hover:bg-teal-50">Nabídnout náhradu</button>}
              </div>
            )}

            {pop.item && pop.item.kind === "rezervace" && (
              <p className="text-[11px] text-gray-500">Rezervace z webu. Spravuješ v záložce Rezervace.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
