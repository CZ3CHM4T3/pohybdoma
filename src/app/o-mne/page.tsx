import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Caveat } from "next/font/google";
import { Sprout, Brain, GraduationCap, House, type LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

// Podpisové písmo – přímější, mužnější rukopis
const signatureFont = Caveat({ subsets: ["latin"], weight: "700", display: "swap" });

export const metadata: Metadata = {
  title: "O mně",
  description:
    "Jsem vystudovaný pedagog se zaměřením na biologii a tělesnou výchovu. Pohyb a lidské tělo mě fascinují odjakživa. Pracuji s tělem, ne proti němu.",
};

// Co ode mě můžeš čekat (text v závorkách tučně)
const EXPECT: { Icon: LucideIcon; title: string; desc: React.ReactNode }[] = [
  {
    Icon: Sprout,
    title: "DLOUHODOBÝ PROJEKT",
    desc: (
      <>
        Osobně pracuji především s dlouhodobými klienty.{" "}
        <strong>Změna, která vydrží, potřebuje čas, trpělivost a poctivě
        vybudované základy – ne pár týdnů dřiny vytržených z kontextu.</strong>{" "}
        Pokud je potřeba, rád pomohu i s akutnějšími pohybovými obtížemi, ale
        skutečný cíl vidím v dobrém pohybu, který je zároveň jejich jedinou
        fungující prevencí.
      </>
    ),
  },
  {
    Icon: Brain,
    title: "HOLISTICKY A FUNKČNĚ",
    desc: (
      <>
        Nelze se zaměřit jen na místo, které bolí. Bude mě zajímat, jak se hýbeš,
        dýcháš, jíš, spíš, jak trávíš svůj běžný den, jaká je tvoje historie
        zranění i pohybových stereotypů a co všechno může stát za tvými obtížemi
        nebo nezdary.{" "}
        <strong>Tělo má být silné, pružné a schopné celý život, přiměřeně
        věku.</strong>{" "}
        Pokud pociťuješ ztrátu pohyblivosti, nebo dokonce slyšíš stáří klepat na
        dveře, začni žít jinak a otevři mu s klidem a vědomím, že děláš, co můžeš.
      </>
    ),
  },
  {
    Icon: GraduationCap,
    title: "EDUKACE",
    desc: (
      <>
        Jsem pedagog a to se přirozeně promítá i do vedení lekcí.{" "}
        <strong>Samotné předcvičování je pouze špičkou ledovce trenérské
        práce.</strong>{" "}
        Klientovi je třeba především vysvětlit, proč se dané pohybové činnosti
        věnujeme, co se v těle děje atd., aby se postupně dokázal rozhodovat sám
        a nebyl pouze závislý na neustálém vedení. Pohybová praxe představuje
        doživotní studium.
      </>
    ),
  },
  {
    Icon: House,
    title: "DOMOV PLNÝ MOŽNOSTÍ",
    desc: (
      <>
        Ke kvalitnímu pohybu nepotřebuješ drahou posilovnu. Většina lidí má doma
        dostatek prostoru i pomůcek, jen je neumí využít. Ukážu ti, jak si klidně
        i bez pomůcek vytvořit smysluplný pohybový systém v prostředí, kde
        skutečně žiješ. Dozvíš se i to, jaké pomůcky a cviky jsou pro tebe osobně
        plýtváním času i prostředků, a jaké naopak skvělou investicí.{" "}
        <strong>Prostor slouží tobě, ne ty jemu.</strong>
      </>
    ),
  },
];

// Měkké, neostré okraje fotky + obtékání textem
const photoStyle: React.CSSProperties = {
  shapeOutside: "ellipse(50% 50%)",
  shapeMargin: "1rem",
  WebkitMaskImage:
    "radial-gradient(ellipse 72% 80% at 50% 47%, #000 44%, transparent 80%)",
  maskImage:
    "radial-gradient(ellipse 72% 80% at 50% 47%, #000 44%, transparent 80%)",
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
              Pohyb a lidské tělo mě fascinují odjakživa – staly se mojí profesí
              i celoživotním studiem.
            </p>
            <p>
              Sám jsem si prošel zraněními a dlouhodobými obtížemi, na které mi
              běžná řešení nedala uspokojivou odpověď. Donutilo mě to hledat
              souvislosti a vnímat tělo jako propojený celek. Dnes pracuji s tělem,
              ne proti němu – a každý rok se cítím líp.
            </p>
            <p>
              Jsem licencovaný fitness trenér a sportovní masér. Propojuji
              biomechaniku, funkční trénink, práci s fasciemi, regeneraci
              i každodenní pohyb a neřeším jen symptomy, ale především jejich
              příčinu. Klienta vnímám jako propojený celek.
            </p>
            <p>
              Jako táta vím, jak těžké je skloubit rodinu s péčí o vlastní zdraví –
              proto hledám řešení, která fungují v reálném životě, doma a bez drahého
              vybavení. Spoluzaložil jsem tenisovou a fitness akademii MS GEM
              v Dobřichovicích a ze stejné myšlenky vznikl i POHYB DOMA: vybavit tě
              dovednostmi pro snadné a efektivní cvičení doma. Pokud chceš vzít své
              zdraví pevněji do rukou, rád budu tvým průvodcem. :)
            </p>
          </div>

          {/* Podpis – mužnější rukopis, zarovnáno doprava */}
          <div className="clear-both mt-8 text-right">
            <p className={`${signatureFont.className} text-brand-dark leading-none text-5xl lg:text-6xl`}>
              Honza
            </p>
            <p className="mt-1 text-sm text-gray-500">Jan Schröffel · POHYB DOMA</p>
          </div>

        </div>
      </section>

      {/* Co ode mě můžeš čekat */}
      <section className="bg-brand-light py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="up">
            <SectionHeading label="Co ode mě můžeš čekat" title="Můj přístup v kostce" centered />
          </Reveal>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {EXPECT.map((v, i) => (
              <Reveal key={v.title} variant={i % 2 === 0 ? "left" : "right"} delay={i * 90}>
                <div className="card card-3d p-6 h-full">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-brand-blue">
                    <v.Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
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
