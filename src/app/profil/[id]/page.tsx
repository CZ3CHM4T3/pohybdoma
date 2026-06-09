"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TIER_STYLES, normalizeTier } from "@/lib/tiers";
import { BADGE_MAP, TIER_RING, TIER_ICON, TIER_GLOW } from "@/lib/badges";

type Pub = { id: string; name: string; tier: string; pinned_badges: string[] };

export default function ProfilPage() {
  const supabase = createClient();
  const params = useParams();
  const id = String(params?.id ?? "");
  const [phase, setPhase] = useState<"loading" | "notfound" | "ready">("loading");
  const [p, setP] = useState<Pub | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("public_profile", { p_id: id });
      const row = (data ?? [])[0] as Pub | undefined;
      if (!row) { setPhase("notfound"); return; }
      setP(row);
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
          <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Eye className="h-3.5 w-3.5" /> Sleduješ profil (jen pro zobrazení)
          </p>

          {/* Síň slávy – přišpendlené odznaky */}
          <div className="mt-6">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Síň slávy</h2>
            {pins.length === 0 ? (
              <p className="text-sm text-gray-400">Tenhle člen si zatím žádný odznak nepřišpendlil.</p>
            ) : (
              <div className="flex flex-wrap justify-center gap-4">
                {pins.map((bid) => {
                  const b = BADGE_MAP[bid];
                  if (!b) return null;
                  const Icon = b.Icon;
                  return (
                    <div key={bid} className="w-20 text-center">
                      <div className={`mx-auto h-16 w-16 rounded-full p-[3px] shadow-md bg-gradient-to-br ${TIER_RING[b.tier]} ${TIER_GLOW[b.tier]}`}>
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                          <Icon className={`h-7 w-7 ${TIER_ICON[b.tier]}`} strokeWidth={1.8} />
                        </div>
                      </div>
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

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center px-4">
      <div className="card p-8 text-center max-w-sm">{children}</div>
    </div>
  );
}
