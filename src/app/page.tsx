import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { MovementClips } from "@/components/MovementClips";
import { MOCK_VIDEOS } from "@/lib/mock-data";
import { VideoCard } from "@/components/VideoCard";
import { NewsletterForm } from "@/components/NewsletterForm";

export const metadata: Metadata = {
  title: "Domů",
  description:
    "Cvič doma, naprav si tělo a rostu na pohybové cestě s minimem vybavení.",
};

const FREE_VIDEOS = MOCK_VIDEOS.filter((v) => v.accessLevel === "FREE").slice(0, 4);

const STATS = [
  { value: "100+", label: "cvičebních videí" },
  { value: "7", label: "ucelených kurzů" },
  { value: "1:1", label: "osobní přístup" },
  { value: "0", label: "potřebné vybavení" },
];

const STEPS = [
  {
    num: "01",
    title: "Vyber si cestu",
    desc: "Osobní lekce, videoknihovna nebo členství – podle toho, jak chceš cvičit.",
  },
  {
    num: "02",
    title: "Cvič doma",
    desc: "Pusť si video nebo se připoj na lekci. Stačí kousek místa na zemi.",
  },
  {
    num: "03",
    title: "Rosť dál",
    desc: "Postupně napravuj tělo, přidávej obtížnost a sleduj svůj posun.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero – fullscreen logo splash ── */}
      {/* Pozadí je čistě bílé (#fff) = stejné jako pozadí loga, takže rámeček loga splývá. */}
      <section className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center overflow-hidden bg-white px-4 py-16 text-center">
        {/* Logo přes celou šířku */}
        <Reveal variant="scale">
          <Image
            src="/LOGO.png"
            alt="POHYB DOMA – Tvoje možnosti. Tvoje cesta."
            width={1535}
            height={1024}
            className="h-auto w-[90vw] max-w-3xl lg:max-w-5xl animate-float-slow"
            sizes="(max-width: 1024px) 90vw, 1024px"
            priority
          />
        </Reveal>

        {/* CTA tlačítka */}
        <Reveal variant="up" delay={200}>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/clenstvi" className="btn-primary text-base py-3 px-8">
              Začít svou cestu
            </Link>
            <Link href="/videoknihovna" className="btn-outline text-base py-3 px-8">
              Procházet videa zdarma
            </Link>
          </div>
        </Reveal>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex flex-col items-center gap-1 text-brand-dark/40">
            <span className="text-[11px] font-medium tracking-widest uppercase">
              Scrolluj
            </span>
            <svg
              className="w-5 h-5 animate-scroll-hint"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Ukázky cvičení (videosekvence) ── */}
      <MovementClips />

      {/* ── Stats band ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <Reveal key={stat.label} variant={i % 2 === 0 ? "left" : "right"} delay={i * 80}>
                <div className="text-center">
                  <div className="text-3xl lg:text-4xl font-semibold text-gradient">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Three pillars ── */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="up">
            <SectionHeading
              label="Co nabízím"
              title="Tři cesty k lepšímu pohybu"
              centered
            />
          </Reveal>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "👤",
                title: "Osobní lekce",
                desc: "1:1 lekce u tebe doma (okolí Dobřichovic) nebo online odkudkoliv. Přesně na míru tvému tělu. Rezervuj si termín.",
                href: "/rezervace",
                cta: "Rezervovat lekci",
              },
              {
                icon: "🎬",
                title: "Knihovna pohybu",
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
            ].map((item, i) => (
              <Reveal
                key={item.title}
                variant={i === 0 ? "left" : i === 2 ? "right" : "up"}
                delay={i * 120}
              >
                <div className="card card-lift group relative p-8 flex flex-col h-full">
                  {/* Accent top bar */}
                  <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-brand-blue to-[#5aadff] transition-transform duration-300 group-hover:scale-x-100" />
                  <div className="text-4xl mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-brand-dark mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed flex-1">
                    {item.desc}
                  </p>
                  <Link
                    href={item.href}
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue"
                  >
                    {item.cta}
                    <span className="transition-transform duration-200 group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative overflow-hidden bg-brand-light py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="up">
            <SectionHeading
              label="Jak to funguje"
              title="Začni ve třech krocích"
              subtitle="Žádné složitosti. Stačí se rozhodnout a začít se hýbat."
              centered
            />
          </Reveal>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-7 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-brand-blue/30 to-transparent" />
            {STEPS.map((step, i) => (
              <Reveal
                key={step.num}
                variant={i === 0 ? "left" : i === 2 ? "right" : "up"}
                delay={i * 130}
              >
                <div className="relative text-center px-4">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-blue font-semibold text-lg shadow-md ring-4 ring-brand-light">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-semibold text-brand-dark mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Free videos preview ── */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="up">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <SectionHeading
                label="Videa zdarma"
                title="Vyzkoušej bez registrace"
                subtitle="Vybrané lekce jsou zcela volně dostupné."
              />
              <Link
                href="/videoknihovna"
                className="btn-outline shrink-0 text-sm"
              >
                Všechna videa →
              </Link>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FREE_VIDEOS.map((video, i) => (
              <Reveal key={video.id} variant={i % 2 === 0 ? "left" : "right"} delay={i * 90}>
                <VideoCard video={video} userTier="FREE" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter / CTA ── */}
      <section className="relative overflow-hidden bg-brand-dark text-white py-16 lg:py-24">
        <div className="pointer-events-none absolute -top-20 right-0 w-80 h-80 rounded-full bg-brand-blue/20 blur-3xl animate-float-slow" />
        <div className="pointer-events-none absolute bottom-0 -left-16 w-72 h-72 rounded-full bg-[#5aadff]/10 blur-3xl animate-float" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <Reveal variant="up">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#5aadff] mb-3">
              Zůstaň v pohybu
            </p>
            <h2 className="text-3xl lg:text-4xl font-semibold leading-tight mb-6">
              Nechceš nic prošvihnout?
            </h2>
            <p className="text-white/70 text-lg mb-10 leading-relaxed">
              Přihlas se k odběru. Budeš první vědět o nových videích, kurzech a
              akcích.
            </p>
            <NewsletterForm />
            <p className="mt-4 text-xs text-white/40">
              Žádný spam. Odhlášení jedním klikem.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Courses teaser ── */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="up">
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
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {["OFFICE CVIČENÍ", "BOLAVÁ ZÁDA", "KYČLE", "RAMENO"].map(
              (name, i) => (
                <Reveal key={name} variant={i % 2 === 0 ? "left" : "right"} delay={i * 90}>
                  <div className="card card-lift group p-6 flex flex-col items-center text-center gap-3 cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center text-xl transition-transform duration-300 group-hover:scale-110">
                      {name === "OFFICE CVIČENÍ"
                        ? "💼"
                        : name === "BOLAVÁ ZÁDA"
                          ? "🦴"
                          : name === "KYČLE"
                            ? "🔄"
                            : "💪"}
                    </div>
                    <p className="text-sm font-semibold text-brand-dark">{name}</p>
                  </div>
                </Reveal>
              )
            )}
          </div>
        </div>
      </section>
    </>
  );
}
