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

/** Brandový výběr DNE. value/onChange ve formátu "YYYY-MM-DD" ("" = nevybráno). */
export function DatePicker({ value, onChange, className = "", placeholder = "Vyber datum" }: {
  value: string; onChange: (v: string) => void; className?: string; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
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

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm hover:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue ${sel ? "text-brand-dark" : "text-gray-400"} ${className}`}>
        <span>{label}</span>{calIcon}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
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

/** Brandový výběr MĚSÍCE. value/onChange ve formátu "YYYY-MM". */
export function MonthPicker({ value, onChange, className = "" }: {
  value: string; onChange: (v: string) => void; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const curY = Number(value.slice(0, 4)) || new Date().getFullYear();
  const curM = Number(value.slice(5, 7)) || (new Date().getMonth() + 1);
  const [vy, setVy] = useState(curY);
  useEffect(() => { setVy(Number(value.slice(0, 4)) || new Date().getFullYear()); }, [value]);
  useOutside(ref, open, () => setOpen(false));

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm capitalize text-brand-dark hover:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue ${className}`}>
        <span>{MONTHS[curM - 1]} {curY}</span>{calIcon}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
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
