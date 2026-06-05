import type { Metadata } from "next";
import Image from "next/image";
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
    icon: "🌱",
    title: "Dlouhodobý přístup",
    desc: "Pracuju výhradně s dlouhodobými klienty. Změna, která vydrží, potřebuje čas a poctivé základy – ne pár týdnů dřiny.",
  },
  {
    icon: "🧠",
    title: "Holisticky, ne izolovaně",
    desc: "Neřeším jen sval nebo jeden cvik. Jde o to, jak držíš tělo, jak dýcháš a jak se hýbeš v běžném dni.",
  },
  {
    icon: "🎓",
    title: "Vysvětlím ti proč",
    desc: "Jsem vystudovaný tělocvikář. Nejde jen o to, co cvičit, ale proč – ať se postupně staneš nezávislým.",
  },
  {
    icon: "🏠",
    title: "Domov plný možností",
    desc: "Většina lidí má doma mnohem víc, než si myslí. Ukážu ti, jak svůj prostor proměnit v plnohodnotné a smysluplné tréninkové místo.",
  },
];

// Na čem stavím (metody)
const METHODS = [
  "Fyziologie a posturální náprava",
  "Kalistenika",
  "Animal Flow",
  "Kettlebell",
  "Atletická a gymnastická průprava",
  "Dech a práce s bránicí",
  "Koordinační cvičení",
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
                Pohyb je pro mě komplexní a{" "}
                <span className="text-gradient">dlouhodobá cesta</span>.
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed mb-4">
                Jmenuji se Jan Schröffel, je mi 33 let, jsem vystudovaný
                tělocvikář, táta a spoluzakladatel Fitness akademie MS GEM
                v Dobřichovicích. Nevěřím ve fitness v té podobě, v jaké je dnes
                mainstreamově prezentováno – tedy jako honbu za rychlými výsledky,
                čísly na váze a dokonalým vzhledem; a jedním z mých cílů je
                proměnit to, co si moji klienti pod tímhle slovem vlastně
                představí.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                Projekt POHYB DOMA je mým způsobem, jak tenhle přístup přenést
                přímo k tobě domů – bez nutnosti drahého fitka či vybavení a za
                zlomek ceny – a zároveň ti ukázat, že tvůj vlastní domov v sobě
                skrývá netušené možnosti pro kvalitní a smysluplný trénink.
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
                <Image
                  src="/honza.jpg"
                  alt="Honza Schröffel – lektor pohybu"
                  width={1080}
                  height={1080}
                  className="w-80 h-80 lg:w-[28rem] lg:h-[28rem] rounded-3xl object-cover shadow-2xl"
                  sizes="(max-width: 1024px) 320px, 448px"
                  priority
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Proč to dělám */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="up">
            <SectionHeading label="Jak přemýšlím o pohybu" title="Komplexně a dlouhodobě" />
          </Reveal>
          <Reveal variant="up" delay={80}>
            <div className="mt-8 space-y-5 text-gray-600 leading-relaxed text-lg">
              <p>
                Pohybovou praxi vnímám jako komplexní a dlouhodobou záležitost,
                a právě proto mám klienty výhradně dlouhodobé – skutečná a trvalá
                změna totiž potřebuje čas, porozumění vlastnímu tělu a poctivě
                vybudované základy, ne pár týdnů dřiny před létem, na které pak
                stejně nic nenavazuje.
              </p>
              <p>
                Ke každému tělu přistupuji holisticky: neřeším izolovaně jeden sval
                nebo jednotlivý cvik, ale souvislosti – jakým způsobem držíš tělo,
                jak dýcháš, jak se hýbeš v běžném dni a kde se vlastně berou tvoje
                obtíže. Každý jsme jiní, se svými silnými i slabými stránkami a
                vlastním tempem, takže mým úkolem není tlačit tě do nějakého ideálu
                z internetu, ale pomoct ti porozumět sám sobě a stavět na kvalitních,
                ověřených základech, které ti dlouhodobě poslouží.
              </p>
              <p>
                <em>
                  [Sem klidně doplň pár vět svého příběhu vlastními slovy – co tě
                  k tomuhle přístupu přivedlo a proč ho děláš.]
                </em>
              </p>
            </div>
          </Reveal>

          {/* Na čem stavím */}
          <Reveal variant="up" delay={120}>
            <div className="mt-10">
              <p className="text-sm font-semibold text-brand-dark mb-3">
                Stavím na tom, co reálně funguje:
              </p>
              <div className="flex flex-wrap gap-2">
                {METHODS.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-brand-light px-4 py-1.5 text-sm font-medium text-brand-blue"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Proč nejsem drill trenér */}
      <section className="bg-brand-dark text-white py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <Reveal variant="up">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#5aadff] mb-3">
              Jak vedu trénink
            </p>
            <h2 className="text-2xl lg:text-3xl font-semibold leading-snug mb-5">
              Holisticky a udržitelně, ne stylem drilu
            </h2>
            <p className="text-white/75 text-lg leading-relaxed">
              Nečekej ode mě křik, mechanické počítání opakování ani hnaní do
              dřiny, po které tě druhý den všechno bolí a potřetí už nepřijdeš.
              Holisticky smýšlející trenér pro mě znamená, že stavím na
              udržitelnosti – na malých, srozumitelných a smysluplných krocích,
              kterým rozumíš a které jsi schopný postupně zvládat i sám. Cílem je,
              aby se pro tebe pohyb stal spolehlivým parťákem na celý život, ne jen
              dočasnou epizodou, kterou po pár týdnech vzdáš.
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
