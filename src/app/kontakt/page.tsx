import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Kontakt a rezervace",
  description:
    "Kontakt na lektora pohybu Jana Schröffela – Dobřichovice a okolí, online po celé ČR. E-mail, telefon a rezervace osobní lekce.",
  alternates: { canonical: "/kontakt" },
};

export default function KontaktPage() {
  return (
    <div className="min-h-screen bg-brand-light py-12 lg:py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-brand-dark mb-4">Kontakt</h1>
        <p className="text-gray-600 mb-8">Neváhej se ozvat s jakýmkoliv dotazem — rád pomůžu.</p>

        <div className="card p-6 mb-6 space-y-4">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand-blue">
              <Mail className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">E-mail</p>
              <a href="mailto:pohybdoma@seznam.cz" className="text-brand-blue font-semibold hover:underline">
                pohybdoma@seznam.cz
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand-blue">
              <Phone className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Telefon</p>
              <a href="tel:+420721327545" className="text-brand-blue font-semibold hover:underline">
                +420 721 327 545
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand-blue">
              <MapPin className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Kde působím</p>
              <p className="text-brand-dark font-semibold">Dobřichovice a okolí · online po celé ČR</p>
            </div>
          </div>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
