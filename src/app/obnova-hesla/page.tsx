"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ObnovaHeslaPage() {
  const supabase = createClient();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Chyba z callbacku (neplatný/vypršelý odkaz)
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("error")) {
        setError("Odkaz je neplatný nebo vypršel. Požádej o nový na stránce přihlášení.");
      }
    }
    // Po callbacku je uživatel přihlášený (recovery session)
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Heslo musí mít alespoň 6 znaků.");
      return;
    }
    if (password !== password2) {
      setError("Hesla se neshodují.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Změna hesla se nezdařila: " + error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/ucet"), 1600);
  }

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-brand-dark">Nové heslo</h1>
          <p className="text-sm text-gray-500 mt-1">Zvol si nové heslo k účtu.</p>
        </div>

        <div className="card p-8">
          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {done ? (
            <div className="text-center">
              <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                Heslo změněno! Přesměrovávám tě na účet…
              </p>
              <Link href="/ucet" className="btn-primary w-full">
                Pokračovat
              </Link>
            </div>
          ) : !ready ? (
            <p className="text-center text-sm text-gray-400">Načítám…</p>
          ) : hasSession ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-brand-dark mb-1.5" htmlFor="np1">
                  Nové heslo
                </label>
                <input
                  id="np1"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="alespoň 6 znaků"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand-dark mb-1.5" htmlFor="np2">
                  Heslo znovu
                </label>
                <input
                  id="np2"
                  type="password"
                  required
                  minLength={6}
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                {loading ? "Ukládám…" : "Nastavit nové heslo"}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-5">
                Odkaz na obnovu hesla je neplatný nebo už vypršel. Požádej o nový.
              </p>
              <Link href="/ucet" className="btn-primary w-full">
                Zpět na přihlášení
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
