"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, Quote, Target, Heart, Pencil, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TIER_STYLES, normalizeTier } from "@/lib/tiers";
import { BADGE_MAP } from "@/lib/badges";
import { BadgeMedal } from "@/components/BadgeMedal";

type Pub = {
  id: string; name: string; tier: string; pinned_badges: string[];
  motto: string | null; goal: string | null; fave: string | null;
};

export default function ProfilPage() {
  const supabase = createClient();
  const params = useParams();
  const id = String(params?.id ?? "");
  const [phase, setPhase] = useState<"loading" | "notfound" | "ready">("loading");
  const [p, setP] = useState<Pub | null>(null);
  const [meId, setMeId] = useState<string | null>(null);

  // editace (jen vlastní profil)
  const [editing, setEditing] = useState(false);
  const [motto, setMotto] = useState("");
  const [goal, setGoal] = useState("");
  const [fave, setFave] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      setMeId(au.user?.id ?? null);
      const { data } = await supabase.rpc("public_profile", { p_id: id });
      const row = (data ?? [])[0] as Pub | undefined;
      if (!row) { setPhase("notfound"); return; }
      setP(row);
      setMotto(row.motto ?? "");
      setGoal(row.goal ?? "");
      setFave(row.fave ?? "");
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save() {
    setSaving(true);
    await supabase.rpc("set_profile_extra", { p_motto: motto, p_goal: goal, p_fave: fave });
    setSaving(false);
    setEditing(false);
    setP((prev) => prev ? {
      ...prev,
      motto: motto.trim() || null,
      goal: goal.trim() || null,
      fave: fave.trim() || null,
    } : prev);
  }

  if (phase === "loading") return <Centered><p className="text-gray-400">Načítám…</p></Centered>;
  if (phase === "notfound" || !p) {
    return (
      <Centered>
        <p className="mb-3 font-semibold text-brand-dark">Profil nenalezen.</p>
        <Link href="/ucet" className="btn-primary">Zpět</Link>
      </Centered>
    );
  }

  const tier = normalizeTier(p.tier);
  const pins = p.pinned_badges ?? [];
  const isOwner = meId != null && meId === p.id;
  const hasLife = p.motto || p.goal || p.fave;

  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
        <button onClick={() => history.back()} className="inline-flex items-center gap-2 text-sm text-brand-blue font-semibold mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Zpět
        </button>

        <div className="card p-8 text-center">
          <span className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-brand-blue text-3xl font-semibold text-white">
            {(p.name[0] ?? "Č").toUpperCase()}
          </span>
          <h1 className="text-2xl font-semibold text-brand-dark">{p.name}</h1>
          <span className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${TIER_STYLES[tier].badge}`}>
            {TIER_STYLES[tier].label}
          </span>

          {/* motto */}
          {!editing && p.motto && (
            <p className="mt-3 text-base italic text-brand-dark">„{p.motto}"</p>
          )}

          {isOwner ? (
            <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <Eye className="h-3.5 w-3.5" /> Takhle tě vidí ostatní členové
            </p>
          ) : (
            <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <Eye className="h-3.5 w-3.5" /> Sleduješ profil (jen pro zobrazení)
            </p>
          )}

          {/* O mně – cíl + oblíbená aktivita */}
          {editing ? (
            <div className="mt-6 space-y-3 text-left">
              <Field label="Motto / citát" Icon={Quote} value={motto} onChange={setMotto} placeholder="Pohyb je svoboda." max={140} />
              <Field label="Můj cíl" Icon={Target} value={goal} onChange={setGoal} placeholder="Udělat první shyb." max={140} />
              <Field label="Oblíbená aktivita" Icon={Heart} value={fave} onChange={setFave} placeholder="Floorwork, kettlebell…" max={80} />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button onClick={() => { setEditing(false); setMotto(p.motto ?? ""); setGoal(p.goal ?? ""); setFave(p.fave ?? ""); }}
                  className="btn-outline text-sm inline-flex items-center gap-1.5">
                  <X className="h-4 w-4" /> Zrušit
                </button>
                <button onClick={save} disabled={saving} className="btn-primary text-sm inline-flex items-center gap-1.5 disabled:opacity-50">
                  <Check className="h-4 w-4" /> {saving ? "Ukládám…" : "Uložit"}
                </button>
              </div>
            </div>
          ) : (
            (p.goal || p.fave) && (
              <div className="mt-5 grid grid-cols-1 gap-2 text-left">
                {p.goal && <LifeRow Icon={Target} label="Cíl" value={p.goal} tint="bg-emerald-50 text-emerald-600" />}
                {p.fave && <LifeRow Icon={Heart} label="Nejradši cvičím" value={p.fave} tint="bg-rose-50 text-rose-600" />}
              </div>
            )
          )}

          {/* prázdný stav pro vlastníka */}
          {isOwner && !editing && !hasLife && (
            <p className="mt-4 text-sm text-gray-400">Přidej si motto, cíl a oblíbenou aktivitu — ať tvůj profil žije. 🙂</p>
          )}

          {/* tlačítko upravit (jen vlastník) */}
          {isOwner && !editing && (
            <button onClick={() => setEditing(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline">
              <Pencil className="h-4 w-4" /> Upravit profil
            </button>
          )}

          {/* Síň slávy – přišpendlené odznaky */}
          <div className="mt-7 border-t border-gray-100 pt-6">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Síň slávy</h2>
            {pins.length === 0 ? (
              <p className="text-sm text-gray-400">
                {isOwner ? "Přišpendli si odznaky v Síni slávy." : "Tenhle člen si zatím žádný odznak nepřišpendlil."}
              </p>
            ) : (
              <div className="flex flex-wrap justify-center gap-4">
                {pins.map((bid) => {
                  const b = BADGE_MAP[bid];
                  if (!b) return null;
                  return (
                    <div key={bid} className="w-20 text-center">
                      <BadgeMedal id={bid} size={64} />
                      <p className="mt-1 text-xs font-semibold text-brand-dark">{b.name}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LifeRow({ Icon, label, value, tint }: { Icon: typeof Target; label: string; value: string; tint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tint}`}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-sm font-medium text-brand-dark break-words">{value}</p>
      </div>
    </div>
  );
}

function Field({ label, Icon, value, onChange, placeholder, max }: {
  label: string; Icon: typeof Target; value: string; onChange: (v: string) => void; placeholder: string; max: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <input
        type="text"
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
      />
    </label>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center px-4">
      <div className="card p-8 text-center max-w-sm">{children}</div>
    </div>
  );
}
