"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Tab = "prihlaseni" | "registrace";

export default function UcetPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  const [tab, setTab] = useState<Tab>("prihlaseni");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes("Invalid login")
          ? "Nesprávný e-mail nebo heslo."
          : error.message.includes("Email not confirmed")
            ? "E-mail ještě není potvrzený. Zkontroluj schránku."
            : "Přihlášení se nezdařilo: " + error.message
      );
      return;
    }
    router.refresh();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/ucet` : undefined,
      },
    });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes("already registered")
          ? "Tento e-mail už je zaregistrovaný. Přihlas se."
          : "Registrace se nezdařila: " + error.message
      );
      return;
    }
    // Pokud je zapnuté potvrzení e-mailu, session zatím není.
    if (!data.session) {
      setInfo("Hotovo! Poslal jsem ti potvrzovací e-mail – klikni na odkaz a pak se přihlas.");
      setTab("prihlaseni");
    } else {
      router.refresh();
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  }

  // ── Přihlášený pohled ──
  if (!checking && user) {
    const displayName =
      (user.user_metadata?.full_name as string | undefined) || user.email;
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue text-2xl font-semibold text-white">
              {(displayName?.[0] ?? "U").toUpperCase()}
            </div>
            <h1 className="text-2xl font-semibold text-brand-dark">
              Vítej zpátky{displayName ? `, ${displayName}` : ""}!
            </h1>
            <p className="text-sm text-gray-500 mt-1 mb-6">{user.email}</p>

            <div className="grid grid-cols-1 gap-3 text-left">
              <Link href="/rezervace" className="btn-outline w-full text-sm">
                Rezervovat lekci
              </Link>
              <Link href="/videoknihovna" className="btn-outline w-full text-sm">
                Knihovna pohybu
              </Link>
              <Link href="/kurzy" className="btn-outline w-full text-sm">
                Moje kurzy
              </Link>
            </div>

            <button
              onClick={handleLogout}
              className="mt-6 text-sm font-semibold text-gray-500 hover:text-brand-dark"
            >
              Odhlásit se
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Nepřihlášený pohled (login / registrace) ──
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-brand-dark">Tvůj účet</h1>
          <p className="text-sm text-gray-500 mt-1">
            Přihlas se nebo si vytvoř účet
          </p>
        </div>

        <div className="card p-8">
          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-7">
            {(["prihlaseni", "registrace"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); setInfo(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                  tab === t ? "bg-white shadow text-brand-dark" : "text-gray-500 hover:text-brand-dark"
                }`}
              >
                {t === "prihlaseni" ? "Přihlásit se" : "Registrace"}
              </button>
            ))}
          </div>

          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {info && (
            <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {info}
            </p>
          )}

          {tab === "prihlaseni" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <Field id="login-email" label="E-mail" type="email" value={email} onChange={setEmail} placeholder="vas@email.cz" />
              <Field id="login-password" label="Heslo" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                {loading ? "Přihlašuji…" : "Přihlásit se"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <Field id="reg-name" label="Jméno" type="text" value={name} onChange={setName} placeholder="Jan Novák" />
              <Field id="reg-email" label="E-mail" type="email" value={email} onChange={setEmail} placeholder="vas@email.cz" />
              <Field id="reg-password" label="Heslo" type="password" value={password} onChange={setPassword} placeholder="alespoň 6 znaků" minLength={6} />
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                {loading ? "Vytvářím účet…" : "Vytvořit účet"}
              </button>
              <p className="text-xs text-center text-gray-400">
                Registrací souhlasíš s{" "}
                <Link href="/obchodni-podminky" className="text-brand-blue hover:underline">obchodními podmínkami</Link>{" "}
                a{" "}
                <Link href="/gdpr" className="text-brand-blue hover:underline">ochranou dat</Link>.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  id, label, type, value, onChange, placeholder, minLength,
}: {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string; minLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-brand-dark mb-1.5" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
      />
    </div>
  );
}
