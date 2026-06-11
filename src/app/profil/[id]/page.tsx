"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, Palette, Check, Clock, CalendarDays, Flame, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TIER_STYLES, normalizeTier } from "@/lib/tiers";
import { BADGE_MAP } from "@/lib/badges";
import { BadgeMedal } from "@/components/BadgeMedal";
import { PROFILE_THEMES, themeCard } from "@/lib/profile-themes";
import { frameClass } from "@/lib/avatar-frames";
import { FounderBadge } from "@/components/FounderBadge";

type Pub = {
  id: string; name: string; tier: string; pinned_badges: string[]; theme: string | null;
  minutes_month: number; minutes_total: number; member_since: string | null; avatar_frame: string | null; is_admin: boolean;
};

function fmtMin(m: number): string {
  if (!m) return "0 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
function fmtMonth(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
}

export default function ProfilPage() {
  const supabase = createClient();
  const params = useParams();
  const id = String(params?.id ?? "");
  const [phase, setPhase] = useState<"loading" | "notfound" | "ready">("loading");
  const [p, setP] = useState<Pub | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [best, setBest] = useState<{ rank: number; month: string } | null>(null);

  const [editing, setEditing] = useState(false);
  const [theme, setTheme] = useState<string>("default");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      setMeId(au.user?.id ?? null);
      const [{ data }, { data: br }] = await Promise.all([
        supabase.rpc("public_profile", { p_id: id }),
        supabase.rpc("personal_best_rank", { p_id: id }),
      ]);
      const row = (data ?? [])[0] as Pub | undefined;
      if (!row) { setPhase("notfound"); return; }
      setP(row);
      setTheme(row.theme ?? "default");
      const b = (br ?? [])[0] as { rank: number; month: string } | undefined;
      setBest(b ?? null);
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveTheme(key: string) {
    setSaving(true);
    setTheme(key);
    await supabase.rpc("set_profile_theme", { p_theme: key });
    setSaving(false);
    setP((prev) => (prev ? { ...prev, theme: key } : prev));
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

  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
        <button onClick={() => history.back()} className="inline-flex items-center gap-2 text-sm text-brand-blue font-semibold mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Zpět
        </button>

        <div className={`card p-8 text-center transition-colors ${themeCard(theme)}`}>
          <span className={`mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-brand-blue text-3xl font-semibold text-white shadow ${frameClass(p.is_admin ? "lektor" : p.avatar_frame)}`}>
            {(p.name[0] ?? "Č").toUpperCase()}
          </span>
          <h1 className="text-2xl font-semibold text-brand-dark">{p.name}</h1>
          {p.is_admin ? (
            <div className="mt-2 flex justify-center"><FounderBadge className="text-xs px-3 py-1" /></div>
          ) : (
            <span className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${TIER_STYLES[tier].badge}`}>
              {TIER_STYLES[tier].label}
            </span>
          )}

          <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Eye className="h-3.5 w-3.5" /> {isOwner ? "Takhle tě vidí ostatní členové" : "Sleduješ profil (jen pro zobrazení)"}
          </p>

          {/* Statistiky – automaticky, vystihují člena */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Stat Icon={Flame} value={fmtMin(p.minutes_month)} label="tento měsíc" tint="text-amber-600" />
            <Stat Icon={Clock} value={fmtMin(p.minutes_total)} label="celkem" tint="text-sky-600" />
            <Stat Icon={CalendarDays} value={fmtMonth(p.member_since)} label="člen od" tint="text-emerald-600" small />
          </div>

          {/* Osobní rekord v žebříčku (jen pokud se dostal do TOP 10) */}
          {best && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/50 px-4 py-3 ring-1 ring-amber-200">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white shadow">
                <Award className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">🏅 Osobní rekord v žebříčku</p>
                <p className="text-sm font-semibold text-brand-dark">
                  {best.rank}. místo
                  <span className="font-normal text-gray-500"> · {fmtMonth(best.month)}</span>
                </p>
              </div>
            </div>
          )}

          {/* Výběr vzhledu (jen vlastník) */}
          {isOwner && (
            <div className="mt-6">
              {!editing ? (
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline">
                  <Palette className="h-4 w-4" /> Upravit vzhled profilu
                </button>
              ) : (
                <div className="rounded-xl bg-white/70 p-4 ring-1 ring-gray-200">
                  <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
                    <Palette className="h-3.5 w-3.5" /> Vyber si vzhled
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {PROFILE_THEMES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => saveTheme(t.key)}
                        disabled={saving}
                        className="flex flex-col items-center gap-1"
                        title={t.label}
                      >
                        <span className={`relative flex h-12 w-full items-center justify-center rounded-lg ${t.swatch} ring-2 ${theme === t.key ? "ring-brand-blue" : "ring-transparent"}`}>
                          {theme === t.key && <Check className="h-5 w-5 text-brand-blue drop-shadow" strokeWidth={3} />}
                        </span>
                        <span className="text-[11px] text-gray-500">{t.label}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setEditing(false)} className="mt-4 text-sm font-semibold text-gray-500 hover:text-brand-dark">
                    Hotovo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Odznaky */}
          <div className="mt-7 border-t border-black/5 pt-6">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Odznaky</h2>
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

function Stat({ Icon, value, label, tint, small }: {
  Icon: typeof Flame; value: string; label: string; tint: string; small?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/70 px-2 py-3 ring-1 ring-black/5">
      <Icon className={`mx-auto h-4 w-4 ${tint}`} strokeWidth={2} />
      <p className={`mt-1 font-bold text-brand-dark ${small ? "text-xs capitalize" : "text-sm"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
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
