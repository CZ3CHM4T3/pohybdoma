"use client";

import { useMemo, useState } from "react";
import {
  SERVICES,
  SERVICE_AREA,
  HOME_BASE,
  getAvailableTimes,
  hasAvailability,
} from "@/lib/mock-data";
import type { Service } from "@/types";
import { SectionHeading } from "@/components/ui/SectionHeading";

const MONTHS_CS = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];
const WEEKDAYS_CS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const OTHER = "__other__";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
/** 6týdenní mřížka začínající pondělím. */
function buildCalendar(view: Date): Date[] {
  const first = startOfMonth(view);
  // JS: neděle=0; chceme pondělí=0
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function RezervacePage() {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const minMonth = useMemo(() => startOfMonth(today), [today]);
  const maxMonth = useMemo(() => addMonths(minMonth, 11), [minMonth]);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(minMonth);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [municipality, setMunicipality] = useState("");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const service: Service | null =
    SERVICES.find((s) => s.id === serviceId) ?? null;
  const isInPerson = service?.mode === "inPerson";

  const days = useMemo(() => buildCalendar(viewMonth), [viewMonth]);
  const times = selectedDate ? getAvailableTimes(selectedDate) : [];

  const canPrev = startOfMonth(viewMonth) > minMonth;
  const canNext = startOfMonth(viewMonth) < maxMonth;

  // Pro osobní lekce: vybraná obec musí být ve spádové oblasti.
  const municipalityInvalid = isInPerson && municipality === OTHER;
  const formValid =
    !!service &&
    !!selectedDate &&
    !!selectedTime &&
    reason.trim().length > 0 &&
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    (!isInPerson || (municipality !== "" && municipality !== OTHER && address.trim().length > 0));

  function resetDateTime() {
    setSelectedDate(null);
    setSelectedTime(null);
  }

  function handleSelectService(id: string) {
    setServiceId(id);
    setSubmitted(false);
    resetDateTime();
    setMunicipality("");
    setAddress("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    setSubmitted(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetAll() {
    setServiceId(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setMunicipality("");
    setAddress("");
    setReason("");
    setName("");
    setEmail("");
    setPhone("");
    setSubmitted(false);
  }

  // ─── Úspěšná rezervace ───────────────────────────────────────────────
  if (submitted && service && selectedDate && selectedTime) {
    return (
      <section className="bg-brand-light py-20 lg:py-28">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <div className="card p-8 lg:p-10 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-semibold text-brand-dark mb-3">
              Rezervace odeslána!
            </h1>
            <div className="text-left bg-brand-light rounded-xl p-5 my-6 text-sm text-brand-dark space-y-1">
              <p><strong>Služba:</strong> {service.name}</p>
              <p>
                <strong>Termín:</strong>{" "}
                {selectedDate.toLocaleDateString("cs-CZ", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}{" "}v {selectedTime}
              </p>
              {isInPerson && <p><strong>Místo:</strong> {address}, {municipality}</p>}
              <p><strong>Cena:</strong> {service.priceKc} Kč</p>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Brzy se ti ozvu s potvrzením a platebními údaji. Těším se na pohyb!
            </p>
            <button onClick={resetAll} className="btn-outline text-sm">
              Vytvořit další rezervaci
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-light py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-3">
              Rezervace
            </p>
            <h1 className="text-4xl lg:text-5xl font-semibold text-brand-dark leading-tight mb-6">
              Rezervuj si svůj termín
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Vyber službu, termín v kalendáři a rezervuj. Online konzultace
              vedu odkudkoliv, na osobní lekce dojíždím po okolí Dobřichovic.
            </p>
          </div>

          {/* Spádová oblast */}
          <div className="mt-8 inline-flex max-w-2xl flex-wrap items-center gap-x-2 gap-y-2 rounded-2xl bg-white p-5 shadow-sm">
            <span className="text-xl">📍</span>
            <span className="text-sm font-semibold text-brand-dark">
              Osobní lekce – kam dojíždím:
            </span>
            {SERVICE_AREA.map((m) => (
              <span
                key={m}
                className="rounded-full bg-brand-light px-3 py-0.5 text-xs font-medium text-brand-blue"
              >
                {m}
              </span>
            ))}
            <span className="w-full text-xs text-gray-500 mt-1">
              Bydlíš jinde? Nevadí – využij <strong>online konzultaci</strong>, tu
              vedu po celé ČR.
            </span>
          </div>
        </div>
      </section>

      {/* Krok 1 – služba */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading label="Krok 1" title="Vyber službu" />
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((s) => {
              const active = serviceId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectService(s.id)}
                  className={`card p-6 text-left transition-all relative ${
                    active ? "ring-2 ring-brand-blue shadow-lg" : "hover:shadow-md"
                  }`}
                >
                  {s.highlighted && (
                    <span className="absolute top-4 right-4 rounded-full bg-brand-blue px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Oblíbené
                    </span>
                  )}
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold mb-3 ${
                      s.mode === "online"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-brand-light text-brand-blue"
                    }`}
                  >
                    {s.mode === "online" ? "💻 Online · odkudkoliv" : "🏠 Osobně · jen okolí"}
                  </span>
                  <h3 className="text-lg font-semibold text-brand-dark mb-1">{s.name}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{s.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xl font-semibold text-brand-dark">{s.priceKc} Kč</span>
                    <span className="text-xs text-gray-400">{s.durationMin} min</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Krok 2 – kalendář */}
      {service && (
        <section className="bg-brand-light py-12 lg:py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <SectionHeading label="Krok 2" title="Vyber termín" />

            <div className="mt-8 card p-5 lg:p-6">
              {/* Navigace měsíců */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  disabled={!canPrev}
                  onClick={() => { setViewMonth(addMonths(viewMonth, -1)); }}
                  className="p-2 rounded-lg text-brand-dark hover:bg-brand-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Předchozí měsíc"
                >
                  ←
                </button>
                <h3 className="font-semibold text-brand-dark capitalize">
                  {MONTHS_CS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                </h3>
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={() => { setViewMonth(addMonths(viewMonth, 1)); }}
                  className="p-2 rounded-lg text-brand-dark hover:bg-brand-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Další měsíc"
                >
                  →
                </button>
              </div>

              {/* Hlavička dnů */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS_CS.map((w) => (
                  <div key={w} className="text-center text-xs font-semibold text-gray-400 py-1">
                    {w}
                  </div>
                ))}
              </div>

              {/* Dny */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((d) => {
                  const inMonth = d.getMonth() === viewMonth.getMonth();
                  const isPast = d < today;
                  const free = inMonth && !isPast && hasAvailability(d);
                  const isSelected = selectedDate && sameDay(d, selectedDate);
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      disabled={!free}
                      onClick={() => { setSelectedDate(d); setSelectedTime(null); }}
                      className={`relative aspect-square rounded-lg text-sm font-medium transition-all ${
                        !inMonth
                          ? "text-gray-300"
                          : isSelected
                            ? "bg-brand-blue text-white shadow-md"
                            : free
                              ? "text-brand-dark hover:bg-brand-light"
                              : "text-gray-300 cursor-not-allowed"
                      }`}
                    >
                      {d.getDate()}
                      {free && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-blue" />
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-xs text-gray-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue inline-block" />
                Den s volným termínem
              </p>
            </div>

            {/* Časy */}
            {selectedDate && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-brand-dark mb-3 capitalize">
                  {selectedDate.toLocaleDateString("cs-CZ", {
                    weekday: "long", day: "numeric", month: "long",
                  })}
                </p>
                {times.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {times.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTime(t)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          selectedTime === t
                            ? "bg-brand-blue text-white shadow-md"
                            : "card hover:shadow-md text-brand-dark"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">V tento den nemám volný termín.</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Krok 3 – formulář */}
      {service && selectedDate && selectedTime && (
        <section className="bg-white py-12 lg:py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <SectionHeading label="Krok 3" title="Dokonči rezervaci" />

            <form onSubmit={handleSubmit} className="mt-8 card p-6 lg:p-8">
              {/* Souhrn */}
              <div className="rounded-xl bg-brand-light p-4 mb-6 text-sm text-brand-dark">
                <strong>{service.name}</strong> ·{" "}
                {selectedDate.toLocaleDateString("cs-CZ", { day: "numeric", month: "long" })} v {selectedTime} ·{" "}
                {service.priceKc} Kč
              </div>

              {/* Místo (jen osobní) */}
              {isInPerson && (
                <>
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-brand-dark mb-2" htmlFor="municipality">
                      Obec (kam mám přijet) *
                    </label>
                    <select
                      id="municipality"
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm bg-white"
                    >
                      <option value="" disabled>Vyber obec…</option>
                      {SERVICE_AREA.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      <option value={OTHER}>Moje obec tu není…</option>
                    </select>
                  </div>

                  {municipalityInvalid && (
                    <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                      Mrzí mě to, ale na osobní lekce dojíždím jen po okolí {HOME_BASE}.
                      Tvoje obec zatím není v dosahu 🙏 Vyber prosím{" "}
                      <strong>online konzultaci</strong> – tu vedu odkudkoliv.
                    </div>
                  )}

                  {municipality && !municipalityInvalid && (
                    <div className="mb-5">
                      <label className="block text-sm font-semibold text-brand-dark mb-2" htmlFor="address">
                        Adresa (ulice a číslo) *
                      </label>
                      <input
                        id="address"
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={`Ulice a číslo, ${municipality}`}
                        required
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Důvod / cíl */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-brand-dark mb-2" htmlFor="reason">
                  Co tě trápí / co od lekce čekáš? *
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  required
                  placeholder="Bolesti, omezení pohybu, cíle… Čím víc napíšeš, tím líp se připravím."
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm resize-none"
                />
              </div>

              {/* Kontakt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-brand-dark mb-2" htmlFor="name">Jméno *</label>
                  <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brand-dark mb-2" htmlFor="email">E-mail *</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-brand-dark mb-2" htmlFor="phone">Telefon</label>
                  <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm" />
                </div>
              </div>

              <button type="submit" disabled={!formValid} className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed">
                Rezervovat a zaplatit {service.priceKc} Kč
                <span className="text-white/70 font-normal text-xs ml-1">(platba zatím neaktivní)</span>
              </button>
              <p className="mt-3 text-xs text-center text-gray-400">
                Termín ti potvrdím e-mailem. Zrušení / přesun možný 24 h předem.
              </p>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
