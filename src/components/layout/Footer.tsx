import Image from "next/image";
import Link from "next/link";

const FOOTER_LINKS = {
  navigace: [
    { href: "/o-mne", label: "O mně" },
    { href: "/rezervace", label: "Rezervace" },
    { href: "/videoknihovna", label: "Knihovna pohybu" },
    { href: "/kurzy", label: "Kurzy" },
    { href: "/clenstvi", label: "Členství" },
    { href: "/recenze", label: "Recenze" },
    { href: "/blog", label: "Blog" },
  ],
  legal: [
    { href: "/obchodni-podminky", label: "Obchodní podmínky" },
    { href: "/gdpr", label: "GDPR & Ochrana dat" },
    { href: "/zdravotni-upozorneni", label: "Zdravotní upozornění" },
    { href: "/kontakt", label: "Kontakt" },
  ],
};


export function Footer() {
  return (
    <footer className="bg-brand-dark text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 lg:pt-16 pb-24 lg:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
          {/* Brand column */}
          <div>
            <Link
              href="/"
              aria-label="POHYB DOMA – domů"
              className="inline-flex rounded-xl bg-white px-3 py-2 shadow-sm"
            >
              <Image
                src="/LOGO.png"
                alt="POHYB DOMA"
                width={140}
                height={48}
                className="h-9 w-auto object-contain"
              />
            </Link>
            <p className="mt-4 text-sm text-white/70 leading-relaxed">
              Cvič doma. Naprav si tělo.<br />Rostu na pohybové cestě.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://www.instagram.com/pohybdoma/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram @pohybdoma"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 hover:bg-brand-blue transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                </svg>
                <span className="text-xs font-semibold">@pohybdoma</span>
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-white/50 mb-4">
              Navigace
            </h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.navigace.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/80 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-white/50 mb-4">
              Právní informace
            </h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/80 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Zdravotní upozornění */}
        <div className="mt-12 pt-6 border-t border-white/10">
          <p className="text-xs text-white/55 leading-relaxed max-w-3xl">
            <strong className="text-white/80">Zdravotní upozornění:</strong> POHYB DOMA poskytuje pohybovou
            edukaci a kondiční vedení. Nejde o zdravotní službu a obsah nenahrazuje péči lékaře ani
            fyzioterapeuta. Při akutní či silné bolesti, po úrazu nebo operaci, v těhotenství a po porodu
            nebo při zdravotních potížích (vystřelující bolest, mravenčení, závratě) se nejdřív poraď
            s odborníkem. Cvič vždy v rozsahu bez bolesti – ostrá bolest je signál přestat.
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/40">
          <p>© {new Date().getFullYear()} POHYB DOMA. Všechna práva vyhrazena.</p>
          <p>pohybdoma.cz</p>
        </div>
      </div>
    </footer>
  );
}
