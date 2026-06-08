"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Send, Sparkles } from "lucide-react";

const NAME = "Jeník";
const AVATAR_SRC = "/asistent.png"; // tvoje miniatura (PNG, ideálně průhledné pozadí)

type LinkRef = { label: string; href: string };
type Msg = { role: "user" | "assistant"; content: string; links?: LinkRef[] };

// ── Znalostní báze (zdarma, bez API) ─────────────────────────────────────────
type Faq = { keywords: string[]; answer: string; links?: LinkRef[] };

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const FAQS: Faq[] = [
  {
    keywords: ["ahoj", "cau", "cus", "dobry den", "zdravim", "hello", "hej"],
    answer: `Ahoj! Jsem ${NAME} 🤸 Rád ti pomůžu zorientovat se na POHYB DOMA. Vyber téma níže, nebo se zeptej vlastními slovy.`,
  },
  {
    keywords: ["dik", "diky", "dekuju", "dekuji", "super", "paráda", "parada"],
    answer: "Rádo se stalo! Kdyby bylo potřeba ještě s něčím poradit, jsem tu. 🙂",
  },
  {
    keywords: ["kdo jsi", "kdo seš", "co jsi", "jeník", "jenik", "kdo je honza", "lektor", "o tobe", "o tobě"],
    answer:
      "Jsem průvodce webem POHYB DOMA, který provozuje lektor pohybu Honza Schröffel. Pomůžu ti najít cvičení, vysvětlit funkce a poradit s účtem nebo rezervací.",
  },
  {
    keywords: ["clenstvi", "členství", "cena", "ceny", "kolik stoji", "kolik stojí", "predplatne", "předplatné", "member", "vip", "free", "tarif", "uroven", "úroveň", "platit"],
    answer:
      "Členství má úrovně FREE (zdarma, ukázky), MEMBER (přístup do videoknihovny), VIP (vedená cesta a víc obsahu) a VIP+ (navíc komunitní Klub). Přesné ceny a co je v každé úrovni najdeš na stránce Členství.",
    links: [{ label: "Zobrazit členství", href: "/clenstvi" }],
  },
  {
    keywords: ["daruj", "darovat", "darek", "dárek", "darovani", "darování"],
    answer:
      "Členství jde darovat jako dárek – a ten, kdo daruje, dostává měsíc MEMBER zdarma. Detaily najdeš u členství.",
    links: [{ label: "Členství", href: "/clenstvi" }],
  },
  {
    keywords: ["video", "videa", "knihovna", "cvik", "cviky", "cviceni", "cvičení", "najit", "najít", "filtr", "filtry", "hledat"],
    answer:
      "Cvičení najdeš ve Videoknihovně. Vlevo si zaškrtáš filtry (Část těla, Systém, Délka, Obtížnost, Co dům dá, Cíl, Vhodnost…) a klidně je kombinuj. Nahoře je i vyhledávání. Zamčená videa odemkne odpovídající členství.",
    links: [{ label: "Otevřít videoknihovnu", href: "/videoknihovna" }],
  },
  {
    keywords: ["kurz", "kurzy"],
    answer: "Kurzy jsou ucelené série lekcí (postupně se plní). Mrkni do sekce kurzů na webu.",
    links: [{ label: "Videoknihovna", href: "/videoknihovna" }],
  },
  {
    keywords: ["rezervace", "rezervovat", "objednat", "lekce", "termin", "termín", "online lekce", "osobne", "osobně", "schuzka", "schůzka"],
    answer:
      "Lekci si objednáš na stránce Rezervace – online (odkudkoliv) nebo osobně (ve spádové oblasti). Po odeslání ti přijde potvrzení e-mailem.",
    links: [{ label: "Rezervovat lekci", href: "/rezervace" }],
  },
  {
    keywords: ["zrusit", "zrušit", "storno", "presunout", "přesunout", "zrusit rezervaci"],
    answer:
      "Rezervaci zrušíš nebo přesuneš ve svém účtu (Moje cesta → Moje rezervace), nejpozději 24 hodin předem.",
    links: [{ label: "Můj účet", href: "/ucet" }],
  },
  {
    keywords: ["prihlasit", "přihlásit", "login", "registrace", "zaregistrovat", "ucet zalozit", "účet založit", "prihlaseni", "přihlášení"],
    answer: "Přihlásit se nebo zaregistrovat můžeš na stránce účtu.",
    links: [{ label: "Přihlášení / registrace", href: "/ucet" }],
  },
  {
    keywords: ["heslo", "zapomnel", "zapomněl", "reset hesla", "obnova hesla", "zapomenute"],
    answer:
      "Na přihlašovací stránce klikni na odkaz pro zapomenuté heslo – přijde ti e-mail s odkazem na nastavení nového hesla.",
    links: [{ label: "Obnova hesla", href: "/ucet" }],
  },
  {
    keywords: ["nastaveni", "nastavení", "zmenit", "změnit", "fotka", "profilova", "jmeno", "jméno", "profil"],
    answer:
      "Profilovou fotku, jméno i heslo si změníš ve svém účtu v sekci Nastavení.",
    links: [{ label: "Moje cesta", href: "/ucet" }],
  },
  {
    keywords: ["ucet", "účet", "moje cesta", "prehled", "přehled", "dashboard"],
    answer:
      "Tvůj přehled Moje cesta má dlaždice: moje videa, kurzy, rezervace (měsíční kalendář), stav členství, mé kruhy a můj deník – plus nastavení profilu.",
    links: [{ label: "Otevřít účet", href: "/ucet" }],
  },
  {
    keywords: ["denik", "deník", "sledovat", "vaha", "váha", "graf", "spanek", "spánek", "energie"],
    answer:
      "V Deníku si zapisuješ váhu, bolest, energii, spánek a trénink a vidíš svůj vývoj v přehledném grafu.",
    links: [{ label: "Můj deník", href: "/denik" }],
  },
  {
    keywords: ["kruh", "kruhy", "komunita", "skupina", "skupinka"],
    answer:
      "Kruhy jsou tematické komunitní skupinky. Připojit se může člen od úrovně MEMBER, vlastní kruh může založit VIP+.",
    links: [{ label: "Procházet kruhy", href: "/kruhy" }],
  },
  {
    keywords: ["klub", "vip+", "vip plus"],
    answer:
      "VIP+ Klub je komunitní prostor (zeď, chat a Q&A, kde odpovídá Honza). Je přístupný pro členy VIP+.",
    links: [{ label: "Členství", href: "/clenstvi" }],
  },
  {
    keywords: ["recenze", "ohlas", "hodnoceni", "hodnocení", "napsat recenzi", "reference"],
    answer:
      "Recenze najdeš na stránce Recenze. Vlastní ohlas může přidat člen od úrovně MEMBER (zobrazí se po schválení).",
    links: [{ label: "Recenze", href: "/recenze" }],
  },
  {
    keywords: ["oblibene", "oblíbené", "srdicko", "srdíčko", "ulozit video", "uložit video", "favorite"],
    answer: "U každého videa je srdíčko – uložená videa pak najdeš ve svém účtu mezi oblíbenými.",
    links: [{ label: "Můj účet", href: "/ucet" }],
  },
  {
    keywords: ["bolest", "boli", "bolí", "zdravi", "zdraví", "doktor", "fyzio", "zraneni", "zranění", "tehotenstvi", "těhotenství", "kontraindikace"],
    answer:
      "Nejsem zdravotník a nemůžu radit s konkrétní bolestí nebo diagnózou. Při zdravotních potížích se prosím poraď s lékařem či fyzioterapeutem. Důležité informace najdeš v Zdravotním upozornění.",
    links: [{ label: "Zdravotní upozornění", href: "/zdravotni-upozorneni" }],
  },
  {
    keywords: ["kontakt", "napsat", "email", "e-mail", "telefon", "spojit", "dotaz", "ozvat"],
    answer: "Napsat Honzovi můžeš přes kontaktní stránku – rád ti odpoví.",
    links: [{ label: "Kontakt", href: "/kontakt" }],
  },
];

