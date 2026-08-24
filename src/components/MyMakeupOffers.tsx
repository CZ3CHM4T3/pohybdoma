"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarHeart, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Slot = { id: string; date: string; time: string; chosen: boolean };
type Offer = { id: string; note: string | null; status: string; slots: Slot[] };

const WD = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];

export function MyMakeupOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: offs } = await supabase
      .from("makeup_offers")
      .select("id, note, status")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    const list = (offs ?? []) as { id: string; note: string | null; status: string }[];
    if (list.length === 0) { setOffers([]); setLoaded(true); return; }
    const { data: slots } = await supabase
      .from("makeup_slots")
      .select("id, offer_id, date, time, chosen")
      .in("offer_id", list.map((o) => o.id))
      .order("date");
    const byOffer = new Map<string, Slot[]>();
    for (const s of (slots ?? []) as (Slot & { offer_id: string })[]) {
      if (!byOffer.has(s.offer_id)) byOffer.set(s.offer_id, []);
      byOffer.get(s.offer_id)!.push({ id: s.id, date: s.date, time: s.time, chosen: s.chosen });
    }
    setOffers(list.map((o) => ({ ...o, slots: byOffer.get(o.id) ?? [] })));
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function accept(slot: Slot) {
    setBusy(slot.id); setErr(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("accept_makeup", { p_slot: slot.id });
    setBusy(null);
    if (error) { setErr("Termín se nepodařilo vybrat: " + error.message); return; }
    setDone(`Rezervováno: ${slot.date} v ${slot.time}. Těším se!`);
    load();
  }
  async function decline(offerId: string) {
    setBusy(offerId); setErr(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("decline_makeup", { p_offer: offerId });
    setBusy(null);
    if (error) { setErr("Nepodařilo se odeslat: " + error.message); return; }
    setDone("Dal(a) jsi vědět, že nevyhovuje žádný termín. Domluvíme se jinak.");
    load();
  }

  if (!loaded) return null;
  if (offers.length === 0 && !done) return null;

  return (
    <div className="card p-6 mt-6">
      <div className="mb-4 flex flex-col items-center text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
          <CalendarHeart className="h-5 w-5" strokeWidth={2} />
        </span>
        <h2 className="mt-2 text-xl font-bold text-brand-dark">Náhradní termíny</h2>
        <span className="text-xs text-gray-500">Vyber si termín, který ti sedí – rovnou se rezervuje.</span>
      </div>

      {err && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {done && <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{done}</p>}

      <div className="space-y-5">
        {offers.map((o) => (
          <div key={o.id} className="rounded-xl border border-gray-100 p-4">
            {o.note && <p className="mb-3 text-sm text-gray-600">„{o.note}"</p>}
            <div className="space-y-2">
              {o.slots.map((s) => {
                const d = new Date(s.date + "T00:00:00");
                return (
                  <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 p-3 text-sm">
                    <span className="rounded bg-teal-600 px-2 py-0.5 font-bold text-white">{s.time}</span>
                    <span className="capitalize font-medium text-brand-dark">{WD[d.getDay()]} {d.getDate()}. {d.getMonth() + 1}.</span>
                    <button
                      type="button"
                      onClick={() => accept(s)}
                      disabled={busy !== null}
                      className="ml-auto inline-flex items-center gap-1 rounded-md bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> {busy === s.id ? "Rezervuji…" : "Vybrat"}
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => decline(o.id)}
              disabled={busy !== null}
              className="mt-3 text-xs font-semibold text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              Nevyhovuje žádný termín
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
