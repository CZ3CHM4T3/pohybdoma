import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { MovementClips } from "@/components/MovementClips";
import { Reviews } from "@/components/Reviews";
import { getApprovedReviews } from "@/lib/reviews-server";
import { Dumbbell, Film, Star, Play } from "lucide-react";
import { MOCK_VIDEOS, MOCK_COURSES, SERVICE_AREA } from "@/lib/mock-data";
import { COURSE_ICONS, DEFAULT_COURSE_ICON } from "@/lib/course-icons";
import { VideoCard } from "@/components/VideoCard";
import { NewsletterForm } from "@/components/NewsletterForm";

export const metadata: Metadata = {
  title: "Domů",
  description:
    "Cvič doma, naprav si tělo a vrať si svobodu pohybu s minimem vybavení.",
};

const FREE_VIDEOS = MOCK_VIDEOS.filter((v) => v.accessLevel === "FREE").slice(0, 4);

// 👉 Až budeš mít video, nahraj ho do /public/videos/intro.mp4 (+ poster intro-poster.jpg)
//    a přepni na true. Do té doby se ukáže elegantní placeholder.
const HAS_INTRO_VIDEO = false;

const STATS = [
  { value: `${MOCK_COURSES.length}`, label: "kurzů v přípravě" },
  { value: `${SERVICE_AREA.length}`, label: "obcí, kam dojíždím" },
  { value: "1:1", label: "osobní přístup" },
  { value: "0", label: "nutné vybavení" },
];

const STEPS = [
  {
    num: "01",
    title: "Vyber si cestu",
    desc: "Osobní lekce v pohodlí tvého domova, brouzdání na vlastní pěst stále se rozšiřující video-knihovnou nebo VIP členství s plnou podporou, radami i feedbackem – rozhodni se podle toho, co potřebuješ. Jsem tu pro tebe, ať jsou tvé cíle a možnosti jakékoliv.",
  },
  {
    num: "02",
    title: "Cvič doma",
    desc: "Čas je to nejcennější. Být nekonečným začátečníkem, co sleduje generická youtube videa a doufá ve změnu – to je nekonečný cyklus začátků a frustrace. Nabízím jinou cestu: za zlomek ceny v domácím prostředí identifikuj příčiny svých pohybových obtíží a nauč se je řešit efektivně a sám. Trénink musí být udržitelný a snadno realizovatelný. Snadněji než doma to nejde. Využij svůj domov na maximum a ušetříš čas, peníze i nervy.",
  },
  {
    num: "03",
    title: "Pochop proces",
    desc: "Každé tělo je jiné, se silnými i slabými stránkami a nekonečný progres neexistuje. Vybuduj si komplexní pohybové kompetence na kvalitních, ověřených základech, postupně si spravuj roky opomíjené tělo a zlepšuj návyky. Edukuj se, získávej o svém těle hlubší povědomí, zkušenosti a sleduj svůj posun v reálném čase. Vše je v tvých rukách, stačí začít a nepřestat.",
  },
];

