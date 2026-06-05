import type { Metadata } from "next";
import { Reveal } from "@/components/ui/Reveal";
import { NewsletterForm } from "@/components/NewsletterForm";

export const metadata: Metadata = {
  title: "Pohybová Myslánka",
  description: "Úvahy o pohybu, těle a životě.",
};

/** Plánované články (zatím bez obsahu). */
const PLANNED_POSTS = [
  {
    title: "Pohyb není jen cvičení",
    teaser:
      "Proč pohyb není výkon ani dřina, ale způsob, jak znovu obývat vlastní tělo.",
    tag: "Filozofie pohybu",
  },
  {
    title: "Proč nemusíš být dobrý, abys začal",
    teaser:
      "O tom, že dokonalost není podmínka. Stačí udělat první krok – nedokonale.",
    tag: "Začátky",
  },
  {
    title: "Co tě učí tělo, když mu dáš čas",
    teaser:
      "Tělo mluví. Když ho přestaneš nutit a začneš naslouchat, naučí tě víc než jakýkoliv plán.",
    tag: "Vnímání",
  },
  {
    title: "Jak začít doma bez vybavení",
    teaser:
      "Praktický návod, jak se rozhýbat doma s tím, co máš – tedy v podstatě s ničím.",
    tag: "Praxe",
  },
  {
    title: "Proč je ztuhlost často ztráta možností",
    teaser:
      "Tuhé tělo není osud. Je to mapa míst, kde jsme přestali zkoušet.",
    tag: "Mobilita",
  },
];

export default function BlogPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-light py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="up">
            <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-2">
              Blog
            </p>
            <h1 className="text-4xl lg:text-5xl font-semibold text-brand-dark mb-4">
              Pohybová Myslánka
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl">
              Úvahy o pohybu, těle a životě. Bez frází a zaručených návodů – spíš
              poctivé otázky a zkušenosti. První články právě připravuji.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Připravované články */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="up">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-brand-light px-4 py-1.5 text-sm font-semibold text-brand-blue">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-blue opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-blue" />
              </span>
              Připravujeme
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PLANNED_POSTS.map((post, i) => (
              <Reveal key={post.title} variant="up" delay={i * 90}>
                <article className="card card-3d h-full p-0 flex flex-col">
                  {/* Náhled */}
                  <div className="relative aspect-video bg-gradient-to-br from-brand-dark to-[#1256c0] flex items-center justify-center">
                    <span className="text-4xl opacity-30">✍️</span>
                    <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-brand-dark">
                      {post.tag}
                    </span>
                  </div>
                  {/* Obsah */}
                  <div className="p-6 flex flex-col flex-1">
                    <h2 className="text-lg font-semibold text-brand-dark leading-snug mb-2">
                      {post.title}
                    </h2>
                    <p className="text-sm text-gray-600 leading-relaxed flex-1">
                      {post.teaser}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400">
                      Připravujeme
                    </span>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="relative overflow-hidden bg-brand-dark text-white py-16">
        <div className="pointer-events-none absolute -top-20 right-0 w-80 h-80 rounded-full bg-brand-blue/20 blur-3xl animate-float-slow" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <Reveal variant="up">
            <h2 className="text-2xl lg:text-3xl font-semibold mb-4">
              Chceš vědět, až vyjde první článek?
            </h2>
            <p className="text-white/70 mb-8">
              Přihlas se k odběru a nic ti neuteče – nové texty, videa i akce.
            </p>
            <NewsletterForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
