import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, ArrowRight } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Produkty",
  description:
    "Prémiové produkty a nástroje POHYB DOMA. Pohybový audit – komplexní diagnostika, osobní plán a kontrola výsledků.",
};

export const dynamic = "force-dynamic";

type Product = {
  slug: string | null;
  name: string;
  tagline: string;
  description: string;
  price: string;
  accent: string;
};

const ACCENTS: Record<string, { bg: string; icon: string }> = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600" },
  violet: { bg: "bg-violet-50", icon: "text-violet-600" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600" },
  rose: { bg: "bg-rose-50", icon: "text-rose-600" },
};

async function getProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("slug,name,tagline,description,price,accent")
    .eq("published", true)
    .order("position", { ascending: true });
  return (data as Product[]) ?? [];
}

export default async function ProduktyPage() {
  const u = await getSessionUser();
  if (!u?.isAdmin) redirect("/");
  const products = await getProducts();

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
          {products.length === 0 ? (
            <p className="text-center text-gray-400">Zatím tu není žádný zveřejněný produkt. Přidej ho ve Správě → Produkty.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {products.map((p) => {
                const tone = ACCENTS[p.accent] ?? ACCENTS.blue;
                const ready = p.price.trim().length > 0;
                const inner = (
                  <div className={`card-3d relative flex h-full flex-col rounded-2xl bg-white p-7 ${ready ? "" : "opacity-70"}`}>
                    <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${tone.bg} ${tone.icon}`}>
                      <Package className="h-6 w-6" strokeWidth={2} />
                    </span>
                    <h2 className="text-xl font-semibold text-brand-dark">{p.name}</h2>
                    {p.tagline && <p className="text-sm font-medium text-brand-blue mb-2">{p.tagline}</p>}
                    <p className="text-sm text-gray-600 leading-relaxed flex-1">{p.description}</p>
                    <div className="mt-5 flex items-center justify-between">
                      {ready ? (
                        <span className="text-lg font-semibold text-brand-dark">{p.price}</span>
                      ) : (
                        <span className="text-sm text-gray-500">Brzy</span>
                      )}
                      {p.slug && (
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
          )}
        </div>
      </section>
    </>
  );
}
