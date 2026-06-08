"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Search, Sparkles } from "lucide-react";

/** Ukázkové kruhy – propojení zatím přijde, teď je to rozcestník. */
const CIRCLES = [
  { slug: "40plus", name: "40+", desc: "Pohyb a zdraví po čtyřicítce.", members: 0 },
  { slug: "maminky", name: "Maminky", desc: "Cvičení kolem mateřství a po porodu.", members: 0 },
  { slug: "teniste", name: "Tenisté", desc: "Prevence a výkon pro tenis.", members: 0 },
  { slug: "seniori", name: "Senioři", desc: "Mobilita a síla ve vyšším věku.", members: 0 },
  { slug: "zacatecnici", name: "Začátečníci", desc: "První kroky k pravidelnému pohybu.", members: 0 },
  { slug: "bolava-zada", name: "Bolavá záda", desc: "Společně proti bolesti zad.", members: 0 },
  { slug: "kancelar", name: "Kancelář", desc: "Pro sedavé zaměstnání.", members: 0 },
  { slug: "kalistenika", name: "Kalistenika", desc: "Cvičení s vlastní vahou.", members: 0 },
];

export default function KruhyPage() {
  const [q, setQ] = useState("");
  const list = CIRCLES.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-brand-light py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-2 flex items-center gap-2">
          <Users className="h-6 w-6 text-brand-blue" strokeWidth={2} />
          <h1 className="text-3xl lg:text-4xl font-semibold text-brand-dark">Kruhy</h1>
        </div>
        <p className="text-gray-500 mb-6 max-w-2xl">
          Propoj se s lidmi, kteří řeší to samé co ty. Najdi svůj kruh, přidej se a
          potkávej <strong>buddies</strong> se stejným zaměřením. Jména členů uvidíš,
          až se do kruhu přidáš.
        </p>

        {/* Vyhledávání */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Hledat kruh…"
            className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>

        {/* Kruhy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => (
            <div key={c.slug} className="card card-3d p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand-blue">
                  <Users className="h-5 w-5" strokeWidth={2} />
                </span>
                <div>
                  <h2 className="font-semibold text-brand-dark leading-tight">{c.name}</h2>
                  <p className="text-xs text-gray-400">{c.members} členů</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">{c.desc}</p>
              <button
                type="button"
                disabled
                className="mt-4 btn-outline text-sm opacity-60 cursor-not-allowed"
                title="Brzy"
              >
                Připojit se (brzy)
              </button>
            </div>
          ))}
        </div>

        {/* Poznámka */}
        <div className="mt-8 card p-5 flex items-start gap-3 bg-brand-light/60">
          <Sparkles className="h-5 w-5 shrink-0 text-brand-blue" strokeWidth={2} />
          <p className="text-sm text-gray-600">
            Kruhy se právě rozjíždějí. Brzy se budeš moct přidávat, vidět ostatní členy
            a přidávat si je mezi <strong>buddies</strong>. Chceš nějaký kruh, který tu chybí?{" "}
            <Link href="/kontakt" className="text-brand-blue hover:underline">Napiš mi →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