export default async function HomePage() {
  const reviews = await getApprovedReviews();
  return (
    <>
      {/* ── Hero – fullscreen logo splash ── */}
      {/* Pozadí je čistě bílé (#fff) = stejné jako pozadí loga, takže rámeček loga splývá. */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden bg-white px-4 py-10 lg:py-16 text-center">
        {/* Web v procesu vzniku – nenápadné upozornění */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          Web se právě dotváří – některé funkce ještě přibývají.
        </div>

        {/* Logo – dominanta */}
        <Reveal variant="scale">
          <Image
            src="/LOGO.png"
            alt="POHYB DOMA – Tvoje možnosti. Tvoje cesta."
            width={1535}
            height={1024}
            className="h-auto w-[60vw] max-w-[280px] sm:max-w-sm lg:max-w-md animate-float-slow"
            sizes="(max-width: 1024px) 60vw, 448px"
            priority
          />
        </Reveal>

        {/* Prodejní věta – jeden řádek */}
        <Reveal variant="up" delay={120}>
          <h1 className="mt-6 text-base sm:text-xl lg:text-2xl font-semibold text-brand-dark sm:whitespace-nowrap">
            Vrať svému tělu svobodu pohybu z domova a vlastním tempem.
          </h1>
        </Reveal>

        {/* Video – představení projektu (logo zůstává dominantou) */}
        <Reveal variant="up" delay={160}>
          <div className="mt-6 w-[88vw] max-w-2xl">
            {HAS_INTRO_VIDEO ? (
              <video
                src="/videos/intro.mp4"
                poster="/videos/intro-poster.jpg"
                controls
                playsInline
                className="aspect-video w-full rounded-2xl object-cover shadow-xl ring-1 ring-black/5"
              />
            ) : (
              <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark to-[#1256c0] shadow-xl ring-1 ring-black/5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="relative px-6 text-center text-white">
                  <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-brand-dark shadow-lg">
                    <Play className="ml-1 h-7 w-7" fill="currentColor" strokeWidth={0} />
                  </span>
                  <p className="font-semibold">Představení projektu</p>
                  <p className="text-sm text-white/60">Video už brzy</p>
                </div>
              </div>
            )}
          </div>
        </Reveal>

        {/* CTA tlačítka */}
        <Reveal variant="up" delay={200}>
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/clenstvi" className="btn-primary text-base py-3 px-8">
              Začít svou cestu
            </Link>
            <Link href="/videoknihovna" className="btn-outline text-base py-3 px-8">
              Procházet videa zdarma
            </Link>
          </div>
        </Reveal>

        {/* Scroll hint – v toku pod tlačítky, aby nikdy nepřekrýval obsah */}
        <div className="mt-10 flex flex-col items-center gap-1 text-brand-dark/40">
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
      </section>

      {/* ── Recenze (nad videi) ── */}
      {reviews.length > 0 && (
        <section className="bg-brand-light py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal variant="up">
              <SectionHeading label="Recenze" title="Co říkají lidé" centered />
            </Reveal>
            <div className="mt-12">
              <Reviews reviews={reviews} carousel />
            </div>
            <div className="mt-8 text-center">
              <Link href="/recenze" className="btn-outline text-sm">
                Všechny recenze →
              </Link>
            </div>
          </div>
        </section>
      )}

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
                Icon: Dumbbell,
                title: "Osobní lekce",
                desc: "1:1 lekce u tebe doma (okolí Dobřichovic) nebo online odkudkoliv. Přesně na míru tvému tělu. Rezervuj si termín.",
                href: "/rezervace",
                cta: "Rezervovat lekci",
              },
              {
                Icon: Film,
                title: "Video-knihovna",
                desc: "Videa tříděná dle části těla, obtížnosti a problému. Cvič kdy a kde chceš.",
                href: "/videoknihovna",
                cta: "Procházet ukázky zdarma",
              },
              {
                Icon: Star,
                title: "Členství",
                desc: "Odemkni si VIP obsah, živé streamy a chat přímo se mnou. Tři úrovně, zrušíš kdykoliv.",
                href: "/clenstvi",
                cta: "Zobrazit členství",
              },
            ].map((item, i) => (
              <Reveal
                key={item.title}
                variant={i === 0 ? "left" : i === 2 ? "right" : "up"}
                delay={i * 120}
              >
                <div className="card card-3d group relative p-8 flex flex-col h-full">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-brand-blue transition-transform duration-300 group-hover:scale-110">
                    <item.Icon className="h-6 w-6" strokeWidth={2} />
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
              title="Od rozhodnutí k posunu"
              subtitle="Žádné složitosti – jen jasný směr od prvního rozhodnutí až po reálný pokrok."
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
                  <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
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
            {MOCK_COURSES.slice(0, 4).map((course, i) => {
              const Icon = COURSE_ICONS[course.slug] ?? DEFAULT_COURSE_ICON;
              return (
                <Reveal key={course.id} variant={i % 2 === 0 ? "left" : "right"} delay={i * 90}>
                  <Link
                    href={`/kurzy/${course.slug}`}
                    className="card card-3d group p-6 flex flex-col items-center text-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center text-brand-blue transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </div>
                    <p className="text-sm font-semibold text-brand-dark">{course.title}</p>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
