import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Krátké videosekvence z domácího cvičení (formát 9:16, jako "reels").
 *
 * 👉 Až budeš mít reálná videa, nahraj je do /public/videos/ a doplň pole
 *    `src` (a klidně `poster` s náhledem). Karta pak automaticky vykreslí
 *    <video autoPlay muted loop playsInline> místo placeholderu.
 *    Doporučení: krátké MP4 (H.264), 9:16, ~8–20 s, bez zvuku.
 */
type Clip = {
  title: string;
  duration: string;
  /** Cesta k videu v /public, např. "/videos/rana-mobilita.mp4". Zatím prázdné. */
  src?: string;
  /** Náhledový obrázek (poster). */
  poster?: string;
  /** Dekorativní emoji do placeholderu, dokud není video. */
  hint: string;
  /** Vizuální gradient placeholderu (Tailwind from/to). */
  gradient: string;
};

const CLIPS: Clip[] = [
  {
    title: "Ranní mobilita",
    duration: "0:18",
    hint: "🌅",
    gradient: "from-[#062A6B] to-[#1976FF]",
  },
  {
    title: "Záda bez bolesti",
    duration: "0:24",
    hint: "🧘",
    gradient: "from-[#0a3a8a] to-[#5aadff]",
  },
  {
    title: "Síla bez vybavení",
    duration: "0:20",
    hint: "💪",
    gradient: "from-[#1256c0] to-[#1976FF]",
  },
  {
    title: "Dech a uvolnění",
    duration: "0:16",
    hint: "🌬️",
    gradient: "from-[#062A6B] to-[#0a3a8a]",
  },
];

export function MovementClips() {
  return (
    <section className="relative overflow-hidden bg-brand-dark text-white py-20 lg:py-28">
      {/* Dekorativní záře */}
      <div className="pointer-events-none absolute -top-24 right-0 w-96 h-96 rounded-full bg-brand-blue/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-[#5aadff]/10 blur-3xl animate-float" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Nadpis + myšlenka */}
        <div className="max-w-2xl">
          <Reveal variant="up">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#5aadff] mb-3">
              Ukázky z cvičení
            </p>
            <h2 className="text-3xl lg:text-4xl font-semibold leading-tight">
              Takhle cvičíme doma
            </h2>
            <p className="mt-5 text-lg text-white/70 leading-relaxed">
              Nejde o dokonalý pohyb. Jde o objevování možností. Nakoukni do
              krátkých ukázek – přesně takhle se hýbeme společně v členství.
            </p>
          </Reveal>
        </div>

        {/* Reel karty */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {CLIPS.map((clip, i) => (
            <Reveal key={clip.title} variant="up" delay={i * 110}>
              <div
                className={`group relative aspect-[9/16] overflow-hidden rounded-[1.5rem] border border-white/10 shadow-xl shadow-black/30 transition-transform duration-500 hover:scale-[1.03] ${
                  i % 2 === 1 ? "lg:translate-y-6" : ""
                }`}
              >
                {clip.src ? (
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    src={clip.src}
                    poster={clip.poster}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  // Placeholder, dokud není reálné video
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${clip.gradient} flex items-center justify-center`}
                  >
                    <span className="text-5xl opacity-40 transition-transform duration-500 group-hover:scale-110">
                      {clip.hint}
                    </span>
                  </div>
                )}

                {/* Ztmavení dole pro čitelnost */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Play tlačítko */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-brand-dark shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <svg className="ml-0.5 h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </div>

                {/* Délka */}
                <span className="absolute top-3 right-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium">
                  {clip.duration}
                </span>

                {/* Štítek úrovně */}
                <span className="absolute top-3 left-3 rounded-full bg-brand-blue px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                  VIP
                </span>

                {/* Název */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-sm font-semibold leading-snug">{clip.title}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* CTA */}
        <Reveal variant="up" delay={200}>
          <div className="mt-12 flex flex-col items-center gap-4 text-center">
            <p className="text-white/60 text-sm">
              Nové lekce každý týden · knihovna krátkých videí · měsíční výzva
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/clenstvi" className="btn-primary text-base py-3 px-8">
                Začít svou cestu
              </Link>
              <Link
                href="/videoknihovna"
                className="btn-outline border-white/40 text-white hover:bg-white hover:text-brand-dark text-base py-3 px-8"
              >
                Celá knihovna pohybu
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
