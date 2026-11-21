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
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-xl bg-brand-dark px-4 py-3 text-white shadow-2xl flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <p className="flex-1 text-xs sm:text-sm leading-snug text-white/80">
        Používáme jen nezbytné cookies pro fungování webu. Víc v{" "}
        <Link href="/gdpr" className="underline hover:text-white">zásadách ochrany údajů</Link>.
      </p>
      <button
        onClick={accept}
        className="shrink-0 w-full sm:w-auto rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:opacity-90 whitespace-nowrap"
      >
        Rozumím
      </button>
    </div>
  );
}
