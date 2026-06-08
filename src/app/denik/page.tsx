"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LineChart, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MONTHS_CS = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];
const WEEKDAYS_CS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

type Entry = {
  date: string;
  weight: number | null;
  pain: number | null;
  energy: number | null;
  sleep: number | null;
  symptoms: string | null;
  food: string | null;
  training: string | null;
  note: string | null;
};
type Form = {
  weight: string; pain: string; energy: string; sleep: string;
  symptoms: string; food: string; training: string; note: string;
};
const EMPTY_FORM: Form = { weight: "", pain: "", energy: "", sleep: "", symptoms: "", food: "", training: "", note: "" };

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
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

function composite(e: { energy: number | null; sleep: number | null; pain: number | null }): number | null {
  if (e.energy == null || e.sleep == null || e.pain == null) return null;
  return Math.round((e.energy + e.sleep * 10 + (100 - e.pain * 10)) / 3);
}

// Křivky v grafu (vše normalizováno na 0–100)
const CURVES = [
  { key: "energy", label: "Energie", color: "#1976FF", norm: (v: number) => v },
  { key: "sleep", label: "Spánek", color: "#7c3aed", norm: (v: number) => v * 10 },
  { key: "pain", label: "Bolest", color: "#e11d48", norm: (v: number) => v * 10 },
  { key: "composite", label: "Pohoda", color: "#059669", norm: (v: number) => v },
] as const;

