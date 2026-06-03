import Image from "next/image";
import Link from "next/link";

const FOOTER_LINKS = {
  navigace: [
    { href: "/o-mne", label: "O mně" },
    { href: "/osobni-lekce", label: "Osobní lekce" },
    { href: "/videoknihovna", label: "Videoknihovna" },
    { href: "/kurzy", label: "Kurzy" },
    { href: "/clenstvi", label: "Členství" },
  ],
  legal: [
    { href: "/obchodni-podminky", label: "Obchodní podmínky" },
    { href: "/gdpr", label: "GDPR & Ochrana dat" },
    { href: "/kontakt", label: "Kontakt" },
  ],
};

const SOCIAL_LINKS = [
  { href: "#", label: "Instagram", icon: "IG" },
  { href: "#", label: "YouTube", icon: "YT" },
  { href: "#", label: "Facebook", icon: "FB" },
];

export function Footer() {
  return (
    <footer className="bg-brand-dark text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
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
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-brand-blue flex items-center justify-center text-xs font-bold transition-colors"
                >
                  {s.icon}
                </a>
              ))}
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

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/40">
          <p>© {new Date().getFullYear()} POHYB DOMA. Všechna práva vyhrazena.</p>
          <p>pohybdoma.cz</p>
        </div>
      </div>
    </footer>
  );
}
