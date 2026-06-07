"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { normalizeTier } from "@/lib/tiers";
import type { User } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/", label: "Domů" },
  { href: "/o-mne", label: "O mně" },
  { href: "/rezervace", label: "Rezervace" },
  { href: "/videoknihovna", label: "Knihovna pohybu" },
  { href: "/kurzy", label: "Kurzy" },
  { href: "/clenstvi", label: "Členství" },
  { href: "/blog", label: "Blog" },
  { href: "/ucet", label: "Účet" },
];

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClub, setIsClub] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [authUser, setAuthUser] = useState<User | null>(null);

  // Pozor: uvnitř onAuthStateChange se NESMÍ volat awaitnutý dotaz do DB
  // (Supabase drží zámek → deadlock). Proto tady jen nastavíme uživatele
  // a úroveň členství dotáhneme v samostatném efektu níže.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setAuthUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthUser(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setSignedIn(!!authUser);
    const admin = isAdminEmail(authUser?.email);
    setIsAdmin(admin);
    if (!authUser) { setIsClub(false); return; }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("tier")
      .eq("id", authUser.id)
      .maybeSingle()
      .then(({ data }) =>
        setIsClub(admin || normalizeTier(data?.tier as string | undefined) === "VIP_PLUS")
      );
  }, [authUser]);

  return (
    <header
      className={`sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b transition-shadow duration-300 ${
        scrolled
          ? "border-gray-200 shadow-md"
          : "border-gray-100 shadow-sm"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between gap-4 transition-all duration-300 ${
            scrolled ? "h-14" : "h-16"
          }`}
        >
          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center" aria-label="POHYB DOMA – domovská stránka">
            <Image
              src="/LOGO.png"
              alt="POHYB DOMA"
              width={140}
              height={48}
              className={`w-auto object-contain transition-all duration-300 ${
                scrolled ? "h-8" : "h-10"
              }`}
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Hlavní navigace">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors ${
                    active
                      ? "text-brand-blue bg-brand-light"
                      : "text-brand-dark hover:text-brand-blue hover:bg-brand-light"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
            {isClub && (
              <Link
                href="/klub"
                className={`px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors inline-flex items-center gap-1.5 ${
                  pathname.startsWith("/klub")
                    ? "text-white bg-amber-500"
                    : "text-amber-700 hover:text-white hover:bg-amber-500"
                }`}
              >
                <Crown className="h-4 w-4" strokeWidth={2} /> Klub
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors ${
                  pathname.startsWith("/admin")
                    ? "text-white bg-brand-dark"
                    : "text-brand-dark hover:text-white hover:bg-brand-dark"
                }`}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* CTA + hamburger */}
          <div className="flex items-center gap-3">
            {signedIn ? (
              <Link
                href="/ucet"
                className="hidden sm:inline-flex items-center gap-2 rounded-lg border-2 border-brand-blue px-4 py-1.5 text-sm font-semibold text-brand-blue hover:bg-brand-light transition-colors"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue text-[11px] text-white">✓</span>
                Můj účet
              </Link>
            ) : (
              <Link
                href="/clenstvi"
                className="hidden sm:inline-flex btn-primary text-sm py-2 px-4"
              >
                Začít hned
              </Link>
            )}

            {/* Hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg text-brand-dark hover:bg-brand-light transition-colors"
              aria-expanded={menuOpen}
              aria-label="Otevřít menu"
            >
              <span className="block w-5 h-0.5 bg-current mb-1 transition-transform" style={{ transform: menuOpen ? "rotate(45deg) translate(2px, 6px)" : "" }} />
              <span className="block w-5 h-0.5 bg-current mb-1 transition-opacity" style={{ opacity: menuOpen ? 0 : 1 }} />
              <span className="block w-5 h-0.5 bg-current transition-transform" style={{ transform: menuOpen ? "rotate(-45deg) translate(2px, -6px)" : "" }} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="lg:hidden pb-4 border-t border-gray-100 pt-3" aria-label="Mobilní navigace">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-semibold tracking-wide transition-colors ${
                    active
                      ? "text-brand-blue bg-brand-light"
                      : "text-brand-dark hover:text-brand-blue hover:bg-brand-light"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
            {isClub && (
              <Link
                href="/klub"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-1.5 px-4 py-3 rounded-lg text-sm font-semibold tracking-wide text-amber-700 hover:bg-amber-50"
              >
                <Crown className="h-4 w-4" strokeWidth={2} /> Klub
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 rounded-lg text-sm font-semibold tracking-wide text-brand-dark hover:bg-brand-light"
              >
                Admin
              </Link>
            )}
            <div className="mt-3 px-4">
              <Link href="/clenstvi" onClick={() => setMenuOpen(false)} className="btn-primary w-full text-sm">
                Začít hned
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
