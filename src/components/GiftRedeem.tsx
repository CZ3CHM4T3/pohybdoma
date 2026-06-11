"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function GiftRedeem() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function redeem() {
    if (!code.trim()) return;
    setBusy(true); setMsg(null); setOk(false);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("redeem_gift_code", { p_code: code.trim() });
    setBusy(false);
    if (error) { setMsg("Něco se nepovedlo (spustil jsi gift_codes.sql?): " + error.message); return; }
    const r = String(data ?? "");
    if (r.startsWith("ok:")) {
      setOk(true); setMsg("Hotovo! Členství je aktivované. 🎉"); setCode("");
      setTimeout(() => window.location.reload(), 1600);
    } else if (r === "used") setMsg("Tenhle kód už byl použitý.");
    else if (r === "invalid") setMsg("Kód nenalezen – zkontroluj ho prosím.");
    else if (r === "not_logged") setMsg("Nejdřív se přihlas.");
    else setMsg("Kód se nepodařilo uplatnit.");
  }

  return (
    <div className="card p-4 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
          <Gift className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-dark">Máš dárkový kód?</p>
          <p className="text-xs text-gray-400">Uplatni ho a aktivuj si členství.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") redeem(); }}
            placeholder="DAR-XXXX-XXXX"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-blue sm:w-44"
          />
          <button onClick={redeem} disabled={busy || !code.trim()} className="btn-primary text-sm disabled:opacity-50">
            {busy ? "…" : "Uplatnit"}
          </button>
        </div>
      </div>
      {msg && <p className={`mt-2 text-xs font-medium ${ok ? "text-emerald-600" : "text-gray-500"}`}>{msg}</p>}
    </div>
  );
}
