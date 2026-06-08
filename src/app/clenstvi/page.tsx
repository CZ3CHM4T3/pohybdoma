import type { Metadata } from "next";
import Link from "next/link";
import { Check, Gift } from "lucide-react";
import { MOCK_MEMBERSHIP_PLANS } from "@/lib/mock-data";
import { TIER_STYLES } from "@/lib/tiers";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Členství",
  description: "Tři úrovně členství – MEMBER, VIP, VIP+. Přístup k video-knihovně, živé streamy, slevy a chat přímo se mnou.",
};

export default function ClenstviPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-light py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-2">Členství</p>
          <h1 className="text-4xl lg:text-5xl font-semibold text-brand-dark mb-4">
            Vyber si, jak hluboko chceš jít
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Tři úrovně přístupu. Zrušení kdykoliv. Žádné závazky.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="bg-white py-12 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {MOCK_MEMBERSHIP_PLANS.map((plan) => {
              const t = TIER_STYLES[plan.tier];
              const isHighlighted = plan.highlighted;
              const badge = isHighlighted
                ? "Nejoblíbenější"
                : plan.tier === "VIP_PLUS"
                  ? "Nejvýhodnější investice"
                  : null;
              return (
                <div
                  key={plan.id}
                  className={`card-3d relative rounded-2xl overflow-hidden ${
                    isHighlighted ? "is-featured" : ""
                  } ${t.card}`}
                >
                  {badge && (
                    <div className={`text-xs font-bold tracking-wide uppercase text-center py-2 ${t.solid}`}>
                      {badge}
                    </div>
                  )}

                  <div className="p-7">
                    <h2 className={`text-xl font-semibold tracking-wide ${t.accentText}`}>
                      {plan.name}
                    </h2>
                    {plan.tagline && (
                      <p className="text-sm text-gray-500 mb-3">{plan.tagline}</p>
                    )}
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-4xl font-semibold text-brand-dark">{plan.priceKcMonth}</span>
                      <span className="text-sm text-gray-400">Kč / měsíc</span>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${t.accentText}`} strokeWidth={2.5} />
                          <span className="text-gray-600">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={`/kontakt?zajem=${plan.name}`}
                      className={`block w-full text-center rounded-lg px-6 py-3 font-semibold transition-opacity hover:opacity-90 ${t.solid}`}
                    >
                      Chci {plan.name}
                    </Link>
                    <p className="mt-3 text-xs text-center text-gray-400">
                      Spouštím brzy – ozvi se a budeš u toho první.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Darovat členství */}
          <div className="mt-16">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#062A6B] to-[#1256c0] p-8 lg:p-10 text-white">
              <div className="pointer-events-none absolute -bottom-16 -left-10 w-72 h-72 rounded-full bg-[#5aadff]/20 blur-3xl" />
              <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
                <div className="flex-1">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold mb-3">
                    <Gift className="h-3.5 w-3.5" strokeWidth={2.5} /> Dárek
                  </span>
                  <h2 className="text-2xl lg:text-3xl font-semibold mb-2">Daruj členství</h2>
                  <p className="text-white/75 leading-relaxed max-w-xl">
                    Zaplať a obdarovaný dostane kód, který si uplatní. Vyber libovolnou
                    úroveň i délku – za běžnou cenu, bez háčků.
                  </p>
                  <div className="mt-5 flex items-start gap-3 rounded-2xl bg-white/10 border border-white/15 p-4 max-w-xl">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5aadff]/20 text-[#5aadff]">
                      <Gift className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                    <p className="text-sm text-white/90 leading-relaxed">
                      A jako poděkování: <strong>ten, kdo členství daruje, získá měsíc
                      MEMBER zdarma.</strong>
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-center">
                  <a href="/kontakt" className="btn-primary bg-white text-brand-dark hover:opacity-90">
                    Darovat členství
                  </a>
                  <p className="mt-3 text-xs text-white/50">Platba bude brzy dostupná</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-16">
            <SectionHeading label="Časté dotazy" title="Jak členství funguje?" centered />
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
              {[
                { q: "Mohu zrušit kdykoliv?", a: "Ano. Zrušení je na 2 kliknutí, bez poplatků. Přístup trvá do konce zaplaceného období." },
                { q: "Jak fungují platby?", a: "Platby probíhají měsíčně přes platební bránu. Napojení bude brzy." },
                { q: "Co dostanu v MEMBER plánu?", a: "Přístup k video-knihovně s tematickými filtry – videa třídění dle části těla, obtížnosti a problému." },
                { q: "Jaký je rozdíl VIP a VIP+?", a: "VIP+ přidává chat kanál přímo se mnou a vyšší slevy (15 %) na workshopy, kurzy i online skupinové tréninky." },
              ].map((item) => (
                <div key={item.q} className="card p-5">
                  <h3 className="font-semibold text-brand-dark text-sm mb-2">{item.q}</h3>
                  <p className="text-sm text-gray-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-semibold text-brand-dark mb-3">Nejsi si jistý/á?</h2>
          <p className="text-gray-600 mb-6">Vyzkoušej videa zdarma – bez registrace. Uvidíš sám/sama, jak pracuju.</p>
          <Link href="/videoknihovna" className="btn-outline">
            Procházet videa zdarma
          </Link>
        </div>
      </section>
    </>
  );
}
