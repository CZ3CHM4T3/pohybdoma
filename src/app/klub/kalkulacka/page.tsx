"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, Lock, ArrowLeft, Plus, Trash2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { normalizeTier } from "@/lib/tiers";
import { getDemoTierClient } from "@/lib/demo-client";
import { PREVIEW_MODE } from "@/lib/preview";
import { FOODS, FOOD_CATS, type Food } from "@/lib/foods";

type Item = { key: string; foodId: string; grams: number };

const FOOD_BY_ID = new Map(FOODS.map((f) => [f.id, f]));
const todayKey = () => new Date().toISOString().slice(0, 10);
const storeKey = () => `pd-kal-${todayKey()}`;

export default function KalkulackaPage() {
  const supabase = createClient();
  const [phase, setPhase] = useState<"loading" | "anon" | "locked" | "ready">("loading");

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [target, setTarget] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const user = au.user;
      if (!user) {
        setPhase(PREVIEW_MODE && getDemoTierClient() === "VIP_PLUS" ? "ready" : "anon");
        return;
      }
      const { data: p } = await supabase.from("profiles").select("tier").eq("id", user.id).maybeSingle();
      const ok = normalizeTier(p?.tier as string | undefined) === "VIP_PLUS" || isAdminEmail(user.email);
      setPhase(ok ? "ready" : "locked");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Načtení / uložení dne (localStorage)
  useEffect(() => {
    if (phase !== "ready") return;
    try {
      const raw = localStorage.getItem(storeKey());
      if (raw) setItems(JSON.parse(raw));
      const t = localStorage.getItem("pd-kal-target");
      if (t) setTarget(t);
    } catch {}
  }, [phase]);
  useEffect(() => {
    if (phase === "ready") { try { localStorage.setItem(storeKey(), JSON.stringify(items)); } catch {} }
  }, [items, phase]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FOODS.filter((f) => (!cat || f.cat === cat) && (!q || f.name.toLowerCase().includes(q)));
  }, [query, cat]);

  const totals = useMemo(() => {
    let kcal = 0, p = 0, c = 0, f = 0;
    for (const it of items) {
      const food = FOOD_BY_ID.get(it.foodId);
      if (!food) continue;
      const r = it.grams / 100;
      kcal += food.kcal * r; p += food.p * r; c += food.c * r; f += food.f * r;
    }
    return { kcal: Math.round(kcal), p: Math.round(p), c: Math.round(c), f: Math.round(f) };
  }, [items]);

  function add(food: Food) {
    setItems((arr) => [...arr, { key: Math.random().toString(36).slice(2), foodId: food.id, grams: food.portionG }]);
  }
  function setGrams(key: string, grams: number) {
    setItems((arr) => arr.map((it) => (it.key === key ? { ...it, grams: Math.max(0, grams) } : it)));
  }
  function remove(key: string) {
    setItems((arr) => arr.filter((it) => it.key !== key));
  }
  function clearDay() {
    if (window.confirm("Vymazat celý dnešní záznam?")) setItems([]);
  }

  if (phase === "loading") return <Centered><p className="text-gray-400">Načítám…</p></Centered>;
  if (phase === "anon") {
    return (
      <Centered>
        <Calculator className="mx-auto mb-3 h-10 w-10 text-amber-500" strokeWidth={1.8} />
        <h1 className="text-xl font-semibold text-brand-dark mb-2">Kalorická kalkulačka</h1>
        <p className="text-sm text-gray-500 mb-5">Pro kalkulačku se přihlas.</p>
        <Link href="/ucet" className="btn-primary">Přihlásit se</Link>
      </Centered>
    );
  }
  if (phase === "locked") {
    return (
      <Centered>
        <Lock className="mx-auto mb-3 h-10 w-10 text-amber-500" strokeWidth={1.8} />
        <h1 className="text-xl font-semibold text-brand-dark mb-2">Kalkulačka je pro VIP+</h1>
        <p className="text-sm text-gray-500 mb-5">Spočítej si den z nejčastějších jídel – součást VIP+.</p>
        <Link href="/clenstvi" className="btn-primary">Zobrazit členství</Link>
      </Centered>
    );
  }

  const targetNum = Number(target) || 0;
  const pct = targetNum > 0 ? Math.min(100, Math.round((totals.kcal / targetNum) * 100)) : 0;

  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/klub" className="inline-flex items-center gap-2 text-sm text-brand-blue font-semibold mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Zpět do Klubu
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Calculator className="h-6 w-6" strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-brand-dark">Kalorická kalkulačka</h1>
            <p className="text-sm text-gray-500">Naklikej, co jsi dnes snědl – spočítám kalorie i makra.</p>
          </div>
        </div>

        {/* Souhrn dne */}
        <div className="card p-6 mb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold text-brand-dark">{totals.kcal} <span className="text-base font-normal text-gray-400">kcal</span></p>
              <div className="mt-1 flex gap-4 text-xs text-gray-500">
                <span>Bílkoviny <strong className="text-brand-dark">{totals.p} g</strong></span>
                <span>Sacharidy <strong className="text-brand-dark">{totals.c} g</strong></span>
                <span>Tuky <strong className="text-brand-dark">{totals.f} g</strong></span>
              </div>
            </div>
            <div className="text-right">
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">Můj cíl (kcal)</label>
              <input
                type="number"
                value={target}
                onChange={(e) => { setTarget(e.target.value); try { localStorage.setItem("pd-kal-target", e.target.value); } catch {} }}
                placeholder="např. 2000"
                className="w-28 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          </div>
          {targetNum > 0 && (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${totals.kcal > targetNum ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {totals.kcal <= targetNum ? `Zbývá ${targetNum - totals.kcal} kcal` : `Překročeno o ${totals.kcal - targetNum} kcal`}
              </p>
            </div>
          )}
        </div>

        {/* Dnešní záznam */}
        <div className="card p-6 mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-dark">Dnešní den ({items.length})</h2>
            {items.length > 0 && <button onClick={clearDay} className="text-xs font-semibold text-gray-400 hover:text-red-600">Vymazat den</button>}
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-gray-400">Zatím nic. Vyber jídla níže a přidej je. 🙂</p>
          ) : (
            <div className="space-y-2">
              {items.map((it) => {
                const food = FOOD_BY_ID.get(it.foodId);
                if (!food) return null;
                const kc = Math.round((food.kcal * it.grams) / 100);
                return (
                  <div key={it.key} className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-brand-dark">{food.name}</span>
                      <span className="text-xs text-gray-400">{kc} kcal · {food.portionLabel}</span>
                    </span>
                    <input
                      type="number"
                      value={it.grams}
                      onChange={(e) => setGrams(it.key, Number(e.target.value))}
                      className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                    <span className="text-xs text-gray-400">g</span>
                    <button onClick={() => remove(it.key)} className="text-gray-300 hover:text-red-500" aria-label="Odebrat"><Trash2 className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Výběr jídel */}
        <div className="card p-6">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hledat jídlo…"
              className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            <Chip label="Vše" active={cat === ""} onClick={() => setCat("")} />
            {FOOD_CATS.map((c) => <Chip key={c} label={c} active={cat === c} onClick={() => setCat(c)} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filtered.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => add(food)}
                className="flex items-center gap-2 rounded-lg border border-gray-100 p-2.5 text-left hover:border-brand-blue hover:bg-brand-light/40 transition-colors"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-brand-dark">{food.name}</span>
                  <span className="text-xs text-gray-400">{food.kcal} kcal/100 g · {food.portionG} g {food.portionLabel}</span>
                </span>
                <Plus className="h-4 w-4 shrink-0 text-brand-blue" />
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-gray-400">
          Hodnoty jsou orientační (jako u každé kaloričky). Slouží k vedení, ne jako lékařský údaj.
        </p>
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-light hover:text-brand-blue"
      }`}
    >
      {label}
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center px-4">
      <div className="card p-8 text-center max-w-sm">{children}</div>
    </div>
  );
}
