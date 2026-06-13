"use client";

import { useEffect, useState } from "react";
import { Eye, ChevronUp, X } from "lucide-react";
import type { UserTier } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { DEMO_TIERS, DEMO_TIER_LABEL } from "@/lib/demo";
import { getDemoTierClient, setDemoTierClient } from "@/lib/demo-client";
import { PREVIEW_MODE } from "@/lib/preview";

// Plovoucí lišta pro nepřihlášené návštěvníky v preview režimu:
// "Prohlížíš jako: FREE / MEMBER / VIP / VIP+". Mění jen zobrazení obsahu,
// nic neukládá do DB a NIKDY nedává admina.
const DOT: Record<UserTier, string> = {
  FREE: "bg-gray-400",
  MEMBER: "bg-blue-500",
  VIP: "bg-violet-500",
  VIP_PLUS: "bg-amber-500",
};

export function DemoTierSwitcher() {
  const [show, setShow] = useState(false);
  const [current, setCurrent] = useState<UserTier>("FREE");
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!PREVIEW_MODE) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) return; // přihlášený (např. admin) demo lištu nevidí
      setCurrent(getDemoTierClient() ?? "FREE");
      setShow(true);
    });
  }, []);

  if (!show || hidden) return null;

  function pick(t: UserTier) {
    setDemoTierClient(t);
    setCurrent(t);
    setOpen(false);
    window.location.reload(); // překreslí obsah podle nové úrovně
  }

  return (
    <div className="fixed inset-x-0 bottom-3 z-[60] flex justify-center px-3 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-xl">
        {/* Hlavička */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
        >
          <Eye className="h-4 w-4 shrink-0 text-brand-blue" strokeWidth={2.2} />
          <span className="text-sm text-gray-600">Prohlížíš jako</span>
          <span className="flex items-center gap-1.5 text-sm font-bold text-brand-dark">
            <span className={`h-2 w-2 rounded-full ${DOT[current]}`} />
            {DEMO_TIER_LABEL[current]}
          </span>
          <ChevronUp
            className={`ml-auto h-4 w-4 text-gray-400 transition-transform ${open ? "" : "rotate-180"}`}
          />
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setHidden(true); }}
            className="ml-1 rounded p-1 text-gray-300 hover:text-gray-500"
            aria-label="Skrýt lištu"
          >
            <X className="h-4 w-4" />
          </span>
        </button>

        {/* Volby */}
        {open && (
          <div className="border-t border-gray-100 p-3">
            <div className="grid grid-cols-4 gap-2">
              {DEMO_TIERS.map((t) => {
                const active = t === current;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => pick(t)}
                    className={`rounded-lg px-2 py-2.5 text-xs font-bold transition-colors ${
                      active
                        ? "bg-brand-dark text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {DEMO_TIER_LABEL[t]}
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-center text-[11px] leading-snug text-gray-400">
              Ukázkový režim – uvidíš, co která úroveň odemyká. Nic se neplatí ani neukládá.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
