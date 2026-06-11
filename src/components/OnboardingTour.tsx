"use client";

import { useEffect, useState } from "react";
import { X, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Step = {
  id: number; position: number; title: string; body: string;
  image_url: string | null; cx: number; cy: number; radius: number;
};

const DONE_KEY = "pd-onboarding-done";

export function OnboardingTour() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supabase = createClient();
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      if (!au.user) return; // jen pro přihlášené členy
      const { data, error } = await supabase.from("onboarding_steps").select("*").order("position");
      if (error || !data || data.length === 0) return; // žádné kroky / tabulka chybí → nic
      setSteps(data as Step[]);
      if (localStorage.getItem(DONE_KEY) !== "1") setShow(true); // poprvé spustí automaticky
    })();
    // ruční spuštění (náhled v adminu / „spustit znovu"): kroky už jsou načtené
    const start = () => { setI(0); setShow(true); };
    window.addEventListener("pd-onboarding-start", start);
    return () => window.removeEventListener("pd-onboarding-start", start);
  }, []);

  if (!show || steps.length === 0) return null;
  const step = steps[Math.min(i, steps.length - 1)];

  function finish() {
    setShow(false);
    try { localStorage.setItem(DONE_KEY, "1"); } catch {}
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={finish}>
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={finish} aria-label="Zavřít" className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 text-gray-500 shadow hover:text-brand-dark">
          <X className="h-5 w-5" />
        </button>

        {step.image_url && (
          <div className="relative bg-brand-light">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={step.image_url} alt="" className="block w-full" />
            {/* animovaný + statický kroužek nad funkcí */}
            <span
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-brand-blue opacity-60"
              style={{ left: `${step.cx}%`, top: `${step.cy}%`, width: `${step.radius * 2}%`, paddingBottom: `${step.radius * 2}%`, animation: "pd-ping 1.6s ease-out infinite" }}
            />
            <span
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-brand-blue shadow-[0_0_0_3px_rgba(255,255,255,0.6)]"
              style={{ left: `${step.cx}%`, top: `${step.cy}%`, width: `${step.radius * 2}%`, paddingBottom: `${step.radius * 2}%` }}
            />
          </div>
        )}

        <div className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-blue">Krok {i + 1} z {steps.length}</p>
          <h2 className="mt-1 text-lg font-semibold text-brand-dark">{step.title}</h2>
          {step.body && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{step.body}</p>}

          <div className="mt-4 flex items-center justify-between">
            <button onClick={finish} className="text-xs font-semibold text-gray-400 hover:text-brand-dark">Přeskočit</button>
            <div className="flex items-center gap-2">
              {i > 0 && (
                <button onClick={() => setI(i - 1)} className="btn-outline text-sm inline-flex items-center gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Zpět
                </button>
              )}
              {i < steps.length - 1 ? (
                <button onClick={() => setI(i + 1)} className="btn-primary text-sm inline-flex items-center gap-1.5">
                  Další <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={finish} className="btn-primary text-sm inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Hotovo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes pd-ping{0%{transform:translate(-50%,-50%) scale(1);opacity:.6}70%{transform:translate(-50%,-50%) scale(1.5);opacity:0}100%{opacity:0}}`}</style>
    </div>
  );
}
