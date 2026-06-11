"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeTier, TIER_STYLES } from "@/lib/tiers";
import type { UserTier } from "@/types";

// Systémová hláška: 3 dny před koncem členství upozorní, kdy (datum + čas) končí.
export function MembershipExpiryBanner() {
  const [info, setInfo] = useState<{ tier: UserTier; until: string } | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      if (!au.user) return;
      // měkce – když sloupec tier_until ještě není, prostě nic neukážeme
      const { data, error } = await supabase
        .from("profiles")
        .select("tier, tier_until")
        .eq("id", au.user.id)
        .maybeSingle();
      if (error || !data) return;
      const tier = normalizeTier(data.tier as string | undefined);
      const until = data.tier_until as string | null;
      if (tier === "FREE" || !until) return;
      const ms = new Date(until).getTime() - Date.now();
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (ms <= 0 || ms > threeDays) return; // jen v posledních 3 dnech
      // zavřeno pro tohle datum?
      if (typeof window !== "undefined" && localStorage.getItem("pd-expiry-seen") === until) return;
      setInfo({ tier, until });
    })();
  }, []);

  if (!info || closed) return null;

  const d = new Date(info.until);
  const datum = d.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });
  const cas = d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });

  function dismiss() {
    setClosed(true);
    try { localStorage.setItem("pd-expiry-seen", info!.until); } catch {}
  }

  return (
    <div className="bg-amber-500 text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <Clock className="h-4 w-4 shrink-0" strokeWidth={2} />
        <p className="min-w-0 flex-1">
          Tvé členství <strong>{TIER_STYLES[info.tier].label}</strong> končí <strong>{datum}</strong> v <strong>{cas}</strong>.{" "}
          <Link href="/clenstvi" className="underline underline-offset-2 hover:opacity-90">Obnov ho, ať nepřijdeš o přístup.</Link>
        </p>
        <button onClick={dismiss} aria-label="Zavřít" className="shrink-0 text-white/80 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
