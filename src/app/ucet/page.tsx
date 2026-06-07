"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  Heart, BookOpen, GraduationCap, CalendarDays, Crown, Newspaper,
  KeyRound, LogOut, MapPin, MonitorPlay,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { TIER_STYLES, normalizeTier } from "@/lib/tiers";
import { MOCK_VIDEOS, MOCK_COURSES } from "@/lib/mock-data";
import type { UserTier } from "@/types";

type Tab = "prihlaseni" | "registrace";

export default function UcetPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [tier, setTier] = useState<UserTier>("FREE");
  const [favSlugs, setFavSlugs] = useState<string[]>([]);
  const [bookings, setBookings] = useState<
    { id: string; service_name: string; date: string; time: string; status: string; mode: string }[]
  >([]);
  const [progress, setProgress] = useState<
    { slug: string; title: string; done: number; total: number; pct: number }[]
  >([]);
  const [accMsg, setAccMsg] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("prihlaseni");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Načti úroveň členství přihlášeného uživatele.
  useEffect(() => {
    if (!user) { setTier("FREE"); return; }
    supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setTier(normalizeTier(data?.tier as string | undefined)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Načti oblíbená videa.
  useEffect(() => {
    if (!user) { setFavSlugs([]); return; }
    supabase
      .from("video_favorites")
      .select("video_slug")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) =>
        setFavSlugs((data ?? []).map((r: { video_slug: string }) => r.video_slug))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Nadcházející rezervace.
  useEffect(() => {
    if (!user) { setBookings([]); return; }
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("bookings")
      .select("id, service_name, date, time, status, mode")
      .eq("user_id", user.id)
      .gte("date", today)
      .order("date")
      .order("time")
      .then(({ data }) => setBookings((data ?? []) as typeof bookings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Postup v kurzech.
  useEffect(() => {
    if (!user) { setProgress([]); return; }
    supabase
      .from("lesson_progress")
      .select("course_slug, completed")
      .eq("user_id", user.id)
      .eq("completed", true)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        for (const r of (data ?? []) as { course_slug: string }[]) {
          counts[r.course_slug] = (counts[r.course_slug] ?? 0) + 1;
        }
        const list = Object.entries(counts)
          .map(([slug, done]) => {
            const c = MOCK_COURSES.find((x) => x.slug === slug);
            const total = c?.lessons.length ?? 0;
            return { slug, title: c?.title ?? slug, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
          })
          .filter((x) => x.total > 0)
          .sort((a, b) => b.pct - a.pct);
        setProgress(list);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function sendPasswordReset() {
    if (!user?.email) return;
    setAccMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/obnova-hesla`,
    });
    setAccMsg(error ? "Nepodařilo se odeslat: " + error.message : "Poslal jsem ti e-mail pro změnu hesla.");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes("Invalid login")
          ? "Nesprávný e-mail nebo heslo."
          : error.message.includes("Email not confirmed")
            ? "E-mail ještě není potvrzený. Zkontroluj schránku."
            : "Přihlášení se nezdařilo: " + error.message
      );
      return;
    }
    router.refresh();
  }

  async function handleForgot() {
    if (!email) {
      setInfo(null);
      setError("Nejdřív vyplň svůj e-mail v poli výše.");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/obnova-hesla`,
    });
    setLoading(false);
    if (error) {
      setError("Odkaz se nepodařilo odeslat: " + error.message);
      return;
    }
    setInfo("Poslal jsem ti e-mail s odkazem na obnovu hesla. Zkontroluj schránku.");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/ucet` : undefined,
      },
    });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes("already registered")
          ? "Tento e-mail už je zaregistrovaný. Přihlas se."
          : "Registrace se nezdařila: " + error.message
      );
      return;
    }
    // Pokud je zapnuté potvrzení e-mailu, session zatím není.
    if (!data.session) {
      setInfo("Hotovo! Poslal jsem ti potvrzovací e-mail – klikni na odkaz a pak se přihlas.");
      setTab("prihlaseni");
    } else {
      router.refresh();
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  }

  // ── Přihlášený pohled ──
  if (!checking && user) {
    const displayName =
      (user.user_metadata?.full_name as string | undefined) || user.email || "";
    const isClub = tier === "VIP_PLUS" || isAdminEmail(user.email);
    const tiles = [
      { href: "/videoknihovna", label: "Knihovna pohybu", Icon: BookOpen },
      { href: "/kurzy", label: "Kurzy", Icon: GraduationCap },
      { href: "/rezervace", label: "Rezervace", Icon: CalendarDays },
      ...(isClub ? [{ href: "/klub", label: "VIP+ Klub", Icon: Crown }] : []),
      { href: "/blog", label: "Blog", Icon: Newspaper },
    ];
    const favVideos = favSlugs
      .map((slug) => MOCK_VIDEOS.find((v) => v.slug === slug))
      .filter((v): v is (typeof MOCK_VIDEOS)[number] => !!v);

    return (
      <div className="min-h-screen bg-brand-light py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Hlavička */}
          <div className="card p-6 mb-6 flex flex-wrap items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue text-2xl font-semibold text-white">
              {(displayName?.[0] ?? "U").toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-brand-dark">
                Vítej zpátky{displayName ? `, ${displayName}` : ""}!
              </h1>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${TIER_STYLES[tier].badge}`}>
                {TIER_STYLES[tier].label}
              </span>
              {tier !== "VIP_PLUS" && (
                <Link href="/clenstvi" className="text-xs font-semibold text-brand-blue hover:underline whitespace-nowrap">
                  Vylepšit →
                </Link>
              )}
            </div>
          </div>

          {/* Rychlé dlaždice */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {tiles.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="card card-3d p-4 flex flex-col items-center justify-center gap-2 text-center"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${href === "/klub" ? "bg-amber-100 text-amber-600" : "bg-brand-light text-brand-blue"}`}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="text-xs font-semibold text-brand-dark">{label}</span>
              </Link>
            ))}
          </div>

          {/* Dva sloupce */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Levý sloupec */}
            <div className="space-y-6">
              {/* Rozjeté kurzy */}
              <div className="card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-brand-blue" strokeWidth={2} />
                  <h2 className="text-sm font-semibold text-brand-dark">Rozjeté kurzy</h2>
                </div>
                {progress.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    Zatím ses nepustil do žádného kurzu.{" "}
                    <Link href="/kurzy" className="text-brand-blue hover:underline">Vyber si →</Link>
                  </p>
                ) : (
                  <div className="space-y-4">
                    {progress.map((p) => (
                      <Link key={p.slug} href={`/kurzy/${p.slug}`} className="block group">
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-brand-dark group-hover:text-brand-blue truncate">{p.title}</span>
                          <span className="ml-2 shrink-0 text-xs text-gray-400">{p.done}/{p.total}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${p.pct}%` }} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Oblíbená videa */}
              <div className="card p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Heart className="h-4 w-4 fill-rose-500 text-rose-500" strokeWidth={2} />
                  <h2 className="text-sm font-semibold text-brand-dark">
                    Oblíbená videa{favVideos.length > 0 ? ` (${favVideos.length})` : ""}
                  </h2>
                </div>
                {favVideos.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    Zatím nic uloženého. V knihovně klikni na srdíčko u videa.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {favVideos.map((v) => (
                      <Link
                        key={v.slug}
                        href={`/videoknihovna/${v.slug}`}
                        className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm text-brand-dark hover:border-brand-blue hover:bg-brand-light/50 transition-colors"
                      >
                        <Heart className="h-3.5 w-3.5 shrink-0 fill-rose-500 text-rose-500" />
                        <span className="truncate">{v.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pravý sloupec */}
            <div className="space-y-6">
              {/* Moje rezervace */}
              <div className="card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-brand-blue" strokeWidth={2} />
                  <h2 className="text-sm font-semibold text-brand-dark">Moje rezervace</h2>
                </div>
                {bookings.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    Žádné nadcházející rezervace.{" "}
                    <Link href="/rezervace" className="text-brand-blue hover:underline">Rezervovat →</Link>
                  </p>
                ) : (
                  <div className="space-y-2">
                    {bookings.map((b) => (
                      <div key={b.id} className="rounded-lg border border-gray-100 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-brand-dark">{b.service_name}</span>
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{b.status}</span>
                        </div>
                        <p className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span>
                            {new Date(b.date).toLocaleDateString("cs-CZ", { weekday: "short", day: "numeric", month: "long" })} · {b.time}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            {b.mode === "online" ? <MonitorPlay className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                            {b.mode === "online" ? "Online" : "Osobně"}
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Členství */}
              <div className={`card p-6 ${TIER_STYLES[tier].card}`}>
                <div className="mb-2 flex items-center gap-2">
                  <Crown className={`h-4 w-4 ${TIER_STYLES[tier].accentText}`} strokeWidth={2} />
                  <h2 className="text-sm font-semibold text-brand-dark">Členství</h2>
                </div>
                <p className="text-sm text-gray-600">
                  Tvoje úroveň je <strong className={TIER_STYLES[tier].accentText}>{TIER_STYLES[tier].label}</strong>.
                  {tier !== "VIP_PLUS" && " Vyšší úroveň odemkne víc videí, kurzů a VIP+ Klub."}
                </p>
                {tier !== "VIP_PLUS" && (
                  <Link href="/clenstvi" className="btn-primary text-sm mt-4 inline-flex">
                    Zobrazit členství
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Účet */}
          <div className="card p-6 mt-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-dark">
              <KeyRound className="h-4 w-4 text-gray-400" /> Účet
            </h2>
            {accMsg && (
              <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{accMsg}</p>
            )}
            <div className="flex flex-wrap items-center gap-4">
              <button onClick={sendPasswordReset} className="btn-outline text-sm inline-flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Změnit heslo
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-brand-dark"
              >
                <LogOut className="h-4 w-4" /> Odhlásit se
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Nepřihlášený pohled (login / registrace) ──
  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-brand-dark">Tvůj účet</h1>
          <p className="text-sm text-gray-500 mt-1">
            Přihlas se nebo si vytvoř účet
          </p>
        </div>

        <div className="card p-8">
          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-7">
            {(["prihlaseni", "registrace"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); setInfo(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                  tab === t ? "bg-white shadow text-brand-dark" : "text-gray-500 hover:text-brand-dark"
                }`}
              >
                {t === "prihlaseni" ? "Přihlásit se" : "Registrace"}
              </button>
            ))}
          </div>

          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {info && (
            <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {info}
            </p>
          )}

          {tab === "prihlaseni" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <Field id="login-email" label="E-mail" type="email" value={email} onChange={setEmail} placeholder="vas@email.cz" />
              <Field id="login-password" label="Heslo" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                {loading ? "Přihlašuji…" : "Přihlásit se"}
              </button>
              <button
                type="button"
                onClick={handleForgot}
                disabled={loading}
                className="block w-full text-center text-xs font-semibold text-gray-500 hover:text-brand-blue disabled:opacity-50"
              >
                Zapomněl jsi heslo?
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <Field id="reg-name" label="Jméno" type="text" value={name} onChange={setName} placeholder="Jan Novák" />
              <Field id="reg-email" label="E-mail" type="email" value={email} onChange={setEmail} placeholder="vas@email.cz" />
              <Field id="reg-password" label="Heslo" type="password" value={password} onChange={setPassword} placeholder="alespoň 6 znaků" minLength={6} />
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                {loading ? "Vytvářím účet…" : "Vytvořit účet"}
              </button>
              <p className="text-xs text-center text-gray-400">
                Registrací souhlasíš s{" "}
                <Link href="/obchodni-podminky" className="text-brand-blue hover:underline">obchodními podmínkami</Link>{" "}
                a{" "}
                <Link href="/gdpr" className="text-brand-blue hover:underline">ochranou dat</Link>.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  id, label, type, value, onChange, placeholder, minLength,
}: {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string; minLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-brand-dark mb-1.5" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
      />
    </div>
  );
}
