import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ochrana osobních údajů (GDPR)" };

export default function GdprPage() {
  return (
    <div className="min-h-screen bg-white py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-brand-dark mb-2">Zásady ochrany osobních údajů</h1>
        <p className="text-sm text-gray-400 mb-8">Účinné od [DOPLŇ datum] · ve znění platném pro rok 2026</p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-brand-dark [&_h2]:mt-8 [&_h2]:mb-2 [&_strong]:text-brand-dark [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">

          <p>
            Tyto zásady popisují, jak nakládám s tvými osobními údaji při provozu webu
            <strong> pohybdoma.cz</strong>. Zpracování probíhá v souladu s Nařízením (EU) 2016/679 (GDPR)
            a zákonem č. 110/2019 Sb., o zpracování osobních údajů.
          </p>

          <h2>1. Správce údajů</h2>
          <p>
            Správcem je <strong>[DOPLŇ jméno / název]</strong>, [DOPLŇ OSVČ / právní forma],
            IČO: <strong>[DOPLŇ IČO]</strong>, se sídlem [DOPLŇ adresa sídla].
            Kontakt: <a href="mailto:pohybdoma@seznam.cz" className="text-brand-blue hover:underline">pohybdoma@seznam.cz</a>.
          </p>

          <h2>2. Jaké údaje zpracovávám</h2>
          <ul>
            <li><strong>Registrace a účet:</strong> e-mail, jméno, heslo (v zašifrované podobě), profilová fotka (nahraješ-li ji).</li>
            <li><strong>Rezervace:</strong> jméno, e-mail, telefon, obec a adresa (u osobních lekcí), důvod/popis obtíží, který sám uvedeš.</li>
            <li><strong>Členství a platby:</strong> zvolená úroveň, historie plateb (platbu zpracovává platební brána, viz níže).</li>
            <li><strong>Deník a postup:</strong> údaje, které si sám dobrovolně zapíšeš (váha, spánek, bolest, energie, poznámky).</li>
            <li><strong>Newsletter:</strong> e-mail (jen pokud se přihlásíš k odběru).</li>
            <li><strong>Technické údaje:</strong> IP adresa, typ zařízení a prohlížeče, základní logy (nezbytné pro provoz a bezpečnost).</li>
          </ul>
          <p className="text-gray-500">
            Údaje o zdraví (např. popis obtíží, deník) jsou zvláštní kategorií údajů a zpracovávám je
            pouze na základě tvého souhlasu, výhradně pro účel poskytnutí služby.
          </p>

          <h2>3. Účely a právní základ</h2>
          <ul>
            <li><strong>Plnění smlouvy</strong> (čl. 6/1/b) – vedení účtu, rezervace, členství, poskytnutí obsahu.</li>
            <li><strong>Souhlas</strong> (čl. 6/1/a, u zdravotních údajů čl. 9/2/a) – newsletter, deník a údaje o obtížích. Souhlas lze kdykoliv odvolat.</li>
            <li><strong>Oprávněný zájem</strong> (čl. 6/1/f) – zabezpečení webu, prevence zneužití.</li>
            <li><strong>Právní povinnost</strong> (čl. 6/1/c) – účetní a daňové doklady.</li>
          </ul>

          <h2>4. Příjemci a zpracovatelé</h2>
          <p>Pro provoz využívám prověřené zpracovatele, s nimiž mám uzavřené zpracovatelské smlouvy:</p>
          <ul>
            <li><strong>Supabase</strong> – databáze a přihlašování (hosting EU).</li>
            <li><strong>Vercel</strong> – hosting webu.</li>
            <li><strong>Resend</strong> – odesílání e-mailů (potvrzení, upozornění).</li>
            <li><strong>Ecomail</strong> – rozesílka newsletteru.</li>
            <li><strong>[DOPLŇ platební brána, např. Stripe / GoPay]</strong> – zpracování plateb.</li>
            <li><strong>[DOPLŇ fakturační / účetní systém]</strong> – vystavování dokladů.</li>
          </ul>
          <p>Někteří zpracovatelé mohou údaje zpracovávat i mimo EU; v takovém případě je zajištěna odpovídající ochrana (standardní smluvní doložky EU).</p>

          <h2>5. Doba uchování</h2>
          <p>
            Údaje uchovávám po dobu trvání účtu a poté po nezbytnou dobu danou zákonem
            (účetní doklady 10 let). Newsletter do odhlášení. Údaje vázané na souhlas do jeho odvolání.
          </p>

          <h2>6. Tvoje práva</h2>
          <ul>
            <li>právo na přístup k údajům a jejich kopii,</li>
            <li>právo na opravu a doplnění,</li>
            <li>právo na výmaz („být zapomenut"),</li>
            <li>právo na omezení zpracování a právo vznést námitku,</li>
            <li>právo na přenositelnost údajů,</li>
            <li>právo kdykoliv odvolat souhlas,</li>
            <li>právo podat stížnost u <strong>Úřadu pro ochranu osobních údajů</strong> (uoou.gov.cz).</li>
          </ul>
          <p>Práva uplatníš e-mailem na <a href="mailto:pohybdoma@seznam.cz" className="text-brand-blue hover:underline">pohybdoma@seznam.cz</a>.</p>

          <h2>7. Cookies</h2>
          <p>
            Web používá nezbytné cookies pro přihlášení a základní fungování. Analytické či marketingové
            cookies používám jen s tvým souhlasem [DOPLŇ dle reálného nasazení]. Nastavení cookies lze
            kdykoliv změnit ve svém prohlížeči.
          </p>

          <p className="text-xs text-gray-400 pt-6 border-t border-gray-100">
            Tento dokument je vzorový a před spuštěním plateb doporučujeme nechat zkontrolovat právníkem
            a doplnit označená místa [DOPLŇ …].
          </p>
        </div>
      </div>
    </div>
  );
}