const FALLBACK: Msg = {
  role: "assistant",
  content:
    "Tohle přesně nevím 🙂 Zkus to říct jinak, vyber téma z nabídky, nebo napiš přímo Honzovi přes kontakt.",
  links: [{ label: "Kontakt", href: "/kontakt" }],
};

const SUGGESTIONS = ["Členství", "Najít cvičení", "Rezervovat lekci", "Můj účet", "Zapomenuté heslo", "Kontakt"];

function answerFor(text: string): Msg {
  const q = norm(text);
  let best: Faq | null = null;
  let bestScore = 0;
  for (const f of FAQS) {
    let score = 0;
    for (const kw of f.keywords) if (q.includes(norm(kw))) score++;
    if (score > bestScore) { bestScore = score; best = f; }
  }
  if (!best) return FALLBACK;
  return { role: "assistant", content: best.answer, links: best.links };
}

const WELCOME: Msg = {
  role: "assistant",
  content: `Ahoj, jsem ${NAME} 🤸 Pomůžu ti najít se na POHYB DOMA. Vyber téma, nebo se zeptej.`,
};

function Avatar({ className = "" }: { className?: string }) {
  const [ok, setOk] = useState(true);
  if (ok) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={AVATAR_SRC} alt={NAME} onError={() => setOk(false)} className={`object-cover ${className}`} />
    );
  }
  return (
    <span className={`flex items-center justify-center bg-brand-blue text-white ${className}`}>
      <Sparkles className="h-1/2 w-1/2" />
    </span>
  );
}

