"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SERVICES,
  SERVICE_AREA,
  HOME_BASE,
  getServicePrice,
  getServicePriceForTier,
  hasDayPricing,
  eventColorOf,
} from "@/lib/mock-data";
import type { Service, ScheduleSlot, SlotStatus, CalendarEvent } from "@/types";
import {
  Dumbbell,
  MonitorPlay,
  MessageCircle,
  HandHelping,
  ClipboardList,
  Video,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeTier } from "@/lib/tiers";
import { SectionHeading } from "@/components/ui/SectionHeading";

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
  "svc-workshop": Users,
};


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
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function RezervacePage() {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Výchozí předvybraná služba (doporučená, jinak první) – aby byl kalendář
  // vidět hned po otevření stránky.
  const defaultServiceId =
    SERVICES.find((s) => s.highlighted)?.id ?? SERVICES[0]?.id ?? null;
  const [serviceId, setServiceId] = useState<string | null>(defaultServiceId);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  // Týdenní přehled dostupnosti (Po daného týdne)
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const x = startOfDay(new Date());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  });

  const [municipality, setMunicipality] = useState("");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Fakturační údaje
  const [billName, setBillName] = useState("");
  const [billAddress, setBillAddress] = useState("");
  const [billIco, setBillIco] = useState("");
  const [billDic, setBillDic] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isVipPlus, setIsVipPlus] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Data z databáze (rozvrh, výjimky, akce) ──
  const [open, setOpen] = useState<Set<string>>(new Set()); // "YYYY-MM-DD HH:MM" volné termíny
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [busy, setBusy] = useState<Set<string>>(new Set()); // "YYYY-MM-DD HH:MM" obsazené termíny
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const from = dateKey(today);
      const to = dateKey(new Date(today.getFullYear(), today.getMonth() + 4, 0));
      const [e, bt, ot] = await Promise.all([
        supabase.from("events").select("*").order("date"),
        supabase.rpc("busy_times", { p_from: from, p_to: to }),
        supabase.rpc("open_times", { p_from: from, p_to: to }),
      ]);
      if (bt.data) setBusy(new Set((bt.data as { date: string; time: string }[]).map((r) => `${r.date} ${r.time}`)));
      if (ot.data) setOpen(new Set((ot.data as { date: string; time: string }[]).map((r) => `${r.date} ${r.time}`)));
      if (e.data) {
        setEvents(
          (e.data as Record<string, unknown>[]).map((r) => ({
            id: String(r.id),
            date: String(r.date),
            title: String(r.title),
            kind: String(r.kind ?? "Akce"),
            time: r.time ? String(r.time) : undefined,
            endTime: r.end_time ? String(r.end_time) : undefined,
            location: r.location ? String(r.location) : undefined,
            description: String(r.description ?? ""),
            priceKc: r.price_kc == null ? undefined : Number(r.price_kc),
            href: r.href ? String(r.href) : undefined,
            color: r.color ? String(r.color) : undefined,
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
        .select("full_name, tier, bill_name, bill_address, bill_ico, bill_dic")
        .eq("id", user.id)
        .maybeSingle();
      const fullName =
        (profile?.full_name as string | undefined) ||
        (user.user_metadata?.full_name as string | undefined) ||
        "";
      if (fullName) setName((n) => n || fullName);
      // Předvyplnění fakturačních údajů z profilu (jednou zadané se pamatuje)
      const p = profile as { bill_name?: string; bill_address?: string; bill_ico?: string; bill_dic?: string } | null;
      if (p?.bill_name) setBillName((v) => v || p.bill_name!);
      else if (fullName) setBillName((v) => v || fullName);
      if (p?.bill_address) setBillAddress((v) => v || p.bill_address!);
      if (p?.bill_ico) setBillIco((v) => v || p.bill_ico!);
      if (p?.bill_dic) setBillDic((v) => v || p.bill_dic!);
      setIsVipPlus(normalizeTier(profile?.tier as string | undefined) === "VIP_PLUS");
    });
  }, []);

  // Obnovení výběru po návratu z přihlášení (aby uživatel nezačínal znovu).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pd_booking_sel");
      if (!raw) return;
      const sel = JSON.parse(raw) as { serviceId?: string; date?: string; time?: string };
      if (sel.serviceId) setServiceId(sel.serviceId);
      if (sel.date) setSelectedDate(new Date(sel.date + "T00:00:00"));
      if (sel.time) setSelectedTime(sel.time);
    } catch { /* ignore */ }
  }, []);

  // Nepřihlášenému uložíme rozdělaný výběr, ať se po loginu vrátí, kde skončil.
  useEffect(() => {
    if (userId) return;
    if (serviceId && selectedDate && selectedTime) {
      try {
        sessionStorage.setItem("pd_booking_sel", JSON.stringify({ serviceId, date: dateKey(selectedDate), time: selectedTime }));
      } catch { /* ignore */ }
    }
  }, [userId, serviceId, selectedDate, selectedTime]);

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
      const prefix = `${key} `;
      // Obsazené hodiny (stálí klienti, bloky, rezervace) = zatmavené „obsazeno".
      for (const b of busy) {
        if (b.startsWith(prefix)) map.set(b.slice(prefix.length), "booked");
      }
      // Volné hodiny (uvolněné od stálých klientů + pevně otevřené) = zeleně, klikací.
      for (const o of open) {
        if (o.startsWith(prefix)) map.set(o.slice(prefix.length), "free");
      }
      return [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, status]) => ({ time, status }));
    },
    [busy, open, today]
  );
  const eventsFor = useCallback(
    (date: Date) => events.filter((e) => e.date === dateKey(date)),
    [events]
  );

  // Týdenní přehled
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const x = new Date(weekStart); x.setDate(weekStart.getDate() + i); return x; }),
    [weekStart]
  );
  const thisWeekMonday = useMemo(() => { const x = startOfDay(new Date()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }, []);

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
      bill_name: billName.trim() || null,
      bill_address: billAddress.trim() || null,
      bill_ico: billIco.trim() || null,
      bill_dic: billDic.trim() || null,
      price_kc: price,
      status: "pending",
    });

    setSaving(false);
    if (error) {
      setSaveError("Rezervaci se nepodařilo odeslat. Zkus to prosím znovu.");
      return;
    }
    // Zapamatuj fakturační údaje do profilu přihlášeného klienta (pro příště)
    if (userId) {
      supabase.from("profiles").update({
        bill_name: billName.trim() || null,
        bill_address: billAddress.trim() || null,
        bill_ico: billIco.trim() || null,
        bill_dic: billDic.trim() || null,
      }).eq("id", userId).then(() => { /* tiché – neblokuje potvrzení */ });
    }
    setSubmitted(true);
    try { sessionStorage.removeItem("pd_booking_sel"); } catch { /* ignore */ }
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
                          <span className="text-sm text-gray-500 line-through mr-1.5">{s.priceKc} Kč</span>
                          <span className="text-amber-700">{s.priceKc - s.vipPlusDiscountKc} Kč</span>
                          <span className="block text-[11px] font-semibold text-amber-700">VIP+ cena</span>
                        </>
                      ) : (
                        s.priceLabel ?? `${s.priceKc} Kč`
                      )}
                    </span>
                    <span className="text-xs text-gray-500">{s.durationLabel ?? `${s.durationMin} min`}</span>
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

            {/* Týdenní přehled – kde je volno */}
            <div className={`mt-8 card p-5 lg:p-8 ${loadingData ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between mb-5">
                <button
                  type="button"
                  disabled={weekStart <= thisWeekMonday}
                  onClick={() => { const x = new Date(weekStart); x.setDate(weekStart.getDate() - 7); setWeekStart(x); }}
                  className="rounded-lg p-2.5 text-lg text-brand-dark hover:bg-brand-light disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Předchozí týden"
                >
                  ←
                </button>
                <h3 className="text-lg font-bold text-brand-dark">
                  {weekDays[0].toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })} – {weekDays[6].toLocaleDateString("cs-CZ", { day: "numeric", month: "long" })}
                </h3>
                <button
                  type="button"
                  onClick={() => { const x = new Date(weekStart); x.setDate(weekStart.getDate() + 7); setWeekStart(x); }}
                  className="rounded-lg p-2.5 text-lg text-brand-dark hover:bg-brand-light"
                  aria-label="Další týden"
                >
                  →
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {weekDays.map((d) => {
                  const past = d < today;
                  const daySlots = past ? [] : slotsFor(d);
                  const isToday = sameDay(d, today);
                  return (
                    <div key={d.toISOString()} className={`rounded-xl border p-2.5 min-h-[120px] ${isToday ? "border-brand-blue bg-brand-light/50" : "border-gray-200"}`}>
                      <p className="text-center text-sm font-bold text-brand-dark">
                        {WEEKDAYS_CS[(d.getDay() + 6) % 7]}
                        <span className="block text-xs text-gray-500 font-medium">{d.getDate()}.{d.getMonth() + 1}.</span>
                      </p>
                      {past ? (
                        <p className="mt-3 text-center text-xs text-gray-300">—</p>
                      ) : (
                        <div className="mt-2 flex flex-col gap-1.5">
                          {/* Akce / workshopy v tento den */}
                          {eventsFor(d).map((ev) => (
                            <a
                              key={ev.id}
                              href="/kontakt"
                              title={`${ev.title}${ev.time ? " · " + ev.time : ""}`}
                              className="block rounded-lg px-1.5 py-1.5 text-[11px] font-bold text-white leading-tight hover:opacity-90"
                              style={{ background: eventColorOf(ev) }}
                            >
                              {ev.time && <span className="block opacity-90">{ev.time}{ev.endTime ? `–${ev.endTime}` : ""}</span>}
                              <span className="block truncate">{ev.title}</span>
                            </a>
                          ))}
                          {daySlots.map((s) => {
                            const isFree = s.status === "free";
                            const isSel = !!selectedDate && sameDay(d, selectedDate) && selectedTime === s.time;
                            return (
                              <button
                                key={s.time}
                                type="button"
                                disabled={!isFree}
                                onClick={() => { setSelectedDate(d); setSelectedTime(s.time); }}
                                title={isFree ? `${s.time} – volno` : `${s.time} – obsazeno`}
                                className={`rounded-lg px-1.5 py-2 text-sm font-bold transition-all ${
                                  isSel
                                    ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300"
                                    : isFree
                                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                      : "bg-red-100 text-red-700 cursor-not-allowed"
                                }`}
                              >
                                {s.time}
                              </button>
                            );
                          })}
                          {daySlots.length === 0 && eventsFor(d).length === 0 && (
                            <p className="text-center text-xs text-gray-300">necvičím</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded bg-emerald-200 inline-block" />
                  <span className="font-semibold text-emerald-700">volno</span> <span className="text-gray-500">– klikni a rezervuj</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded bg-red-200 inline-block" />
                  <span className="font-semibold text-red-600">obsazeno</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded inline-block" style={{ background: "#7c3aed" }} />
                  <span className="font-semibold text-violet-700">akce / workshop</span>
                </span>
              </div>
            </div>
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
                <a href="/ucet?next=/rezervace" className="btn-primary inline-block">Přihlásit se / registrovat</a>
                <p className="mt-3 text-xs text-gray-500">Neboj – tvůj výběr (služba, den i čas) ti zůstane a po přihlášení tě vrátíme sem.</p>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="mt-8 card p-6 lg:p-8">
              {/* Souhrn */}
              <div className="rounded-xl bg-brand-light p-4 mb-6 text-sm text-brand-dark">
                <strong>{service.name}</strong> ·{" "}
                {selectedDate.toLocaleDateString("cs-CZ", { day: "numeric", month: "long" })} v {selectedTime} ·{" "}
                {vipSaved > 0 ? (
                  <>
                    <span className="text-gray-500 line-through">{fullPrice} Kč</span>{" "}
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

              {/* Fakturační údaje */}
              <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-brand-dark mb-1">Fakturační údaje <span className="font-normal text-gray-400">(nepovinné)</span></p>
                <p className="text-xs text-gray-500 mb-4">
                  Můžeš vyplnit teď, nebo to dořešíme před fakturací. Fyzická osoba: jméno a adresa; firma navíc IČO (a DIČ).
                  {userId ? " Uloží se ti do účtu, příště je mít předvyplněné." : ""}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-brand-dark mb-2" htmlFor="billName">Jméno / název na faktuře</label>
                    <input id="billName" type="text" value={billName} onChange={(e) => setBillName(e.target.value)}
                      placeholder="Jan Novák / Firma s.r.o."
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-brand-dark mb-2" htmlFor="billAddress">Fakturační adresa</label>
                    <textarea id="billAddress" value={billAddress} onChange={(e) => setBillAddress(e.target.value)} rows={2}
                      placeholder="Ulice a číslo, PSČ, město"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-brand-dark mb-2" htmlFor="billIco">IČO <span className="font-normal text-gray-400">(firmy)</span></label>
                    <input id="billIco" type="text" inputMode="numeric" value={billIco} onChange={(e) => setBillIco(e.target.value)}
                      placeholder="např. 04531817"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-brand-dark mb-2" htmlFor="billDic">DIČ <span className="font-normal text-gray-400">(nepovinné)</span></label>
                    <input id="billDic" type="text" value={billDic} onChange={(e) => setBillDic(e.target.value)}
                      placeholder="CZ…"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm" />
                  </div>
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
              <p className="mt-3 text-xs text-center text-gray-500">
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
