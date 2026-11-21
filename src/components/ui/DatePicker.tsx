"use client";

import { useEffect, useRef, useState } from "react";

const WD = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MONTHS = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
const MSHORT = ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function parseYmd(v: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function todayYmd() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

const calIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-gray-400" aria-hidden="true">
    <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

function useOutside(ref: React.RefObject<HTMLDivElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, ref, close]);
}

/** Rozhodne, jestli se popup otevře nahoru (když dole není místo). */
function measureFlip(btn: HTMLElement | null, needed: number) {
  if (!btn) return false;
  const r = btn.getBoundingClientRect();
  return window.innerHeight - r.bottom < needed && r.top > needed;
}

/** Brandový výběr DNE. value/onChange ve formátu "YYYY-MM-DD" ("" = nevybráno). */
export function DatePicker({ value, onChange, className = "", placeholder = "Vyber datum" }: {
  value: string; onChange: (v: string) => void; className?: string; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const sel = parseYmd(value);
  const [view, setView] = useState<Date>(() => sel ?? new Date());
  useEffect(() => { const s = parseYmd(value); if (s) setView(s); }, [value]);
  useOutside(ref, open, () => setOpen(false));

  const y = view.getFullYear(), m = view.getMonth();
  const startOffset = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayYmd();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const label = sel ? `${sel.getDate()}. ${sel.getMonth() + 1}. ${sel.getFullYear()}` : placeholder;

  const toggle = () => { setOpen((o) => { if (!o) setFlip(measureFlip(btn.current, 360)); return !o; }); };

  return (
    <div ref={ref} className="relative inline-block">
      <button ref={btn} type="button" onClick={toggle}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm hover:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue ${sel ? "text-brand-dark" : "text-gray-400"} ${className}`}>
        <span>{label}</span>{calIcon}
      </button>
      {open && (
        <div className={`absolute left-0 z-50 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-xl ${flip ? "bottom-full mb-1" : "top-full mt-1"}`}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Předchozí měsíc" onClick={() => setView(new Date(y, m - 1, 1))} className="rounded-md px-2 py-1 text-lg leading-none text-brand-dark hover:bg-brand-light">‹</button>
            <span className="text-sm font-semibold capitalize text-brand-dark">{MONTHS[m]} {y}</span>
            <button type="button" aria-label="Další měsíc" onClick={() => setView(new Date(y, m + 1, 1))} className="rounded-md px-2 py-1 text-lg leading-none text-brand-dark hover:bg-brand-light">›</button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-semibold text-gray-400">
            {WD.map((w) => <div key={w} className="py-1">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, idx) => {
              if (d === null) return <div key={idx} />;
              const ds = `${y}-${pad(m + 1)}-${pad(d)}`;
              const isSel = ds === value;
              const isToday = ds === today;
              return (
                <button key={idx} type="button" onClick={() => { onChange(ds); setOpen(false); }}
                  className={`rounded-md py-1.5 text-sm transition-colors ${isSel ? "bg-brand-blue font-semibold text-white" : isToday ? "bg-brand-light font-semibold text-brand-dark" : "text-brand-dark hover:bg-gray-100"}`}>
                  {d}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-xs">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-gray-400 hover:text-gray-600">Vymazat</button>
            <button type="button" onClick={() => { onChange(today); setOpen(false); }} className="font-semibold text-brand-blue hover:underline">Dnes</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Brandový výběr jednoho MĚSÍCE. value/onChange ve formátu "YYYY-MM". */
export function MonthPicker({ value, onChange, className = "" }: {
  value: string; onChange: (v: string) => void; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const curY = Number(value.slice(0, 4)) || new Date().getFullYear();
  const curM = Number(value.slice(5, 7)) || (new Date().getMonth() + 1);
  const [vy, setVy] = useState(curY);
  useEffect(() => { setVy(Number(value.slice(0, 4)) || new Date().getFullYear()); }, [value]);
  useOutside(ref, open, () => setOpen(false));
  const toggle = () => { setOpen((o) => { if (!o) setFlip(measureFlip(btn.current, 230)); return !o; }); };

  return (
    <div ref={ref} className="relative inline-block">
      <button ref={btn} type="button" onClick={toggle}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm capitalize text-brand-dark hover:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue ${className}`}>
        <span>{MONTHS[curM - 1]} {curY}</span>{calIcon}
      </button>
      {open && (
        <div className={`absolute left-0 z-50 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-xl ${flip ? "bottom-full mb-1" : "top-full mt-1"}`}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Předchozí rok" onClick={() => setVy((v) => v - 1)} className="rounded-md px-2 py-1 text-lg leading-none text-brand-dark hover:bg-brand-light">‹</button>
            <span className="text-sm font-semibold text-brand-dark">{vy}</span>
            <button type="button" aria-label="Další rok" onClick={() => setVy((v) => v + 1)} className="rounded-md px-2 py-1 text-lg leading-none text-brand-dark hover:bg-brand-light">›</button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MSHORT.map((nm, i) => {
              const isSel = vy === curY && i + 1 === curM;
              return (
                <button key={i} type="button" onClick={() => { onChange(`${vy}-${pad(i + 1)}`); setOpen(false); }}
                  className={`rounded-md py-2 text-sm font-semibold capitalize transition-colors ${isSel ? "bg-brand-blue text-white" : "text-brand-dark hover:bg-gray-100"}`}>
                  {nm}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Výběr ROZSAHU měsíců v jednom kalendáříku. from/to ve formátu "YYYY-MM".
 *  1. klik = jeden měsíc (hotovo), případný 2. klik = rozsah od–do. */
export function MonthRangePicker({ from, to, onChange, className = "" }: {
  from: string; to: string; onChange: (from: string, to: string) => void; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const [vy, setVy] = useState(() => Number((from || to).slice(0, 4)) || new Date().getFullYear());
  const [pick, setPick] = useState<string | null>(null); // první vybraný měsíc (čeká na druhý klik)
  useOutside(ref, open, () => { setOpen(false); setPick(null); });
  useEffect(() => { if (open) setVy(Number((from || to).slice(0, 4)) || new Date().getFullYear()); }, [open, from, to]);
  const toggle = () => { setOpen((o) => { if (!o) { setFlip(measureFlip(btn.current, 260)); setPick(null); } return !o; }); };

  const label = (() => {
    if (!from) return "Měsíc(e)";
    const fy = from.slice(0, 4), fm = Number(from.slice(5, 7));
    const ty = (to || from).slice(0, 4), tm = Number((to || from).slice(5, 7));
    if (!to || from === to) return `${MONTHS[fm - 1]} ${fy}`;
    if (fy === ty) return `${MONTHS[fm - 1]}–${MONTHS[tm - 1]} ${ty}`;
    return `${MONTHS[fm - 1]} ${fy} – ${MONTHS[tm - 1]} ${ty}`;
  })();

  const clickMonth = (i: number) => {
    const k = `${vy}-${pad(i + 1)}`;
    if (pick && pick !== k) {
      const a = pick <= k ? pick : k, b = pick <= k ? k : pick;
      onChange(a, b); setPick(null); setOpen(false);
    } else {
      setPick(k); onChange(k, k); // jeden měsíc hotový; druhý klik udělá rozsah
    }
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button ref={btn} type="button" onClick={toggle}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm capitalize text-brand-dark hover:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue ${className}`}>
        <span>{label}</span>{calIcon}
      </button>
      {open && (
        <div className={`absolute left-0 z-50 w-60 rounded-xl border border-gray-200 bg-white p-3 shadow-xl ${flip ? "bottom-full mb-1" : "top-full mt-1"}`}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Předchozí rok" onClick={() => setVy((v) => v - 1)} className="rounded-md px-2 py-1 text-lg leading-none text-brand-dark hover:bg-brand-light">‹</button>
            <span className="text-sm font-semibold text-brand-dark">{vy}</span>
            <button type="button" aria-label="Další rok" onClick={() => setVy((v) => v + 1)} className="rounded-md px-2 py-1 text-lg leading-none text-brand-dark hover:bg-brand-light">›</button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MSHORT.map((nm, i) => {
              const k = `${vy}-${pad(i + 1)}`;
              const lo = pick ?? from, hi = pick ? pick : to;
              const inRange = lo && hi && k >= (lo <= hi ? lo : hi) && k <= (lo <= hi ? hi : lo);
              const isEnd = k === from || k === to || k === pick;
              return (
                <button key={i} type="button" onClick={() => clickMonth(i)}
                  className={`rounded-md py-2 text-sm font-semibold capitalize transition-colors ${isEnd ? "bg-brand-blue text-white" : inRange ? "bg-brand-light text-brand-dark" : "text-brand-dark hover:bg-gray-100"}`}>
                  {nm}
                </button>
              );
            })}
          </div>
          <p className="mt-2 border-t border-gray-100 pt-2 text-[11px] text-gray-400">{pick ? "Klikni druhý měsíc pro rozsah, nebo zavři." : "Klikni měsíc. Pro rozsah pak klikni druhý."}</p>
        </div>
      )}
    </div>
  );
}

/** Brandový výběr VÍCE MĚSÍCŮ (toggle). value/onChange jako pole "YYYY-MM".
 *  Klik přepne měsíc (přidá/odebere), popup zůstane otevřený a zavře se až kliknutím mimo. */
export function MonthMultiPicker({ value, onChange, className = "" }: {
  value: string[]; onChange: (months: string[]) => void; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const sorted = [...value].sort();
  const [vy, setVy] = useState(() => Number((sorted[0] || "").slice(0, 4)) || new Date().getFullYear());
  useOutside(ref, open, () => setOpen(false));
  useEffect(() => { if (open) setVy(Number((sorted[sorted.length - 1] || "").slice(0, 4)) || new Date().getFullYear()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = () => { setOpen((o) => { if (!o) setFlip(measureFlip(btn.current, 300)); return !o; }); };

  const label = (() => {
    if (sorted.length === 0) return "Měsíce";
    if (sorted.length === 1) { const fm = Number(sorted[0].slice(5, 7)); return `${MONTHS[fm - 1]} ${sorted[0].slice(0, 4)}`; }
    return `${sorted.length} měsíců`;
  })();

  const toggleMonth = (i: number) => {
    const k = `${vy}-${pad(i + 1)}`;
    onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  };
  const selectWholeYear = () => {
    const ys = Array.from({ length: 12 }, (_, i) => `${vy}-${pad(i + 1)}`);
    onChange([...value.filter((x) => x.slice(0, 4) !== String(vy)), ...ys]);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button ref={btn} type="button" onClick={toggle}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm capitalize text-brand-dark hover:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue ${className}`}>
        <span>{label}</span>{calIcon}
      </button>
      {open && (
        <div className={`absolute left-0 z-50 w-60 rounded-xl border border-gray-200 bg-white p-3 shadow-xl ${flip ? "bottom-full mb-1" : "top-full mt-1"}`}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Předchozí rok" onClick={() => setVy((v) => v - 1)} className="rounded-md px-2 py-1 text-lg leading-none text-brand-dark hover:bg-brand-light">‹</button>
            <span className="text-sm font-semibold text-brand-dark">{vy}</span>
            <button type="button" aria-label="Další rok" onClick={() => setVy((v) => v + 1)} className="rounded-md px-2 py-1 text-lg leading-none text-brand-dark hover:bg-brand-light">›</button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MSHORT.map((nm, i) => {
              const k = `${vy}-${pad(i + 1)}`;
              const isSel = value.includes(k);
              return (
                <button key={i} type="button" onClick={() => toggleMonth(i)}
                  className={`rounded-md py-2 text-sm font-semibold capitalize transition-colors ${isSel ? "bg-brand-blue text-white" : "text-brand-dark hover:bg-gray-100"}`}>
                  {nm}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
            <button type="button" onClick={() => onChange([])} className="text-gray-400 hover:text-gray-600">Vymazat</button>
            <button type="button" onClick={selectWholeYear} className="font-semibold text-brand-blue hover:underline">Celý {vy}</button>
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">{value.length ? `Vybráno: ${value.length} · klik = přidat/odebrat, zavři mimo` : "Klikni měsíce. Zavři kliknutím mimo."}</p>
        </div>
      )}
    </div>
  );
}
