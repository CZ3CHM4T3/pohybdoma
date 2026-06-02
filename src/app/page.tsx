import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MOCK_VIDEOS } from "@/lib/mock-data";
import { VideoCard } from "@/components/VideoCard";
import { NewsletterForm } from "@/components/NewsletterForm";

export const metadata: Metadata = {
  title: "Domů",
  description: "Cvič doma, naprav si tělo a rostu na pohybové cestě s minimem vybavení.",
};

const FREE_VIDEOS = MOCK_VIDEOS.filter((v) => v.accessLevel === "FREE").slice(0, 4);

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#062A6B] via-[#0a3a8a] to-[#1256c0] text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_#1976FF_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28 flex flex-col lg:flex-row items-center gap-12">
          {/* Text */}
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-6 inline-flex">
              <Image
                src="/LOGO.png"
                alt="POHYB DOMA"
                width={200}
                height={68}
                className="h-16 w-auto object-contain brightness-0 invert"
                priority
              />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight tracking-wide">
              Cvič doma.<br />
              Naprav si tělo.<br />
              <span className="text-[#5aadff]">Rostu na pohybové cestě.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/75 font-normal max-w-xl mx-auto lg:mx-0">
              Tvoje možnosti. Tvoje cesta.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/videoknihovna" className="btn-primary text-base py-3 px-8">
                Procházet videa zdarma
              </Link>
              <Link href="/clenstvi" className="btn-outline border-white/50 text-white hover:bg-white hover:text-brand-dark text-base py-3 px-8">
                Prozkoumat členství
              </Link>
            </div>
          </div>

          {/* Illustration placeholder */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative w-72 h-72 lg:w-96 lg:h-96 rounded-2xl overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center">
              <div className="text-center text-white/40">
                <div className="text-6xl mb-3">🏃</div>
                <p className="text-sm font-medium">Foto / ilustrace</p>
                <p className="text-xs opacity-60">placeholder</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Three pillars ── */}
      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Co nabízím"
            title="Tři cesty k lepšímu pohybu"
            centered
          />
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "👤",
                title: "Osobní lekce",
                desc: "1:1 lekce v pohodlí domova nebo online. Přesně na míru vašemu tělu a cílům. Rezervujte si termín.",
                href: "/osobni-lekce",
                cta: "Rezervovat lekci",
              },
              {
                icon: "🎬",
                title: "Videoknihovna",
                desc: "Stovky videí třídění dle části těla, obtížnosti a problému. Cvičte kdy a kde chcete.",
                href: "/videoknihovna",
                cta: "Procházet videa",
              },
              {
                icon: "⭐",
                title: "Členství",
                desc: "Odemkněte VIP obsah, živé streamy a přímou komunikaci se mnou. Tři úrovně, zrušení kdykoliv.",
                href: "/clenstvi",
                cta: "Zobrazit plány",
              },
            ].map((item) => (
              <div key={item.title} className="card p-8 flex flex-col">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold text-brand-dark mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed flex-1">{item.desc}</p>
                <Link href={item.href} className="btn-outline mt-6 text-sm py-2.5">
                  {item.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Free videos preview ── */}
      <section className="bg-brand-light py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <SectionHeading
              label="Videa zdarma"
              title="Vyzkoušej bez registrace"
              subtitle="Vybrané lekce jsou zcela volně dostupné."
            />
            <Link href="/videoknihovna" className="btn-outline shrink-0 text-sm">
              Všechna videa →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FREE_VIDEOS.map((video) => (
              <VideoCard key={video.id} video={video} userTier="FREE" />
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter / CTA ── */}
      <section className="bg-brand-dark text-white py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-3">
            Zůstaň v pohybu
          </p>
          <h2 className="text-3xl lg:text-4xl font-semibold leading-tight mb-6">
            Nechceš nic prošvihnout?
          </h2>
          <p className="text-white/70 text-lg mb-10 leading-relaxed">
            Přihlás se k odběru. Budeš první vědět o nových videích, kurzech a akcích.
          </p>
          <NewsletterForm />
          <p className="mt-4 text-xs text-white/40">Žádný spam. Odhlášení jedním klikem.</p>
        </div>
      </section>

      {/* ── Courses teaser ── */}
      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <SectionHeading
              label="Videokurzy"
              title="Strukturované programy"
              subtitle="Od bolavých zad přes kyčle až po dech – ucelené kurzy krok za krokem."
            />
            <Link href="/kurzy" className="btn-outline shrink-0 text-sm">
              Všechny kurzy →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {["OFFICE CVIČENÍ", "BOLAVÁ ZÁDA", "KYČLE", "RAMENO"].map((name) => (
              <div
                key={name}
                className="card p-6 flex flex-col items-center text-center gap-3 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center text-xl">
                  {name === "OFFICE CVIČENÍ" ? "💼" : name === "BOLAVÁ ZÁDA" ? "🦴" : name === "KYČLE" ? "🔄" : "💪"}
                </div>
                <p className="text-sm font-semibold text-brand-dark">{name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
