"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, CalendarDays, Settings2, Clock, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Category = { id: number; label: string; color: string; position: number };
type Note = { id: number; day: string; category_id: number | null; at_time: string | null; body: string; note: string | null };

// Paleta barev pro kategorie (klíč → třídy)
export const CAL_COLORS = [
  { key: "emerald", dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-500" },
  { key: "amber", dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700", ring: "ring-amber-500" },
  { key: "sky", dot: "bg-sky-500", chip: "bg-sky-100 text-sky-700", ring: "ring-sky-500" },
  { key: "violet", dot: "bg-violet-500", chip: "bg-violet-100 text-violet-700", ring: "ring-violet-500" },
  { key: "rose", dot: "bg-rose-500", chip: "bg-rose-100 text-rose-700", ring: "ring-rose-500" },
  { key: "lime", dot: "bg-lime-500", chip: "bg-lime-100 text-lime-700", ring: "ring-lime-500" },
  { key: "cyan", dot: "bg-cyan-500", chip: "bg-cyan-100 text-cyan-700", ring: "ring-cyan-500" },
  { key: "orange", dot: "bg-orange-500", chip: "bg-orange-100 text-orange-700", ring: "ring-orange-500" },
  { key: "fuchsia", dot: "bg-fuchsia-500", chip: "bg-fuchsia-100 text-fuchsia-700", ring: "ring-fuchsia-500" },
  { key: "red", dot: "bg-red-500", chip: "bg-red-100 text-red-700", ring: "ring-red-500" },
  { key: "blue", dot: "bg-blue-500", chip: "bg-blue-100 text-blue-700", ring: "ring-blue-500" },
  { key: "teal", dot: "bg-teal-500", chip: "bg-teal-100 text-teal-700", ring: "ring-teal-500" },
];
const COLOR_MAP = Object.fromEntries(CAL_COLORS.map((c) => [c.key, c]));
const colorOf = (key: string | undefined | null) => COLOR_MAP[key ?? "sky"] ?? COLOR_MAP["sky"];

const DEFAULT_CATS = [
  { label: "Trénink", color: "emerald" },
  { label: "Výživa", color: "amber" },
  { label: "Odpočinek", color: "sky" },
  { label: "Cíl / milník", color: "violet" },
];
const MAX_CATS = 8;

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
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

export function PersonalCalendar() {
  const supabase = createClient();
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const [uid, setUid] = useState<string | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<Date>(() => startOfMonth(new Date()));
  const [sel, setSel] = useState<Date | null>(null);

  // správa kategorií
  const [editCats, setEditCats] = useState(false);
  const [paletteFor, setPaletteFor] = useState<number | null>(null);

  // přidání události
  const [evCat, setEvCat] = useState<number | null>(null);
  const [evTime, setEvTime] = useState("");
  const [evBody, setEvBody] = useState("");
  const [evNote, setEvNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      if (!au.user) return;
      const id = au.user.id;
      setUid(id);

      let { data: cd } = await supabase.from("calendar_categories").select("id, label, color, position").eq("user_id", id).order("position");
      // první návštěva → založ výchozí kategorie
      if (!cd || cd.length === 0) {
        await supabase.from("calendar_categories").insert(DEFAULT_CATS.map((c, i) => ({ user_id: id, label: c.label, color: c.color, position: i })));
        const r = await supabase.from("calendar_categories").select("id, label, color, position").eq("user_id", id).order("position");
        cd = r.data ?? [];
      }
      setCats((cd ?? []) as Category[]);
      setEvCat((cd ?? [])[0]?.id ?? null);

      const { data: nd } = await supabase.from("calendar_notes").select("id, day, category_id, at_time, body, note").eq("user_id", id);
      setNotes((nd ?? []) as Note[]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const catById = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);
  const byDay = useMemo(() => {
    const m: Record<string, Note[]> = {};
    for (const n of notes) (m[n.day] ??= []).push(n);
    return m;
  }, [notes]);

  const days = useMemo(() => buildCalendar(view), [view]);
  const selKey = sel ? dateKey(sel) : null;
  const selNotes = (selKey ? byDay[selKey] ?? [] : []).slice().sort((a, b) => (a.at_time ?? "99").localeCompare(b.at_time ?? "99"));

  // ── kategorie ──
  async function addCat() {
    if (!uid || cats.length >= MAX_CATS) return;
    const used = new Set(cats.map((c) => c.color));
    const color = CAL_COLORS.find((c) => !used.has(c.key))?.key ?? "sky";
    const { data } = await supabase.from("calendar_categories")
      .insert({ user_id: uid, label: "Nová kategorie", color, position: cats.length })
      .select("id, label, color, position").single();
    if (data) setCats((arr) => [...arr, data as Category]);
  }
  async function renameCat(id: number, label: string) {
    setCats((arr) => arr.map((c) => (c.id === id ? { ...c, label } : c)));
    await supabase.from("calendar_categories").update({ label }).eq("id", id);
  }
  async function recolorCat(id: number, color: string) {
    setCats((arr) => arr.map((c) => (c.id === id ? { ...c, color } : c)));
    setPaletteFor(null);
    await supabase.from("calendar_categories").update({ color }).eq("id", id);
  }
  async function delCat(id: number) {
    setCats((arr) => arr.filter((c) => c.id !== id));
    if (evCat === id) setEvCat(cats.find((c) => c.id !== id)?.id ?? null);
    await supabase.from("calendar_categories").delete().eq("id", id);
    // poznámky té kategorie zůstanou (category_id → null)
    setNotes((arr) => arr.map((n) => (n.category_id === id ? { ...n, category_id: null } : n)));
  }

  // ── události ──
  async function addNote() {
    if (!uid || !sel || !evBody.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("calendar_notes")
      .insert({ user_id: uid, day: dateKey(sel), category_id: evCat, at_time: evTime || null, body: evBody.trim(), note: evNote.trim() || null })
      .select("id, day, category_id, at_time, body, note").single();
    setSaving(false);
    if (!error && data) { setNotes((arr) => [...arr, data as Note]); setEvBody(""); setEvNote(""); setEvTime(""); }
  }
  async function delNote(id: number) {
    setNotes((arr) => arr.filter((n) => n.id !== id));
    await supabase.from("calendar_notes").delete().eq("id", id);
  }

  return (
    <div>
      {/* Navigace měsíců */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => setView(addMonths(view, -1))} className="p-2 rounded-lg text-brand-dark hover:bg-brand-light" aria-label="Předchozí měsíc">←</button>
        <h3 className="font-semibold text-brand-dark capitalize">{MONTHS_CS[view.getMonth()]} {view.getFullYear()}</h3>
        <button type="button" onClick={() => setView(addMonths(view, 1))} className="p-2 rounded-lg text-brand-dark hover:bg-brand-light" aria-label="Další měsíc">→</button>
      </div>

      {/* Legenda + správa kategorií */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        {cats.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1 text-[11px] text-gray-500">
            <span className={`h-2 w-2 rounded-full ${colorOf(c.color).dot}`} /> {c.label}
          </span>
        ))}
        <button onClick={() => setEditCats((v) => !v)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-blue hover:underline">
          <Settings2 className="h-3.5 w-3.5" /> {editCats ? "Hotovo" : "Upravit kategorie"}
        </button>
      </div>

      {/* Editor kategorií */}
      {editCats && (
        <div className="mb-4 rounded-xl border border-gray-100 p-3">
          <div className="space-y-2">
            {cats.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setPaletteFor(paletteFor === c.id ? null : c.id)} className={`h-6 w-6 rounded-full ${colorOf(c.color).dot} ring-2 ring-white shadow`} aria-label="Změnit barvu" />
                  {paletteFor === c.id && (
                    <div className="absolute z-10 mt-1 grid w-40 grid-cols-6 gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-xl">
                      {CAL_COLORS.map((col) => (
                        <button key={col.key} onClick={() => recolorCat(c.id, col.key)} className={`flex h-5 w-5 items-center justify-center rounded-full ${col.dot}`}>
                          {c.color === col.key && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  defaultValue={c.label}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== c.label) renameCat(c.id, v); }}
                  className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  maxLength={24}
                />
                <button onClick={() => delCat(c.id)} className="text-gray-300 hover:text-red-500" aria-label="Smazat kategorii"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          {cats.length < MAX_CATS ? (
            <button onClick={addCat} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline">
              <Plus className="h-4 w-4" /> Přidat kategorii ({cats.length}/{MAX_CATS})
            </button>
          ) : (
            <p className="mt-3 text-xs text-gray-400">Maximum {MAX_CATS} kategorií.</p>
          )}
        </div>
      )}

      {/* Hlavička dnů */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_CS.map((w) => <div key={w} className="text-center text-xs font-semibold text-gray-400 py-1">{w}</div>)}
      </div>

      {/* Dny */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = d.getMonth() === view.getMonth();
          const dayNotes = byDay[dateKey(d)] ?? [];
          const colors = Array.from(new Set(dayNotes.map((n) => catById[n.category_id ?? -1]?.color ?? "gray"))).slice(0, 4);
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
              {colors.length > 0 && !isSel && (
                <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                  {colors.map((c, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${c === "gray" ? "bg-gray-400" : colorOf(c).dot}`} />)}
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

          {/* Seznam událostí */}
          {selNotes.length === 0 ? (
            <p className="text-xs text-gray-400">Žádná událost. Přidej si níže, co tě tenhle den čeká. 🙂</p>
          ) : (
            <div className="space-y-1.5">
              {selNotes.map((n) => {
                const c = n.category_id ? catById[n.category_id] : null;
                const col = colorOf(c?.color);
                return (
                  <div key={n.id} className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${col.dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-brand-dark">
                        {hhmm(n.at_time) && <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-gray-500"><Clock className="h-3 w-3" />{hhmm(n.at_time)}</span>}
                        <span className="break-words">{n.body}</span>
                      </p>
                      {n.note && <p className="mt-0.5 break-words text-xs text-gray-500">{n.note}</p>}
                    </div>
                    {c && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${col.chip}`}>{c.label}</span>}
                    <button onClick={() => delNote(n.id)} className="shrink-0 text-gray-300 hover:text-red-500" aria-label="Smazat"><Trash2 className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Přidání události */}
          <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
            {cats.length === 0 ? (
              <p className="text-xs text-gray-400">Nejdřív si přidej aspoň jednu kategorii výše. 🙂</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {cats.map((c) => {
                    const col = colorOf(c.color);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEvCat(c.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-2 transition ${
                          evCat === c.id ? `${col.chip} ${col.ring}` : "bg-gray-50 text-gray-500 ring-transparent hover:bg-gray-100"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${col.dot}`} /> {c.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input type="time" value={evTime} onChange={(e) => setEvTime(e.target.value)} className="w-28 rounded-lg border border-gray-200 pl-8 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                  </div>
                  <input value={evBody} onChange={(e) => setEvBody(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNote(); }} placeholder="Název události (např. Ranní rozcvička)" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                </div>
                <textarea value={evNote} onChange={(e) => setEvNote(e.target.value)} rows={2} placeholder="Poznámka / detaily (nepovinné)…" className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                <div className="flex justify-end">
                  <button onClick={addNote} disabled={saving || !evBody.trim()} className="btn-primary text-sm inline-flex items-center gap-1.5 disabled:opacity-50">
                    <Plus className="h-4 w-4" /> Přidat událost
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!sel && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400">
          <CalendarDays className="h-3.5 w-3.5" /> Klikni na den a přidej si událost.
        </p>
      )}
    </div>
  );
}
