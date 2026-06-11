import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Gift, Info } from "lucide-react";
import { MOCK_MEMBERSHIP_PLANS, MEMBERSHIP_MATRIX, type MatrixCell } from "@/lib/mock-data";
import { TIER_STYLES } from "@/lib/tiers";
import type { AccessLevel } from "@/types";
import { SectionHeading } from "@/components/ui/SectionHeading";

const MATRIX_COLS: { key: "free" | "member" | "vip" | "vipPlus"; tier: AccessLevel }[] = [
  { key: "free", tier: "FREE" },
  { key: "member", tier: "MEMBER" },
  { key: "vip", tier: "VIP" },
  { key: "vipPlus", tier: "VIP_PLUS" },
];

function MatrixValue({ v }: { v: MatrixCell }) {
  if (v === true) return <Check className="mx-auto h-5 w-5 text-emerald-500" strokeWidth={3} />;
  if (v === false) return <X className="mx-auto h-5 w-5 text-gray-300" strokeWidth={2.5} />;
  return <span className="text-xs font-bold text-brand-blue">{v}</span>;
}

export const metadata: Metadata = {
  title: "Členství",
  description: "Úrovně členství FREE, MEMBER, VIP a VIP+. Video-knihovna, kurzy, Můj deník, Mixér, živé streamy, kalorická kalkulačka a VIP+ Klub.",
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
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {/* FREE karta */}
            <div className={`card-3d relative rounded-2xl overflow-hidden ${TIER_STYLES.FREE.card}`}>
              <div className="p-7">
                <h2 className={`text-xl font-semibold tracking-wide ${TIER_STYLES.FREE.accentText}`}>FREE</h2>
                <p className="text-sm text-gray-500 mb-3">Na vyzkoušení</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-semibold text-brand-dark">0</span>
                  <span className="text-sm text-gray-400">Kč / měsíc</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {["Ukázková videa zdarma", "Základní přístup k webu", "Bez registrace, bez závazků"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${TIER_STYLES.FREE.accentText}`} strokeWidth={2.5} />
                      <span className="text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/videoknihovna"
                  className={`block w-full text-center rounded-lg px-6 py-3 font-semibold transition-opacity hover:opacity-90 ${TIER_STYLES.FREE.solid}`}
                >
                  Procházet zdarma
                </Link>
                <p className="mt-3 text-xs text-center text-gray-400">Žádná platba potřeba.</p>
              </div>
            </div>

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

          {/* Srovnávací tabulka */}
          <div className="mt-16">
            <SectionHeading label="Srovnání" title="Co je v které úrovni" centered />
            <div className="mt-8 overflow-x-auto md:overflow-visible">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="p-3 text-left font-semibold text-brand-dark">Co je součástí</th>
                    {MATRIX_COLS.map((c) => (
                      <th key={c.key} className={`p-3 text-center ${c.tier === "VIP_PLUS" ? "bg-amber-50" : ""}`}>
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${TIER_STYLES[c.tier].badge}`}>
                          {TIER_STYLES[c.tier].label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MEMBERSHIP_MATRIX.map((row, i) => (
                    <tr key={row.label} className={i % 2 === 1 ? "bg-brand-light/40" : ""}>
                      <td className="p-3 text-gray-700">
                        <span className="group relative inline-flex items-center gap-1.5 cursor-help">
                          <span className="border-b border-dotted border-gray-300">{row.label}</span>
                          <Info className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                          <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-64 rounded-lg bg-brand-dark px-3 py-2 text-xs leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                            {row.desc}
                          </span>
                        </span>
                      </td>
                      {MATRIX_COLS.map((c) => (
                        <td key={c.key} className={`p-3 text-center ${c.tier === "VIP_PLUS" ? "bg-amber-50" : ""}`}>
                          <MatrixValue v={row[c.key]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-center text-xs text-gray-400">
              Členství zrušíš kdykoliv. Přístup trvá do konce zaplaceného období.
            </p>
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
                    Zaplať a obdarovaný dostane kód, který si uplatní ve svém účtu. Vyber
                    libovolnou úroveň i délku – za běžnou cenu, bez háčků.
                  </p>
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
                { q: "Potřebuju doma nějaké vybavení?", a: "Většinou stačí vlastní váha a kousek místa. U videí navíc vidíš, co se hodí (třeba židle, guma nebo válec) – filtr Co dům dá ti poradí, co zvládneš jen s tím, co máš doma." },
                { q: "Zvládnu to i jako úplný začátečník?", a: "Ano. Videa mají úrovně obtížnosti, takže začneš v klidu a přidáváš postupně, vlastním tempem. Když tě něco bolí, nepřemáhej se a poraď se s odborníkem (viz Zdravotní upozornění)." },
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
