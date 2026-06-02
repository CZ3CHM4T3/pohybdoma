"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_OPEN_SLOTS } from "@/lib/mock-data";
import type { OpenSlot } from "@/types";
import { SectionHeading } from "@/components/ui/SectionHeading";

const TYPE_LABELS: Record<OpenSlot["type"], string> = {
  online: "Online (video hovor)",
  domů: "Příjezd k vám domů",
  "na místě": "Na dohodnutém místě",
};

const TYPE_ICONS: Record<OpenSlot["type"], string> = {
  online: "💻",
  domů: "🏠",
  "na místě": "📍",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

export default function OsobniLekcePage() {
  const [selectedSlot, setSelectedSlot] = useState<OpenSlot | null>(null);
  const [address, setAddress] = useState("");
  const [problem, setProblem] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const available = MOCK_OPEN_SLOTS.filter((s) => !s.isBooked);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-light py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-3">Osobní lekce</p>
            <h1 className="text-4xl lg:text-5xl font-semibold text-brand-dark leading-tight mb-6">
              Cvičení přesně<br />pro vaše tělo
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Osobní lekce probíhají online přes video hovor, nebo mohu přijet přímo k vám domů. Každá lekce je sestavena na míru – podle vaší situace, bolestí a cílů.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading label="Jak to probíhá" title="3 jednoduché kroky" />
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Vyberete termín", desc: "Vyberte z dostupných termínů níže ten, který vám vyhovuje." },
              { step: "2", title: "Popíšete problém", desc: "Napíšete, co vás trápí a co od lekce očekáváte. Přijdu připravený." },
              { step: "3", title: "Cvičíme", desc: "Online nebo u vás doma – lekce trvá 60–90 minut a odcházíte s plánem." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center font-semibold text-lg">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-brand-dark mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slot picker + form */}
      <section className="bg-brand-light py-12 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading label="Rezervace" title="Dostupné termíny" />

          {/* Slots grid */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {available.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => { setSelectedSlot(slot); setSubmitted(false); }}
                className={`card p-4 text-left transition-all ${
                  selectedSlot?.id === slot.id
                    ? "ring-2 ring-brand-blue shadow-lg"
                    : "hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-xl">{TYPE_ICONS[slot.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-dark text-sm capitalize">{formatDate(slot.dateTime)}</p>
                    <p className="text-brand-blue font-semibold">{formatTime(slot.dateTime)} – {slot.durationMinutes} min</p>
                    <p className="text-xs text-gray-500 mt-0.5">{TYPE_LABELS[slot.type]}</p>
                  </div>
                  {selectedSlot?.id === slot.id && (
                    <div className="shrink-0 w-5 h-5 rounded-full bg-brand-blue flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Booking form */}
          {selectedSlot && !submitted && (
            <form onSubmit={handleSubmit} className="mt-10 card p-6 lg:p-8">
              <h3 className="text-lg font-semibold text-brand-dark mb-6">
                Rezervace – {formatDate(selectedSlot.dateTime)}, {formatTime(selectedSlot.dateTime)}
              </h3>

              {selectedSlot.type !== "online" && (
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-brand-dark mb-2" htmlFor="address">
                    Vaše adresa
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ulice, číslo, město"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                  />
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-semibold text-brand-dark mb-2" htmlFor="problem">
                  Popis problému / cíle
                </label>
                <textarea
                  id="problem"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  rows={4}
                  required
                  placeholder="Co vás trápí? Bolesti, omezení pohybu, cíle… Čím více napíšete, tím lépe se připravím."
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm resize-none"
                />
              </div>

              <div className="p-4 rounded-lg bg-brand-light border border-brand-blue/20 mb-6 text-sm text-brand-dark">
                <strong>Cena:</strong> [placeholder – bude doplněno] Kč / lekce<br />
                <span className="text-gray-500">Platba bude probíhat přes platební bránu po potvrzení rezervace.</span>
              </div>

              <button type="submit" className="btn-primary w-full">
                Rezervovat a zaplatit
                <span className="text-white/70 font-normal text-xs ml-1">(platba zatím neaktivní)</span>
              </button>
            </form>
          )}

          {submitted && (
            <div className="mt-10 card p-8 text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-brand-dark mb-2">Rezervace odeslána!</h3>
              <p className="text-gray-600">
                Brzy se vám ozvu s potvrzením. Těším se na lekci!
              </p>
              <button onClick={() => { setSelectedSlot(null); setSubmitted(false); setAddress(""); setProblem(""); }} className="btn-outline mt-6 text-sm">
                Rezervovat další termín
              </button>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading label="Časté dotazy" title="Ještě otázky?" />
          <div className="mt-8 space-y-4">
            {[
              { q: "Co potřebuji na online lekci?", a: "Stačí podložka, trochu prostoru (cca 2×2 m) a video hovor (Google Meet / Zoom). Předem vám zašlu odkaz." },
              { q: "Mohu cvičit i bez předchozích zkušeností?", a: "Ano. Lekce přizpůsobuji vaší aktuální kondici a pohybovým zkušenostem. Začínáme tam, kde jste." },
              { q: "Jak zrušit nebo přesunout termín?", a: "Termín lze přesunout nejpozději 24 hodin předem. Napište mi na [email] – placeholder." },
              { q: "Pomůže mi to i s chronickými bolestmi?", a: "Pohybová terapie pomáhá v mnoha případech chronických bolestí. Ale nejsem lékař – v případě akutní bolesti navštivte nejdříve lékaře." },
            ].map((item) => (
              <details key={item.q} className="card p-5 group">
                <summary className="cursor-pointer font-semibold text-brand-dark text-sm flex justify-between items-center gap-2">
                  {item.q}
                  <span className="shrink-0 text-brand-blue transition-transform group-open:rotate-180">▼</span>
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