export default function DenikPage() {
  const supabase = createClient();
  const [phase, setPhase] = useState<"loading" | "anon" | "ready">("loading");
  const [uid, setUid] = useState<string | null>(null);

  const [view, setView] = useState<Date>(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadMonth = useCallback(
    async (userId: string, month: Date) => {
      const from = dateKey(startOfMonth(month));
      const to = dateKey(endOfMonth(month));
      const { data } = await supabase
        .from("diary_entries")
        .select("date, weight, pain, energy, sleep, symptoms, food, training, note")
        .eq("user_id", userId)
        .gte("date", from)
        .lte("date", to);
      const map: Record<string, Entry> = {};
      for (const e of (data ?? []) as Entry[]) map[e.date] = e;
      setEntries(map);
    },
    [supabase]
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { setPhase("anon"); return; }
      setUid(data.user.id);
      setPhase("ready");
      loadMonth(data.user.id, view);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (uid) loadMonth(uid, view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, uid]);

  // Naplň formulář podle vybraného dne
  useEffect(() => {
    const e = entries[dateKey(selected)];
    setForm(
      e
        ? {
            weight: e.weight?.toString() ?? "",
            pain: e.pain?.toString() ?? "",
            energy: e.energy?.toString() ?? "",
            sleep: e.sleep?.toString() ?? "",
            symptoms: e.symptoms ?? "",
            food: e.food ?? "",
            training: e.training ?? "",
            note: e.note ?? "",
          }
        : EMPTY_FORM
    );
  }, [selected, entries]);

  const days = useMemo(() => buildCalendar(view), [view]);

  function num(s: string): number | null {
    const t = s.trim();
    if (t === "") return null;
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  async function save() {
    if (!uid) return;
    setSaving(true);
    setMsg(null);
    const key = dateKey(selected);
    const row = {
      user_id: uid,
      date: key,
      weight: num(form.weight),
      pain: num(form.pain),
      energy: num(form.energy),
      sleep: num(form.sleep),
      symptoms: form.symptoms.trim() || null,
      food: form.food.trim() || null,
      training: form.training.trim() || null,
      note: form.note.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("diary_entries")
      .upsert(row, { onConflict: "user_id,date" });
    setSaving(false);
    if (error) {
      setMsg("Uložení selhalo (" + error.message + "). Spustil jsi journey.sql?");
      return;
    }
    setEntries((m) => ({ ...m, [key]: { ...row } as Entry }));
    setMsg("Uloženo ✓");
  }

  if (phase === "loading") {
    return <Centered><p className="text-gray-400">Načítám deník…</p></Centered>;
  }
  if (phase === "anon") {
    return (
      <Centered>
        <LineChart className="mx-auto mb-3 h-10 w-10 text-brand-blue" strokeWidth={1.8} />
        <h1 className="text-xl font-semibold text-brand-dark mb-2">Můj deník</h1>
        <p className="text-sm text-gray-500 mb-5">Pro vedení deníku se přihlas.</p>
        <Link href="/ucet" className="btn-primary">Přihlásit se</Link>
      </Centered>
    );
  }

  const f = form;
  const set = (k: keyof Form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2">
          <LineChart className="h-6 w-6 text-brand-blue" strokeWidth={2} />
          <h1 className="text-3xl lg:text-4xl font-semibold text-brand-dark">Můj deník</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kalendář */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={() => setView(addMonths(view, -1))} className="p-2 rounded-lg text-brand-dark hover:bg-brand-light" aria-label="Předchozí měsíc">←</button>
              <h2 className="font-semibold text-brand-dark capitalize">{MONTHS_CS[view.getMonth()]} {view.getFullYear()}</h2>
              <button type="button" onClick={() => setView(addMonths(view, 1))} className="p-2 rounded-lg text-brand-dark hover:bg-brand-light" aria-label="Další měsíc">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS_CS.map((w) => <div key={w} className="text-center text-xs font-semibold text-gray-400 py-1">{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d) => {
                const inMonth = d.getMonth() === view.getMonth();
                const has = !!entries[dateKey(d)];
                const isSel = sameDay(d, selected);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => setSelected(new Date(d))}
                    className={`relative aspect-square rounded-lg text-sm font-medium transition-all ${
                      !inMonth ? "text-gray-300" : isSel ? "bg-brand-blue text-white shadow-md" : "text-brand-dark hover:bg-brand-light"
                    }`}
                  >
                    {d.getDate()}
                    {has && !isSel && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-gray-400">Zelená tečka = den s vyplněným záznamem.</p>
          </div>

          {/* Formulář dne */}
          <div className="card p-6">
            <p className="text-sm font-semibold text-brand-dark capitalize mb-4">
              {selected.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Váha (kg)" value={f.weight} onChange={(v) => set("weight", v)} type="number" placeholder="nap. 78,5" />
              <Field label="Spánek (1–10)" value={f.sleep} onChange={(v) => set("sleep", v)} type="number" min={1} max={10} />
              <Field label="Energie (1–100)" value={f.energy} onChange={(v) => set("energy", v)} type="number" min={1} max={100} />
              <Field label="Bolest (1–10)" value={f.pain} onChange={(v) => set("pain", v)} type="number" min={1} max={10} />
            </div>
            <div className="mt-3 space-y-3">
              <AreaField label="Trénink (co jsem dnes dělal)" value={f.training} onChange={(v) => set("training", v)} placeholder="napa. mobilita zad, kettlebell 20 min…" />
              <AreaField label="Strava" value={f.food} onChange={(v) => set("food", v)} />
              <AreaField label="Symptomy" value={f.symptoms} onChange={(v) => set("symptoms", v)} />
              <AreaField label="Poznámka" value={f.note} onChange={(v) => set("note", v)} />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={save} disabled={saving} className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? "Ukládám…" : "Uložit den"}
              </button>
              {msg && <span className="text-xs text-emerald-700">{msg}</span>}
            </div>
          </div>
        </div>

        {/* Graf měsíce */}
        <div className="card p-6 mt-6">
          <div className="flex items-center gap-2 mb-1">
            <LineChart className="h-4 w-4 text-brand-blue" strokeWidth={2} />
            <h2 className="text-sm font-semibold text-brand-dark">Vývoj v měsíci</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">Vše přepočteno na 0–100 (čím výš, tím líp – kromě bolesti).</p>
          <MonthChart
            view={view}
            entries={entries}
            onPickDay={(day) => setSelected(new Date(view.getFullYear(), view.getMonth(), day))}
          />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {CURVES.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthChart({
  view,
  entries,
  onPickDay,
}: {
  view: Date;
  entries: Record<string, Entry>;
  onPickDay?: (day: number) => void;
}) {
  const W = 700;
  const H = 210;
  const padX = 12;
  const padTop = 12;
  const padBottom = 24;
  const daysInMonth = endOfMonth(view).getDate();
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const x = (day: number) => padX + ((day - 1) / Math.max(1, daysInMonth - 1)) * (W - padX * 2);
  const y = (val: number) => padTop + (1 - val / 100) * (H - padTop - padBottom);

  // hodnota dané křivky pro daný den (normalizovaná 0–100) nebo null
  function curveVal(key: string, e: Entry): number | null {
    let raw: number | null = null;
    if (key === "composite") raw = composite(e);
    else raw = e[key as "energy" | "sleep" | "pain"] ?? null;
    if (raw == null) return null;
    const cfg = CURVES.find((c) => c.key === key)!;
    return Math.max(0, Math.min(100, cfg.norm(raw)));
  }

  const lines = CURVES.map((c) => {
    const pts: { day: number; cx: number; cy: number }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const e = entries[dateKey(new Date(view.getFullYear(), view.getMonth(), day))];
      if (!e) continue;
      const v = curveVal(c.key, e);
      if (v == null) continue;
      pts.push({ day, cx: x(day), cy: y(v) });
    }
    return { ...c, pts };
  });

  const hasAny = lines.some((l) => l.pts.length > 0);
  const dayTicks: number[] = [];
  for (let d = 1; d <= daysInMonth; d += 5) dayTicks.push(d);
  if (dayTicks[dayTicks.length - 1] !== daysInMonth) dayTicks.push(daysInMonth);

  const hoverEntry =
    hoverDay != null ? entries[dateKey(new Date(view.getFullYear(), view.getMonth(), hoverDay))] : undefined;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const day = Math.round(ratio * (daysInMonth - 1)) + 1;
    setHoverDay(Math.max(1, Math.min(daysInMonth, day)));
  }

  return (
    <div className="w-full">
      {/* Odečet vybraného dne */}
      <div className="mb-2 h-5 text-xs">
        {hoverDay != null && (
          <span className="text-gray-600">
            <strong className="text-brand-dark">{hoverDay}. {MONTHS_CS[view.getMonth()]}</strong>
            {hoverEntry ? (
              <>
                {CURVES.map((c) => {
                  const raw =
                    c.key === "composite"
                      ? composite(hoverEntry)
                      : (hoverEntry[c.key as "energy" | "sleep" | "pain"] ?? null);
                  return raw == null ? null : (
                    <span key={c.key} className="ml-3" style={{ color: c.color }}>
                      {c.label}: {raw}
                    </span>
                  );
                })}
                {hoverEntry.weight != null && <span className="ml-3 text-gray-500">Váha: {hoverEntry.weight} kg</span>}
              </>
            ) : (
              <span className="ml-2 text-gray-400">žádný záznam</span>
            )}
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: 320 }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverDay(null)}
          onClick={() => hoverDay != null && onPickDay?.(hoverDay)}
        >
          {/* vodorovné linky + popisky 0–100 */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={padX} x2={W - padX} y1={y(v)} y2={y(v)} stroke="#eef2f7" strokeWidth={1} />
              <text x={2} y={y(v) + 3} fill="#cbd5e1" fontSize="9">{v}</text>
            </g>
          ))}

          {/* svislá mřížka dní */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <line key={d} x1={x(d)} x2={x(d)} y1={padTop} y2={H - padBottom} stroke="#f6f8fb" strokeWidth={1} />
          ))}

          {/* popisky dní */}
          {dayTicks.map((d) => (
            <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fill="#9ca3af" fontSize="9">{d}</text>
          ))}

          {/* zvýraznění dne pod kurzorem */}
          {hoverDay != null && (
            <line x1={x(hoverDay)} x2={x(hoverDay)} y1={padTop} y2={H - padBottom} stroke="#cbd5e1" strokeWidth={1.5} />
          )}

          {/* křivky + body */}
          {lines.map((l) => (
            <g key={l.key}>
              {l.pts.length > 1 && (
                <polyline
                  points={l.pts.map((p) => `${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke={l.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {l.pts.map((p) => (
                <circle
                  key={p.day}
                  cx={p.cx}
                  cy={p.cy}
                  r={hoverDay === p.day ? 4 : 2.5}
                  fill={l.color}
                  stroke="#fff"
                  strokeWidth={hoverDay === p.day ? 1.5 : 0}
                />
              ))}
            </g>
          ))}

          {!hasAny && (
            <text x={W / 2} y={H / 2} textAnchor="middle" fill="#9ca3af" fontSize="13">
              Zatím žádná data – vyplň pár dní a křivky se objeví.
            </text>
          )}
        </svg>
      </div>
      <p className="mt-1 text-[11px] text-gray-400">Najeď myší na den · klikni pro otevření dne ve formuláři.</p>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, min, max,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; min?: number; max?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-brand-dark mb-1">{label}</label>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
      />
    </div>
  );
}

function AreaField({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-brand-dark mb-1">{label}</label>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
      />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center px-4">
      <div className="card p-8 text-center max-w-sm">{children}</div>
    </div>
  );
}
