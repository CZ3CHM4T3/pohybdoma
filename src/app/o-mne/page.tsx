import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "O mně",
  description:
    "Jsem Honza a učím lidi hýbat se doma – chytře, bezpečně a tak, aby je to bavilo. Pohyb beru jako možnost, ne povinnost.",
};

const EXPECT = [
  {
    icon: "🧭",
    title: "Jasný směr, žádné zázraky",
    desc: "Nečekej zaručené triky. Dostaneš srozumitelný plán a pochopíš, proč ho děláš.",
  },
  {
    icon: "🧩",
    title: "Na míru tvému tělu",
    desc: "Žádná šablona pro všechny. Vycházím z toho, kde právě jsi a co potřebuješ.",
  },
  {
    icon: "🎓",
    title: "Vysvětlím ti proč",
    desc: "Nejen co cvičit, ale i proč – ať se postupně staneš nezávislým a umíš si pomoct sám.",
  },
  {
    icon: "🤝",
    title: "Respekt a žádný drill",
    desc: "Nebudu na tebe křičet ani tě hnát do dřiny. Jdeme tvým tempem, udržitelně.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-light py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <Reveal variant="left">
              <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-3">
                O mně
              </p>
              <h1 className="text-4xl lg:text-5xl font-semibold text-brand-dark leading-tight mb-6">
                Jsem Honza.
                <br />
                Pohyb beru jako <span className="text-gradient">možnost</span>, ne
                povinnost.
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed mb-4">
                Jmenuju se Jan Schröffel, ale klidně mi říkej Honzo. Učím lidi
                hýbat se doma – chytře, bezpečně a tak, aby je to bavilo. Bydlím
                v Dobřichovicích a po okolí jezdím na osobní lekce; ke zbytku se
                dostanu přes video.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                K pohybu mě nepřivedl výkon, ale zvědavost – co všechno tělo
                dokáže, když mu dáš prostor a čas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/rezervace" className="btn-primary">
                  Rezervovat lekci
                </Link>
                <Link href="/clenstvi" className="btn-outline">
                  Prozkoumat členství
                </Link>
              </div>
            </Reveal>

            {/* Fotka */}
            <Reveal variant="right">
              <div className="flex justify-center lg:justify-end">
                {/* 👉 Až dodáš fotku: nahraj ji jako /public/honza.jpg a dej vědět,
                    vyměním tenhle placeholder za <Image src="/honza.jpg" …>. */}
                <div className="w-80 h-96 lg:w-[26rem] lg:h-[32rem] rounded-3xl bg-gradient-to-br from-brand-dark/10 to-brand-blue/10 border-2 border-dashed border-brand-blue/30 flex items-center justify-center shadow-xl">
                  <div className="text-center text-gray-400">
                    <div className="text-5xl mb-3">📷</div>
                    <p className="text-sm font-medium">Tvoje fotka</p>
                    <p className="text-xs opacity-60">brzy doplníme</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Proč to dělám */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="up">
            <SectionHeading label="Proč to dělám" title="Pohyb pro každého, kdo chce začít" />
          </Reveal>
          <Reveal variant="up" delay={80}>
            <div className="mt-8 space-y-5 text-gray-600 leading-relaxed text-lg">
              <p>
                Postupně jsem zjistil, že většina lidí nepotřebuje dřinu ani drahé
                fitko. Potřebují pochopit svoje tělo, srovnat roky zanedbávané věci
                a najít pohyb, který si užijí. A to jde i doma, s minimem vybavení.
              </p>
              <p>
                <em>
                  [Sem klidně doplň svůj příběh – kdy jsi začal, čím sis prošel,
                  co tě nakoplo k tomu učit ostatní. Pár vět stačí, ať je to lidské.]
                </em>
              </p>
              <p>
                Nejde o dokonalý cvik. Jde o objevování možností. Každé tělo je jiné
                – má svoje silné i slabé stránky a svoje tempo. Moje práce není tlačit
                tě do ideálu z internetu, ale pomoct ti stavět na kvalitních základech
                a vnímat, co ti dělá dobře.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Proč nejsem drill trenér */}
      <section className="bg-brand-dark text-white py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <Reveal variant="up">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#5aadff] mb-3">
              Jak to dělám jinak
            </p>
            <h2 className="text-2xl lg:text-3xl font-semibold leading-snug mb-5">
              Nejsem drill trenér
            </h2>
            <p className="text-white/75 text-lg leading-relaxed">
              Nebudu na tebe křičet, počítat ti opakování ani tě hnát do dřiny, po
              které tě druhý den všechno bolí a potřetí už nepřijdeš. Věřím na
              udržitelnost: malé, chytré kroky, kterým rozumíš a které zvládneš
              zopakovat sám. Pohyb má být tvůj parťák na celý život, ne trest.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Co ode mě čekáš */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="up">
            <SectionHeading label="Co ode mě čekáš" title="Můj přístup v kostce" centered />
          </Reveal>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {EXPECT.map((v, i) => (
              <Reveal key={v.title} variant={i % 2 === 0 ? "left" : "right"} delay={i * 90}>
                <div className="card card-3d p-6 text-center h-full">
                  <div className="text-3xl mb-3">{v.icon}</div>
                  <h3 className="font-semibold text-brand-dark mb-2">{v.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Závěrečné CTA */}
      <section className="bg-brand-light py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
          <Reveal variant="up">
            <h2 className="text-2xl lg:text-3xl font-semibold text-brand-dark mb-3">
              Tvoje možnosti. Tvoje cesta.
            </h2>
            <p className="text-gray-600 mb-7">
              Já ti jen pomůžu ji najít. Pojďme začít tam, kde právě jsi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/rezervace" className="btn-primary">
                Rezervovat lekci
              </Link>
              <Link href="/videoknihovna" className="btn-outline">
                Procházet ukázky zdarma
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
