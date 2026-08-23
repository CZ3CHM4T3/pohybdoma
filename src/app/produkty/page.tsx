import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ClipboardCheck, Sparkles, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Produkty",
  description:
    "Prémiové produkty a nástroje POHYB DOMA. Pohybový audit – komplexní diagnostika, osobní plán a kontrola výsledků.",
};

type Product = {
  slug: string | null;
  name: string;
  tagline: string;
  desc: string;
  price?: string;
  Icon: typeof Activity;
  tone: { bg: string; icon: string };
  ready: boolean;
};

const PRODUCTS: Product[] = [
  {
    slug: "pohybovy-audit",
    name: "Pohybový audit",
    tagline: "Najdi příčinu, ne jen symptom",
    desc: "Komplexní pohybová diagnostika, osobní plán na měsíc a kontrola výsledků. Podíváme se na tělo jako celek – dech, postura, pohybové vzory.",
    price: "od 2 900 Kč",
    Icon: Activity,
    tone: { bg: "bg-blue-50", icon: "text-blue-600" },
    ready: true,
  },
  {
    slug: null,
    name: "Pohybový plán na míru",
    tagline: "Připravujeme",
    desc: "Dlouhodobé vedení a plán šitý na tvoje tělo a cíle.",
    Icon: ClipboardCheck,
    tone: { bg: "bg-violet-50", icon: "text-violet-600" },
    ready: false,
  },
  {
    slug: null,
    name: "Další produkty",
    tagline: "Připravujeme",
    desc: "Postupně přibydou další nástroje a balíčky.",
    Icon: Sparkles,
    tone: { bg: "bg-amber-50", icon: "text-amber-600" },
    ready: false,
  },
];

export default function ProduktyPage() {
  return (
    <>
      <section className="bg-brand-light py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-2">Produkty</p>
          <h1 className="text-4xl lg:text-5xl font-semibold text-brand-dark mb-4">Prémiové produkty a nástroje</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Cílené služby, které tě posunou nejrychleji. Začínáme Pohybovým auditem.
          </p>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {PRODUCTS.map((p) => {
              const inner = (
                <div className={`card-3d relative flex h-full flex-col rounded-2xl bg-white p-7 ${p.ready ? "" : "opacity-70"}`}>
                  <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${p.tone.bg} ${p.tone.icon}`}>
                    <p.Icon className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <h2 className="text-xl font-semibold text-brand-dark">{p.name}</h2>
                  <p className="text-sm font-medium text-brand-blue mb-2">{p.tagline}</p>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1">{p.desc}</p>
                  <div className="mt-5 flex items-center justify-between">
                    {p.price ? (
                      <span className="text-lg font-semibold text-brand-dark">{p.price}</span>
                    ) : (
                      <span className="text-sm text-gray-500">Brzy</span>
                    )}
                    {p.ready && (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue">
                        Detail <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </div>
              );
              return p.slug ? (
                <Link key={p.name} href={`/produkty/${p.slug}`} className="block">
                  {inner}
                </Link>
              ) : (
                <div key={p.name}>{inner}</div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
