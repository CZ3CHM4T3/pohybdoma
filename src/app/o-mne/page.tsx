import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "O mně",
  description:
    "Jsem vystudovaný pedagog se zaměřením na biologii a tělesnou výchovu. Pohyb a lidské tělo mě fascinují odjakživa. Pracuji s tělem, ne proti němu.",
};

// Co ode mě můžeš čekat
const EXPECT = [
  {
    icon: "🌱",
    title: "Dlouhodobý přístup",
    desc: "Osobně pracuji výhradně s dlouhodobými klienty. Změna, která vydrží, potřebuje čas a poctivé základy – ne pár týdnů dřiny. Je-li potřeba, rád pomůžu i s pohybovými obtížemi akutnějšího rázu.",
  },
  {
    icon: "🧠",
    title: "Holisticky a funkčně",
    desc: "Vycházím z funkčního pohledu na tělo. Klienta vnímám jako komplexní a propojený celek, ve kterém spolu úzce souvisí pohybový aparát, nervový systém, dechové stereotypy, fascie i každodenní návyky a životní situace.",
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

// S čím pracuji
const METHODS = [
  "Atletická a gymnastická průprava",
  "Animal Flow",
  "Kettlebell",
  "Kalistenika",
  "Flow rope",
  "Práce s kotouči",
  "Koordinační cvičení",
  "Pohybové hry",
  "Práce s fasciemi",
  "Regenerace",
];

// Měkké, neostré okraje fotky + obtékání textem
const photoStyle: React.CSSProperties = {
  shapeOutside: "ellipse(48% 48%)",
  shapeMargin: "1.25rem",
  WebkitMaskImage:
    "radial-gradient(ellipse 70% 70% at 50% 45%, #000 50%, transparent 86%)",
  maskImage:
    "radial-gradient(ellipse 70% 70% at 50% 45%, #000 50%, transparent 86%)",
};

export default function AboutPage() {
  return (
    <>
      {/* Článek O mně – nadpis a pod ním souvislý text s vetkanou fotkou */}
      <section className="bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="up">
            <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-3">
              O mně
            </p>
            <h1 className="text-4xl lg:text-5xl font-semibold text-brand-dark leading-tight mb-8">
              Pracuji s tělem, <span className="text-gradient">ne proti němu.</span>
            </h1>
          </Reveal>

          <div className="text-lg text-gray-700 leading-relaxed space-y-5">
            {/* Fotka vetkaná do textu (obtékání + rozpité okraje) */}
            <Image
              src="/honza.jpg"
              alt="Honza Schröffel – lektor pohybu"
              width={1080}
              height={1080}
              sizes="(max-width: 640px) 240px, 360px"
              priority
              style={photoStyle}
              className="mx-auto mb-6 w-60 sm:float-right sm:ml-2 sm:mb-2 sm:w-72 lg:w-[22rem] h-auto"
            />

            <p>
              Jsem vystudovaný pedagog se zaměřením na biologii a tělesnou výchovu.
              Pohyb a lidské tělo mě fascinují odjakživa a postupně se staly nejen
              mojí profesí, ale i celoživotním studiem.
            </p>
            <p>
              Moje cesta ale nevedla jen přes učebnice a kurzy. Sám jsem si dřív
              prošel zraněními a dlouhodobými obtížemi, na které mi běžná odborná
              řešení nepřinesla uspokojivou odpověď. To mě přivedlo k hlubšímu
              hledání souvislostí a k přesvědčení, že lidské tělo je potřeba vnímat
              komplexně. Musel jsem vzít věci do vlastních rukou a právě tato
              zkušenost dnes významně ovlivňuje způsob, jakým pracuji s klienty.
              Dnes mohu s klidem říct, že se každý rok cítím lépe a pracuji s tělem,
              ne proti němu.
            </p>
            <p>
              Jsem licencovaný fitness trenér, sportovní masér, cvičitel plavání
              2. třídy, instruktor lyžování, bývalý plavčík a není mnoho sportů,
              které jsem nezkusil. Díky pedagogickému vzdělání i praktickým
              zkušenostem propojuji poznatky z biomechaniky, funkčního tréninku,
              práce s fasciemi, regenerace a každodenního pohybu. Neřeším jen
              symptomy, ale především jejich příčinu. Klienta vnímám jako propojený
              celek rozmanitých dílčích faktorů.
            </p>
            <p>
              Jsem také táta a dobře vím, jak náročné je skloubit péči o rodinu
              s péčí o vlastní zdraví. Proto vždy hledám pro klienta řešení, která
              jsou dlouhodobě udržitelná a fungují i v běžném životě plném práce,
              dětí a každodenních povinností. Ze stejného popudu vznikla i tato moje
              online iniciativa s hlavní myšlenkou – vybavit lidi dovednostmi
              a znalostmi pro snadné a efektivní domácí cvičení a řešení základních
              i komplexních pohybových obtíží.
            </p>
            <p>
              Jsem spoluzakladatelem tenisové a fitness akademie MS GEM
              v Dobřichovicích, která působí v areálu TJ Sokol Dobřichovice.
              V posledních letech jsme s našimi svěřenci dosáhli na umístění mezi
              nejlepšími týmy v České republice, ale výsledky pro mě nikdy nebyly
              v rámci dětského pohybu tím nejdůležitějším cílem. Hlavní hodnotu
              spatřuji v budování charakteru, kolektivu a kvalitních pohybových
              základů.
            </p>
            <p>
              Je proto běžné, že se děti na našich trénincích setkávají
              s atleticko-gymnastickými základy, animal flow, kettlebellem,
              kalistenikou, flow rope, prací s kotouči, koordinačními cvičeními
              i pohybovými hrami a mnoha dalšími prvky. Vše je součástí promyšleného
              systému, který jsem během let praxe postupně vytvářel a dále ho
              aktivně rozvíjím.
            </p>
            <p>
              Na své práci mám nejraději okamžiky, kdy lidé zjišťují, že jejich tělo
              umí a zvládne mnohem víc, než si mysleli. Když mizí zbytečná tenze,
              diskomfort a frustrace a pohyb se znovu stává přirozenou součástí
              života, posouvá se optika nazírání na svět hned přívětivějším směrem.
            </p>
            <p>
              Věřím, že zdravější, silnější a svobodnější pohyb nemusí být výsadou
              sportovců. Může být dostupný téměř každému a často je cesta k němu
              jednodušší, než se na první pohled zdá. Pokud jste se rozhodli vzít
              své zdraví a spokojenost pevněji do svých rukou, hledat souvislosti
              a aktivně na sobě pracovat, budu rád, když na té cestě budu moci být
              i vaším průvodcem. :)
            </p>
          </div>

          {/* Podpis */}
          <div className="clear-both mt-8">
            {/* 👉 Až naskenuješ podpis: ulož ho jako /public/podpis.png (ideálně
                průhledné pozadí) a dej vědět – vyměním tento text za obrázek. */}
            <p className="text-2xl text-brand-dark" style={{ fontStyle: "italic" }}>
              Honza
            </p>
            <p className="text-sm text-gray-500">Jan Schröffel · POHYB DOMA</p>
          </div>

          {/* S čím pracuji */}
          <div className="mt-10">
            <p className="text-sm font-semibold text-brand-dark mb-3">S čím pracuji:</p>
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
        </div>
      </section>

      {/* Co ode mě můžeš čekat */}
      <section className="bg-brand-light py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="up">
            <SectionHeading label="Co ode mě můžeš čekat" title="Můj přístup v kostce" centered />
          </Reveal>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {EXPECT.map((v, i) => (
              <Reveal key={v.title} variant={i % 2 === 0 ? "left" : "right"} delay={i * 90}>
                <div className="card card-3d p-6 h-full">
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
      <section className="bg-white py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
          <Reveal variant="up">
            <h2 className="text-2xl lg:text-3xl font-semibold text-brand-dark mb-3">
              Tvoje možnosti. Tvoje cesta.
            </h2>
            <p className="text-gray-600 mb-7">
              Pojďme začít tam, kde právě jsi. Rád budu tvým průvodcem.
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
