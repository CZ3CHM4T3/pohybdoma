import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "O mně",
  description: "Příběh lektora pohybu. Proč jsem začal učit lidi cvičit doma.",
};

const VALUES = [
  { icon: "🎯", title: "Přesnost", desc: "Každé cvičení cílím přesně na váš problém." },
  { icon: "🏠", title: "Dostupnost", desc: "Věřím, že pohyb patří domů. Bez nutnosti drahého vybavení nebo fitka." },
  { icon: "📈", title: "Růst", desc: "Pohybová cesta je celoživotní. Učím lidi růst krok za krokem." },
  { icon: "❤️", title: "Autenticita", desc: "Sdílím jen to, co sám prověřím na svém těle nebo s klienty." },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-light py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-3">O mně</p>
              <h1 className="text-4xl lg:text-5xl font-semibold text-brand-dark leading-tight mb-6">
                Jmenuji se [Jméno]<br />a učím lidi pohybu.
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed mb-4">
                Celý život se věnuji pohybu, rehabilitaci a tomu, jak funguje tělo. Prošel jsem si vlastními zraněními a věřím, že každý člověk má možnost napravit si tělo a žít bez bolesti.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                Pohyb doma vznikl z přesvědčení, že kvalitní pohybová výuka by měla být dostupná každému – bez dojíždění, drahého členství ve fitku nebo složitého vybavení.
              </p>
              <Link href="/osobni-lekce" className="btn-primary">
                Rezervovat osobní lekci
              </Link>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="w-80 h-96 lg:w-96 lg:h-[28rem] rounded-2xl bg-gradient-to-br from-brand-dark/10 to-brand-blue/10 border-2 border-dashed border-brand-blue/30 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <div className="text-5xl mb-3">👤</div>
                  <p className="text-sm font-medium">Vaše fotka</p>
                  <p className="text-xs opacity-60">placeholder</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading label="Příběh" title="Jak to začalo" />
          <div className="mt-8 space-y-5 text-gray-600 leading-relaxed">
            <p>
              Lorem ipsum – sem patří váš skutečný příběh. Kdy a proč jste začali cvičit? Jaká zranění nebo výzvy jste prožili? Co vás přivedlo k tomu učit ostatní?
            </p>
            <p>
              Pohybová cesta není přímá čára. Byly chvíle, kdy jsem nevěděl, jak dál. Ale každý krok zpět mě naučil něco nového o tom, jak tělo funguje a co skutečně pomáhá.
            </p>
            <p>
              Dnes pracuji s klienty individuálně i skrze videa a kurzy. Cílem není dokonalost – cílem je pohyb, který vám slouží a dělá vám radost.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-brand-light py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading label="Hodnoty" title="Co mě řídí" centered />
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="card p-6 text-center">
                <div className="text-3xl mb-3">{v.icon}</div>
                <h3 className="font-semibold text-brand-dark mb-2">{v.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credentials placeholder */}
      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <SectionHeading label="Vzdělání & kurzy" title="Formální zázemí" centered />
          <ul className="mt-8 space-y-3 text-left inline-block">
            {[
              "Certifikát fyzioterapie / pohybového koučinku – [instituce, rok]",
              "Specializace: DNS, rehabilitace pohybového aparátu",
              "Kurz výživy a regenerace – [instituce, rok]",
              "[Další certifikace] – placeholder",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-gray-600">
                <span className="mt-1 shrink-0 w-4 h-4 rounded-full bg-brand-blue/20 flex items-center justify-center">
                  <span className="block w-2 h-2 rounded-full bg-brand-blue" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
