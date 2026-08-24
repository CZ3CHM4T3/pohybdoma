"use client";

import { useState } from "react";
import { CalendarPlus, Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function CalendarSubscribe() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function reveal() {
    setOpen(true);
    if (url || loading) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("my_ical_token");
    setLoading(false);
    if (data) setUrl(`${window.location.origin}/api/kalendar/${data}`);
  }
  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }

  return (
    <div className="card p-6 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CalendarPlus className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-brand-dark">Přidat lekce do kalendáře</h2>
            <p className="text-xs text-gray-500">Nepovinné – tvoje lekce se ti zobrazí v Google/Apple kalendáři.</p>
          </div>
        </div>
        {!open && (
          <button type="button" onClick={reveal} className="btn-outline text-sm">Získat odkaz</button>
        )}
      </div>

      {open && (
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-gray-400">Připravuji odkaz…</p>
          ) : url ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <input readOnly value={url} className="flex-1 min-w-[220px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600" />
                <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-blue px-3 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-light">
                  {copied ? <><Check className="h-4 w-4" /> Zkopírováno</> : <><Copy className="h-4 w-4" /> Kopírovat</>}
                </button>
              </div>
              <div className="mt-3 text-xs text-gray-500 leading-relaxed">
                <p className="font-semibold text-brand-dark mb-1">Jak přidat do Google kalendáře:</p>
                <p>Google kalendář → vlevo „Jiné kalendáře" → <strong>+</strong> → <strong>Přidat pomocí URL</strong> → vlož odkaz. Lekce se pak samy aktualizují (Google je obnovuje s odstupem několika hodin).</p>
                <p className="mt-1 text-gray-400">Odkaz je jen tvůj a obsahuje jen tvoje lekce – nesdílej ho.</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">Odkaz se nepodařilo načíst. Zkus to prosím znovu.</p>
          )}
        </div>
      )}
    </div>
  );
}
