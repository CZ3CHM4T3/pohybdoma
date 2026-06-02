"use client";

import { useState } from "react";
import Link from "next/link";

type Tab = "prihlaseni" | "registrace";

export default function UcetPage() {
  const [tab, setTab] = useState<Tab>("prihlaseni");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-brand-dark">Váš účet</h1>
          <p className="text-sm text-gray-500 mt-1">
            Přihlašování bude napojeno na Supabase
          </p>
        </div>

        <div className="card p-8">
          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-7">
            <button
              type="button"
              onClick={() => setTab("prihlaseni")}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                tab === "prihlaseni" ? "bg-white shadow text-brand-dark" : "text-gray-500 hover:text-brand-dark"
              }`}
            >
              Přihlásit se
            </button>
            <button
              type="button"
              onClick={() => setTab("registrace")}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                tab === "registrace" ? "bg-white shadow text-brand-dark" : "text-gray-500 hover:text-brand-dark"
              }`}
            >
              Registrace
            </button>
          </div>

          {tab === "prihlaseni" ? (
            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-brand-dark mb-1.5" htmlFor="login-email">
                  E-mail
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas@email.cz"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand-dark mb-1.5" htmlFor="login-password">
                  Heslo
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Přihlásit se
              </button>
              <p className="text-center text-xs text-gray-400">
                Zapomněli jste heslo?{" "}
                <button type="button" className="text-brand-blue hover:underline font-medium">
                  Obnovit
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-brand-dark mb-1.5" htmlFor="reg-name">
                  Jméno
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jan Novák"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand-dark mb-1.5" htmlFor="reg-email">
                  E-mail
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas@email.cz"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand-dark mb-1.5" htmlFor="reg-password">
                  Heslo
                </label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="alespoň 8 znaků"
                  minLength={8}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Vytvořit účet
              </button>
              <p className="text-xs text-center text-gray-400">
                Registrací souhlasíte s{" "}
                <Link href="/obchodni-podminky" className="text-brand-blue hover:underline">
                  obchodními podmínkami
                </Link>{" "}
                a{" "}
                <Link href="/gdpr" className="text-brand-blue hover:underline">
                  ochranou dat
                </Link>
                .
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Ještě nemáte účet a chcete vyzkoušet?{" "}
          <Link href="/videoknihovna" className="text-brand-blue font-semibold hover:underline">
            Free videa →
          </Link>
        </p>
      </div>
    </div>
  );
}
