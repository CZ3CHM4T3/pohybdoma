"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Tlačítko u karty členství. Spustí Stripe checkout (předplatné).
// Dokud nejsou nastavené Stripe klíče, padá zpět na kontakt.
export function SubscribeButton({ tier, name, className }: { tier: string; name: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isFree = tier === "FREE";

  async function go() {
    if (isFree) { router.push("/ucet"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (res.status === 401) { router.push("/ucet"); return; } // nepřihlášený → přihlásit
      const data = await res.json().catch(() => ({}));
      if (data?.url) { window.location.href = data.url; return; } // → Stripe
      router.push(`/kontakt?zajem=${encodeURIComponent(name)}`); // fallback (Stripe ještě nenastavený)
    } catch {
      router.push(`/kontakt?zajem=${encodeURIComponent(name)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={go} disabled={busy} className={className}>
      {busy ? "Přesměrovávám…" : isFree ? "Začít zdarma" : `Chci ${name}`}
    </button>
  );
}
