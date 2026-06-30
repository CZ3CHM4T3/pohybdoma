"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SERVICES,
  SERVICE_AREA,
  HOME_BASE,
  getServicePrice,
  getServicePriceForTier,
  hasDayPricing,
} from "@/lib/mock-data";
import type { Service, ScheduleSlot, SlotStatus, CalendarEvent } from "@/types";
import {
  Dumbbell,
  MonitorPlay,
  MessageCircle,
  HandHelping,
  ClipboardList,
  Video,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeTier } from "@/lib/tiers";
import { SectionHeading } from "@/components/ui/SectionHeading";

const MONTHS_CS = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];
const WEEKDAYS_CS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const OTHER = "__other__";

// Jemná sladěná paleta pro karty služeb (plný pastel, bez rámečku)
const TONES: Record<string, { card: string; iconBg: string; iconText: string; badge: string; outline: string }> = {
  blue: { card: "bg-blue-50", iconBg: "bg-blue-100", iconText: "text-blue-600", badge: "bg-blue-100 text-blue-700", outline: "outline-blue-400" },
  emerald: { card: "bg-emerald-50", iconBg: "bg-emerald-100", iconText: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700", outline: "outline-emerald-400" },
  indigo: { card: "bg-indigo-50", iconBg: "bg-indigo-100", iconText: "text-indigo-600", badge: "bg-indigo-100 text-indigo-700", outline: "outline-indigo-400" },
  amber: { card: "bg-amber-50", iconBg: "bg-amber-100", iconText: "text-amber-600", badge: "bg-amber-100 text-amber-700", outline: "outline-amber-400" },
  rose: { card: "bg-rose-50", iconBg: "bg-rose-100", iconText: "text-rose-600", badge: "bg-rose-100 text-rose-700", outline: "outline-rose-400" },
  violet: { card: "bg-violet-50", iconBg: "bg-violet-100", iconText: "text-violet-600", badge: "bg-violet-100 text-violet-700", outline: "outline-violet-400" },
};
const DEFAULT_TONE = { card: "bg-gray-50", iconBg: "bg-gray-100", iconText: "text-gray-600", badge: "bg-gray-100 text-gray-700", outline: "outline-gray-400" };

// Profesionální ikony pro jednotlivé služby (lucide)
const SERVICE_ICONS: Record<string, LucideIcon> = {
  "svc-lekce-60": Dumbbell,
  "svc-cvico": MonitorPlay,
  "svc-online-30": MessageCircle,
  "svc-masaz": HandHelping,
  "svc-plan-doma": ClipboardList,
  "svc-video-rozbor": Video,
};

// Řádky z databáze
type WeeklyRow = { weekday: number; time: string; is_free: boolean };
type OverrideRow = { date: string; time: string; status: SlotStatus };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
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

  // Výchozí předvybraná služba (doporučená, jinak první) – aby byl kalendář
  // vidět hned po otevření stránky.
  const defaultServiceId =
    SERVICES.find((s) => s.highlighted)?.id ?? SERVICES[0]?.id ?? null;
  const [serviceId, setServiceId] = useState<string | null>(defaultServiceId);
  const [viewMonth, setViewMonth] = useState<Date>(minMonth);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [municipality, setMunicipality] = useState("");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isVipPlus, setIsVipPlus] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Data z databáze (rozvrh, výjimky, akce) ──
  const [weekly, setWeekly] = useState<WeeklyRow[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [w, o, e] = await Promise.all([
        supabase.from("availability_weekly").select("weekday,time,is_free"),
        supabase.from("availability_overrides").select("date,time,status"),
        supabase.from("events").select("*").order("date"),
      ]);
      if (w.data) setWeekly(w.data as WeeklyRow[]);
      if (o.data) setOverrides(o.data as OverrideRow[]);
      if (e.data) {
        setEvents(
          (e.data as Record<string, unknown>[]).map((r) => ({
            id: String(r.id),
            date: String(r.date),
            title: String(r.title),
            kind: String(r.kind ?? "Akce"),
            time: r.time ? String(r.time) : undefined,
            location: r.location ? String(r.location) : undefined,
            description: String(r.description ?? ""),
            priceKc: r.price_kc == null ? undefined : Number(r.price_kc),
            href: r.href ? String(r.href) : undefined,
          }))
        );
      }
      setLoadingData(false);
    })();
  }, []);

  // Přihlášený uživatel → ulož user_id a předvyplň kontakt.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;
      setUserId(user.id);
      setEmail((e) => e || user.email || "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, tier")
        .eq("id", user.id)
        .maybeSingle();
      const fullName =
        (profile?.full_name as string | undefined) ||
        (user.user_metadata?.full_name as string | undefined) ||
        "";
      if (fullName) setName((n) => n || fullName);
      setIsVipPlus(normalizeTier(profile?.tier as string | undefined) === "VIP_PLUS");
    });
  }, []);

  const service: Service | null =
    SERVICES.find((s) => s.id === serviceId) ?? null;
  const isInPerson = service?.mode === "inPerson";
  const fullPrice = service ? getServicePrice(service, selectedDate) : 0;
  const price = service ? getServicePriceForTier(service, selectedDate, isVipPlus) : 0;
  const vipSaved = fullPrice - price; // kolik VIP+ ušetří (0, když není sleva)

  // ── Výpočet slotů a akcí z načtených dat ──
  const slotsFor = useCallback(
    (date: Date): ScheduleSlot[] => {
      if (startOfDay(date) < today) return [];
      const wd = date.getDay();
      const key = dateKey(date);
      const map = new Map<string, SlotStatus>();
      weekly
        .filter((r) => r.weekday === wd)
        .forEach((r) => map.set(r.time, r.is_free ? "free" : "booked"));
      overrides
        .filter((r) => r.date === key)
        .forEach((r) => map.set(r.time, r.status));
      return [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, status]) => ({ time, status }));
    },
    [weekly, overrides, today]
  );
  const dayHasFree = useCallback(
    (date: Date) => slotsFor(date).some((s) => s.status === "free"),
    [slotsFor]
  );
  const eventsFor = useCallback(
    (date: Date) => events.filter((e) => e.date === dateKey(date)),
    [events]
  );

  const days = useMemo(() => buildCalendar(viewMonth), [viewMonth]);
  const slots = selectedDate ? slotsFor(selectedDate) : [];
  const dayEvents = selectedDate ? eventsFor(selectedDate) : [];

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || !service || !selectedDate || !selectedTime) return;
    setSaving(true);
    setSaveError(null);

    const supabase = createClient();
    const { error } = await supabase.from("bookings").insert({
      user_id: userId,
      service_id: service.id,
      service_name: service.name,
      date: dateKey(selectedDate),
      time: selectedTime,
      mode: service.mode,
      municipality: isInPerson ? municipality : null,
      address: isInPerson ? address : null,
      reason,
      contact_name: name,
      contact_email: email,
      contact_phone: phone || null,
      price_kc: price,
      status: "pending",
    });

    setSaving(false);
    if (error) {
      setSaveError("Rezervaci se nepodařilo odeslat. Zkus to prosím znovu.");
      return;
    }
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
              <p><strong>Cena:</strong> {price} Kč</p>
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
              const tone = TONES[s.tone ?? ""] ?? DEFAULT_TONE;
              const Icon = SERVICE_ICONS[s.id] ?? Dumbbell;
              return (
                <div
                  key={s.id}
                  className={`card-3d relative flex flex-col rounded-2xl p-6 text-left ${tone.card} ${
                    active ? `outline outline-2 outline-offset-2 ${tone.outline}` : ""
                  }`}
                >
                  {s.highlighted && (
                    <span className="absolute top-4 right-4 rounded-full bg-brand-dark px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Oblíbené
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone.iconBg}`}>
                      <Icon className={`h-6 w-6 ${tone.iconText}`} strokeWidth={2} />
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone.badge}`}>
                      {s.mode === "online" ? "Online" : "Osobně · okolí"}
                    </span>
                  </div>
                  <h3 className="font-semibold text-brand-dark leading-snug mb-1">{s.name}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1">
                    {s.description}
                    {s.descBold && <> <strong className="text-brand-dark">{s.descBold}</strong></>}
                  </p>
                  <div className="flex items-end justify-between border-t border-black/5 pt-3 mb-4">
                    <span className="text-xl font-semibold text-brand-dark">
                      {isVipPlus && s.vipPlusDiscountKc ? (
                        <>
                          <span className="text-sm text-gray-400 line-through mr-1.5">{s.priceKc} Kč</span>
                          <span className="text-amber-700">{s.priceKc - s.vipPlusDiscountKc} Kč</span>
                          <span className="block text-[11px] font-semibold text-amber-700">VIP+ cena</span>
                        </>
                      ) : (
                        s.priceLabel ?? `${s.priceKc} Kč`
                      )}
                    </span>
                    <span className="text-xs text-gray-400">{s.durationLabel ?? `${s.durationMin} min`}</span>
                  </div>
                  {s.inquiryOnly ? (
                    <a href="/kontakt" className="btn-primary w-full text-sm">
                      Mám zájem
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectService(s.id);
                        setTimeout(
                          () => document.getElementById("kalendar")?.scrollIntoView({ behavior: "smooth", block: "start" }),
                          120
                        );
                      }}
                      className={active ? "btn-outline w-full text-sm" : "btn-primary w-full text-sm"}
                    >
                      {active ? "✓ Vybráno – vyber termín" : "Rezervovat"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Krok 2 – kalendář */}
      {service && (
        <section id="kalendar" className="bg-brand-light py-12 lg:py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <SectionHeading label="Krok 2" title="Vyber termín" />

            {loadingData && (
              <p className="mt-8 text-sm text-gray-500">Načítám dostupné termíny…</p>
            )}

            <div className={`mt-8 card p-5 lg:p-6 ${loadingData ? "opacity-50" : ""}`}>
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
                  const free = inMonth && !isPast && dayHasFree(d);
                  const eventDay = inMonth && !isPast && eventsFor(d).length > 0;
                  const clickable = free || eventDay;
                  const isSelected = selectedDate && sameDay(d, selectedDate);
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      disabled={!clickable}
                      onClick={() => { setSelectedDate(d); setSelectedTime(null); }}
                      className={`relative aspect-square rounded-lg text-sm font-medium transition-all ${
                        !inMonth
                          ? "text-gray-300"
                          : isSelected
                            ? "bg-emerald-600 text-white shadow-md"
                            : clickable
                              ? "text-brand-dark hover:bg-emerald-50"
                              : "text-gray-300 cursor-not-allowed"
                      }`}
                    >
                      {d.getDate()}
                      {!isSelected && (free || eventDay) && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {free && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                          {eventDay && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Volný termín
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  Akce / workshop
                </span>
              </div>
            </div>

            {/* Časy */}
            {selectedDate && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-brand-dark capitalize">
                    {selectedDate.toLocaleDateString("cs-CZ", {
                      weekday: "long", day: "numeric", month: "long",
                    })}
                  </p>
                  {/* Legenda */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> volno
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" /> obsazeno
                    </span>
                  </div>
                </div>

                {/* Akce v tento den */}
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="mb-4 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        {ev.kind}
                      </span>
                      {ev.time && <span className="text-xs font-medium text-amber-800">{ev.time}</span>}
                    </div>
                    <h4 className="font-semibold text-brand-dark">{ev.title}</h4>
                    <p className="mt-1 text-sm text-gray-600 leading-relaxed">{ev.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      {ev.location && <span>📍 {ev.location}</span>}
                      <span>
                        {ev.priceKc === 0 ? "Zdarma" : ev.priceKc != null ? `${ev.priceKc} Kč` : ""}
                      </span>
                    </div>
                    <a
                      href="/kontakt"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
                    >
                      Přihlásit se
                    </a>
                  </div>
                ))}
                {slots.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => {
                      const isFree = slot.status === "free";
                      const isSel = selectedTime === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!isFree}
                          onClick={() => isFree && setSelectedTime(slot.time)}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border-2 ${
                            isSel
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-md"
                              : isFree
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "border-transparent bg-gray-100 text-gray-400 line-through cursor-not-allowed"
                          }`}
                          aria-label={isFree ? `${slot.time} – volno` : `${slot.time} – obsazeno`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                ) : dayEvents.length > 0 ? (
                  <p className="text-sm text-gray-500">
                    V tento den nemám individuální lekce – ale koná se akce (viz výše).
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">V tento den necvičím.</p>
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

            {!userId ? (
              <div className="mt-8 card p-6 lg:p-8 text-center">
                <p className="text-brand-dark font-semibold mb-1">Rezervace jen pro registrované</p>
                <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">
                  Pro objednání lekce se prosím přihlas nebo si vytvoř účet – je to rychlé.
                  Členové <strong>VIP+</strong> navíc rovnou uvidí svoji zvýhodněnou cenu.
                </p>
                <a href="/ucet" className="btn-primary inline-block">Přihlásit se / registrovat</a>
                <p className="mt-3 text-xs text-gray-400">Po přihlášení se vrať sem a dokonči rezervaci.</p>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="mt-8 card p-6 lg:p-8">
              {/* Souhrn */}
              <div className="rounded-xl bg-brand-light p-4 mb-6 text-sm text-brand-dark">
                <strong>{service.name}</strong> ·{" "}
                {selectedDate.toLocaleDateString("cs-CZ", { day: "numeric", month: "long" })} v {selectedTime} ·{" "}
                {vipSaved > 0 ? (
                  <>
                    <span className="text-gray-400 line-through">{fullPrice} Kč</span>{" "}
                    <strong className="text-amber-700">{price} Kč</strong>
                    <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      VIP+ sleva −{vipSaved} Kč
                    </span>
                  </>
                ) : (
                  <strong>{price} Kč</strong>
                )}
                {hasDayPricing(service) && (
                  <span className="text-gray-500">
                    {" "}({selectedDate.getDay() === 0 || selectedDate.getDay() === 6 ? "víkendová" : "všední"} sazba)
                  </span>
                )}
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

              {saveError && (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {saveError}
                </p>
              )}
              <button
                type="submit"
                disabled={!formValid || saving}
                className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Odesílám…" : `Rezervovat a zaplatit ${price} Kč`}
                {!saving && (
                  <span className="text-white/70 font-normal text-xs ml-1">(platba zatím neaktivní)</span>
                )}
              </button>
              <p className="mt-3 text-xs text-center text-gray-400">
                Termín ti potvrdím e-mailem. Zrušení / přesun možný 24 h předem.
              </p>
            </form>
            )}
          </div>
        </section>
      )}
    </>
  );
}
