"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { BookingLite, LessonRow } from "./MonthCalendar";
import { EVENT_TYPES, eventColorOf } from "@/lib/mock-data";

// Na serveru není layout efekt – bublinu polohujeme až v prohlížeči.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type EventLite = { id: string; date: string; time: string | null; end_time: string | null; title: string; kind: string; color: string | null };

export type BlockOcc = { id: string; date: string; start_time: string; end_time: string; label: string; category: string; cancelled?: boolean };

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
  color: string; kind: "fitness" | "block" | "rezervace" | "volno" | "zruseno" | "event"; deletable: boolean; recurring: boolean; byClient?: boolean; note?: string; cancelled?: boolean; lane: number; lanes: number;
};

export function WeekCalendar({
  bookings,
  lessons,
  blocks,
  open = [],
  cancelled = [],
  notes = [],
  blockMembers = [],
  blockAttendance = [],
  events = [],
  catColors,
  clientNames = [],
  onAddLesson,
  onAddRecurring,
  onDeleteLesson,
  onCancelOccurrence,
  onMoveOccurrence,
  onCancelBlock,
  onRestoreBlock,
  onOpenOnce,
  onOpenWeekly,
  onCloseOpen,
  onSaveNote,
  onToggleAttendance,
  onAddEvent,
  onDeleteEvent,
}: {
  bookings: BookingLite[];
  lessons: LessonRow[];
  blocks: BlockOcc[];
  open?: { date: string; time: string }[];
  cancelled?: { date: string; time: string; name: string; byClient: boolean }[];
  notes?: { date: string; time: string; note: string }[];
  blockMembers?: { block_id: string; name: string }[];
  blockAttendance?: { block_id: string; date: string; name: string }[];
  events?: EventLite[];
  catColors: Record<string, string>;
  clientNames?: string[];
  onAddLesson: (date: string, time: string, clientName: string, note: string, priceKc: number | null) => Promise<void | boolean>;
  onAddRecurring?: (weekday: number, time: string, clientName: string, note: string, priceKc: number | null) => Promise<void>;
  onDeleteLesson: (id: string) => Promise<void>;
  onCancelOccurrence?: (recId: string, date: string) => Promise<void>;
  onMoveOccurrence?: (recId: string, origDate: string, newDate: string, newTime: string) => Promise<void>;
  onCancelBlock?: (blockId: string, date: string) => Promise<void>;
  onRestoreBlock?: (blockId: string, date: string) => Promise<void>;
  onOpenOnce?: (date: string, time: string) => Promise<void>;
  onOpenWeekly?: (weekday: number, time: string) => Promise<void>;
  onCloseOpen?: (date: string, time: string) => Promise<void>;
  onSaveNote?: (date: string, time: string, note: string) => Promise<void>;
  onToggleAttendance?: (blockId: string, date: string, name: string, present: boolean) => Promise<void>;
  onAddEvent?: (date: string, time: string, endTime: string, title: string, kind: string, color: string, location: string, priceKc: number | null) => Promise<void>;
  onDeleteEvent?: (id: string) => Promise<void>;
}) {
  const attSet = useMemo(() => new Set(blockAttendance.map((a) => `${a.block_id}|${a.date}|${a.name}`)), [blockAttendance]);
  const noteMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of notes) m.set(`${n.date}|${n.time}`, n.note);
    return m;
  }, [notes]);
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
  const [lErr, setLErr] = useState<string | null>(null);
  // Přesun lekce lektorem
  const [moveOccId, setMoveOccId] = useState<string | null>(null);
  const [moveOccDate, setMoveOccDate] = useState("");
  const [moveOccTime, setMoveOccTime] = useState("15:00");
  // Bublinové menu na kalendáři (klik na políčko/lekci)
  const [pop, setPop] = useState<{ x: number; y: number; date: string; time: string; item: Item | null } | null>(null);
  const [addMode, setAddMode] = useState(false);
  // Napozicování bubliny tak, aby byla celá vidět (jinak u spodních lekcí ukrojená)
  const popRef = useRef<HTMLDivElement>(null);
  const [popStyle, setPopStyle] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  // Připomínka k lekci
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  // Vytvoření akce v kalendáři
  const [evMode, setEvMode] = useState(false);
  const [evTitle, setEvTitle] = useState("");
  const [evType, setEvType] = useState(EVENT_TYPES[0].key);
  const [evFrom, setEvFrom] = useState("17:00");
  const [evTo, setEvTo] = useState("18:00");
  const [evPlace, setEvPlace] = useState("");
  const [evPrice, setEvPrice] = useState("");
  const [evSaving, setEvSaving] = useState(false);
  function closePop() { setPop(null); setAddMode(false); setMoveOccId(null); setEvMode(false); setLErr(null); }
  async function submitEvent() {
    if (!pop || !evTitle.trim() || !onAddEvent) return;
    setEvSaving(true);
    const t = EVENT_TYPES.find((x) => x.key === evType) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
    const pr = evPrice.trim() === "" ? null : Number(evPrice);
    await onAddEvent(pop.date, evFrom, evTo, evTitle.trim(), t.label, t.color, evPlace.trim(), Number.isFinite(pr as number) ? pr : null);
    setEvSaving(false); setEvTitle(""); setEvPlace(""); setEvPrice(""); setEvMode(false); closePop();
  }

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
      raw.push({ id: b.id, startMin: toMin(b.start_time), endMin: toMin(b.end_time), name: b.label, time: b.start_time, color: catColors[b.category] || catColors.jine, kind: "block", deletable: false, recurring: false, cancelled: b.cancelled });
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
    for (const ev of events) {
      if (ev.date !== key || !ev.time) continue;
      const s = toMin(ev.time);
      const e2 = ev.end_time ? toMin(ev.end_time) : s + 90;
      raw.push({ id: `evt:${ev.id}`, startMin: s, endMin: Math.max(s + 30, e2), name: ev.title, time: ev.time, color: eventColorOf(ev), kind: "event", deletable: false, recurring: false });
    }
    // Na daný čas může být jen 1 lekce. Když čas zabírá reálná lekce/rezervace/akce/aktivní blok,
    // schováme informativní značky (volno, zrušeno, zrušený blok), ať se sloupec nezdvojuje.
    const occupying = raw.filter((r) => r.kind === "fitness" || r.kind === "rezervace" || r.kind === "event" || (r.kind === "block" && !r.cancelled));
    const overlapsOccupying = (it: Omit<Item, "lane" | "lanes">) => occupying.some((o) => o !== it && o.startMin < it.endMin && it.startMin < o.endMin);
    const rawShown = raw.filter((r) => {
      const isMarker = r.kind === "volno" || r.kind === "zruseno" || (r.kind === "block" && r.cancelled);
      return !(isMarker && overlapsOccupying(r));
    });
    // Rozvržení do sloupců (lanes) při překryvu
    rawShown.sort((a, b) => a.startMin - b.startMin);
    const laneEnds: number[] = [];
    const withLane = rawShown.map((it) => {
      let lane = laneEnds.findIndex((end) => end <= it.startMin);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.endMin); }
      else laneEnds[lane] = it.endMin;
      return { ...it, lane };
    });
    const lanes = Math.max(1, laneEnds.length);
    return withLane.map((it) => ({ ...it, lanes, note: noteMap.get(`${key}|${it.time}`) }));
  }

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, d: Date) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let min = START_H * 60 + Math.round(((y / HOUR_PX) * 60) / 15) * 15; // zaokrouhli na 15 min
    min = Math.max(START_H * 60, Math.min(END_H * 60 - 15, min));
    const time = `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    setLTime(time); setAddMode(false); setMoveOccId(null); setLErr(null);
    setPop({ x: e.clientX, y: e.clientY, date: dateKey(d), time, item: null });
  }
  function openItemPop(e: React.MouseEvent, d: Date, it: Item) {
    e.stopPropagation();
    setAddMode(false); setMoveOccId(null); setMoveOccDate(""); setMoveOccTime(it.time); setLErr(null);
    setNoteDraft(it.note ?? "");
    setPop({ x: e.clientX, y: e.clientY, date: dateKey(d), time: it.time, item: it });
  }
  async function saveNote(value: string) {
    if (!pop || !pop.item || !onSaveNote) return;
    setNoteSaving(true);
    await onSaveNote(pop.date, pop.item.time, value.trim());
    setNoteSaving(false);
    closePop();
  }
  async function submitLessonPop() {
    if (!pop || !lName.trim() || !lTime) return;
    setLSaving(true);
    setLErr(null);
    const priceKc = lPrice.trim() === "" ? null : Number(lPrice);
    const p = Number.isFinite(priceKc as number) ? priceKc : null;
    const ok = (lRepeat && onAddRecurring)
      ? await onAddRecurring(new Date(pop.date + "T00:00:00").getDay(), lTime, lName.trim(), lNote.trim(), p)
      : await onAddLesson(pop.date, lTime, lName.trim(), lNote.trim(), p);
    setLSaving(false);
    if (ok === false) { setLErr("Nepodařilo se uložit. Zkontroluj, že je v Supabase spuštěný planner.sql (tabulka lesson_plans)."); return; }
    setLName(""); setLNote(""); setLRepeat(false); closePop();
  }

  // Po otevření/změně obsahu bubliny ji posuň, ať se celá vejde na obrazovku.
  useIsoLayoutEffect(() => {
    if (!pop || typeof window === "undefined") { setPopStyle(null); return; }
    const el = popRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const maxHeight = vh - 16;
    const h = Math.min(rect.height, maxHeight);
    const left = Math.max(8, Math.min(pop.x, vw - rect.width - 8));
    const top = Math.max(8, Math.min(pop.y, vh - h - 8));
    setPopStyle({ left, top, maxHeight });
  }, [pop, addMode, evMode, moveOccId]);

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
                    const isCx = it.kind === "zruseno" || it.cancelled; // zrušená lekce nebo zrušený blok
                    return (
                      <div
                        key={it.id}
                        title={isCx ? `Zrušeno: ${it.name}` : `${it.time} ${it.name}`}
                        onClick={(e) => openItemPop(e, d, it)}
                        className={`absolute rounded px-1 py-0.5 text-[9px] font-semibold overflow-hidden leading-tight cursor-pointer ${isCx ? "border border-dashed border-gray-400 text-gray-600" : "text-white"}`}
                        style={{ top, height, left: `calc(${it.lane * w}% + 1px)`, width: `calc(${w}% - 2px)`, background: isCx ? "#f3f4f6" : it.color }}
                      >
                        <span className="block opacity-90">{isCx ? "zrušeno" : it.time}</span>
                        <span className={`block truncate ${isCx ? "line-through" : ""}`}>{it.name}</span>
                        {it.note && !isCx && (
                          <span className="block truncate font-normal opacity-95">📝 {it.note}</span>
                        )}
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
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded inline-block" style={{ background: "#7c3aed" }} /> akce / workshop</span>
      </div>

      <p className="mt-3 text-[11px] text-gray-400">Klikni na políčko (přidat / otevřít pro veřejnost) nebo na lekci (přesunout / zrušit / nabídnout náhradu).</p>

      {/* Bublinové menu (klik na kalendář) */}
      {pop && (
        <>
          <div className="fixed inset-0 z-40" onClick={closePop} />
          <div
            ref={popRef}
            className="fixed z-50 w-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-xl text-xs"
            style={{
              left: popStyle ? popStyle.left : Math.max(8, Math.min(pop.x, (typeof window !== "undefined" ? window.innerWidth : 1000) - 260)),
              top: popStyle ? popStyle.top : Math.max(8, Math.min(pop.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 320)),
              maxHeight: popStyle ? popStyle.maxHeight : undefined,
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-brand-dark capitalize">
                {new Date(pop.date + "T00:00:00").toLocaleDateString("cs-CZ", { weekday: "short", day: "numeric", month: "numeric" })} · {pop.item ? pop.item.time : pop.time}
                {pop.item ? ` · ${pop.item.name}` : ""}
              </span>
              <button type="button" onClick={closePop} className="text-gray-300 hover:text-gray-600">✕</button>
            </div>

            {pop.item && onSaveNote && !pop.item.cancelled && (pop.item.kind === "fitness" || pop.item.kind === "block" || pop.item.kind === "rezervace") && (
              <div className="mb-2 rounded-md border border-amber-200 bg-amber-50/60 p-2">
                <p className="mb-1 text-[11px] font-semibold text-amber-700">📝 Připomínka (ukáže se v rámečku lekce)</p>
                <input type="text" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="např. přines gumu, platba v hotovosti…" className="w-full rounded-md border border-amber-200 px-2 py-1.5" />
                <div className="mt-1 flex gap-1.5">
                  <button type="button" onClick={() => saveNote(noteDraft)} disabled={noteSaving} className="flex-1 rounded-md bg-amber-500 px-2.5 py-1.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-40">{noteSaving ? "Ukládám…" : "Uložit poznámku"}</button>
                  {pop.item.note && <button type="button" onClick={() => saveNote("")} disabled={noteSaving} className="rounded-md border border-gray-200 px-2.5 py-1.5 font-semibold text-gray-500 hover:bg-gray-50">Smazat</button>}
                </div>
              </div>
            )}

            {!pop.item && !addMode && !evMode && (
              <div className="space-y-1.5">
                <button type="button" onClick={() => setAddMode(true)} className="w-full rounded-md bg-teal-600 px-2.5 py-1.5 text-left font-semibold text-white hover:bg-teal-700">+ Přidat lekci</button>
                {onAddEvent && (
                  <button type="button" onClick={() => { setEvFrom(pop.time); const [hh, mm] = pop.time.split(":").map(Number); const end = Math.min(22 * 60, hh * 60 + mm + 90); setEvTo(`${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`); setEvMode(true); }} className="w-full rounded-md bg-violet-600 px-2.5 py-1.5 text-left font-semibold text-white hover:bg-violet-700">+ Vytvořit akci / workshop</button>
                )}
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

            {addMode && (
              <div className="space-y-1.5">
                {pop.item && <p className="text-[11px] font-semibold text-teal-700">Náhrada na tento den – vyber klienta:</p>}
                <input type="time" value={lTime} onChange={(e) => setLTime(e.target.value)} className="w-full rounded-md border border-gray-200 px-2 py-1.5" />
                {clientNames.length > 0 && (
                  <select value={clientNames.includes(lName) ? lName : ""} onChange={(e) => setLName(e.target.value)} className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5">
                    <option value="">— vyber klienta —</option>
                    {clientNames.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                )}
                <input type="text" value={lName} onChange={(e) => setLName(e.target.value)} placeholder="…nebo napiš jméno" className="w-full rounded-md border border-gray-200 px-2 py-1.5" />
                <div className="flex gap-1.5">
                  <input type="text" value={lNote} onChange={(e) => setLNote(e.target.value)} placeholder="Pozn." className="flex-1 rounded-md border border-gray-200 px-2 py-1.5" />
                  <input type="number" value={lPrice} onChange={(e) => setLPrice(e.target.value)} placeholder="Kč" className="w-16 rounded-md border border-gray-200 px-2 py-1.5" />
                </div>
                {onAddRecurring && !pop.item && (
                  <label className="flex items-center gap-2 text-brand-dark"><input type="checkbox" checked={lRepeat} onChange={(e) => setLRepeat(e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300 text-brand-blue" /> Opakovat (stálý klient)</label>
                )}
                {lErr && <p className="rounded-md border border-red-200 bg-red-50 p-1.5 text-[11px] text-red-700">{lErr}</p>}
                <div className="flex gap-1.5">
                  <button type="button" onClick={submitLessonPop} disabled={lSaving || !lName.trim()} className="flex-1 rounded-md bg-teal-600 px-2.5 py-1.5 font-semibold text-white hover:bg-teal-700 disabled:opacity-40">{lSaving ? "Ukládám…" : "Přidat"}</button>
                  <button type="button" onClick={() => setAddMode(false)} className="rounded-md border border-gray-200 px-2.5 py-1.5 font-semibold text-gray-500">Zpět</button>
                </div>
              </div>
            )}

            {!pop.item && evMode && (
              <div className="space-y-1.5">
                <input type="text" value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Název akce (např. Workshop: zdravá záda)" className="w-full rounded-md border border-gray-200 px-2 py-1.5" />
                <select value={evType} onChange={(e) => setEvType(e.target.value)} className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5">
                  {EVENT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-500">Od</span>
                  <input type="time" value={evFrom} onChange={(e) => setEvFrom(e.target.value)} className="flex-1 rounded-md border border-gray-200 px-2 py-1.5" />
                  <span className="text-[11px] text-gray-500">do</span>
                  <input type="time" value={evTo} onChange={(e) => setEvTo(e.target.value)} className="flex-1 rounded-md border border-gray-200 px-2 py-1.5" />
                </div>
                <div className="flex gap-1.5">
                  <input type="text" value={evPlace} onChange={(e) => setEvPlace(e.target.value)} placeholder="Místo (nepovinné)" className="flex-1 rounded-md border border-gray-200 px-2 py-1.5" />
                  <input type="number" value={evPrice} onChange={(e) => setEvPrice(e.target.value)} placeholder="Kč" className="w-16 rounded-md border border-gray-200 px-2 py-1.5" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  Barva: <span className="inline-block h-3.5 w-3.5 rounded" style={{ background: (EVENT_TYPES.find((x) => x.key === evType) ?? EVENT_TYPES[0]).color }} /> (podle typu)
                </div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={submitEvent} disabled={evSaving || !evTitle.trim()} className="flex-1 rounded-md bg-violet-600 px-2.5 py-1.5 font-semibold text-white hover:bg-violet-700 disabled:opacity-40">{evSaving ? "Ukládám…" : "Vytvořit akci"}</button>
                  <button type="button" onClick={() => setEvMode(false)} className="rounded-md border border-gray-200 px-2.5 py-1.5 font-semibold text-gray-500">Zpět</button>
                </div>
              </div>
            )}

            {pop.item && pop.item.kind === "event" && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-gray-500">Akce / workshop – veřejně viditelné v kalendáři na webu.</p>
                {onDeleteEvent && (
                  <button type="button" onClick={async () => { await onDeleteEvent(pop.item!.id.replace(/^evt:/, "")); closePop(); }} className="w-full rounded-md border border-red-200 px-2.5 py-1.5 text-left font-semibold text-red-600 hover:bg-red-50">Smazat akci</button>
                )}
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

            {pop.item && pop.item.kind === "block" && !addMode && (() => {
              const p = pop.item.id.split(":");
              const blockId = p[1], bdate = p[2];
              const roster = blockMembers.filter((m) => m.block_id === blockId).map((m) => m.name).sort((a, b) => a.localeCompare(b, "cs"));
              const addReplacementBtn = (
                <button type="button" onClick={() => { setLTime(pop.item!.time); setLName(""); setLNote("náhrada"); setLRepeat(false); setAddMode(true); }} className="w-full rounded-md bg-teal-600 px-2.5 py-1.5 text-left font-semibold text-white hover:bg-teal-700">+ Přidat náhradu sem (vybrat klienta)</button>
              );
              if (pop.item.cancelled) {
                return (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-gray-400">Tento den je blok zrušený.</p>
                    {addReplacementBtn}
                    {onRestoreBlock && (
                      <button type="button" onClick={async () => { await onRestoreBlock(blockId, bdate); closePop(); }} className="w-full rounded-md border border-emerald-300 px-2.5 py-1.5 text-left font-semibold text-emerald-700 hover:bg-emerald-50">Obnovit blok</button>
                    )}
                  </div>
                );
              }
              return (
                <div className="space-y-2">
                  {addReplacementBtn}
                  {onToggleAttendance && (
                    <div className="rounded-md border border-gray-200 p-2">
                      <p className="mb-1 text-[11px] font-semibold text-brand-dark">Docházka – kdo je tu?</p>
                      {roster.length === 0 ? (
                        <p className="text-[11px] text-gray-400">Nikdo v soupisce. Přidej lidi ve Stálí klienti → Skupinové lekce.</p>
                      ) : (
                        <div className="max-h-44 space-y-1 overflow-y-auto">
                          {roster.map((nm) => {
                            const present = attSet.has(`${blockId}|${bdate}|${nm}`);
                            return (
                              <label key={nm} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-50">
                                <input type="checkbox" checked={present} onChange={(e) => onToggleAttendance(blockId, bdate, nm, e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600" />
                                <span className={present ? "font-semibold text-brand-dark" : "text-gray-500"}>{nm}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {onCancelBlock && (
                    <button type="button" onClick={async () => { await onCancelBlock(blockId, bdate); closePop(); }} className="w-full rounded-md border border-red-200 px-2.5 py-1.5 text-left font-semibold text-red-600 hover:bg-red-50">Zrušit tento den (blok není)</button>
                  )}
                </div>
              );
            })()}

            {pop.item && pop.item.kind === "volno" && !addMode && (
              <div className="space-y-1.5">
                <button type="button" onClick={() => { setLTime(pop.item!.time); setLName(""); setLNote(""); setLRepeat(false); setAddMode(true); }} className="w-full rounded-md bg-teal-600 px-2.5 py-1.5 text-left font-semibold text-white hover:bg-teal-700">+ Přidat lekci sem</button>
                {onCloseOpen && <button type="button" onClick={async () => { await onCloseOpen(pop.date, pop.item!.time); closePop(); }} className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-left font-semibold text-gray-600 hover:bg-gray-50">Zavřít (přestat nabízet)</button>}
              </div>
            )}

            {pop.item && pop.item.kind === "zruseno" && !addMode && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-gray-400">zrušeno ({pop.item.byClient ? "klient" : "já"})</p>
                <button type="button" onClick={() => { setLTime(pop.item!.time); setLName(""); setLNote("náhrada"); setLRepeat(false); setAddMode(true); }} className="w-full rounded-md bg-teal-600 px-2.5 py-1.5 text-left font-semibold text-white hover:bg-teal-700">+ Přidat náhradu sem (vybrat klienta)</button>
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