export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open, typing]);

  function ask(text: string) {
    const t = text.trim();
    if (!t || typing) return;
    setMsgs((m) => [...m, { role: "user", content: t }]);
    setInput("");
    setTyping(true);
    // krátká prodleva pro „živý" pocit
    setTimeout(() => {
      setMsgs((m) => [...m, answerFor(t)]);
      setTyping(false);
    }, 450);
  }

  return (
    <>
      <style>{`
        @keyframes pd-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        .pd-float{ animation: pd-float 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce){ .pd-float{ animation:none } }
      `}</style>

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Zeptej se – ${NAME}`}
          className="group fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-white py-2 pl-2 pr-4 shadow-xl ring-1 ring-black/5 transition-transform hover:scale-105"
        >
          <span className="pd-float relative flex h-11 w-11 overflow-hidden rounded-full ring-2 ring-brand-blue/30">
            <Avatar className="h-full w-full" />
          </span>
          <span className="text-sm font-semibold text-brand-dark">Poradím ti 👋</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
          {/* Hlavička */}
          <div className="flex items-center gap-3 bg-brand-dark px-4 py-3 text-white">
            <span className="pd-float flex h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/30">
              <Avatar className="h-full w-full" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-tight">{NAME}</p>
              <p className="text-[11px] text-white/70 leading-tight">Průvodce webem POHYB DOMA</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Zavřít" className="text-white/80 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Zprávy */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-brand-light/40 p-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%]">
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-brand-blue text-white rounded-br-sm"
                        : "bg-white text-brand-dark ring-1 ring-gray-200 rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.links && m.links.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.links.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          onClick={() => setOpen(false)}
                          className="rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue hover:bg-brand-blue/20"
                        >
                          {l.label} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-gray-400 ring-1 ring-gray-200">
                  {NAME} píše…
                </div>
              </div>
            )}
          </div>

          {/* Rychlé volby */}
          <div className="flex flex-wrap gap-1.5 border-t border-gray-100 px-3 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-brand-light hover:text-brand-blue"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Vstup */}
          <div className="flex items-center gap-2 p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ask(input); }}
              placeholder="Napiš dotaz…"
              className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            <button
              type="button"
              onClick={() => ask(input)}
              disabled={typing || !input.trim()}
              aria-label="Odeslat"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
