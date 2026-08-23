import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowLeft, ClipboardList } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Pohybový audit",
  description:
    "Komplexní pohybová diagnostika: dech, postura, pohybové vzory. Osobní plán na měsíc a kontrola výsledků. Řešíme příčinu, ne symptom.",
};

const OBSAH = [
  "Vstupní dotazník (vyplníš předem – ušetří čas)",
  "Setkání ~90 min: dech, postura, pohybové vzory, symetrie",
  "Celotělový pohled – hledáme příčinu, ne jen místo bolesti",
  "Osobní plán na měsíc (jasné cviky, frekvence, priority)",
  "Follow-up: kontrola výsledků a úprava plánu",
];

export default function PohybovyAuditPage() {
  return (
    <>
      <section className="bg-brand-light py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link href="/produkty" className="inline-flex items-center gap-2 text-sm text-brand-blue font-semibold mb-6 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Zpět na produkty
          </Link>
          <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-2">Produkt</p>
          <h1 className="text-4xl lg:text-5xl font-semibold text-brand-dark mb-4">Pohybový audit</h1>
          <p className="text-lg text-gray-600">
            Svoboda pohybu vychází z bezbolestného pohybu. Podívám se na tvé tělo jako celek a najdu
            <strong className="text-brand-dark"> příčinu</strong> – ne jen místo, které bolí.
          </p>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading label="Co obsahuje" title="Jak audit probíhá" />
          <ul className="mt-8 space-y-3">
            {OBSAH.map((o) => (
              <li key={o} className="flex items-start gap-3 text-gray-700">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" strokeWidth={2.5} />
                <span>{o}</span>
              </li>
            ))}
          </ul>

          {/* Ceník */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-brand-dark">Pohybový audit</h3>
              <p className="text-sm text-gray-500 mb-3">Diagnostika + plán na měsíc + follow-up</p>
              <p className="text-3xl font-semibold text-brand-dark">2 900 Kč</p>
            </div>
            <div className="card p-6 ring-2 ring-brand-blue/30">
              <h3 className="text-lg font-semibold text-brand-dark">Audit + 3 měsíce vedení</h3>
              <p className="text-sm text-gray-500 mb-3">Audit a průběžné vedení a úpravy plánu</p>
              <p className="text-3xl font-semibold text-brand-dark">7 900 Kč</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Lze i online (video hovor + rozbor zaslaného videa). Jde o pohybový screening a poradenství,
            ne lékařskou diagnózu.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link href="/kontakt?zajem=Pohybový%20audit" className="btn-primary text-center">
              Mám zájem o audit
            </Link>
            <Link
              href="/produkty/pohybovy-audit/dotaznik"
              className="btn-outline inline-flex items-center justify-center gap-2"
            >
              <ClipboardList className="h-4 w-4" /> Vstupní dotazník
            </Link>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Dotazník je zatím nástroj pro lektora (dá se vytisknout). Později ho vyplní členové online.
          </p>
        </div>
      </section>
    </>
  );
}
