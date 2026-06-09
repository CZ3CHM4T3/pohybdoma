"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Note = { id: number; day: string; category: string; body: string };

export const CATS = [
  { key: "trenink", label: "Trénink", dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-500" },
  { key: "vyziva", label: "Výživa", dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700", ring: "ring-amber-500" },
  { key: "odpocinek", label: "Odpočinek", dot: "bg-sky-500", chip: "bg-sky-100 text-sky-700", ring: "ring-sky-500" },
  { key: "cil", label: "Cíl / milník", dot: "bg-violet-500", chip: "bg-violet-100 text-violet-700", ring: "ring-violet-500" },
  { key: "jine", label: "Jiné", dot: "bg-gray-400", chip: "bg-gray-100 text-gray-600", ring: "ring-gray-400" },
];
const CAT_MAP = Object.fromEntries(CATS.map((c) => [c.key, c]));

const MONTHS_CS = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
const WEEKDAYS_CS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number): Date { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
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

export function PersonalCalendar() {
  const supabase = createClient();
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const [uid, setUid] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<Date>(() => startOfMonth(new Date()));
  const [sel, setSel] = useState<Date | null>(null);

  // přidávací formulář
  const [cat, setCat] = useState("trenink");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      if (!au.user) return;
      setUid(au.user.id);
      const { data } = await supabase.from("calendar_notes").select("id, day, category, body").eq("user_id", au.user.id);
      setNotes((data ?? []) as Note[]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byDay = useMemo(() => {
    const m: Record<string, Note[]> = {};
    for (const n of notes) (m[n.day] ??= []).push(n);
    return m;
  }, [notes]);

  const days = useMemo(() => buildCalendar(view), [view]);
  const selKey = sel ? dateKey(sel) : null;
  const selNotes = selKey ? byDay[selKey] ?? [] : [];

  async function addNote() {
    if (!uid || !sel || !text.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("calendar_notes")
      .insert({ user_id: uid, day: dateKey(sel), category: cat, body: text.trim() })
      .select("id, day, category, body").single();
    setSaving(false);
    if (!error && data) { setNotes((arr) => [...arr, data as Note]); setText(""); }
  }
  async function delNote(id: number) {
    setNotes((arr) => arr.filter((n) => n.id !== id));
    await supabase.from("calendar_notes").delete().eq("id", id);
  }

  return (
    <div>
      {/* Navigace měsíců */}
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={() => setView(addMonths(view, -1))} className="p-2 rounded-lg text-brand-dark hover:bg-brand-light transition-colors" aria-label="Předchozí měsíc">←</button>
        <h3 className="font-semibold text-brand-dark capitalize">{MONTHS_CS[view.getMonth()]} {view.getFullYear()}</h3>
        <button type="button" onClick={() => setView(addMonths(view, 1))} className="p-2 rounded-lg text-brand-dark hover:bg-brand-light transition-colors" aria-label="Další měsíc">→</button>
      </div>

      {/* Legenda kategorií */}
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1">
        {CATS.map((c) => (
          <span key={c.key} className="inline-flex items-center gap-1 text-[11px] text-gray-500">
            <span className={`h-2 w-2 rounded-full ${c.dot}`} /> {c.label}
          </span>
        ))}
      </div>

      {/* Hlavička dnů */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_CS.map((w) => <div key={w} className="text-center text-xs font-semibold text-gray-400 py-1">{w}</div>)}
      </div>

      {/* Dny */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = d.getMonth() === view.getMonth();
          const dayNotes = byDay[dateKey(d)] ?? [];
          const cats = Array.from(new Set(dayNotes.map((n) => n.category))).slice(0, 4);
          const isToday = sameDay(d, today);
          const isSel = sel && sameDay(d, sel);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => setSel(d)}
              className={`relative aspect-square rounded-lg text-sm font-medium transition-all ${
                !inMonth ? "text-gray-300" : isSel ? "bg-brand-blue text-white shadow-md" : "text-brand-dark hover:bg-brand-light"
              } ${isToday && !isSel ? "ring-1 ring-brand-blue/40" : ""}`}
            >
              {d.getDate()}
              {cats.length > 0 && !isSel && (
                <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                  {cats.map((c) => <span key={c} className={`h-1.5 w-1.5 rounded-full ${CAT_MAP[c]?.dot ?? "bg-gray-400"}`} />)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Detail vybraného dne */}
      {sel && (
        <div className="mt-4 rounded-xl border border-gray-100 p-4">
          <p className="mb-3 text-sm font-semibold text-brand-dark capitalize">
            {sel.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>

          {/* Seznam poznámek */}
          {selNotes.length === 0 ? (
            <p className="text-xs text-gray-400">Žádná poznámka. Přidej si níže, co tě tenhle den čeká. 🙂</p>
          ) : (
            <div className="space-y-1.5">
              {selNotes.map((n) => {
                const c = CAT_MAP[n.category] ?? CAT_MAP["jine"];
                return (
                  <div key={n.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`} />
                    <span className="min-w-0 flex-1 break-words text-sm text-brand-dark">{n.body}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.chip}`}>{c.label}</span>
                    <button onClick={() => delNote(n.id)} className="shrink-0 text-gray-300 hover:text-red-500" aria-label="Smazat"><Trash2 className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Přidání poznámky */}
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {CATS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCat(c.key)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-2 transition ${
                    cat === c.key ? `${c.chip} ${c.ring}` : "bg-gray-50 text-gray-500 ring-transparent hover:bg-gray-100"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} /> {c.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                placeholder="Co tě čeká? (poznámka, cíl, jídlo…)"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
              <button onClick={addNote} disabled={saving || !text.trim()} className="btn-primary text-sm inline-flex items-center gap-1.5 disabled:opacity-50">
                <Plus className="h-4 w-4" /> Přidat
              </button>
            </div>
          </div>
        </div>
      )}

      {!sel && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400">
          <CalendarDays className="h-3.5 w-3.5" /> Klikni na den a přidej si poznámku nebo událost.
        </p>
      )}
    </div>
  );
}
