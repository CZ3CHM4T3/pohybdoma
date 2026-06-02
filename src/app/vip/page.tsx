import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "VIP Zóna",
  description: "Exkluzivní obsah pro VIP členy – videokurzy, živé streamy a přímý chat.",
};

const VIP_SECTIONS = [
  { icon: "🎬", title: "VIP Videoknihovna", desc: "Vaše VIP a VIP PLUS videa na jednom místě.", href: "/videoknihovna", cta: "Otevřít" },
  { icon: "📚", title: "VIP Kurzy", desc: "Prémiové videokurzy se slevou pro VIP členy.", href: "/kurzy", cta: "Kurzy" },
  { icon: "💬", title: "Přímý chat", desc: "Napište mi přímo – odpovídám do 24 hodin. (VIP PLUS)", href: "#", cta: "Brzy" },
  { icon: "📡", title: "Živé streamy", desc: "Záznamy a přístupy k živým tréninkům. (VIP PLUS)", href: "#", cta: "Brzy" },
];

export default function VipPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-dark to-[#1256c0] text-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block bg-brand-blue/30 text-white text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
            VIP Zóna
          </span>
          <h1 className="text-4xl lg:text-5xl font-semibold mb-4">Vítejte ve VIP</h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Tato sekce je určena pro VIP a VIP PLUS členy. Přihlašování a napojení na Supabase bude brzy.
          </p>
        </div>
      </section>

      {/* Placeholder content */}
      <section className="bg-brand-light py-12 lg:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Auth placeholder */}
          <div className="card p-8 mb-10 text-center border-2 border-dashed border-brand-blue/30">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-xl font-semibold text-brand-dark mb-2">Přihlašování bude brzy</h2>
            <p className="text-gray-600 text-sm mb-5 max-w-sm mx-auto">
              Auth bude napojeno na Supabase. Uživatelé s rolí MEMBER / VIP / VIP_PLUS uvidí odpovídající obsah.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/ucet" className="btn-primary text-sm">Přihlásit se (UI)</Link>
              <Link href="/clenstvi" className="btn-outline text-sm">Stát se členem</Link>
            </div>
          </div>

          {/* Section cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {VIP_SECTIONS.map((s) => (
              <div key={s.title} className="card p-6 flex items-start gap-4">
                <div className="text-3xl">{s.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-brand-dark mb-1">{s.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{s.desc}</p>
                  <Link
                    href={s.href}
                    className={s.cta === "Brzy" ? "text-xs text-gray-400 font-semibold" : "text-sm text-brand-blue font-semibold hover:underline"}
                  >
                    {s.cta === "Brzy" ? "Již brzy →" : `${s.cta} →`}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
