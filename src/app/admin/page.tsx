"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GripVertical, Radio, UserX, Film, Flame, CalendarDays, CalendarCheck, Users, Star, Mail, Compass, BarChart3, Gift, FileText, Receipt, Trash2 } from "lucide-react";
import { BlogAdmin } from "@/components/admin/BlogAdmin";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { TIER_STYLES, normalizeTier, tierToDb } from "@/lib/tiers";
import { MonthCalendar } from "@/components/admin/MonthCalendar";
import { WeekCalendar } from "@/components/admin/WeekCalendar";
import { VIDEO_COLS, type VideoRow } from "@/lib/content";
import {
  FILTER_BODY, FILTER_SYSTEMS, FILTER_PROPS, FILTER_GOALS, FILTER_SUITABILITY,
} from "@/lib/filters";
import { MOCK_VIDEOS } from "@/lib/mock-data";
import type { UserTier, AccessLevel } from "@/types";

const ACCESS_OPTS: AccessLevel[] = ["FREE", "MEMBER", "VIP", "VIP_PLUS"];
const DIFF_OPTS = ["začátečník", "mírně pokročilý", "pokročilý"];
const ADMIN_TABS = [
  { k: "videa", label: "Videa", Icon: Film, active: "bg-violet-600 text-white", icon: "text-violet-500" },
  { k: "live", label: "LIVE", Icon: Radio, active: "bg-red-600 text-white", icon: "text-red-500" },
  { k: "vyzva", label: "Výzva", Icon: Flame, active: "bg-amber-500 text-white", icon: "text-amber-500" },
  { k: "rozvrh", label: "Rozvrh", Icon: CalendarDays, active: "bg-sky-600 text-white", icon: "text-sky-500" },
  { k: "rezervace", label: "Rezervace", Icon: CalendarCheck, active: "bg-emerald-600 text-white", icon: "text-emerald-500" },
  { k: "faktury", label: "Faktury", Icon: Receipt, active: "bg-green-700 text-white", icon: "text-green-600" },
  { k: "clenove", label: "Členové", Icon: Users, active: "bg-blue-600 text-white", icon: "text-blue-500" },
  { k: "recenze", label: "Recenze", Icon: Star, active: "bg-orange-500 text-white", icon: "text-orange-500" },
  { k: "newsletter", label: "Newsletter", Icon: Mail, active: "bg-teal-600 text-white", icon: "text-teal-500" },
  { k: "pruvodce", label: "Průvodce", Icon: Compass, active: "bg-fuchsia-600 text-white", icon: "text-fuchsia-500" },
  { k: "blog", label: "Blog", Icon: FileText, active: "bg-rose-600 text-white", icon: "text-rose-500" },
  { k: "analytika", label: "Analytika", Icon: BarChart3, active: "bg-indigo-600 text-white", icon: "text-indigo-500" },
];
function slugifyVideo(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);
}
function toArr(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}
// Doplní 30 denních sloupců (i prázdné dny) z řídké série {d,n}.
function daily30(series: { d: string; n: number }[]): { label: string; n: number }[] {
  const map = new Map(series.map((x) => [x.d, x.n]));
  const out: { label: string; n: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    out.push({ label: String(dt.getDate()), n: map.get(key) ?? 0 });
  }
  return out;
}

const HOURS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
];
// "2026-07-04" → "so 4. 7. 2026" (s názvem dne)
function fmtDateCs(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("cs-CZ", { weekday: "short", day: "numeric", month: "numeric", year: "numeric" });
}

type WeeklyRow = { weekday: number; time: string; is_free: boolean };
type EventRow = {
  id: string;
  date: string;
  title: string;
  kind: string;
  time: string | null;
  location: string | null;
  description: string | null;
  price_kc: number | null;
};
type OverrideRow = {
  id: string;
  date: string;
  time: string;
  status: "free" | "booked";
};
type Member = {
  id: string;
  email: string | null;
  full_name: string | null;
  tier: string;
  tier_since: string | null;
  tier_until: string | null;
  bonus_days: number | null;
};
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
type LessonRow = {
  id: string;
  date: string;
  time: string;
  client_name: string;
  note: string | null;
  price_kc: number | null;
};
type ReviewRow = {
  id: string;
  author_name: string;
  place: string | null;
  rating: number;
  text: string;
  approved: boolean;
  position: number | null;
  created_at: string;
};

