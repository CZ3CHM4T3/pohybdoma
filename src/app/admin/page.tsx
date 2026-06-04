"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";

const HOURS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
];
const DAYS = [
  { wd: 1, label: "Po" },
  { wd: 2, label: "Út" },
  { wd: 3, label: "St" },
  { wd: 4, label: "Čt" },
  { wd: 5, label: "Pá" },
];

type WeeklyRow = { weekday: number; time: string; is_free: boolean };
type Booking = {
  id: string;
  service_name: string;
  date: string;
  time: string;
  mode: string;
  municipality: string | null;
  address: string | null;
  reason: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  price_kc: number;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  const [weekly, setWeekly] = useState<WeeklyRow[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const admin = isAdminEmail(user?.email);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async () => {
    const [w, b] = await Promise.all([
      supabase.from("availability_weekly").select("weekday,time,is_free"),
      supabase.from("bookings").select("*").order("date").order("time"),
    ]);
    if (w.data) setWeekly(w.data as WeeklyRow[]);
    if (b.data) setBookings(b.data as Booking[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (admin) loadData();
  }, [admin, loadData]);

  const isFree = (wd: number, time: string) =>
    weekly.find((r) => r.weekday === wd && r.time === time)?.is_free ?? false;

  async function toggle(wd: number, time: string) {
    const key = `${wd}-${time}`;
    const current = isFree(wd, time);
    setSavingCell(key);
    setError(null);
    // optimisticky
    setWeekly((prev) =>
      prev.map((r) =>
        r.weekday === wd && r.time === time ? { ...r, is_free: !current } : r
      )
    );
    const { error } = await supabase
      .from("availability_weekly")
      .update({ is_free: !current })
      .eq("weekday", wd)
      .eq("time", time);
    setSavingCell(null);
    if (error) {
      // revert
      setWeekly((prev) =>
        prev.map((r) =>
          r.weekday === wd && r.time === time ? { ...r, is_free: current } : r
        )
      );
      setError(
        "Uložení se nezdařilo. Spustil jsi v Supabase admin-policies.sql? (" +
          error.message +
          ")"
      );
    }
  }

  // ── Stavy přístupu ──
  if (checking) {
    return <Centered>Načítám…</Centered>;
  }
  if (!user) {
    return (
      <Centered>
        <p className="mb-4">Tahle stránka je jen pro administrátora.</p>
        <Link href="/ucet" className="btn-primary">Přihlásit se</Link>
      </Centered>
    );
  }
  if (!admin) {
    return (
      <Centered>
        <p className="mb-2 font-semibold text-brand-dark">Nemáš oprávnění 🙈</p>
        <p className="text-sm text-gray-500">
          Přihlášený účet ({user.email}) není administrátor.
        </p>
      </Centered>
    );
  }

  // ── Admin obsah ──
  return (
    <div className="bg-brand-light min-h-screen py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-2">
          Administrace
        </p>
        <h1 className="text-3xl font-semibold text-brand-dark mb-8">Správa</h1>

        {error && (
          <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* ── Týdenní rozvrh ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">Týdenní rozvrh</h2>
          <p className="text-sm text-gray-500 mb-5">
            Klikni na hodinu = přepneš <span className="text-emerald-600 font-medium">volno</span> /{" "}
            <span className="text-gray-400 font-medium">obsazeno</span>. Platí každý týden.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="w-14"></th>
                  {DAYS.map((d) => (
                    <th key={d.wd} className="text-xs font-semibold text-gray-500 pb-1">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((time) => (
                  <tr key={time}>
                    <td className="text-xs text-gray-400 pr-2 text-right align-middle">{time}</td>
                    {DAYS.map((d) => {
                      const free = isFree(d.wd, time);
                      const key = `${d.wd}-${time}`;
                      return (
                        <td key={key}>
                          <button
                            type="button"
                            onClick={() => toggle(d.wd, time)}
                            disabled={savingCell === key}
                            className={`w-full h-9 rounded-md text-xs font-semibold transition-all ${
                              free
                                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            } ${savingCell === key ? "opacity-50" : ""}`}
                          >
                            {free ? "volno" : "—"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Rezervace ── */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">
            Rezervace <span className="text-gray-400 font-normal">({bookings.length})</span>
          </h2>
          <p className="text-sm text-gray-500 mb-5">Příchozí rezervace od klientů.</p>

          {bookings.length === 0 ? (
            <p className="text-sm text-gray-400">Zatím žádné rezervace.</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-brand-dark">
                      {b.service_name} · {b.date} v {b.time}
                    </span>
                    <span className="text-sm font-semibold text-brand-blue">{b.price_kc} Kč</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                    <span>👤 {b.contact_name}</span>
                    <span>✉️ {b.contact_email}</span>
                    {b.contact_phone && <span>📞 {b.contact_phone}</span>}
                    <span>{b.mode === "online" ? "💻 Online" : "🏠 Osobně"}</span>
                    {b.municipality && (
                      <span className="sm:col-span-2">📍 {b.address}, {b.municipality}</span>
                    )}
                    {b.reason && (
                      <span className="sm:col-span-2 text-gray-500">„{b.reason}"</span>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center px-4">
      <div className="card p-8 text-center max-w-sm">{children}</div>
    </div>
  );
}
