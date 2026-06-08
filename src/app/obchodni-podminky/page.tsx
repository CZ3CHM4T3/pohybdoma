import type { Metadata } from "next";

export const metadata: Metadata = { title: "Obchodní podmínky" };

export default function ObchodniPodminkyPage() {
  return (
    <div className="min-h-screen bg-white py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-brand-dark mb-2">Obchodní podmínky</h1>
        <p className="text-sm text-gray-400 mb-8">Účinné od června 2026</p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-brand-dark [&_h2]:mt-8 [&_h2]:mb-2 [&_strong]:text-brand-dark [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">

          <h2>1. Úvodní ustanovení a provozovatel</h2>
          <p>
            Tyto obchodní podmínky upravují práva a povinnosti mezi provozovatelem webu
            <strong> pohybdoma.cz</strong> a uživatelem (zákazníkem). Provozovatel:
            <strong> Mgr. Jan Schröffel</strong>, IČO: <strong>045 31 817</strong>,
            se sídlem Chovatelů 159, 252 09 Hradištko, neplátce DPH, zapsán v živnostenském
            rejstříku. Kontakt: <a href="mailto:pohybdoma@seznam.cz" className="text-brand-blue hover:underline">pohybdoma@seznam.cz</a>.
            Vztahy se řídí právem ČR, zejm. zákonem č. 89/2012 Sb. (občanský zákoník) a zákonem č. 634/1992 Sb.
            (o ochraně spotřebitele).
          </p>

          <h2>2. Předmět a služby</h2>
          <p>Provozovatel nabízí:</p>
          <ul>
            <li><strong>Členství</strong> (MEMBER / VIP / VIP+) – opakované měsíční předplatné s přístupem k digitálnímu obsahu.</li>
            <li><strong>Videokurzy</strong> – jednorázově zakoupený digitální obsah.</li>
            <li><strong>Osobní a online lekce, konzultace, masáže, plány</strong> – služby rezervované přes web.</li>
          </ul>

          <h2>3. Objednávka a vznik smlouvy</h2>
          <p>
            Smlouva vzniká dokončením objednávky (potvrzením a u placených služeb zaplacením), případně
            potvrzením rezervace ze strany provozovatele. Zákazník před dokončením stvrzuje seznámení
            s těmito podmínkami.
          </p>

          <h2>4. Ceny a platby</h2>
          <p>
            Ceny jsou uvedené u jednotlivých služeb v Kč (provozovatel je neplátce DPH).
            Platby zpracovává platební brána <strong>Stripe</strong> (po spuštění plateb).
            Doklad je vystaven provozovatelem a zaslán e-mailem. Členství je opakovaná platba,
            která se automaticky obnovuje vždy na další období, dokud ji zákazník nezruší.
          </p>

          <h2>5. Členství a jeho zrušení</h2>
          <p>
            Členství lze kdykoliv zrušit ve svém účtu; přístup zůstává aktivní do konce již zaplaceného
            období a další platba se nestrhne. Již zaplacené období se nevrací (není-li dále uvedeno jinak).
          </p>

          <h2>6. Dodání digitálního obsahu</h2>
          <p>
            Digitální obsah (videa, kurzy, členská sekce) je zpřístupněn online ihned po zaplacení,
            resp. po aktivaci účtu.
          </p>

          <h2>7. Odstoupení od smlouvy (spotřebitel)</h2>
          <p>
            Spotřebitel má právo odstoupit od smlouvy do <strong>14 dnů</strong> bez udání důvodu.
            U <strong>digitálního obsahu</strong> (videa, kurzy, členství) ale platí: požádáš-li o zpřístupnění
            obsahu před uplynutím lhůty a výslovně odsouhlasíš zahájení plnění, bereš na vědomí, že tím
            <strong> ztrácíš právo na odstoupení</strong> (§ 1837 obč. zák.). U <strong>rezervovaných lekcí/služeb</strong>
            se postupuje dle storno pravidel níže.
          </p>

          <h2>8. Storno rezervací</h2>
          <p>
            Rezervovaný termín lze zrušit či přesunout nejpozději <strong>24 hodin předem</strong>.
            Při pozdějším zrušení nebo nedostavení se může cena propadnout. Konkrétní podmínky jsou
            uvedeny u rezervace.
          </p>

          <h2>9. Reklamace a odpovědnost za vady</h2>
          <p>
            Práva z vadného plnění se řídí občanským zákoníkem. Reklamaci uplatni e-mailem na
            <a href="mailto:pohybdoma@seznam.cz" className="text-brand-blue hover:underline"> pohybdoma@seznam.cz</a>;
            vyřídím ji bez zbytečného odkladu, nejpozději do 30 dnů.
          </p>

          <h2>10. Charakter služby (důležité)</h2>
          <p>
            Obsah a služby mají povahu pohybové edukace a kondičního vedení a <strong>nenahrazují
            lékařskou ani fyzioterapeutickou péči</strong>. Viz zdravotní upozornění v patičce webu.
            Cvičíš na vlastní odpovědnost v rozsahu svých možností.
          </p>

          <h2>11. Mimosoudní řešení sporů</h2>
          <p>
            K mimosoudnímu řešení spotřebitelských sporů je příslušná <strong>Česká obchodní inspekce</strong>
            (<a href="https://www.coi.cz" className="text-brand-blue hover:underline" target="_blank" rel="noopener">coi.cz</a>).
          </p>

          <h2>12. Závěrečná ustanovení</h2>
          <p>
            Provozovatel může podmínky měnit; pro již uzavřené smlouvy platí znění účinné v době objednávky.
            Ochranu osobních údajů řeší samostatný dokument GDPR.
          </p>

          <p className="text-xs text-gray-400 pt-6 border-t border-gray-100">
            Tento dokument je vzorový. Před spuštěním plateb doporučujeme kontrolu právníkem a doplnění
            míst [DOPLŇ …] (zejm. identifikace, platební brána, fakturační systém).
          </p>
        </div>
      </div>
    </div>
  );
}