export default function AdminPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  const [weekly, setWeekly] = useState<WeeklyRow[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [invMonth, setInvMonth] = useState<string>(() => new Date().toLocaleDateString("sv-SE").slice(0, 7)); // "YYYY-MM"
  const [subscribers, setSubscribers] = useState<{ id: string; email: string; created_at: string }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [kickId, setKickId] = useState<string | null>(null);
  const [kickCode, setKickCode] = useState("");
  const [kickInput, setKickInput] = useState("");
  const [kickBusy, setKickBusy] = useState(false);

  // Onboarding průvodce
  type OnbStep = { id: number; position: number; title: string; body: string; image_url: string | null; cx: number; cy: number; radius: number; href: string | null };
  const [onbSteps, setOnbSteps] = useState<OnbStep[]>([]);
  const [obTitle, setObTitle] = useState("");
  const [obBody, setObBody] = useState("");
  const [obHref, setObHref] = useState("");
  const [obImage, setObImage] = useState<string | null>(null);
  const [obCx, setObCx] = useState(50);
  const [obCy, setObCy] = useState(50);
  const [obRadius, setObRadius] = useState(10);
  const [obEditId, setObEditId] = useState<number | null>(null);
  const [obUploading, setObUploading] = useState(false);

  // Analytika
  type Stats = {
    members: { total: number; free: number; member: number; vip: number; vip_plus: number };
    reg7: number; reg30: number; reg_daily: { d: string; n: number }[];
    bookings: { total: number; last7: number; last30: number };
    minutes30: number; active7: number; subscribers: number; brags: number; challenges_done: number;
    top_videos: { slug: string; minutes: number }[];
    pv: { total30: number; today: number; daily: { d: string; n: number }[]; top: { path: string; n: number }[] };
  };
  const [analytics, setAnalytics] = useState<Stats | null>(null);

  // Dárkové kódy
  type GiftCode = { code: string; tier: string; months: number; redeemed: boolean; redeemed_at: string | null; created_at: string };
  const [giftTier, setGiftTier] = useState("member");
  const [giftMonths, setGiftMonths] = useState(1);
  const [lastGift, setLastGift] = useState<string | null>(null);
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);
  const [giftPaid, setGiftPaid] = useState(true);

  // Finance
  type FinEntry = { id: number; kind: string; category: string; amount_kc: number; note: string | null; at: string };
  const [finEntries, setFinEntries] = useState<FinEntry[]>([]);
  const [finKind, setFinKind] = useState<"income" | "expense">("income");
  const [finCat, setFinCat] = useState("MEMBER");
  const [finAmount, setFinAmount] = useState("");
  const [finNote, setFinNote] = useState("");
  const [finDate, setFinDate] = useState("");
  // Rychlé zadání měsíčního příjmu odjinud (fitko apod.) v kartě Faktury
  const [extCat, setExtCat] = useState("Fitko");
  const [extAmount, setExtAmount] = useState("");
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [tab, setTab] = useState<string>("videa");

  // Formulář nového videa
  const [viTitle, setViTitle] = useState("");
  const [viDesc, setViDesc] = useState("");
  const [viAccess, setViAccess] = useState<AccessLevel>("FREE");
  const [viDiff, setViDiff] = useState("začátečník");
  const [viDur, setViDur] = useState("");
  const [viCf, setViCf] = useState("");
  const [viTags, setViTags] = useState("");
  const [viCaution, setViCaution] = useState("");
  const [viBody, setViBody] = useState<string[]>([]);
  const [viSystems, setViSystems] = useState<string[]>([]);
  const [viProps, setViProps] = useState<string[]>([]);
  const [viGoal, setViGoal] = useState<string[]>([]);
  const [viUnsuitable, setViUnsuitable] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const togArr = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  // LIVE streamy
  type StreamRow = { id: string; title: string; description: string | null; embed_url: string | null; recording_url: string | null; starts_at: string };
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [stTitle, setStTitle] = useState("");
  const [stDesc, setStDesc] = useState("");
  const [stWhen, setStWhen] = useState("");
  const [stEmbed, setStEmbed] = useState("");
  const [stRec, setStRec] = useState("");

  // Měsíční výzva
  type ChallengeRow = { id: string; title: string; body: string | null; video_uid?: string | null };
  const [challenge, setChallenge] = useState<ChallengeRow | null>(null);
  const [chTitle, setChTitle] = useState("");
  const [chBody, setChBody] = useState("");
  const [chVideo, setChVideo] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Formulář nové recenze
  const [rvName, setRvName] = useState("");
  const [rvPlace, setRvPlace] = useState("");
  const [rvRating, setRvRating] = useState("5");
  const [rvText, setRvText] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Formulář nové akce
  const [evDate, setEvDate] = useState("");
  const [evTitle, setEvTitle] = useState("");
  const [evKind, setEvKind] = useState("Workshop");
  const [evTime, setEvTime] = useState("");
  const [evLocation, setEvLocation] = useState("");
  const [evDesc, setEvDesc] = useState("");
  const [evPrice, setEvPrice] = useState("");

  // Formulář nové výjimky
  const [ovDate, setOvDate] = useState("");
  const [ovTime, setOvTime] = useState("08:00");
  const [ovStatus, setOvStatus] = useState<"free" | "booked">("free");

  const admin = isAdminEmail(user?.email);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async () => {
    const [w, b, e, o, s, m, r, v, st, ch] = await Promise.all([
      supabase.from("availability_weekly").select("weekday,time,is_free"),
      supabase.from("bookings").select("*").order("date").order("time"),
      supabase.from("events").select("*").order("date"),
      supabase.from("availability_overrides").select("*").order("date"),
      supabase.from("subscribers").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,email,full_name,tier").order("email"),
      supabase.from("reviews").select("*").order("position", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
      supabase.from("videos").select(VIDEO_COLS).order("position", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
      supabase.from("streams").select("id, title, description, embed_url, recording_url, starts_at").order("starts_at", { ascending: false }),
      supabase.from("challenges").select("id, title, body").eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (w.data) setWeekly(w.data as WeeklyRow[]);
    if (b.data) setBookings(b.data as Booking[]);
    if (e.data) setEvents(e.data as EventRow[]);
    if (o.data) setOverrides(o.data as OverrideRow[]);
    if (s.data) setSubscribers(s.data as { id: string; email: string; created_at: string }[]);
    if (m.data) setMembers(m.data.map((x) => ({
      id: x.id, email: x.email, full_name: x.full_name, tier: x.tier,
      tier_since: null, tier_until: null, bonus_days: 0,
    })));
    if (r.data) setReviews(r.data as ReviewRow[]);
    if (v.data) setVideos(v.data as VideoRow[]);
    if (st.data) setStreams(st.data as StreamRow[]);
    setChallenge((ch.data as ChallengeRow | null) ?? null);

    // Vlastní lekce (plánovač) – samostatně, ať to nespadne, když tabulka ještě není.
    supabase.from("lesson_plans").select("*").order("date").order("time").then(({ data }) => {
      if (data) setLessons(data as LessonRow[]);
    });

    // Volitelné novější sloupce – když ještě nejsou v DB, prostě se přeskočí.
    supabase.from("profiles").select("id,tier_since,tier_until,bonus_days").then(({ data }) => {
      if (!data) return;
      const map = new Map((data as { id: string; tier_since: string | null; tier_until: string | null; bonus_days: number | null }[]).map((x) => [x.id, x]));
      setMembers((list) => list.map((mm) => {
        const ex = map.get(mm.id);
        return ex ? { ...mm, tier_since: ex.tier_since, tier_until: ex.tier_until, bonus_days: ex.bonus_days ?? 0 } : mm;
      }));
    });
    supabase.from("challenges").select("id, video_uid").eq("active", true).limit(1).maybeSingle().then(({ data }) => {
      if (data) setChallenge((c) => (c ? { ...c, video_uid: (data as { video_uid: string | null }).video_uid } : c));
    });
    supabase.from("onboarding_steps").select("*").order("position").then(({ data }) => {
      if (data) setOnbSteps(data as OnbStep[]);
    });
    supabase.rpc("admin_stats").then(({ data }) => {
      if (data) setAnalytics(data as Stats);
    });
    supabase.rpc("list_gift_codes").then(({ data }) => {
      if (data) setGiftCodes(data as GiftCode[]);
    });
    supabase.from("finance_entries").select("*").order("at", { ascending: false }).then(({ data }) => {
      if (data) setFinEntries(data as FinEntry[]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addFinance() {
    const amt = Number(finAmount.replace(",", "."));
    if (!amt || amt <= 0) { setError("Zadej částku v Kč."); return; }
    setError(null);
    const { error } = await supabase.from("finance_entries").insert({
      kind: finKind, category: finCat, amount_kc: amt, note: finNote.trim() || null,
      at: finDate || new Date().toISOString().slice(0, 10),
    });
    if (error) { setError("Uložení selhalo (spustil jsi finance.sql?): " + error.message); return; }
    setFinAmount(""); setFinNote("");
    const { data } = await supabase.from("finance_entries").select("*").order("at", { ascending: false });
    if (data) setFinEntries(data as FinEntry[]);
  }
  async function delFinance(id: number) {
    setFinEntries((e) => e.filter((x) => x.id !== id));
    await supabase.from("finance_entries").delete().eq("id", id);
  }

  // Rychlý měsíční příjem odjinud (fitko apod.) – zapíše se k 1. dni vybraného měsíce.
  async function addExternalIncome() {
    const amt = Number(extAmount.replace(",", "."));
    if (!amt || amt <= 0) { setError("Zadej částku v Kč."); return; }
    setError(null);
    const { error } = await supabase.from("finance_entries").insert({
      kind: "income", category: extCat, amount_kc: amt, note: null, at: `${invMonth}-01`,
    });
    if (error) { setError("Uložení selhalo (spustil jsi finance.sql?): " + error.message); return; }
    setExtAmount("");
    const { data } = await supabase.from("finance_entries").select("*").order("at", { ascending: false });
    if (data) setFinEntries(data as FinEntry[]);
  }

  async function genGift() {
    setError(null);
    const { data, error } = await supabase.rpc("create_gift_code", { p_tier: giftTier, p_months: giftMonths, p_log_income: giftPaid });
    if (error) { setError("Vygenerování kódu selhalo (spustil jsi gift_codes.sql?): " + error.message); return; }
    setLastGift(String(data));
    supabase.rpc("list_gift_codes").then(({ data: d }) => { if (d) setGiftCodes(d as GiftCode[]); });
    supabase.from("finance_entries").select("*").order("at", { ascending: false }).then(({ data: d }) => { if (d) setFinEntries(d as FinEntry[]); });
  }

  // ── Akce ──
  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from("events").insert({
      date: evDate,
      title: evTitle,
      kind: evKind || "Akce",
      time: evTime || null,
      location: evLocation || null,
      description: evDesc || null,
      price_kc: evPrice === "" ? null : Number(evPrice),
    });
    if (error) { setError("Akci se nepodařilo uložit: " + error.message); return; }
    setEvDate(""); setEvTitle(""); setEvKind("Workshop"); setEvTime("");
    setEvLocation(""); setEvDesc(""); setEvPrice("");
    loadData();
  }
  async function deleteEvent(id: string) {
    setError(null);
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) { setError("Smazání akce selhalo: " + error.message); return; }
    setEvents((prev) => prev.filter((x) => x.id !== id));
  }

  // ── Výjimky pro konkrétní datum ──
  async function addOverride(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase
      .from("availability_overrides")
      .upsert({ date: ovDate, time: ovTime, status: ovStatus }, { onConflict: "date,time" });
    if (error) { setError("Výjimku se nepodařilo uložit: " + error.message); return; }
    setOvDate("");
    loadData();
  }
  async function deleteOverride(id: string) {
    setError(null);
    const { error } = await supabase.from("availability_overrides").delete().eq("id", id);
    if (error) { setError("Smazání výjimky selhalo: " + error.message); return; }
    setOverrides((prev) => prev.filter((x) => x.id !== id));
  }

  // ── Výjimky z měsíčního kalendáře (klik na hodinu konkrétního dne) ──
  async function setOverrideAt(date: string, time: string, status: "free" | "booked") {
    setError(null);
    const { error } = await supabase
      .from("availability_overrides")
      .upsert({ date, time, status }, { onConflict: "date,time" });
    if (error) { setError("Uložení výjimky selhalo: " + error.message); return; }
    await loadData();
  }
  async function resetOverrideAt(date: string, time: string) {
    setError(null);
    const { error } = await supabase
      .from("availability_overrides")
      .delete()
      .eq("date", date)
      .eq("time", time);
    if (error) { setError("Smazání výjimky selhalo: " + error.message); return; }
    await loadData();
  }

  // ── Vlastní lekce (plánovač) ──
  async function addLesson(date: string, time: string, clientName: string, note: string, priceKc: number | null) {
    setError(null);
    const { error } = await supabase
      .from("lesson_plans")
      .insert({ date, time, client_name: clientName, note: note || null, price_kc: priceKc });
    if (error) { setError("Lekci se nepodařilo uložit (spustil jsi planner.sql?): " + error.message); return; }
    const { data } = await supabase.from("lesson_plans").select("*").order("date").order("time");
    if (data) setLessons(data as LessonRow[]);
  }
  async function deleteLesson(id: string) {
    setError(null);
    const { error } = await supabase.from("lesson_plans").delete().eq("id", id);
    if (error) { setError("Smazání lekce selhalo: " + error.message); return; }
    setLessons((prev) => prev.filter((x) => x.id !== id));
  }

  // ── Členové (úroveň přístupu) ──
  async function setMemberTier(id: string, newTier: UserTier) {
    setError(null);
    const prev = members;
    // optimisticky
    setMembers((m) => m.map((x) => (x.id === id ? { ...x, tier: tierToDb(newTier) } : x)));
    const { error } = await supabase.rpc("set_user_tier", {
      target_id: id,
      new_tier: tierToDb(newTier),
    });
    if (error) {
      setMembers(prev);
      setError(
        "Změna úrovně selhala. Spustil jsi v Supabase membership.sql? (" + error.message + ")"
      );
      return;
    }
    refreshMember(id); // dotáhne nově orazítkovaná data (od/do)
  }

  async function refreshMember(id: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id,email,full_name,tier,tier_since,tier_until,bonus_days")
      .eq("id", id)
      .maybeSingle();
    if (data) setMembers((m) => m.map((x) => (x.id === id ? (data as Member) : x)));
  }

  async function addDays(id: string, tierDb: string, days: number, logIncome: boolean) {
    setError(null);
    const { error } = await supabase.rpc("add_membership_days", { target_id: id, p_tier: tierDb, p_days: days, p_log_income: logIncome });
    if (error) {
      setError("Přidání dní selhalo (spustil jsi membership_dates.sql?): " + error.message);
      return;
    }
    refreshMember(id);
    supabase.from("finance_entries").select("*").order("at", { ascending: false }).then(({ data }) => { if (data) setFinEntries(data as FinEntry[]); });
  }

  function genKickCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bez matoucích 0/O/1/I
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }
  function startKick(id: string) {
    setKickId(id);
    setKickCode(genKickCode());
    setKickInput("");
    setError(null);
  }
  function cancelKick() {
    setKickId(null);
    setKickCode("");
    setKickInput("");
  }
  async function confirmKick(id: string) {
    setKickBusy(true);
    setError(null);
    const { error } = await supabase.rpc("admin_kick_member", { target_id: id });
    setKickBusy(false);
    if (error) {
      setError("Vyhození selhalo (spustil jsi admin_kick.sql?): " + error.message);
      return;
    }
    setMembers((m) => m.filter((x) => x.id !== id));
    cancelKick();
  }

  // ── Onboarding průvodce ──
  async function loadOnb() {
    const { data } = await supabase.from("onboarding_steps").select("*").order("position");
    if (data) setOnbSteps(data as OnbStep[]);
  }
  function resetOb() { setObEditId(null); setObTitle(""); setObBody(""); setObHref(""); setObImage(null); setObCx(50); setObCy(50); setObRadius(10); }
  async function uploadObImage(file: File) {
    setObUploading(true); setError(null);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `onboarding/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("community").upload(path, file, { upsert: true });
    setObUploading(false);
    if (error) { setError("Nahrání obrázku selhalo: " + error.message); return; }
    setObImage(supabase.storage.from("community").getPublicUrl(path).data.publicUrl);
  }
  async function saveStep() {
    if (!obTitle.trim()) { setError("Vyplň nadpis kroku."); return; }
    setError(null);
    const hrefRaw = obHref.trim();
    const href = hrefRaw ? (/^https?:\/\//.test(hrefRaw) ? hrefRaw : "/" + hrefRaw.replace(/^\/+/, "")) : null;
    const payload = { title: obTitle.trim(), body: obBody.trim(), href, image_url: obImage, cx: obCx, cy: obCy, radius: obRadius };
    if (obEditId) {
      const { error } = await supabase.from("onboarding_steps").update(payload).eq("id", obEditId);
      if (error) { setError("Uložení selhalo (spustil jsi onboarding.sql?): " + error.message); return; }
    } else {
      const pos = (onbSteps[onbSteps.length - 1]?.position ?? 0) + 1;
      const { error } = await supabase.from("onboarding_steps").insert({ ...payload, position: pos });
      if (error) { setError("Uložení selhalo (spustil jsi onboarding.sql?): " + error.message); return; }
    }
    resetOb(); loadOnb();
  }
  function editStep(s: OnbStep) { setObEditId(s.id); setObTitle(s.title); setObBody(s.body); setObHref(s.href ?? ""); setObImage(s.image_url); setObCx(s.cx); setObCy(s.cy); setObRadius(s.radius); }
  async function deleteStep(id: number) { await supabase.from("onboarding_steps").delete().eq("id", id); if (obEditId === id) resetOb(); loadOnb(); }
  async function moveStep(id: number, dir: -1 | 1) {
    const idx = onbSteps.findIndex((s) => s.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= onbSteps.length) return;
    const a = onbSteps[idx], b = onbSteps[j];
    await supabase.from("onboarding_steps").update({ position: b.position }).eq("id", a.id);
    await supabase.from("onboarding_steps").update({ position: a.position }).eq("id", b.id);
    loadOnb();
  }

  // ── Recenze ──
  async function addReview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const rating = Math.min(5, Math.max(1, Number(rvRating) || 5));
    const { error } = await supabase.from("reviews").insert({
      author_name: rvName.trim(),
      place: rvPlace.trim() || null,
      rating,
      text: rvText.trim(),
      approved: true,
    });
    if (error) { setError("Recenzi se nepodařilo uložit: " + error.message); return; }
    setRvName(""); setRvPlace(""); setRvRating("5"); setRvText("");
    loadData();
  }
  async function deleteReview(id: string) {
    setError(null);
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) { setError("Smazání recenze selhalo: " + error.message); return; }
    setReviews((prev) => prev.filter((x) => x.id !== id));
  }
  async function toggleReviewApproved(id: string, approved: boolean) {
    setError(null);
    const { error } = await supabase.from("reviews").update({ approved: !approved }).eq("id", id);
    if (error) { setError("Změna stavu recenze selhala: " + error.message); return; }
    setReviews((prev) => prev.map((x) => (x.id === id ? { ...x, approved: !approved } : x)));
  }
  async function handleReviewDrop(target: number) {
    if (dragIdx === null || dragIdx === target) { setDragIdx(null); return; }
    const arr = [...reviews];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(target, 0, moved);
    setReviews(arr);
    setDragIdx(null);
    setError(null);
    const { error } = await Promise.all(
      arr.map((r, i) => supabase.from("reviews").update({ position: i }).eq("id", r.id))
    ).then(() => ({ error: null })).catch((e) => ({ error: e }));
    if (error) setError("Uložení pořadí selhalo. Spustil jsi reviews_order.sql?");
  }

  // ── Videa ──
  async function addVideo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!viTitle.trim()) return;
    const row = {
      slug: `${slugifyVideo(viTitle)}-${Math.random().toString(36).slice(2, 5)}`,
      title: viTitle.trim(),
      description: viDesc.trim(),
      access_level: viAccess,
      body_parts: viBody,
      difficulty: viDiff,
      duration_seconds: Number(viDur) || 0,
      cf_uid: viCf.trim() || null,
      tags: toArr(viTags),
      caution: viCaution.trim() || null,
      systems: viSystems,
      props: viProps,
      problem_types: viGoal,
      unsuitable_for: viUnsuitable,
      published: true,
    };
    const { error } = await supabase.from("videos").insert(row);
    if (error) { setError("Video se nepodařilo uložit: " + error.message); return; }
    setViTitle(""); setViDesc(""); setViAccess("FREE"); setViDiff("začátečník");
    setViDur(""); setViCf(""); setViTags(""); setViCaution("");
    setViBody([]); setViSystems([]); setViProps([]); setViGoal([]); setViUnsuitable([]);
    loadData();
  }
  async function deleteVideo(id: string) {
    setError(null);
    const { error } = await supabase.from("videos").delete().eq("id", id);
    if (error) { setError("Smazání videa selhalo: " + error.message); return; }
    setVideos((prev) => prev.filter((x) => x.id !== id));
  }
  async function toggleVideoPublished(id: string, published: boolean) {
    setError(null);
    const { error } = await supabase.from("videos").update({ published: !published }).eq("id", id);
    if (error) { setError("Změna stavu videa selhala: " + error.message); return; }
    setVideos((prev) => prev.map((x) => (x.id === id ? { ...x, published: !published } : x)));
  }
  async function importMockVideos() {
    setImporting(true);
    setError(null);
    const rows = MOCK_VIDEOS.map((v) => ({
      slug: v.slug,
      title: v.title,
      description: v.description,
      access_level: v.accessLevel,
      body_parts: v.bodyParts,
      difficulty: v.difficulty,
      problem_types: v.problemTypes,
      equipment: v.equipment,
      tags: v.tags,
      duration_seconds: v.durationSeconds,
      caution: v.caution ?? null,
      published: true,
    }));
    const { error } = await supabase.from("videos").upsert(rows, { onConflict: "slug", ignoreDuplicates: true });
    setImporting(false);
    if (error) { setError("Import selhal: " + error.message); return; }
    loadData();
  }

  // ── LIVE streamy ──
  async function addStream(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!stTitle.trim() || !stWhen) { setError("Vyplň název a datum/čas streamu."); return; }
    const { error } = await supabase.from("streams").insert({
      title: stTitle.trim(),
      description: stDesc.trim(),
      starts_at: new Date(stWhen).toISOString(),
      embed_url: stEmbed.trim() || null,
      recording_url: stRec.trim() || null,
    });
    if (error) { setError("Stream se nepodařilo uložit: " + error.message); return; }
    setStTitle(""); setStDesc(""); setStWhen(""); setStEmbed(""); setStRec("");
    loadData();
  }
  async function deleteStream(id: string) {
    setError(null);
    const { error } = await supabase.from("streams").delete().eq("id", id);
    if (error) { setError("Smazání streamu selhalo: " + error.message); return; }
    setStreams((prev) => prev.filter((x) => x.id !== id));
  }

  // ── Měsíční výzva ──
  async function publishChallenge(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!chTitle.trim()) { setError("Vyplň název výzvy."); return; }
    await supabase.from("challenges").update({ active: false }).eq("active", true);
    const base = { title: chTitle.trim(), body: chBody.trim(), active: true };
    const withVideo = chVideo.trim() ? { ...base, video_uid: chVideo.trim() } : base;
    let { error } = await supabase.from("challenges").insert(withVideo);
    if (error && chVideo.trim()) {
      // možná ještě není sloupec video_uid → ulož aspoň výzvu bez videa
      ({ error } = await supabase.from("challenges").insert(base));
      if (!error) { setError("Výzva uložena, ale video se nepřidalo – spusť v Supabase challenge_video.sql."); }
    }
    if (error) { setError("Výzvu se nepodařilo uložit: " + error.message); return; }
    setChTitle(""); setChBody(""); setChVideo("");
    loadData();
  }
  async function clearChallenge() {
    setError(null);
    await supabase.from("challenges").update({ active: false }).eq("active", true);
    setChallenge(null);
  }

  // ── Odběratelé newsletteru ──
  async function deleteSubscriber(id: string) {
    setError(null);
    const { error } = await supabase.from("subscribers").delete().eq("id", id);
    if (error) { setError("Odhlášení odběratele selhalo: " + error.message); return; }
    setSubscribers((prev) => prev.filter((x) => x.id !== id));
  }
  function copyEmails() {
    const text = subscribers.map((s) => s.email).join(", ");
    if (navigator.clipboard) navigator.clipboard.writeText(text);
  }

  useEffect(() => {
    if (admin) loadData();
  }, [admin, loadData]);

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

  // ── Finance (z deníku + tržby z rezervací) ──
  const bookingsRevenue = bookings
    .filter((b) => b.status !== "cancelled" && b.status !== "zrušeno")
    .reduce((s, b) => s + (b.price_kc ?? 0), 0);
  const incomeByCat: Record<string, number> = {};
  finEntries.filter((e) => e.kind === "income").forEach((e) => { incomeByCat[e.category] = (incomeByCat[e.category] ?? 0) + Number(e.amount_kc); });
  if (bookingsRevenue > 0) incomeByCat["Rezervace"] = (incomeByCat["Rezervace"] ?? 0) + bookingsRevenue;
  const expenseByCat: Record<string, number> = {};
  finEntries.filter((e) => e.kind === "expense").forEach((e) => { expenseByCat[e.category] = (expenseByCat[e.category] ?? 0) + Number(e.amount_kc); });
  const totalEarned = Object.values(incomeByCat).reduce((a, b) => a + b, 0);
  const totalSpent = Object.values(expenseByCat).reduce((a, b) => a + b, 0);
  const profit = totalEarned - totalSpent;
  const FIN_COLORS = ["#1976FF", "#7c3aed", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#ec4899", "#64748b"];
  const incomeSlices = Object.entries(incomeByCat).map(([label, value], i) => ({ label, value, color: FIN_COLORS[i % FIN_COLORS.length] }));
  const expenseSlices = Object.entries(expenseByCat).map(([label, value], i) => ({ label, value, color: FIN_COLORS[i % FIN_COLORS.length] }));
  let topMembership = "—"; let topMembershipVal = 0;
  for (const c of ["MEMBER", "VIP", "VIP+"]) { if ((incomeByCat[c] ?? 0) > topMembershipVal) { topMembershipVal = incomeByCat[c]; topMembership = c; } }
  const finIncomeCats = ["MEMBER", "VIP", "VIP+", "Kurz", "Fitko", "Osobní lekce", "Jiné"];
  const finExpenseCats = ["Cloudflare", "Supabase", "Vercel", "Doména", "Marketing", "Jiné"];

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

        {/* Záložky */}
        <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm sticky top-2 z-10">
          {ADMIN_TABS.map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => setTab(t.k)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                tab === t.k ? t.active : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <t.Icon className={`h-4 w-4 ${tab === t.k ? "" : t.icon}`} strokeWidth={2} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "videa" && (
        <section className="card p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <h2 className="text-lg font-semibold text-brand-dark">
              Videa <span className="text-gray-400 font-normal">({videos.length})</span>
            </h2>
            <button
              type="button"
              onClick={importMockVideos}
              disabled={importing}
              className="text-xs font-semibold text-brand-blue hover:underline disabled:opacity-50"
            >
              {importing ? "Importuji…" : "Importovat ukázková videa"}
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            Soubor nahraješ na Cloudflare Stream a sem vložíš jeho <strong>UID</strong>. Bez UID je
            video „bez přehrávače" – metadata ale fungují.
          </p>

          {videos.length > 0 && (
            <div className="space-y-2 mb-6">
              {videos.map((v) => {
                const t = normalizeTier(v.access_level);
                return (
                  <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-dark truncate">
                        {v.title}
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${TIER_STYLES[t].badge}`}>{TIER_STYLES[t].label}</span>
                        {!v.published && <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-[11px] text-gray-500">skryté</span>}
                        {!v.cf_uid && <span className="ml-2 text-[11px] font-medium text-amber-600">chybí Cloudflare UID</span>}
                      </p>
                      <p className="text-xs text-gray-400">{(v.body_parts ?? []).join(", ")}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={() => toggleVideoPublished(v.id, v.published)} className="text-xs font-semibold text-gray-400 hover:text-gray-600">
                        {v.published ? "Skrýt" : "Zveřejnit"}
                      </button>
                      <button type="button" onClick={() => deleteVideo(v.id)} className="text-xs font-semibold text-red-500 hover:text-red-700">Smazat</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={addVideo} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminInput label="Název *" value={viTitle} onChange={setViTitle} placeholder="Ranní mobilita" required />
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Úroveň přístupu</label>
              <select value={viAccess} onChange={(e) => setViAccess(e.target.value as AccessLevel)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue">
                {ACCESS_OPTS.map((a) => <option key={a} value={a}>{TIER_STYLES[a].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Obtížnost</label>
              <select value={viDiff} onChange={(e) => setViDiff(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue">
                {DIFF_OPTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <AdminInput label="Délka (vteřiny)" type="number" value={viDur} onChange={setViDur} placeholder="600" />
            <AdminInput label="Cloudflare UID (zatím nech prázdné)" value={viCf} onChange={setViCf} />
            <AdminInput label="Štítky (oddělené čárkou)" value={viTags} onChange={setViTags} placeholder="ráno, protažení" />

            <CheckGroup label="Část těla" options={FILTER_BODY} selected={viBody} onToggle={(v) => togArr(viBody, setViBody, v)} />
            <CheckGroup label="Systém" options={FILTER_SYSTEMS} selected={viSystems} onToggle={(v) => togArr(viSystems, setViSystems, v)} />
            <CheckGroup label="Co dům dá" options={FILTER_PROPS} selected={viProps} onToggle={(v) => togArr(viProps, setViProps, v)} />
            <CheckGroup label="Cíl" options={FILTER_GOALS} selected={viGoal} onToggle={(v) => togArr(viGoal, setViGoal, v)} />
            <CheckGroup label="Nevhodné pro (kontraindikace)" options={FILTER_SUITABILITY} selected={viUnsuitable} onToggle={(v) => togArr(viUnsuitable, setViUnsuitable, v)} />

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-brand-dark mb-1">Popis</label>
              <textarea value={viDesc} onChange={(e) => setViDesc(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-brand-dark mb-1">Upozornění / kontraindikace text (nepovinné)</label>
              <textarea value={viCaution} onChange={(e) => setViCaution(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary text-sm">Přidat video</button>
            </div>
          </form>
        </section>
        )}

        {tab === "vyzva" && (
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">Měsíční výzva</h2>
          <p className="text-sm text-gray-500 mb-4">Krátká hravá výzva pro všechny. Zobrazí se každému v „Moje cesta".</p>
          {challenge && (
            <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-brand-dark">Aktuální: {challenge.title}</p>
              {challenge.body && <p className="text-xs text-gray-600 mt-0.5">{challenge.body}</p>}
              <button type="button" onClick={clearChallenge} className="mt-2 text-xs font-semibold text-red-500 hover:text-red-700">Ukončit výzvu</button>
            </div>
          )}
          <form onSubmit={publishChallenge} className="grid grid-cols-1 gap-3">
            <AdminInput label="Název výzvy *" value={chTitle} onChange={setChTitle} placeholder="Týden bez výmluv 💪" required />
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Popis</label>
              <textarea value={chBody} onChange={(e) => setChBody(e.target.value)} rows={2} placeholder="Každý den 5 minut pohybu. Stačí málo, hlavně pravidelně!" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <AdminInput label="Video k výzvě – Cloudflare UID (nepovinné)" value={chVideo} onChange={setChVideo} placeholder="např. a1b2c3d4e5f6… (necháš prázdné = bez videa)" />
            <div><button type="submit" className="btn-primary text-sm">Zveřejnit výzvu</button></div>
          </form>
        </section>
        )}

        {tab === "live" && (
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1 inline-flex items-center gap-2">
            <Radio className="h-5 w-5 text-amber-600" /> LIVE streamy <span className="text-gray-400 font-normal">({streams.length})</span>
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Naplánuj živý přenos. Odkaz z YouTube/Vimeo se vloží jako přehrávač, jiný se otevře odkazem. Záznam je pro VIP+ dostupný týden po streamu.
          </p>

          {streams.length > 0 && (
            <div className="space-y-2 mb-6">
              {streams.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">{s.title}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.starts_at).toLocaleString("cs-CZ")}{s.recording_url ? " · má záznam" : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => deleteStream(s.id)} className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700">Smazat</button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addStream} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminInput label="Název *" value={stTitle} onChange={setStTitle} placeholder="Ranní mobilita živě" required />
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Datum a čas *</label>
              <input
                type="datetime-local"
                value={stWhen}
                onChange={(e) => setStWhen(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <AdminInput label="Odkaz na živý přenos" value={stEmbed} onChange={setStEmbed} placeholder="https://youtube.com/live/..." />
            <AdminInput label="Odkaz na záznam (po skončení)" value={stRec} onChange={setStRec} placeholder="https://youtube.com/watch?v=..." />
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-brand-dark mb-1">Popis</label>
              <textarea value={stDesc} onChange={(e) => setStDesc(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary text-sm">Přidat stream</button>
            </div>
          </form>
        </section>
        )}

        {tab === "rozvrh" && (
        <>
        {/* ── Agenda: Co mě čeká ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">Co mě čeká</h2>
          <p className="text-sm text-gray-500 mb-5">
            Tvoje lekce a rezervace klientů dopředu, den po dni.
          </p>
          {(() => {
            const todayKey = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD lokálně
            type AgendaItem = { date: string; time: string; who: string; what: string; kind: "lekce" | "rezervace" };
            const items: AgendaItem[] = [
              ...lessons.map((l) => ({ date: l.date, time: l.time, who: l.client_name || "Lekce", what: l.note || "vlastní lekce", kind: "lekce" as const })),
              ...bookings.map((b) => ({ date: b.date, time: b.time, who: b.contact_name, what: b.service_name, kind: "rezervace" as const })),
            ]
              .filter((x) => x.date >= todayKey)
              .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
            if (items.length === 0) {
              return <p className="text-sm text-gray-400">Zatím nemáš nic naplánovaného. Přidej lekci v kalendáři níže, nebo počkej na rezervace klientů.</p>;
            }
            const byDay = new Map<string, AgendaItem[]>();
            for (const it of items.slice(0, 60)) {
              if (!byDay.has(it.date)) byDay.set(it.date, []);
              byDay.get(it.date)!.push(it);
            }
            return (
              <div className="space-y-4">
                {[...byDay.entries()].map(([date, dayItems]) => (
                  <div key={date}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5 capitalize">
                      {new Date(date + "T00:00:00").toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <div className="space-y-1.5">
                      {dayItems.map((it, i) => (
                        <div key={i} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${it.kind === "lekce" ? "bg-violet-50" : "bg-brand-light"}`}>
                          <span className={`rounded px-1.5 py-0.5 font-bold text-white ${it.kind === "lekce" ? "bg-violet-600" : "bg-brand-blue"}`}>{it.time}</span>
                          <span className="font-semibold text-brand-dark">{it.who}</span>
                          <span className="text-gray-500 truncate">· {it.what}</span>
                          <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${it.kind === "lekce" ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"}`}>{it.kind}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>

        {/* ── Moje volné hodiny (po týdnech, s daty) ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">Moje volné hodiny</h2>
          <p className="text-sm text-gray-500 mb-5">
            Tady nastavuješ, <strong>které hodiny jsou volné pro klienty</strong>. Listuj po týdnech
            (← →) klidně na měsíce dopředu a u konkrétních dnů naklikej volno. Kliknutím na <strong>datum dne</strong>
            otevřeš den a můžeš přidat vlastní lekci.
          </p>
          <WeekCalendar
            weekly={weekly}
            overrides={overrides}
            bookings={bookings}
            lessons={lessons}
            onSetOverride={setOverrideAt}
            onResetOverride={resetOverrideAt}
            onAddLesson={addLesson}
            onDeleteLesson={deleteLesson}
          />
        </section>

        {/* ── Měsíční přehled / výjimky ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">Měsíční přehled</h2>
          <p className="text-sm text-gray-500 mb-5">
            Celý měsíc na jednom místě – uvidíš, které dny máš volno, kolik máš obsazeno a kde jsou akce.
            Klik na den ukáže detail a umí i výjimky.
          </p>
          <MonthCalendar
            weekly={weekly}
            overrides={overrides}
            events={events}
            bookings={bookings}
            lessons={lessons}
            onSetOverride={setOverrideAt}
            onResetOverride={resetOverrideAt}
            onAddLesson={addLesson}
            onDeleteLesson={deleteLesson}
          />
        </section>

        {/* ── Akce / workshopy ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">
            Akce a workshopy <span className="text-gray-400 font-normal">({events.length})</span>
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Zobrazí se v kalendáři oranžovým puntíkem.
          </p>

          {/* Seznam */}
          {events.length > 0 && (
            <div className="space-y-2 mb-6">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">
                      <span className="capitalize">{fmtDateCs(ev.date)}</span> · {ev.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ev.kind}{ev.time ? ` · ${ev.time}` : ""}{ev.location ? ` · ${ev.location}` : ""}
                      {ev.price_kc != null ? ` · ${ev.price_kc === 0 ? "zdarma" : ev.price_kc + " Kč"}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteEvent(ev.id)}
                    className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    Smazat
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Přidat akci */}
          <form onSubmit={addEvent} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminInput label="Datum *" type="date" value={evDate} onChange={setEvDate} required />
            <AdminInput label="Název *" value={evTitle} onChange={setEvTitle} placeholder="Workshop: Zdravá záda" required />
            <AdminInput label="Typ" value={evKind} onChange={setEvKind} placeholder="Workshop / Seminář / Akce" />
            <AdminInput label="Čas" value={evTime} onChange={setEvTime} placeholder="10:00–13:00" />
            <AdminInput label="Místo" value={evLocation} onChange={setEvLocation} placeholder="Dobřichovice" />
            <AdminInput label="Cena (Kč, 0 = zdarma)" type="number" value={evPrice} onChange={setEvPrice} placeholder="890" />
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-brand-dark mb-1">Popis</label>
              <textarea
                value={evDesc}
                onChange={(e) => setEvDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary text-sm">Přidat akci</button>
            </div>
          </form>
        </section>

        {/* ── Výjimky pro konkrétní datum ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">
            Výjimky „pro tentokrát" <span className="text-gray-400 font-normal">({overrides.length})</span>
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Mimořádně uvolni nebo zaber hodinu na <strong>konkrétní datum</strong> (má přednost před týdenním rozvrhem).
          </p>

          {overrides.length > 0 && (
            <div className="space-y-2 mb-6">
              {overrides.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                  <p className="text-sm text-brand-dark">
                    <span className="capitalize">{fmtDateCs(o.date)}</span> · {o.time} ·{" "}
                    <span className={o.status === "free" ? "text-emerald-600 font-semibold" : "text-gray-500 font-semibold"}>
                      {o.status === "free" ? "volno" : "obsazeno"}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => deleteOverride(o.id)}
                    className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    Smazat
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addOverride} className="flex flex-wrap items-end gap-3">
            <AdminInput label="Datum *" type="date" value={ovDate} onChange={setOvDate} required />
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Hodina</label>
              <select
                value={ovTime}
                onChange={(e) => setOvTime(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm bg-white"
              >
                {HOURS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Stav</label>
              <select
                value={ovStatus}
                onChange={(e) => setOvStatus(e.target.value as "free" | "booked")}
                className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm bg-white"
              >
                <option value="free">volno</option>
                <option value="booked">obsazeno</option>
              </select>
            </div>
            <button type="submit" className="btn-primary text-sm">Přidat výjimku</button>
          </form>
        </section>
        </>
        )}

        {tab === "clenove" && (
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">
            Členové <span className="text-gray-400 font-normal">({members.length})</span>
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Přiřaď úroveň členství. Změna se projeví ihned a uživateli odemkne obsah.
          </p>

          {/* Dárkové kódy */}
          <div className="mb-6 rounded-xl border border-rose-100 bg-rose-50/40 p-4">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-rose-500" strokeWidth={2} />
              <p className="text-sm font-semibold text-brand-dark">Dárkový kód</p>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">Vygeneruj kód, který si obdarovaný uplatní ve svém účtu (Moje cesta → „Máš dárkový kód?").</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select value={giftTier} onChange={(e) => setGiftTier(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
                <option value="member">MEMBER</option>
                <option value="vip">VIP</option>
                <option value="vip_plus">VIP+</option>
              </select>
              <div className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                <input type="number" min={1} max={24} value={giftMonths} onChange={(e) => setGiftMonths(Math.max(1, Math.min(24, Number(e.target.value) || 1)))} className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                měsíců
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-500" title="Započítat do tržeb (odškrtni u promo kódu zdarma)">
                <input type="checkbox" checked={giftPaid} onChange={(e) => setGiftPaid(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" />
                tržba
              </label>
              <button onClick={genGift} className="btn-primary text-sm">Vygenerovat kód</button>
            </div>
            {lastGift && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="select-all rounded-lg bg-white px-3 py-1.5 font-mono text-base font-bold tracking-widest text-brand-dark ring-1 ring-gray-200">{lastGift}</span>
                <button onClick={() => navigator.clipboard?.writeText(lastGift)} className="text-xs font-semibold text-brand-blue hover:underline">Zkopírovat</button>
                <span className="text-xs text-gray-400">— pošli tenhle kód obdarovanému</span>
              </div>
            )}
            {giftCodes.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-gray-500">Všechny kódy ({giftCodes.length})</summary>
                <div className="mt-2 space-y-1">
                  {giftCodes.map((g) => (
                    <div key={g.code} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-xs ring-1 ring-gray-100">
                      <span className="font-mono font-semibold text-brand-dark">{g.code}</span>
                      <span className="text-gray-500">{g.tier.toUpperCase()} · {g.months} měs.</span>
                      <span className={g.redeemed ? "font-semibold text-emerald-600" : "text-gray-400"}>{g.redeemed ? "uplatněn" : "volný"}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {members.length === 0 ? (
            <p className="text-sm text-gray-400">Zatím žádní registrovaní uživatelé.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const t = normalizeTier(m.tier);
                const fmtD = (s: string | null) =>
                  s ? new Date(s).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }) : "—";
                const daysLeft = m.tier_until
                  ? Math.ceil((new Date(m.tier_until).getTime() - Date.now()) / 86400000)
                  : null;
                const paid = t !== "FREE";
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-dark truncate">
                        {m.full_name || m.email || "—"}
                      </p>
                      {m.full_name && m.email && (
                        <p className="text-xs text-gray-500 truncate">{m.email}</p>
                      )}
                      {paid && (
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                          <span>Získáno: <strong className="text-brand-dark">{fmtD(m.tier_since)}</strong></span>
                          <span>
                            Končí: <strong className="text-brand-dark">{fmtD(m.tier_until)}</strong>
                            {daysLeft != null && (
                              <span className={daysLeft < 0 ? "text-red-500" : "text-gray-400"}>
                                {" "}({daysLeft >= 0 ? `zbývá ${daysLeft} dní` : "vypršelo"})
                              </span>
                            )}
                          </span>
                          {(m.bonus_days ?? 0) > 0 && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 font-bold text-amber-700">
                              bonus +{m.bonus_days} dní
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${TIER_STYLES[t].badge}`}
                        >
                          {TIER_STYLES[t].label}
                        </span>
                        <select
                          value={t}
                          onChange={(e) => setMemberTier(m.id, e.target.value as UserTier)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                        >
                          <option value="FREE">FREE</option>
                          <option value="MEMBER">MEMBER</option>
                          <option value="VIP">VIP</option>
                          <option value="VIP_PLUS">VIP+</option>
                        </select>
                      </div>
                      <AddDays onAdd={(tierDb, days, logIncome) => addDays(m.id, tierDb, days, logIncome)} />
                      <button
                        onClick={() => startKick(m.id)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-500 hover:text-red-700"
                      >
                        <UserX className="h-3.5 w-3.5" /> Vyhodit
                      </button>
                    </div>
                    {kickId === m.id && (
                      <div className="w-full rounded-lg border border-red-200 bg-red-50/60 p-3">
                        <p className="text-sm font-semibold text-red-700">Vyhodit člena z webu</p>
                        <p className="mt-0.5 text-xs text-gray-600">
                          Trvale a nevratně smaže účet i všechna data tohoto člena. Pro potvrzení opiš kód:
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="select-all rounded-md bg-white px-3 py-1.5 font-mono text-base font-bold tracking-[0.3em] text-brand-dark ring-1 ring-gray-200">
                            {kickCode}
                          </span>
                          <input
                            value={kickInput}
                            onChange={(e) => setKickInput(e.target.value.toUpperCase())}
                            placeholder="Opiš kód"
                            maxLength={6}
                            className="w-32 rounded-lg border border-red-200 px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-red-400"
                          />
                          <button
                            onClick={() => confirmKick(m.id)}
                            disabled={kickBusy || kickInput !== kickCode}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <UserX className="h-4 w-4" /> {kickBusy ? "Vyhazuji…" : "Vyhodit natrvalo"}
                          </button>
                          <button onClick={cancelKick} className="text-sm font-semibold text-gray-500 hover:text-brand-dark">
                            Zrušit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        )}

        {tab === "rezervace" && (
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
                      {b.service_name} · <span className="capitalize">{fmtDateCs(b.date)}</span> v {b.time}
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
        )}

        {tab === "faktury" && (() => {
          // Lekce k vyúčtování: webové rezervace + vlastní lekce (obě s cenou).
          type Line = { date: string; time: string; client: string; what: string; amount: number };
          const lessonLines: Line[] = [
            ...bookings.map((b) => ({ date: b.date, time: b.time, client: b.contact_name || "—", what: b.service_name, amount: b.price_kc || 0 })),
            ...lessons.map((l) => ({ date: l.date, time: l.time, client: l.client_name || "—", what: l.note || "Lekce", amount: l.price_kc ?? 0 })),
          ];
          const monthLines = lessonLines.filter((x) => x.date.slice(0, 7) === invMonth).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
          const byClient = new Map<string, Line[]>();
          for (const ln of monthLines) {
            if (!byClient.has(ln.client)) byClient.set(ln.client, []);
            byClient.get(ln.client)!.push(ln);
          }
          const clients = [...byClient.entries()].sort((a, b) => a[0].localeCompare(b[0], "cs"));
          const lessonsTotal = monthLines.reduce((s, x) => s + x.amount, 0);

          // Příjmy odjinud (ručně – fitko apod.) pro vybraný měsíc
          const monthFin = finEntries.filter((e) => e.kind === "income" && String(e.at).slice(0, 7) === invMonth);
          const manualTotal = monthFin.reduce((s, e) => s + Number(e.amount_kc), 0);
          const monthGrand = lessonsTotal + manualTotal;

          const year = invMonth.slice(0, 4);
          const yearMonths = Array.from({ length: 12 }, (_, i) => {
            const mm = String(i + 1).padStart(2, "0");
            const key = `${year}-${mm}`;
            const les = lessonLines.filter((x) => x.date.slice(0, 7) === key).reduce((s, x) => s + x.amount, 0);
            const man = finEntries.filter((e) => e.kind === "income" && String(e.at).slice(0, 7) === key).reduce((s, e) => s + Number(e.amount_kc), 0);
            return { mm, total: les + man };
          });
          const yearTotal = yearMonths.reduce((s, x) => s + x.total, 0);
          const maxMonth = Math.max(1, ...yearMonths.map((m) => m.total));
          const MNAMES = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
          const monthLabel = new Date(invMonth + "-01T00:00:00").toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });

          return (
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-brand-dark mb-1">Faktury / měsíční vyúčtování</h2>
            <p className="text-sm text-gray-500 mb-5">
              Kolik komu naúčtovat za lekce + příjmy odjinud (fitko). Čísla faktur přibydou, až poběží
              Stripe – zatím je to podklad pro fakturaci a celkový přehled příjmů.
            </p>

            {/* Výběr měsíce + celkový příjem */}
            <div className="flex flex-wrap items-end gap-3 mb-6">
              <div>
                <label className="block text-xs font-semibold text-brand-dark mb-1">Měsíc</label>
                <input
                  type="month"
                  value={invMonth}
                  onChange={(e) => setInvMonth(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                />
              </div>
              <div className="rounded-lg bg-green-50 px-4 py-2">
                <p className="text-[11px] text-green-700 font-semibold uppercase tracking-wide">Příjem celkem · <span className="capitalize">{monthLabel}</span></p>
                <p className="text-xl font-bold text-green-800">{monthGrand.toLocaleString("cs-CZ")} Kč</p>
                {manualTotal > 0 && lessonsTotal > 0 && (
                  <p className="text-[11px] text-green-600">lekce {lessonsTotal.toLocaleString("cs-CZ")} + jinde {manualTotal.toLocaleString("cs-CZ")}</p>
                )}
              </div>
            </div>

            {/* Vyúčtování lekcí po klientech */}
            <h3 className="text-sm font-semibold text-brand-dark mb-2">Lekce – komu naúčtovat</h3>
            {clients.length === 0 ? (
              <p className="text-sm text-gray-400 mb-6">V tomto měsíci nejsou žádné lekce.</p>
            ) : (
              <div className="space-y-4 mb-6">
                {clients.map(([client, lines]) => {
                  const sub = lines.reduce((s, x) => s + x.amount, 0);
                  return (
                    <div key={client} className="rounded-xl border border-gray-100 overflow-hidden">
                      <div className="flex items-center justify-between bg-gray-50 px-4 py-2">
                        <span className="font-semibold text-brand-dark">{client}</span>
                        <span className="text-sm font-bold text-green-700">{sub.toLocaleString("cs-CZ")} Kč</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {lines.map((ln, i) => (
                          <div key={i} className="flex items-center gap-2 px-4 py-2 text-sm">
                            <span className="capitalize text-gray-600 w-40 shrink-0">{fmtDateCs(ln.date)}</span>
                            <span className="text-gray-400 w-12 shrink-0">{ln.time}</span>
                            <span className="text-gray-600 truncate flex-1">{ln.what}</span>
                            <span className="font-semibold text-brand-dark shrink-0">{ln.amount.toLocaleString("cs-CZ")} Kč</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Příjmy odjinud (fitko apod.) */}
            <h3 className="text-sm font-semibold text-brand-dark mb-2 mt-6">Příjmy odjinud (fitko apod.)</h3>
            {monthFin.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {monthFin.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-1.5 text-sm">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">{e.category}</span>
                    {e.note && <span className="text-gray-400 truncate">· {e.note}</span>}
                    <span className="ml-auto font-semibold text-brand-dark">{Math.round(Number(e.amount_kc)).toLocaleString("cs-CZ")} Kč</span>
                    <button type="button" onClick={() => delFinance(e.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-end gap-2 mb-8 rounded-lg bg-gray-50 p-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-0.5">Odkud</label>
                <select value={extCat} onChange={(e) => setExtCat(e.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs">
                  {["Fitko", "Osobní lekce", "Kurz", "Jiné"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="w-28">
                <label className="block text-[11px] text-gray-400 mb-0.5">Částka Kč</label>
                <input value={extAmount} onChange={(e) => setExtAmount(e.target.value)} inputMode="decimal" placeholder="např. 12000" className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs" />
              </div>
              <button type="button" onClick={addExternalIncome} disabled={!extAmount.trim()} className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-40">
                Přidat za <span className="capitalize">{monthLabel}</span>
              </button>
            </div>

            {/* Celkem za měsíc */}
            <div className="flex items-center justify-between rounded-xl bg-brand-dark px-4 py-3 text-white mb-8">
              <span className="font-semibold">Celkem za <span className="capitalize">{monthLabel}</span></span>
              <span className="text-lg font-bold">{monthGrand.toLocaleString("cs-CZ")} Kč</span>
            </div>

            {/* Roční přehled */}
            <h3 className="text-sm font-semibold text-brand-dark mb-1">Přehled roku {year} <span className="text-gray-400 font-normal">· celkem {yearTotal.toLocaleString("cs-CZ")} Kč</span></h3>
            <p className="text-xs text-gray-400 mb-3">Příjem po měsících – klikni na měsíc pro detail výše.</p>
            <div className="space-y-1.5">
              {yearMonths.map((m, i) => (
                <button
                  key={m.mm}
                  type="button"
                  onClick={() => setInvMonth(`${year}-${m.mm}`)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${invMonth === `${year}-${m.mm}` ? "bg-brand-light" : "hover:bg-gray-50"}`}
                >
                  <span className="w-20 shrink-0 text-xs font-medium text-gray-600">{MNAMES[i]}</span>
                  <span className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                    <span className="block h-full rounded-full bg-green-500" style={{ width: `${(m.total / maxMonth) * 100}%` }} />
                  </span>
                  <span className="w-24 shrink-0 text-right text-xs font-semibold text-brand-dark">{m.total.toLocaleString("cs-CZ")} Kč</span>
                </button>
              ))}
            </div>
          </section>
          );
        })()}

        {tab === "recenze" && (
        <section className="card p-6 mt-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">
            Recenze <span className="text-gray-400 font-normal">({reviews.length})</span>
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Přidej recenzi (zobrazí se hned). Návrhy od členů se objeví jako neschválené – schválíš je tlačítkem.
          </p>

          {/* Seznam (přetažením změníš pořadí zobrazení na webu) */}
          {reviews.length > 0 && (
            <div className="space-y-2 mb-6">
              <p className="text-xs text-gray-400">Pořadí změníš přetažením za úchyt vlevo.</p>
              {reviews.map((r, i) => (
                <div
                  key={r.id}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleReviewDrop(i)}
                  onDragEnd={() => setDragIdx(null)}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${dragIdx === i ? "border-brand-blue bg-brand-light/40" : "border-gray-100"}`}
                >
                  <span
                    className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
                    title="Přetáhni pro změnu pořadí"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-dark">
                      {r.author_name}{r.place ? ` · ${r.place}` : ""}{" "}
                      <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                      {!r.approved && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">čeká na schválení</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{r.text}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleReviewApproved(r.id, r.approved)}
                      className={`text-xs font-semibold ${r.approved ? "text-gray-400 hover:text-gray-600" : "text-emerald-600 hover:text-emerald-700"}`}
                    >
                      {r.approved ? "Skrýt" : "Schválit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteReview(r.id)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700"
                    >
                      Smazat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Přidat recenzi */}
          <form onSubmit={addReview} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminInput label="Jméno *" value={rvName} onChange={setRvName} placeholder="Jan N." required />
            <AdminInput label="Obec" value={rvPlace} onChange={setRvPlace} placeholder="Dobřichovice" />
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Hodnocení</label>
              <select
                value={rvRating}
                onChange={(e) => setRvRating(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm bg-white"
              >
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-brand-dark mb-1">Text recenze *</label>
              <textarea
                value={rvText}
                onChange={(e) => setRvText(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary text-sm">Přidat recenzi</button>
            </div>
          </form>
        </section>
        )}

        {tab === "newsletter" && (
        <section className="card p-6 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <h2 className="text-lg font-semibold text-brand-dark">
              Odběratelé newsletteru <span className="text-gray-400 font-normal">({subscribers.length})</span>
            </h2>
            {subscribers.length > 0 && (
              <button
                type="button"
                onClick={copyEmails}
                className="text-xs font-semibold text-brand-blue hover:underline"
              >
                Zkopírovat všechny e-maily
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-5">
            E-maily lidí, kteří se přihlásili k odběru novinek.
          </p>

          {subscribers.length === 0 ? (
            <p className="text-sm text-gray-400">Zatím žádní odběratelé.</p>
          ) : (
            <div className="space-y-2">
              {subscribers.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                  <span className="text-sm text-brand-dark truncate">{s.email}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">
                      {new Date(s.created_at).toLocaleDateString("cs-CZ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteSubscriber(s.id)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700"
                    >
                      Odhlásit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {tab === "pruvodce" && (
        <section className="card p-6 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <h2 className="text-lg font-semibold text-brand-dark">
              Onboarding průvodce <span className="text-gray-400 font-normal">({onbSteps.length} kroků)</span>
            </h2>
            <button type="button" onClick={() => window.dispatchEvent(new Event("pd-onboarding-start"))} className="text-xs font-semibold text-brand-blue hover:underline">
              Spustit náhled
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            Kroky, kterými projde nový člen po prvním přihlášení. U každého nahraj obrázek (screenshot stránky) a klikni do něj, kde se má objevit kroužek.
          </p>

          {/* Seznam kroků */}
          {onbSteps.length > 0 && (
            <div className="space-y-2 mb-6">
              {onbSteps.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5">
                  <span className="w-5 shrink-0 text-center text-sm font-bold text-gray-400">{idx + 1}.</span>
                  {s.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image_url} alt="" className="h-10 w-16 shrink-0 rounded object-cover ring-1 ring-gray-200" />
                  ) : (
                    <span className="h-10 w-16 shrink-0 rounded bg-gray-100" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-dark">{s.title}</span>
                  <div className="flex shrink-0 items-center gap-1.5 text-xs">
                    <button onClick={() => moveStep(s.id, -1)} className="rounded border border-gray-200 px-1.5 py-0.5 text-gray-500 hover:bg-gray-50" title="Nahoru">↑</button>
                    <button onClick={() => moveStep(s.id, 1)} className="rounded border border-gray-200 px-1.5 py-0.5 text-gray-500 hover:bg-gray-50" title="Dolů">↓</button>
                    <button onClick={() => editStep(s)} className="font-semibold text-brand-blue hover:underline">Upravit</button>
                    <button onClick={() => deleteStep(s.id)} className="font-semibold text-red-500 hover:text-red-700">Smazat</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulář kroku */}
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="mb-3 text-sm font-semibold text-brand-dark">{obEditId ? "Upravit krok" : "Přidat krok"}</p>
            <div className="grid grid-cols-1 gap-3">
              <AdminInput label="Nadpis kroku *" value={obTitle} onChange={setObTitle} placeholder="Tady najdeš svoje videa" />
              <div>
                <label className="block text-xs font-semibold text-brand-dark mb-1">Popis</label>
                <textarea value={obBody} onChange={(e) => setObBody(e.target.value)} rows={2} placeholder="Krátce vysvětli, k čemu to je a kde to najde." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue" />
              </div>
              <AdminInput label={'Tlačítko „Ukázat" vede na (nepovinné)'} value={obHref} onChange={setObHref} placeholder="např. /videoknihovna nebo /ucet (prázdné = bez tlačítka)" />
              <div>
                <label className="block text-xs font-semibold text-brand-dark mb-1">Obrázek (screenshot stránky)</label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-light">
                  {obUploading ? "Nahrávám…" : obImage ? "Změnit obrázek" : "Nahrát obrázek"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadObImage(f); e.target.value = ""; }} />
                </label>
              </div>

              {obImage && (
                <div>
                  <p className="mb-1 text-xs text-gray-500">Klikni do obrázku, kam dát kroužek. Velikost nastav posuvníkem.</p>
                  <div
                    className="relative inline-block max-w-full cursor-crosshair overflow-hidden rounded-lg ring-1 ring-gray-200"
                    onClick={(e) => {
                      const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      setObCx(Math.round(((e.clientX - r.left) / r.width) * 100));
                      setObCy(Math.round(((e.clientY - r.top) / r.height) * 100));
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={obImage} alt="" className="block max-h-72 w-auto" />
                    <span
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-brand-blue shadow-[0_0_0_3px_rgba(255,255,255,0.6)]"
                      style={{ left: `${obCx}%`, top: `${obCy}%`, width: `${obRadius * 2}%`, paddingBottom: `${obRadius * 2}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <span>Velikost kroužku</span>
                    <input type="range" min={4} max={30} value={obRadius} onChange={(e) => setObRadius(Number(e.target.value))} className="flex-1" />
                    <span className="w-8 text-right">{obRadius}%</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button type="button" onClick={saveStep} className="btn-primary text-sm">{obEditId ? "Uložit změny" : "Přidat krok"}</button>
                {obEditId && <button type="button" onClick={resetOb} className="text-sm font-semibold text-gray-500 hover:text-brand-dark">Zrušit úpravu</button>}
              </div>
            </div>
          </div>
        </section>
        )}

        {tab === "blog" && <BlogAdmin />}

        {tab === "analytika" && (
        <section className="card p-6 mt-8">
          <h2 className="mb-1 inline-flex items-center gap-2 text-lg font-semibold text-brand-dark">
            <BarChart3 className="h-5 w-5 text-indigo-500" /> Analytika
          </h2>
          <p className="mb-5 text-sm text-gray-500">Přehled dění na webu (převážně za posledních 30 dní).</p>

          {!analytics ? (
            <p className="text-sm text-gray-400">Načítám… Pokud se nic neobjeví, spusť v Supabase <strong>analytics.sql</strong>.</p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Členů celkem" value={analytics.members.total} />
                <Metric label="Registrace 30 dní" value={analytics.reg30} sub={`${analytics.reg7} za 7 dní`} />
                <Metric label="Rezervace 30 dní" value={analytics.bookings.last30} sub={`${analytics.bookings.total} celkem`} />
                <Metric label="Návštěvy dnes" value={analytics.pv.today} sub={`${analytics.pv.total30} za 30 dní`} />
                <Metric label="Odcvičené minuty 30 dní" value={analytics.minutes30} />
                <Metric label="Aktivní cvičící 7 dní" value={analytics.active7} />
                <Metric label="Odběratelé newsletteru" value={analytics.subscribers} />
                <Metric label="Splněné výzvy" value={analytics.challenges_done} />
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Členové podle úrovně</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <TierCard label="FREE" value={analytics.members.free} cls="bg-gray-100 text-gray-600" />
                  <TierCard label="MEMBER" value={analytics.members.member} cls="bg-blue-100 text-blue-700" />
                  <TierCard label="VIP" value={analytics.members.vip} cls="bg-violet-100 text-violet-700" />
                  <TierCard label="VIP+" value={analytics.members.vip_plus} cls="bg-amber-100 text-amber-700" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <BarChart title="Návštěvy / den" data={daily30(analytics.pv.daily)} color="bg-indigo-500" />
                <BarChart title="Registrace / den" data={daily30(analytics.reg_daily)} color="bg-emerald-500" />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <TopList title="Nejnavštěvovanější stránky" items={analytics.pv.top.map((x) => ({ label: x.path, value: x.n, unit: "návštěv" }))} />
                <TopList title="Nejsledovanější videa" items={analytics.top_videos.map((x) => ({ label: x.slug, value: x.minutes, unit: "min" }))} />
              </div>
            </div>
          )}

          {/* ── Finance ── */}
          <div className="mt-8 border-t border-gray-100 pt-6">
            <h3 className="mb-1 inline-flex items-center gap-2 text-lg font-semibold text-brand-dark">💰 Finance</h3>
            <p className="mb-4 text-sm text-gray-500">Tržby z rezervací se počítají automaticky; členství, kurzy a výdaje na provoz si zapisuješ níže.</p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Vydělal jsem (Kč)" value={Math.round(totalEarned)} />
              <Metric label="Utratil jsem (Kč)" value={Math.round(totalSpent)} />
              <div className="rounded-xl bg-gray-50 p-3">
                <p className={`text-2xl font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{Math.round(profit).toLocaleString("cs-CZ")}</p>
                <p className="text-[11px] text-gray-500">Zisk (Kč)</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-base font-bold text-brand-dark">{topMembership}</p>
                <p className="text-[11px] text-gray-500">Nejvýdělečnější členství</p>
                {topMembershipVal > 0 && <p className="text-[11px] text-gray-400">{Math.round(topMembershipVal).toLocaleString("cs-CZ")} Kč</p>}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Příjmy podle služby</p>
                <Pie slices={incomeSlices} />
              </div>
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Výdaje podle kategorie</p>
                <Pie slices={expenseSlices} />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-100 p-4">
              <p className="mb-3 text-sm font-semibold text-brand-dark">Přidat záznam</p>
              <div className="flex flex-wrap items-end gap-2">
                <select value={finKind} onChange={(e) => { const k = e.target.value as "income" | "expense"; setFinKind(k); setFinCat(k === "income" ? "MEMBER" : "Cloudflare"); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                  <option value="income">Příjem</option>
                  <option value="expense">Výdaj</option>
                </select>
                <select value={finCat} onChange={(e) => setFinCat(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                  {(finKind === "income" ? finIncomeCats : finExpenseCats).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={finAmount} onChange={(e) => setFinAmount(e.target.value)} placeholder="Částka (Kč)" inputMode="decimal" className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                <input type="date" value={finDate} onChange={(e) => setFinDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                <input value={finNote} onChange={(e) => setFinNote(e.target.value)} placeholder="Poznámka (nepovinné)" className="min-w-[120px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                <button onClick={addFinance} className="btn-primary text-sm">Přidat</button>
              </div>
            </div>

            {finEntries.length > 0 && (
              <div className="mt-4 space-y-1">
                {finEntries.slice(0, 30).map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-1.5 text-xs">
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 font-bold ${e.kind === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{e.kind === "income" ? "+" : "−"}</span>
                    <span className="shrink-0 font-semibold text-brand-dark">{Math.round(Number(e.amount_kc)).toLocaleString("cs-CZ")} Kč</span>
                    <span className="text-gray-500">{e.category}</span>
                    {e.note && <span className="min-w-0 truncate text-gray-400">· {e.note}</span>}
                    <span className="ml-auto shrink-0 text-gray-400">{new Date(e.at).toLocaleDateString("cs-CZ")}</span>
                    <button onClick={() => delFinance(e.id)} className="shrink-0 text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        )}
      </div>
    </div>
  );
}

function CheckGroup({
  label, options, selected, onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <label className="block text-xs font-semibold text-brand-dark mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                on ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-light hover:text-brand-blue"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AdminInput({
  label, value, onChange, type = "text", placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-brand-dark mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
      />
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

function AddDays({ onAdd }: { onAdd: (tierDb: string, days: number, logIncome: boolean) => void }) {
  const [t, setT] = useState("member");
  const [d, setD] = useState(30);
  const [paid, setPaid] = useState(true);
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
      <span>Přidat:</span>
      <select value={t} onChange={(e) => setT(e.target.value)} className="rounded-md border border-gray-200 bg-white px-1.5 py-1 text-[11px] focus:outline-none">
        <option value="member">MEMBER</option>
        <option value="vip">VIP</option>
        <option value="vip_plus">VIP+</option>
      </select>
      <input type="number" min={1} value={d} onChange={(e) => setD(Math.max(1, Number(e.target.value) || 1))} className="w-14 rounded-md border border-gray-200 px-1.5 py-1 text-[11px] focus:outline-none" />
      <span>dní</span>
      <label className="inline-flex items-center gap-1" title="Započítat do tržeb (odškrtni u dárku zdarma)">
        <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-3 w-3 rounded border-gray-300 text-brand-blue" />
        tržba
      </label>
      <button onClick={() => onAdd(t, d, paid)} className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-semibold text-brand-blue hover:bg-brand-light">Přidat</button>
    </div>
  );
}

function Pie({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const data = slices.filter((s) => s.value > 0);
  const total = data.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return <p className="text-xs text-gray-400">Zatím žádná data.</p>;
  const R = 55, sw = 26, circ = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0">
        <g transform="rotate(-90 70 70)">
          {data.map((s, i) => {
            const frac = s.value / total;
            const seg = (
              <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth={sw}
                strokeDasharray={`${frac * circ} ${circ - frac * circ}`} strokeDashoffset={-acc * circ} />
            );
            acc += frac;
            return seg;
          })}
        </g>
      </svg>
      <div className="min-w-[150px] flex-1 space-y-1">
        {data.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="min-w-0 truncate text-brand-dark">{s.label}</span>
            <span className="ml-auto whitespace-nowrap text-gray-500">{Math.round(s.value).toLocaleString("cs-CZ")} Kč · {Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-2xl font-bold text-brand-dark">{value.toLocaleString("cs-CZ")}</p>
      <p className="text-[11px] leading-tight text-gray-500">{label}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}
function TierCard({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-xl border border-gray-100 p-3 text-center">
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>
      <p className="mt-1 text-xl font-bold text-brand-dark">{value}</p>
    </div>
  );
}
function BarChart({ title, data, color }: { title: string; data: { label: string; n: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">{title}</p>
      <div className="flex h-24 items-end gap-[2px]">
        {data.map((d, i) => (
          <div key={i} className="flex-1" title={`${d.label}.: ${d.n}`}>
            <div className={`${color} rounded-sm`} style={{ height: `${(d.n / max) * 100}%`, minHeight: d.n > 0 ? "2px" : "0" }} />
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-gray-400">posledních 30 dní</p>
    </div>
  );
}
function TopList({ title, items }: { title: string; items: { label: string; value: number; unit: string }[] }) {
  const max = Math.max(1, ...items.map((x) => x.value));
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">Zatím žádná data.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((x, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-xs">
                <span className="min-w-0 truncate text-brand-dark">{x.label}</span>
                <span className="ml-2 shrink-0 font-semibold text-gray-500">{x.value} {x.unit}</span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-indigo-400" style={{ width: `${(x.value / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
