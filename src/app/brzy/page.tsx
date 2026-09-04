import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Připravuje se",
  robots: { index: false, follow: true },
};

export default async function BrzyPage({
  searchParams,
}: {
  searchParams: Promise<{ sekce?: string }>;
}) {
  const { sekce } = await searchParams;
  const name = (sekce && sekce.trim()) || "Tato část";

  return (
    <section className="bg-brand-light py-20 lg:py-28">
      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
        <div className="card p-8 lg:p-10 text-center">
          <div className="mb-4 text-5xl">🚧</div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue mb-2">
            Připravuje se
          </p>
          <h1 className="text-2xl lg:text-3xl font-semibold text-brand-dark mb-3">
            {name} se právě chystá
          </h1>
          <p className="text-gray-600 leading-relaxed mb-8">
            Na téhle části ještě pracuji, aby stála za to. Zatím si můžeš rezervovat
            osobní lekci, přečíst recenze nebo mrknout, kdo jsem.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/rezervace" className="btn-primary text-sm">
              Rezervovat lekci
            </Link>
            <Link href="/" className="btn-outline text-sm">
              Zpět na úvod
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
