"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("pd-cookie-consent")) setShow(true);
    } catch {}
  }, []);

  if (!show) return null;

  function accept() {
    try {
      localStorage.setItem("pd-cookie-consent", "1");
    } catch {}
    setShow(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl bg-brand-dark p-4 text-white shadow-2xl sm:flex sm:items-center sm:gap-4">
      <p className="flex-1 text-sm text-white/80">
        Používáme nezbytné cookies pro fungování webu (např. přihlášení). Podrobnosti najdeš v{" "}
        <Link href="/gdpr" className="underline hover:text-white">zásadách ochrany osobních údajů</Link>.
      </p>
      <button
        onClick={accept}
        className="mt-3 w-full rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:opacity-90 sm:mt-0 sm:w-auto whitespace-nowrap"
      >
        Rozumím
      </button>
    </div>
  );
}
