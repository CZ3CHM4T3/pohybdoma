import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kontakt" };

export default function KontaktPage() {
  return (
    <div className="min-h-screen bg-brand-light py-12 lg:py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-brand-dark mb-4">Kontakt</h1>
        <p className="text-gray-600 mb-8">Neváhejte se ozvat s jakýmkoliv dotazem.</p>

        <div className="card p-8 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">E-mail</p>
            <a href="mailto:pohybdoma@seznam.cz" className="text-brand-blue font-semibold hover:underline">
              pohybdoma@seznam.cz
            </a>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Instagram</p>
            <a href="#" className="text-brand-blue font-semibold hover:underline">@pohybdoma</a>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">YouTube</p>
            <a href="#" className="text-brand-blue font-semibold hover:underline">POHYB DOMA</a>
          </div>
          <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">
            Kontaktní formulář bude brzy dostupný.
          </p>
        </div>
      </div>
    </div>
  );
}
