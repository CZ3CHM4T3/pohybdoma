"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

// Vstupní dotazník k Pohybovému auditu. Zatím nástroj pro lektora (vyplnit / vytisknout).
// Později se dá zpřístupnit přihlášeným (VIP+) k online vyplnění.

function Field({ label, wide }: { label: string; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="block text-sm font-medium text-brand-dark mb-1">{label}</span>
      <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
    </label>
  );
}
function Area({ label }: { label: string }) {
  return (
    <label className="block sm:col-span-2">
      <span className="block text-sm font-medium text-brand-dark mb-1">{label}</span>
      <textarea rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
    </label>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 break-inside-avoid">
      <h2 className="text-lg font-semibold text-brand-dark border-b border-gray-200 pb-1 mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}
function Flag({ text }: { text: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-gray-700 sm:col-span-2">
      <input type="checkbox" className="mt-1 h-4 w-4" />
      <span>{text}</span>
    </label>
  );
}

export default function DotaznikPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <Link href="/produkty/pohybovy-audit" className="inline-flex items-center gap-2 text-sm text-brand-blue font-semibold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Zpět
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <Printer className="h-4 w-4" /> Tisk / uložit PDF
        </button>
      </div>

      <h1 className="text-2xl font-semibold text-brand-dark mb-1">Pohybový audit – vstupní dotazník</h1>
      <p className="no-print text-sm text-gray-500 mb-8">
        Nástroj pro lektora. Vyplň nebo vytiskni a vyplň s klientem. Pole se dají vyplnit i na počítači před tiskem.
      </p>

      <Section title="A) Základ a cíl">
        <Field label="Jméno" />
        <Field label="Věk / výška / váha" />
        <Field label="Povolání" />
        <Field label="Datum" />
        <Area label="Hlavní důvod návštěvy (1 věta)" />
        <Area label="Co by byl velký úspěch za měsíc / půl roku?" />
        <Area label="Zkoušel/a to řešit dřív? S jakým výsledkem?" />
      </Section>

      <Section title="B) Práce a denní pohyb">
        <Field label="Charakter práce + kolik hodin" />
        <Field label="Hodin denně u PC/mobilu v předklonu" />
        <Area label="Ergonomie (monitor, židle, stojací stůl) a běžný den" />
      </Section>

      <Section title="C) Spánek a regenerace">
        <Field label="Kolik hodin / kvalita spánku" />
        <Field label="Poloha na spaní" />
        <Field label="Ranní ztuhlost – kde a jak dlouho" />
      </Section>

      <Section title="D) Dech a stres">
        <Field label="Přes den dýchá nosem / pusou" />
        <Field label="V noci (chrápání, suchá ústa ráno)" />
        <Field label="Stres 1–10 + zdroje" />
        <Field label="Dělá něco na dech/relaxaci?" />
      </Section>

      <Section title="E) Bolest – teď i historie">
        <Area label="Kde bolí + intenzita 0–10 (klid / zátěž)" />
        <Area label="Kdy a jak vzniklo, co zhoršuje / zlepšuje" />
        <Field label="Budí v noci? Mění se s polohou?" />
        <Field label="Léky (bolest, srážlivost, kortikoidy)" />
        <Area label="Historie zranění / operací / zlomenin (+ data)" />
        <Area label="Chronické nemoci (osteoporóza, diabetes, kardio, autoimunitní, revma)" />
      </Section>

      <Section title="F) Pohybová historie">
        <Field label="Co sportuje teď + jak často" />
        <Field label="Co dřív (i závodně), dominantní strana" />
        <Area label="Cítí se v pohybu jistý/á, nebo má z něčeho strach?" />
      </Section>

      <Section title="G) Zažívání a celkové zdraví">
        <Field label="Trávení (nadýmání, pálení žáhy)" />
        <Field label="Pitný režim, kofein, alkohol, kouření" />
        <Field label="Časté infekce / alergie" />
        <Field label="Změny hmotnosti bez příčiny?" />
      </Section>

      <Section title="H) Ženy (doplňkově)">
        <Area label="Cyklus (pravidelnost, bolestivost), těhotenství/porod, menopauza" />
      </Section>

      <section className="mb-8 break-inside-avoid rounded-xl border border-red-200 bg-red-50/50 p-4">
        <h2 className="text-lg font-semibold text-red-700 mb-1">I) Bezpečnostní screening</h2>
        <p className="text-xs text-gray-600 mb-3">
          Kterákoli odpověď ANO → nejdřív telefon, případně nejdřív lékař (audit odložit).
        </p>
        <div className="grid grid-cols-1 gap-2">
          <Flag text="Nevysvětlitelný úbytek váhy" />
          <Flag text="Noční bolest, co nezmizí změnou polohy" />
          <Flag text="Necitlivost/mravenčení do nohy/ruky, slabost, potíže s močením/stolicí" />
          <Flag text="Horečka + bolest kloubu/zad v posledních týdnech" />
          <Flag text="Onkologická anamnéza" />
          <Flag text="Úraz s podezřením na zlomeninu bez lékaře" />
          <Flag text="Bolest na hrudi / dušnost v klidu / vystřelování do paže/čelisti" />
        </div>
      </section>

      <p className="text-xs text-gray-500">
        Pohybový audit je pohybový screening a poradenství, ne lékařská diagnóza ani náhrada fyzioterapie
        při akutním/závažném stavu. Při rizikových příznacích doporučím nejdřív vyšetření u lékaře.
      </p>
    </div>
  );
}
