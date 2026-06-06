import type { Metadata } from "next";
import { Mail, Camera, Video } from "lucide-react";

export const metadata: Metadata = { title: "Kontakt" };

export default function KontaktPage() {
  return (
    <div className="min-h-screen bg-brand-light py-12 lg:py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-brand-dark mb-4">Kontakt</h1>
        <p className="text-gray-600 mb-8">Neváhejte se ozvat s jakýmkoliv dotazem.</p>

        <div className="card p-8 space-y-5">
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
              <Camera className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Instagram</p>
              <a href="#" className="text-brand-blue font-semibold hover:underline">@pohybdoma</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand-blue">
              <Video className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">YouTube</p>
              <a href="#" className="text-brand-blue font-semibold hover:underline">POHYB DOMA</a>
            </div>
          </div>
          <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">
            Kontaktní formulář bude brzy dostupný.
          </p>
        </div>
      </div>
    </div>
  );
}
