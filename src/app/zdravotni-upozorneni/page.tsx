import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zdravotní a bezpečnostní upozornění",
  description: "Charakter služby POHYB DOMA, hranice kompetence a kdy se obrátit na lékaře či fyzioterapeuta.",
};

export default function ZdravotniUpozorneniPage() {
  return (
    <div className="min-h-screen bg-white py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-brand-dark mb-2">Zdravotní a bezpečnostní upozornění</h1>
        <p className="text-sm text-gray-400 mb-8">Platné pro rok 2026</p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-brand-dark [&_h2]:mt-8 [&_h2]:mb-2 [&_strong]:text-brand-dark [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">

          <h2>Co POHYB DOMA je – a co není</h2>
          <p>
            POHYB DOMA poskytuje <strong>pohybovou edukaci, kondiční a tréninkové vedení</strong>.
            Jde o trénink a vzdělávání v oblasti pohybu, <strong>nikoliv o zdravotní službu</strong>.
            Obsah, videa, kurzy ani lekce <strong>nenahrazují</strong> vyšetření, diagnózu, léčbu ani
            fyzioterapeutickou péči a nelze je za ně zaměňovat.
          </p>
          <p>
            Provozovatel je <strong>vystudovaný pedagog a licencovaný trenér</strong> (nikoliv lékař ani
            fyzioterapeut). Veškerá doporučení mají charakter pohybového tréninku a edukace.
          </p>

          <h2>Cvičíš na vlastní odpovědnost</h2>
          <p>
            Účastí na cvičení bereš na vědomí, že cvičíš dobrovolně a na vlastní odpovědnost, v rozsahu
            svých aktuálních možností. <strong>Cvič vždy bez bolesti</strong> – ostrá nebo vystřelující
            bolest je signál okamžitě přestat.
          </p>

          <h2>Kdy se nejdřív poraď s lékařem nebo fyzioterapeutem</h2>
          <p>Před zahájením cvičení (nebo v jeho průběhu) vyhledej odborníka zejména pokud:</p>
          <ul>
            <li>máš <strong>akutní nebo silnou bolest</strong>, otok či omezení hybnosti,</li>
            <li>jsi <strong>po úrazu, operaci</strong> nebo v léčbě pohybového aparátu,</li>
            <li>cítíš <strong>vystřelující bolest, mravenčení, necitlivost nebo slabost</strong> končetiny,</li>
            <li>jsi <strong>těhotná nebo krátce po porodu</strong> (zvlášť u cvičení pánevního dna a břicha),</li>
            <li>máš <strong>chronické či závažné onemocnění</strong> (srdce, krevní tlak, neurologické potíže, závratě),</li>
            <li>si <strong>nejsi jistý/á</strong>, zda je daný pohyb pro tebe vhodný.</li>
          </ul>

          <h2>Kontraindikace u konkrétního obsahu</h2>
          <p>
            U vybraných videí a kurzů (typicky témata jako záda, koleno, rameno, pánevní dno či návrat
            do pohybu po zranění) najdeš konkrétní upozornění „<strong>Než začneš cvičit</strong>".
            Vždy si ho přečti. Cvičení na dálku probíhá bez přímé kontroly provedení – o to víc dbej na
            techniku a vlastní pocity.
          </p>

          <h2>Vyhledej okamžitě lékařskou pomoc</h2>
          <p>
            Pokud během cvičení pocítíš bolest na hrudi, dušnost, závrať, mdloby nebo náhlou silnou bolest,
            cvičení <strong>okamžitě přeruš</strong> a vyhledej lékařskou pomoc.
          </p>

          <h2>Omezení odpovědnosti</h2>
          <p>
            V rozsahu povoleném právními předpisy provozovatel neodpovídá za újmu vzniklou nesprávným
            provedením cviků, cvičením přes bolest nebo cvičením navzdory zdravotnímu stavu, který cvičení
            nedovoloval. Dbej na svoje hranice a v případě pochybností se poraď s odborníkem.
          </p>

          <p className="text-xs text-gray-400 pt-6 border-t border-gray-100">
            Toto upozornění doplňuje Obchodní podmínky a Zásady ochrany osobních údajů.
          </p>
        </div>
      </div>
    </div>
  );
}
