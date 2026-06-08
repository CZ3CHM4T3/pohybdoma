"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

export default function VstupPage() {
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    // Pokud se sem člověk dostal s ?pristup=... , byl kód špatný
    if (typeof window !== "undefined" && window.location.search.includes("pristup=")) {
      setWrong(true);
    }
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    window.location.href = `/?pristup=${encodeURIComponent(c)}`;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-blue">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-semibold text-brand-dark">POHYB DOMA</h1>
        <p className="mt-1 mb-5 text-sm text-gray-500">
          Web je zatím v přípravě a přístupný jen na pozvání. Zadej přístupový kód.
        </p>
        {wrong && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Nesprávný kód. Zkus to prosím znovu.
          </p>
        )}
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Přístupový kód"
          autoFocus
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
        <button type="submit" className="btn-primary mt-3 w-full justify-center">Vstoupit</button>
      </form>
    </div>
  );
}
