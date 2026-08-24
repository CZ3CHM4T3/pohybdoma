"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GripVertical, Radio, UserX, Film, Flame, CalendarDays, CalendarCheck, Users, Star, Mail, Compass, BarChart3, Gift, FileText, Receipt, Trash2, Package, LayoutDashboard } from "lucide-react";
import { BlogAdmin } from "@/components/admin/BlogAdmin";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { TIER_STYLES, normalizeTier, tierToDb } from "@/lib/tiers";
import QRCode from "qrcode";
import { MonthCalendar } from "@/components/admin/MonthCalendar";
import { WeekCalendar } from "@/components/admin/WeekCalendar";
import { INVOICE_SUPPLIER, INVOICE_SETTINGS, invoiceConfigured } from "@/lib/invoice-config";
import { spdString } from "@/lib/qr-payment";
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
  { k: "produkty", label: "Produkty", Icon: Package, active: "bg-slate-700 text-white", icon: "text-slate-500" },
  { k: "analytika", label: "Analytika", Icon: BarChart3, active: "bg-indigo-600 text-white", icon: "text-indigo-500" },
];
// Hlavní skupiny (2. úroveň = podzáložky). Denní provoz první.
const ADMIN_GROUPS = [
  { k: "dnes", label: "Dnešek", Icon: LayoutDashboard, active: "bg-brand-dark text-white", icon: "text-gray-500", tabs: ["dnes"] },
  { k: "provoz", label: "Provoz", Icon: CalendarDays, active: "bg-sky-600 text-white", icon: "text-sky-500", tabs: ["rozvrh", "rezervace"] },
  { k: "penize", label: "Peníze", Icon: Receipt, active: "bg-green-700 text-white", icon: "text-green-600", tabs: ["faktury", "analytika"] },
  { k: "obsah", label: "Obsah", Icon: Film, active: "bg-violet-600 text-white", icon: "text-violet-500", tabs: ["videa", "live", "vyzva", "blog", "produkty"] },
  { k: "lide", label: "Lidé", Icon: Users, active: "bg-blue-600 text-white", icon: "text-blue-500", tabs: ["clenove", "recenze", "newsletter", "pruvodce"] },
];
// Barvy dlaždic produktů (klíč → třídy pozadí/ikony)
const PRODUCT_ACCENTS: Record<string, { bg: string; icon: string }> = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600" },
  violet: { bg: "bg-violet-50", icon: "text-violet-600" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600" },
  rose: { bg: "bg-rose-50", icon: "text-rose-600" },
};
// Stavy rezervace (životní cyklus)
const BOOKING_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Čeká na potvrzení", cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Potvrzeno", cls: "bg-blue-100 text-blue-700" },
  completed: { label: "Proběhla", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Zrušeno včas", cls: "bg-gray-100 text-gray-500" },
  no_show: { label: "Storno – poplatek", cls: "bg-red-100 text-red-700" },
};
function bookingStatusMeta(s: string) {
  return BOOKING_STATUS[s] ?? { label: s, cls: "bg-gray-100 text-gray-500" };
}

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
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

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
  bill_name: string | null;
  bill_address: string | null;
  bill_ico: string | null;
  bill_dic: string | null;
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
  recurring?: boolean;
  block?: boolean; // pravidelný blok (MS GEM, kroužek…) – jen blokuje kalendář, nefakturuje se
};
type RecurringRow = {
  id: string;
  client_name: string;
  weekday: number;
  time: string;
  price_kc: number | null;
  note: string | null;
  active: boolean;
};
type ClientRow = { id: string; name: string; email: string | null; note: string | null; bill_group: string | null };
type BlockRow = { id: string; weekday: number; start_time: string; end_time: string; label: string; category: string; note: string | null; active: boolean };
// Barvy typů lekcí/bloků v rozvrhu (hex kvůli inline stylu na časové ose)
const CAT_COLORS: Record<string, string> = {
  fitness: "#0f766e",   // klientská lekce – tyrkysová
  rezervace: "#1976ff", // web rezervace – modrá
  msgem: "#c2410c",     // MS GEM – oranžová
  tenis: "#b45309",     // příprava tenistů – jantarová
  skolka: "#be185d",    // tenis s EMESKOU (MŠ) – růžová
  krouzek: "#4d7c0f",   // kroužek – zelená
  kruhac: "#6d28d9",    // kruhový trénink – fialová
  jine: "#475569",      // ostatní – šedá
};
const CAT_LABELS: Record<string, string> = {
  msgem: "MS GEM", tenis: "Příprava tenistů", skolka: "Tenis s EMESKOU (MŠ)", krouzek: "Kroužek", kruhac: "Kruhový trénink", jine: "Jiné",
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
type ProductRow = {
  id: string;
  slug: string | null;
  name: string;
  tagline: string;
  description: string;
  price: string;
  accent: string;
  published: boolean;
  position: number;
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
  const [recurring, setRecurring] = useState<RecurringRow[]>([]);
  const [recCancels, setRecCancels] = useState<{ recurring_id: string; date: string }[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [recClient, setRecClient] = useState("");
  const [recWeekday, setRecWeekday] = useState("1");
  const [recTime, setRecTime] = useState("15:00");
  const [recPrice, setRecPrice] = useState("1000");
  // Pravidelné bloky (MS GEM, kroužky…)
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [blkWeekday, setBlkWeekday] = useState("1");
  const [blkStart, setBlkStart] = useState("14:00");
  const [blkEnd, setBlkEnd] = useState("18:00");
  const [blkLabel, setBlkLabel] = useState("");
  const [blkCategory, setBlkCategory] = useState("msgem");
  const [invMonth, setInvMonth] = useState<string>(() => new Date().toLocaleDateString("sv-SE").slice(0, 7)); // "YYYY-MM"
  const [finView, setFinView] = useState<"mesic" | "individualy" | "archiv">("individualy");
  const [bookView, setBookView] = useState<"aktivni" | "probehle" | "propadle">("aktivni");
  const [archClient, setArchClient] = useState("");
  const [subscribers, setSubscribers] = useState<{ id: string; email: string; created_at: string }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [kickId, setKickId] = useState<string | null>(null);
  const [kickCode, setKickCode] = useState("");
  const [kickInput, setKickInput] = useState("");
  const [kickBusy, setKickBusy] = useState(false);
  // Storno rezervace s opsáním kódu
  const [stornoId, setStornoId] = useState<string | null>(null);
  const [stornoCode, setStornoCode] = useState("");
  const [stornoInput, setStornoInput] = useState("");
  const [stornoBusy, setStornoBusy] = useState(false);

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
  const [extCat, setExtCat] = useState("MS GEM");
  const [extAmount, setExtAmount] = useState("");
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [tab, setTab] = useState<string>("dnes");

  // Produkty (editace dlaždic na /produkty)
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [prEditId, setPrEditId] = useState<string | null>(null);
  const [prName, setPrName] = useState("");
  const [prSlug, setPrSlug] = useState("");
  const [prTagline, setPrTagline] = useState("");
  const [prDesc, setPrDesc] = useState("");
  const [prPrice, setPrPrice] = useState("");
  const [prAccent, setPrAccent] = useState("blue");
  const [prPosition, setPrPosition] = useState("0");
  const [prPublished, setPrPublished] = useState(false);

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
    // Stálí klienti (opakované lekce) – samostatně kvůli odolnosti.
    supabase.from("recurring_lessons").select("*").order("weekday").order("time").then(({ data }) => {
      if (data) setRecurring(data as RecurringRow[]);
    });
    supabase.from("recurring_cancellations").select("recurring_id, date").then(({ data }) => {
      if (data) setRecCancels(data as { recurring_id: string; date: string }[]);
    });
    supabase.from("recurring_blocks").select("*").order("weekday").order("start_time").then(({ data }) => {
      if (data) setBlocks(data as BlockRow[]);
    });
    supabase.from("clients").select("id, name, email, note, bill_group").order("name").then(({ data }) => {
      if (data) setClients(data as ClientRow[]);
    });
    // Produkty – samostatně, ať admin funguje i bez tabulky products
    supabase.from("products").select("*").order("position").then(({ data }) => {
      if (data) setProducts(data as ProductRow[]);
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

  // Vystaví fakturu pro klienta za vybraný měsíc – otevře ji v novém okně k tisku/PDF.
  async function openInvoice(clientName: string, lines: { date: string; what: string; amount: number }[], seq: number, monthKey?: string) {
    if (!invoiceConfigured()) {
      setError("Nejdřív vyplň fakturační údaje v src/lib/invoice-config.ts (jméno + IBAN nebo číslo účtu).");
      return;
    }
    const s = INVOICE_SUPPLIER;
    const total = lines.reduce((a, l) => a + l.amount, 0);
    const num = `${INVOICE_SETTINGS.numberPrefix}${(monthKey ?? invMonth).replace("-", "")}${String(seq).padStart(2, "0")}`;
    const today = new Date();
    const due = new Date(); due.setDate(due.getDate() + INVOICE_SETTINGS.dueDays);
    const fmt = (d: Date) => d.toLocaleDateString("cs-CZ");
    let qrImg = "";
    if (s.iban) {
      try {
        qrImg = await QRCode.toDataURL(spdString({ iban: s.iban, amountKc: total, vs: num, message: `Faktura ${num}` }), { margin: 1, width: 220 });
      } catch { /* QR se nepovedlo – faktura půjde i bez něj */ }
    }
    const rows = lines.map((l) =>
      `<tr><td>${escapeHtml(fmtDateCs(l.date))}</td><td>${escapeHtml(l.what)}</td><td class="r">${l.amount.toLocaleString("cs-CZ")} Kč</td></tr>`
    ).join("");
    const dphNote = INVOICE_SETTINGS.vatPayer ? "" : "<p class=\"muted\">Neplátce DPH.</p>";
    const html = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Faktura ${num}</title>
<style>
  *{box-sizing:border-box} body{font-family:system-ui,Arial,sans-serif;color:#1a2b4a;max-width:800px;margin:24px auto;padding:0 24px}
  h1{font-size:22px;margin:0 0 4px} .muted{color:#667;font-size:13px}
  .top{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-top:16px}
  .box{font-size:14px;line-height:1.5} .box b{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#889;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}
  th,td{padding:8px 6px;border-bottom:1px solid #e5e9f0;text-align:left} th{font-size:12px;text-transform:uppercase;color:#889}
  td.r,th.r{text-align:right} .total{margin-top:12px;text-align:right;font-size:18px;font-weight:700}
  .pay{display:flex;gap:24px;align-items:center;margin-top:24px;flex-wrap:wrap;border-top:1px solid #e5e9f0;padding-top:16px}
  .btn{display:inline-block;margin:20px 0;padding:10px 18px;background:#1976FF;color:#fff;border:0;border-radius:8px;font-weight:600;cursor:pointer}
  @media print{.btn{display:none}}
</style></head><body>
  <button class="btn" onclick="window.print()">Tisk / uložit jako PDF</button>
  <h1>Faktura ${num}</h1>
  <p class="muted">Datum vystavení: ${fmt(today)} · Datum splatnosti: ${fmt(due)}</p>
  <div class="top">
    <div class="box"><b>Dodavatel</b>${escapeHtml(s.name)}<br>${escapeHtml(s.address)}<br>${escapeHtml(s.city)}<br>${s.ico ? "IČO: " + escapeHtml(s.ico) + "<br>" : ""}${s.dic ? "DIČ: " + escapeHtml(s.dic) + "<br>" : ""}${s.email ? escapeHtml(s.email) : ""}</div>
    <div class="box"><b>Odběratel</b>${escapeHtml(clientName)}</div>
  </div>
  <table><thead><tr><th>Datum</th><th>Položka</th><th class="r">Cena</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="total">Celkem: ${total.toLocaleString("cs-CZ")} Kč</p>
  ${dphNote}
  <div class="pay">
    ${qrImg ? `<img src="${qrImg}" alt="QR platba" width="160" height="160">` : ""}
    <div class="box"><b>Platba převodem</b>${s.accountDisplay ? "Účet: " + escapeHtml(s.accountDisplay) + "<br>" : ""}${s.iban ? "IBAN: " + escapeHtml(s.iban) + "<br>" : ""}Variabilní symbol: ${escapeHtml(num.replace(/\D/g, ""))}<br>Částka: ${total.toLocaleString("cs-CZ")} Kč</div>
  </div>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { setError("Prohlížeč zablokoval nové okno – povol vyskakovací okna a zkus znovu."); return; }
    w.document.write(html);
    w.document.close();
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

  // ── Kartotéka klientů ──
  async function addClient() {
    if (!newClientName.trim()) { setError("Zadej jméno klienta."); return; }
    setError(null);
    const { error } = await supabase.from("clients").insert({
      name: newClientName.trim(),
      email: newClientEmail.trim() ? newClientEmail.trim().toLowerCase() : null,
    });
    if (error) { setError("Uložení klienta selhalo (spustil jsi clients.sql?): " + error.message); return; }
    setNewClientName(""); setNewClientEmail("");
    const { data } = await supabase.from("clients").select("id, name, email, note, bill_group").order("name");
    if (data) setClients(data as ClientRow[]);
  }
  async function deleteClient(id: string) {
    setError(null);
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) { setError("Smazání klienta selhalo: " + error.message); return; }
    setClients((prev) => prev.filter((x) => x.id !== id));
  }
  // Fakturační skupina (rodina) – stejný název u dvou klientů = jedna společná faktura
  async function updateClientGroup(id: string, group: string) {
    const val = group.trim() || null;
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, bill_group: val } : c)));
    const { error } = await supabase.from("clients").update({ bill_group: val }).eq("id", id);
    if (error) setError("Uložení skupiny selhalo (spustil jsi client_billing_group.sql?): " + error.message);
  }

  // ── Stálí klienti (opakované lekce) ──
  async function addRecurring() {
    if (!recClient.trim()) { setError("Vyber klienta z kartotéky."); return; }
    setError(null);
    const priceKc = recPrice.trim() === "" ? null : Number(recPrice);
    // Když má klient v kartotéce e-mail a účet, propoj → může se pak sám omluvit.
    const roster = clients.find((c) => c.name === recClient);
    let clientId: string | null = null;
    if (roster?.email) {
      const { data: prof } = await supabase.from("profiles").select("id").eq("email", roster.email).maybeSingle();
      if (prof) clientId = prof.id as string;
    }
    const { error } = await supabase.from("recurring_lessons").insert({
      client_name: recClient,
      client_id: clientId,
      weekday: Number(recWeekday),
      time: recTime,
      price_kc: Number.isFinite(priceKc as number) ? priceKc : null,
    });
    if (error) { setError("Uložení selhalo (spustil jsi recurring.sql?): " + error.message); return; }
    // Klienta necháme vybraného, ať můžeš rovnou přidat další hodinu v týdnu (jiný den/čas).
    const { data } = await supabase.from("recurring_lessons").select("*").order("weekday").order("time");
    if (data) setRecurring(data as RecurringRow[]);
  }
  async function deleteRecurring(id: string) {
    setError(null);
    const { error } = await supabase.from("recurring_lessons").delete().eq("id", id);
    if (error) { setError("Smazání selhalo: " + error.message); return; }
    setRecurring((prev) => prev.filter((x) => x.id !== id));
  }
  // ── Pravidelné bloky (MS GEM, kroužky…) ──
  async function addBlock() {
    if (!blkLabel.trim()) { setError("Zadej název bloku (např. MS GEM – tenisová akademie)."); return; }
    if (blkEnd <= blkStart) { setError("Konec bloku musí být později než začátek."); return; }
    setError(null);
    const { error } = await supabase.from("recurring_blocks").insert({
      weekday: Number(blkWeekday),
      start_time: blkStart,
      end_time: blkEnd,
      label: blkLabel.trim(),
      category: blkCategory,
    });
    if (error) { setError("Uložení bloku selhalo (spustil jsi recurring_blocks.sql?): " + error.message); return; }
    setBlkLabel("");
    const { data } = await supabase.from("recurring_blocks").select("*").order("weekday").order("start_time");
    if (data) setBlocks(data as BlockRow[]);
  }
  async function deleteBlock(id: string) {
    setError(null);
    const { error } = await supabase.from("recurring_blocks").delete().eq("id", id);
    if (error) { setError("Smazání bloku selhalo: " + error.message); return; }
    setBlocks((prev) => prev.filter((x) => x.id !== id));
  }
  // Pravidelná lekce založená přímo z kalendáře (den → weekday). Propojí účet klienta, pokud sedí e-mail.
  async function addRecurringFromCalendar(weekday: number, time: string, clientName: string, note: string, priceKc: number | null) {
    if (!clientName.trim()) return;
    setError(null);
    const roster = clients.find((c) => c.name === clientName.trim());
    let clientId: string | null = null;
    if (roster?.email) {
      const { data: prof } = await supabase.from("profiles").select("id").eq("email", roster.email).maybeSingle();
      if (prof) clientId = prof.id as string;
    }
    const { error } = await supabase.from("recurring_lessons").insert({
      client_name: clientName.trim(),
      client_id: clientId,
      weekday,
      time,
      price_kc: priceKc,
      note: note.trim() || null,
    });
    if (error) { setError("Uložení pravidelné lekce selhalo (spustil jsi recurring.sql?): " + error.message); return; }
    const { data } = await supabase.from("recurring_lessons").select("*").order("weekday").order("time");
    if (data) setRecurring(data as RecurringRow[]);
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

  // ── Správa rezervací (stav) ──
  async function updateBookingStatus(id: string, status: string) {
    setError(null);
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) { setError("Změna stavu rezervace selhala: " + error.message); return; }
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
  }
  function startStorno(id: string) { setStornoId(id); setStornoCode(genKickCode()); setStornoInput(""); setError(null); }
  function cancelStorno() { setStornoId(null); setStornoCode(""); setStornoInput(""); }
  async function confirmStorno(id: string) {
    setStornoBusy(true);
    await updateBookingStatus(id, "no_show");
    setStornoBusy(false);
    cancelStorno();
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

  // ── Produkty ──
  function resetProductForm() {
    setPrEditId(null); setPrName(""); setPrSlug(""); setPrTagline("");
    setPrDesc(""); setPrPrice(""); setPrAccent("blue"); setPrPosition("0"); setPrPublished(false);
  }
  function editProduct(p: ProductRow) {
    setPrEditId(p.id);
    setPrName(p.name); setPrSlug(p.slug ?? ""); setPrTagline(p.tagline);
    setPrDesc(p.description); setPrPrice(p.price); setPrAccent(p.accent);
    setPrPosition(String(p.position)); setPrPublished(p.published);
  }
  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!prName.trim()) return;
    const payload = {
      name: prName.trim(),
      slug: prSlug.trim() || null,
      tagline: prTagline.trim(),
      description: prDesc.trim(),
      price: prPrice.trim(),
      accent: prAccent,
      position: Number(prPosition) || 0,
      published: prPublished,
    };
    const { error } = prEditId
      ? await supabase.from("products").update(payload).eq("id", prEditId)
      : await supabase.from("products").insert(payload);
    if (error) { setError("Produkt se nepodařilo uložit (spustil jsi products.sql?): " + error.message); return; }
    resetProductForm();
    const { data } = await supabase.from("products").select("*").order("position");
    if (data) setProducts(data as ProductRow[]);
  }
  async function deleteProduct(id: string) {
    setError(null);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { setError("Smazání produktu selhalo: " + error.message); return; }
    setProducts((prev) => prev.filter((x) => x.id !== id));
    if (prEditId === id) resetProductForm();
  }
  async function toggleProductPublished(id: string, published: boolean) {
    setError(null);
    const { error } = await supabase.from("products").update({ published: !published }).eq("id", id);
    if (error) { setError("Změna zveřejnění selhala: " + error.message); return; }
    setProducts((prev) => prev.map((x) => (x.id === id ? { ...x, published: !published } : x)));
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
  // Do příjmů se počítají jen proběhlé lekce a storno poplatky (ne čekající/zrušené).
  const bookingsRevenue = bookings
    .filter((b) => b.status === "completed" || b.status === "no_show")
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
  const finIncomeCats = ["MEMBER", "VIP", "VIP+", "Kurz", "MS GEM", "Fitness lekce", "Jiné"];
  const finExpenseCats = ["Cloudflare", "Supabase", "Vercel", "Doména", "Marketing", "Jiné"];

  // ── Opakované lekce stálých klientů → konkrétní výskyty (pro kalendář i agendu) ──
  const recCancelSet = new Set(recCancels.map((c) => `${c.recurring_id}|${c.date}`));
  const recurringLessonRows: LessonRow[] = [];
  {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7 * 78; i++) { // ~18 měsíců dopředu (jako týdenní kalendář)
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const wd = d.getDay(); // 0=Ne … 6=So (stejně jako recurring.weekday)
      const key = d.toLocaleDateString("sv-SE"); // YYYY-MM-DD lokálně
      for (const r of recurring) {
        if (!r.active || r.weekday !== wd) continue;
        if (recCancelSet.has(`${r.id}|${key}`)) continue;
        recurringLessonRows.push({
          id: `rec:${r.id}:${key}`,
          date: key,
          time: r.time,
          client_name: r.client_name || "Stálý klient",
          note: r.note,
          price_kc: r.price_kc,
          recurring: true,
        });
      }
    }
  }
  // Pravidelné bloky (MS GEM, kroužky…) → rozpad na celé hodiny výskytu (jen pro kalendář, nefakturuje se)
  const blockRows: LessonRow[] = [];
  {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7 * 78; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const wd = d.getDay();
      const key = d.toLocaleDateString("sv-SE");
      for (const b of blocks) {
        if (!b.active || b.weekday !== wd) continue;
        const sh = parseInt(b.start_time.slice(0, 2), 10);
        const em = parseInt(b.end_time.slice(3, 5), 10);
        const eh = parseInt(b.end_time.slice(0, 2), 10) - (em === 0 ? 1 : 0);
        for (let h = sh; h <= eh; h++) {
          blockRows.push({
            id: `blk:${b.id}:${key}:${h}`,
            date: key,
            time: `${String(h).padStart(2, "0")}:00`,
            client_name: b.label,
            note: null,
            price_kc: null,
            block: true,
          });
        }
      }
    }
  }
  const allLessons: LessonRow[] = [...lessons, ...recurringLessonRows, ...blockRows];

  // Bloky jako CELÉ boxy (start–end) pro proporční časovou osu
  const blockOccs: { id: string; date: string; start_time: string; end_time: string; label: string; category: string }[] = [];
  {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7 * 78; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const wd = d.getDay();
      const key = d.toLocaleDateString("sv-SE");
      for (const b of blocks) {
        if (!b.active || b.weekday !== wd) continue;
        blockOccs.push({ id: `blk:${b.id}:${key}`, date: key, start_time: b.start_time, end_time: b.end_time, label: b.label, category: b.category });
      }
    }
  }
  // Klientské lekce (stálé + jednorázové) pro časovou osu – každá 60 min
  const timelineLessons: LessonRow[] = [...lessons, ...recurringLessonRows];

  // Odtrénované hodiny (každá lekce/blok-hodina = 1 h) – tento týden a tento měsíc, do dneška včetně
  const hoursTodayKey = new Date().toLocaleDateString("sv-SE");
  const hoursNow = new Date(); hoursNow.setHours(0, 0, 0, 0);
  const hoursMonday = new Date(hoursNow); hoursMonday.setDate(hoursNow.getDate() - ((hoursNow.getDay() + 6) % 7));
  const hoursSunday = new Date(hoursMonday); hoursSunday.setDate(hoursMonday.getDate() + 6);
  const wkStartKey = hoursMonday.toLocaleDateString("sv-SE");
  const wkEndKey = hoursSunday.toLocaleDateString("sv-SE");
  const monthPrefix = hoursTodayKey.slice(0, 7);
  const HOURS_COUNT_FROM = "2026-09-01"; // odtrénované hodiny počítáme až od září
  function trainedHours(fromKey: string, toKey: string): number {
    const from = fromKey < HOURS_COUNT_FROM ? HOURS_COUNT_FROM : fromKey;
    let h = allLessons.filter((l) => l.date >= from && l.date <= toKey && l.date <= hoursTodayKey).length;
    h += bookings.filter((b) => (b.status === "completed" || b.status === "no_show") && b.date >= from && b.date <= toKey).length;
    return h;
  }
  const weekHours = trainedHours(wkStartKey, wkEndKey);
  const monthHours = trainedHours(`${monthPrefix}-01`, `${monthPrefix}-31`);

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

        {/* Záložky – 1. úroveň: hlavní skupiny */}
        <div className="mb-2 flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm sticky top-2 z-10">
          {ADMIN_GROUPS.map((g) => {
            const activeG = g.tabs.includes(tab);
            return (
              <button
                key={g.k}
                type="button"
                onClick={() => setTab(g.tabs[0])}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  activeG ? g.active : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <g.Icon className={`h-4 w-4 ${activeG ? "" : g.icon}`} strokeWidth={2} />
                {g.label}
              </button>
            );
          })}
        </div>

        {/* Záložky – 2. úroveň: podzáložky aktivní skupiny */}
        {(() => {
          const g = ADMIN_GROUPS.find((x) => x.tabs.includes(tab));
          if (!g || g.tabs.length <= 1) return <div className="mb-6" />;
          const subs = ADMIN_TABS.filter((t) => g.tabs.includes(t.k));
          return (
            <div className="mb-6 flex flex-wrap gap-1 pl-1">
              {subs.map((t) => (
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
          );
        })()}

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

            <details className="sm:col-span-2 rounded-lg border border-gray-100 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-brand-blue">Podrobnější štítky (nepovinné) – část těla, systém, cíl, pomůcky, kontraindikace</summary>
              <div className="mt-3 space-y-3">
                <CheckGroup label="Část těla" options={FILTER_BODY} selected={viBody} onToggle={(v) => togArr(viBody, setViBody, v)} />
                <CheckGroup label="Systém" options={FILTER_SYSTEMS} selected={viSystems} onToggle={(v) => togArr(viSystems, setViSystems, v)} />
                <CheckGroup label="Co dům dá" options={FILTER_PROPS} selected={viProps} onToggle={(v) => togArr(viProps, setViProps, v)} />
                <CheckGroup label="Cíl" options={FILTER_GOALS} selected={viGoal} onToggle={(v) => togArr(viGoal, setViGoal, v)} />
                <CheckGroup label="Nevhodné pro (kontraindikace)" options={FILTER_SUITABILITY} selected={viUnsuitable} onToggle={(v) => togArr(viUnsuitable, setViUnsuitable, v)} />
              </div>
            </details>

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

        {tab === "dnes" && (
        <>
        {/* ── Odtrénované hodiny ── */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Odtrénováno tento týden</p>
            <p className="text-2xl font-bold text-brand-dark">{weekHours} h</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Odtrénováno tento měsíc</p>
            <p className="text-2xl font-bold text-brand-dark">{monthHours} h</p>
          </div>
        </div>
        {/* ── Agenda: Co mě čeká ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">Co mě čeká</h2>
          <p className="text-sm text-gray-500 mb-5">
            Tvoje lekce a rezervace klientů dopředu, den po dni. U rezervací můžeš rovnou potvrdit / označit proběhlé / zrušit.
          </p>
          {(() => {
            const todayKey = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD lokálně
            type AgendaItem = { date: string; time: string; who: string; what: string; kind: "lekce" | "rezervace" | "staly"; bookingId?: string; status?: string };
            const items: AgendaItem[] = [
              ...lessons.map((l) => ({ date: l.date, time: l.time, who: l.client_name || "Lekce", what: l.note || "vlastní lekce", kind: "lekce" as const })),
              ...recurringLessonRows.map((l) => ({ date: l.date, time: l.time, who: l.client_name, what: l.note || "pravidelná lekce", kind: "staly" as const })),
              ...bookings.filter((b) => b.status !== "cancelled" && b.status !== "no_show").map((b) => ({ date: b.date, time: b.time, who: b.contact_name, what: b.service_name, kind: "rezervace" as const, bookingId: b.id, status: b.status })),
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
                        <div key={i} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${it.kind === "lekce" ? "bg-violet-50" : it.kind === "staly" ? "bg-teal-50" : "bg-brand-light"}`}>
                          <span className={`rounded px-1.5 py-0.5 font-bold text-white ${it.kind === "lekce" ? "bg-violet-600" : it.kind === "staly" ? "bg-teal-600" : "bg-brand-blue"}`}>{it.time}</span>
                          <span className="font-semibold text-brand-dark">{it.who}</span>
                          <span className="text-gray-500 truncate">· {it.what}</span>
                          {it.kind === "rezervace" && it.bookingId ? (
                            <span className="ml-auto flex items-center gap-1">
                              {it.status === "pending" && (
                                <button type="button" onClick={() => updateBookingStatus(it.bookingId!, "confirmed")} className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-blue-700">Potvrdit</button>
                              )}
                              <button type="button" onClick={() => updateBookingStatus(it.bookingId!, "completed")} className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-700">Proběhla</button>
                              <button type="button" onClick={() => updateBookingStatus(it.bookingId!, "cancelled")} className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 hover:bg-gray-50">Zrušit</button>
                            </span>
                          ) : (
                            <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${it.kind === "lekce" ? "bg-violet-100 text-violet-700" : "bg-teal-100 text-teal-700"}`}>{it.kind === "staly" ? "STÁLÝ KLIENT" : "jednorázová lekce"}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>
        </>
        )}

        {tab === "rozvrh" && (
        <>
        {/* ── Moje volné hodiny (po týdnech, s daty) ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">Moje volné hodiny</h2>
          <p className="text-sm text-gray-500 mb-5">
            Tady nastavuješ, <strong>které hodiny jsou volné pro klienty</strong>. Listuj po týdnech
            (← →) klidně na měsíce dopředu a u konkrétních dnů naklikej volno. Kliknutím na <strong>datum dne</strong>
            otevřeš den a můžeš přidat vlastní lekci.
          </p>
          <WeekCalendar
            bookings={bookings}
            lessons={timelineLessons}
            blocks={blockOccs}
            catColors={CAT_COLORS}
            clientNames={clients.map((c) => c.name)}
            onAddLesson={addLesson}
            onAddRecurring={addRecurringFromCalendar}
            onDeleteLesson={deleteLesson}
          />
        </section>

        {/* ── Stálí klienti: kartotéka + pravidelné lekce ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">Stálí klienti</h2>
          <p className="text-sm text-gray-500 mb-5">
            Kartotéka klientů a jejich pravidelné lekce. Lekce automaticky obsazují termín a počítají se
            do Faktur. <span className="text-gray-400">(Spusť clients.sql a recurring.sql.)</span>
          </p>

          {/* Přidat klienta do kartotéky */}
          <div className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-3 mb-3">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] text-gray-500 mb-0.5">Jméno klienta</label>
              <input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Jméno a příjmení" className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[11px] text-gray-500 mb-0.5">E-mail účtu (nepovinné)</label>
              <input value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="aby se mohl sám omluvit" className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm" />
            </div>
            <button type="button" onClick={addClient} disabled={!newClientName.trim()} className="rounded-md bg-brand-dark px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
              Přidat klienta
            </button>
          </div>

          {/* Seznam klientů */}
          {clients.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {clients.map((c) => {
                const recCount = recurring.filter((r) => r.client_name === c.name).length;
                return (
                  <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-dark">
                    {c.name}
                    {c.email && <span className="text-gray-400">· účet</span>}
                    {recCount > 0 && <span className="font-semibold text-brand-blue">· {recCount}× týdně</span>}
                    <input
                      defaultValue={c.bill_group ?? ""}
                      onBlur={(e) => { if ((e.target.value.trim() || null) !== (c.bill_group ?? null)) updateClientGroup(c.id, e.target.value); }}
                      placeholder="rodina"
                      title="Fakturovat dohromady: zadej stejný název u obou (např. Kremsovi)"
                      className="w-16 rounded border border-gray-200 bg-white px-1 py-0.5 text-[11px] text-brand-dark placeholder:text-gray-300"
                    />
                    <button type="button" onClick={() => deleteClient(c.id)} title="Smazat z kartotéky" className="text-gray-300 hover:text-red-500">×</button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Pravidelné lekce */}
          <h3 className="text-sm font-semibold text-brand-dark mb-2">Pravidelné lekce</h3>
          {recurring.length > 0 && (
            <div className="space-y-2 mb-4">
              {recurring.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 p-3">
                  <span className="text-sm text-brand-dark">
                    <span className="font-semibold">{["Ne", "Po", "Út", "St", "Čt", "Pá", "So"][r.weekday]}</span>
                    {" "}v {r.time} · <span className="font-medium">{r.client_name}</span>
                    {r.price_kc != null && <span className="text-gray-500"> · {r.price_kc} Kč</span>}
                  </span>
                  <button type="button" onClick={() => deleteRecurring(r.id)} className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700">
                    Smazat
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-3">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] text-gray-500 mb-0.5">Klient</label>
              <select value={recClient} onChange={(e) => setRecClient(e.target.value)} className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm">
                <option value="">— vyber z kartotéky —</option>
                {clients.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-0.5">Den</label>
              <select value={recWeekday} onChange={(e) => setRecWeekday(e.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm">
                {[["1", "Po"], ["2", "Út"], ["3", "St"], ["4", "Čt"], ["5", "Pá"], ["6", "So"], ["0", "Ne"]].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-[11px] text-gray-500 mb-0.5">Čas</label>
              <input type="time" value={recTime} onChange={(e) => setRecTime(e.target.value)} className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm" />
            </div>
            <div className="w-20">
              <label className="block text-[11px] text-gray-500 mb-0.5">Cena Kč</label>
              <input type="number" value={recPrice} onChange={(e) => setRecPrice(e.target.value)} className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm" />
            </div>
            <button type="button" onClick={addRecurring} disabled={!recClient} className="rounded-md bg-brand-dark px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
              Přidat lekci
            </button>
          </div>
        </section>

        {/* ── Pravidelné bloky (MS GEM, kroužky, akademie…) ── */}
        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-1">Pravidelné bloky (MS GEM, kroužky, akademie…)</h2>
          <p className="text-sm text-gray-500 mb-5">
            Vyblokuj pravidelně obsazený čas (den + od–do), např. MS GEM, kruhový trénink, příprava tenistů, kroužek. Zablokuje kalendář (nikdo si tam nezarezervuje) a zobrazí se <span className="font-semibold text-slate-600">šedě jako blok</span>. Do faktur klientů se nepočítá – peníze si zapisuješ ve Faktury → Příjmy odjinud. <span className="text-gray-400">(Spusť recurring_blocks.sql.)</span>
          </p>

          {blocks.length > 0 && (
            <div className="space-y-2 mb-4">
              {blocks.map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded-lg border border-gray-100 p-3 text-sm">
                  <span className="rounded px-2 py-0.5 font-bold text-white" style={{ background: CAT_COLORS[b.category] || CAT_COLORS.jine }}>{["Ne", "Po", "Út", "St", "Čt", "Pá", "So"][b.weekday]}</span>
                  <span className="font-medium text-gray-500">{b.start_time}–{b.end_time}</span>
                  <span className="font-semibold text-brand-dark truncate">{b.label}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{CAT_LABELS[b.category] || "Jiné"}</span>
                  <button type="button" onClick={() => deleteBlock(b.id)} className="ml-auto shrink-0 text-xs font-semibold text-red-500 hover:text-red-700">Smazat</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-3">
            <div>
              <label className="block text-[11px] text-gray-500 mb-0.5">Den</label>
              <select value={blkWeekday} onChange={(e) => setBlkWeekday(e.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm">
                <option value="1">Po</option><option value="2">Út</option><option value="3">St</option><option value="4">Čt</option><option value="5">Pá</option><option value="6">So</option><option value="0">Ne</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-0.5">Od</label>
              <input type="time" value={blkStart} onChange={(e) => setBlkStart(e.target.value)} className="rounded-md border border-gray-200 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-0.5">Do</label>
              <input type="time" value={blkEnd} onChange={(e) => setBlkEnd(e.target.value)} className="rounded-md border border-gray-200 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-0.5">Typ</label>
              <select value={blkCategory} onChange={(e) => setBlkCategory(e.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm">
                <option value="msgem">MS GEM</option>
                <option value="tenis">Příprava tenistů</option>
                <option value="skolka">Tenis s EMESKOU (MŠ)</option>
                <option value="krouzek">Kroužek</option>
                <option value="kruhac">Kruhový trénink</option>
                <option value="jine">Jiné</option>
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] text-gray-500 mb-0.5">Název</label>
              <input value={blkLabel} onChange={(e) => setBlkLabel(e.target.value)} placeholder="MS GEM – tenisová akademie" className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm" />
            </div>
            <button type="button" onClick={addBlock} disabled={!blkLabel.trim()} className="rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
              Přidat blok
            </button>
          </div>
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
            lessons={allLessons}
            clientNames={clients.map((c) => c.name)}
            onSetOverride={setOverrideAt}
            onResetOverride={resetOverrideAt}
            onAddLesson={addLesson}
            onAddRecurring={addRecurringFromCalendar}
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

        {tab === "rezervace" && (() => {
          // Zrušené včas se neukazují. Podzáložky: aktivní / proběhlé / propadlé.
          const shown = bookings.filter((b) =>
            bookView === "aktivni" ? (b.status === "pending" || b.status === "confirmed")
            : bookView === "probehle" ? b.status === "completed"
            : b.status === "no_show"
          );
          return (
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-brand-dark mb-1">Rezervace</h2>
            <p className="text-sm text-gray-500 mb-4">Příchozí rezervace od klientů. Zrušené včas se nezobrazují.</p>

            <div className="mb-5 inline-flex rounded-lg bg-gray-100 p-1">
              {([["aktivni", "Aktivní"], ["probehle", "Proběhlé"], ["propadle", "Propadlé (storno)"]] as const).map(([k, l]) => {
                const cnt = bookings.filter((b) =>
                  k === "aktivni" ? (b.status === "pending" || b.status === "confirmed")
                  : k === "probehle" ? b.status === "completed"
                  : b.status === "no_show"
                ).length;
                return (
                  <button key={k} type="button" onClick={() => setBookView(k)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${bookView === k ? "bg-white shadow text-brand-dark" : "text-gray-500 hover:text-brand-dark"}`}>
                    {l} ({cnt})
                  </button>
                );
              })}
            </div>

          {shown.length === 0 ? (
            <p className="text-sm text-gray-400">Nic tu není.</p>
          ) : (
            <div className="space-y-3">
              {shown.map((b) => (
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
                    {(b.bill_name || b.bill_address || b.bill_ico) && (
                      <span className="sm:col-span-2 mt-1 rounded-md bg-gray-50 px-2 py-1.5 text-[11px] text-gray-600">
                        🧾 <strong>Fakturace:</strong> {b.bill_name}
                        {b.bill_address ? ` · ${b.bill_address.replace(/\s+/g, " ")}` : ""}
                        {b.bill_ico ? ` · IČO ${b.bill_ico}` : ""}
                        {b.bill_dic ? ` · DIČ ${b.bill_dic}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${bookingStatusMeta(b.status).cls}`}>
                      {bookingStatusMeta(b.status).label}
                    </span>
                    {b.status !== "cancelled" && b.status !== "completed" && b.status !== "no_show" && (
                      <>
                        {b.status === "pending" && (
                          <button onClick={() => updateBookingStatus(b.id, "confirmed")} className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700">Potvrdit</button>
                        )}
                        <button onClick={() => updateBookingStatus(b.id, "completed")} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700">Proběhla</button>
                        <button onClick={() => updateBookingStatus(b.id, "cancelled")} className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">Zrušit včas</button>
                        <button onClick={() => startStorno(b.id)} className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Pozdní storno (poplatek)</button>
                      </>
                    )}
                    {(b.status === "cancelled" || b.status === "no_show" || b.status === "completed") && (
                      <button onClick={() => updateBookingStatus(b.id, "pending")} className="text-xs font-semibold text-gray-400 hover:text-brand-dark">↺ vrátit na čekající</button>
                    )}
                  </div>
                  {stornoId === b.id && (
                    <div className="mt-2 rounded-lg border border-red-200 bg-red-50/60 p-3">
                      <p className="text-sm font-semibold text-red-700">Pozdní storno – naúčtovat poplatek {b.price_kc} Kč</p>
                      <p className="mt-0.5 text-xs text-gray-600">Klient zrušil pozdě (&lt; 24 h) nebo nedorazil. Pro potvrzení opiš kód:</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="select-all rounded-md bg-white px-3 py-1.5 font-mono text-base font-bold tracking-[0.3em] text-brand-dark ring-1 ring-gray-200">{stornoCode}</span>
                        <input value={stornoInput} onChange={(e) => setStornoInput(e.target.value.toUpperCase())} placeholder="Opiš kód" maxLength={6} className="w-32 rounded-lg border border-red-200 px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-red-400" />
                        <button onClick={() => confirmStorno(b.id)} disabled={stornoBusy || stornoInput !== stornoCode} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">{stornoBusy ? "Účtuji…" : "Naúčtovat storno"}</button>
                        <button onClick={cancelStorno} className="text-sm font-semibold text-gray-500 hover:text-brand-dark">Zpět</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </section>
          );
        })()}

        {tab === "faktury" && (() => {
          // Lekce k vyúčtování: webové rezervace + vlastní lekce (obě s cenou).
          type Line = { date: string; time: string; client: string; what: string; amount: number; kind: "staly" | "lekce" | "web" };
          // Proběhlé pravidelné lekce stálých klientů (posledních ~12 měsíců, mimo včas zrušené).
          const cancelSet = new Set(recCancels.map((c) => `${c.recurring_id}|${c.date}`));
          const recLines: Line[] = [];
          {
            const today0 = new Date(); today0.setHours(0, 0, 0, 0);
            const start0 = new Date(today0); start0.setDate(start0.getDate() - 365);
            for (const r of recurring) {
              if (!r.active) continue;
              const d = new Date(start0);
              while (d <= today0) {
                if (d.getDay() === r.weekday) {
                  const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                  if (!cancelSet.has(`${r.id}|${dk}`)) {
                    recLines.push({ date: dk, time: r.time, client: r.client_name || "Stálý klient", what: "Pravidelná lekce", amount: r.price_kc ?? 0, kind: "staly" });
                  }
                }
                d.setDate(d.getDate() + 1);
              }
            }
          }
          const lessonLines: Line[] = [
            // Fakturuje se, co proběhlo, nebo pozdní storno (poplatek). Čekající/zrušené se nepočítají.
            ...bookings.filter((b) => b.status === "completed" || b.status === "no_show")
              .map((b) => ({ date: b.date, time: b.time, client: b.contact_name || "—", what: b.status === "no_show" ? `${b.service_name} (storno)` : b.service_name, amount: b.price_kc || 0, kind: "web" as const })),
            ...lessons.map((l) => ({ date: l.date, time: l.time, client: l.client_name || "—", what: l.note || "Lekce", amount: l.price_kc ?? 0, kind: "lekce" as const })),
            ...recLines,
          ];
          const monthLines = lessonLines.filter((x) => x.date.slice(0, 7) === invMonth).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
          // Fakturační skupiny (rodiny): klienti se stejným bill_group se sečtou do jedné faktury
          const groupOf = new Map<string, string>();
          for (const c of clients) { if (c.bill_group && c.bill_group.trim()) groupOf.set(c.name, c.bill_group.trim()); }
          const byClient = new Map<string, Line[]>();
          for (const ln of monthLines) {
            const key = groupOf.get(ln.client) || ln.client;
            if (!byClient.has(key)) byClient.set(key, []);
            byClient.get(key)!.push(ln);
          }
          const invGroups = [...byClient.entries()].sort((a, b) => a[0].localeCompare(b[0], "cs"));
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
          const MSHORT = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čvn", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];
          const monthLabel = new Date(invMonth + "-01T00:00:00").toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });

          // Barvy zdrojů příjmů
          const CAT_COLOR: Record<string, string> = {
            "MS GEM": "#4f46e5", "Fitness lekce": "#10b981", "Web (lekce)": "#7c3aed",
            "Kurz": "#f59e0b", "MEMBER": "#1976FF", "VIP": "#a855f7", "VIP+": "#f59e0b", "Jiné": "#64748b",
          };
          const catColor = (c: string) => CAT_COLOR[c] ?? "#0ea5e9";

          // Rozpad příjmů po měsících a kategoriích (vybraný rok)
          const monthCats = Array.from({ length: 12 }, () => ({}) as Record<string, number>);
          const addMC = (mIdx: number, cat: string, amt: number) => { monthCats[mIdx][cat] = (monthCats[mIdx][cat] ?? 0) + amt; };
          lessonLines.forEach((l) => { if (l.date.slice(0, 4) === year && l.amount > 0) addMC(Number(l.date.slice(5, 7)) - 1, "Web (lekce)", l.amount); });
          finEntries.filter((e) => e.kind === "income" && String(e.at).slice(0, 4) === year).forEach((e) => addMC(Number(String(e.at).slice(5, 7)) - 1, e.category, Number(e.amount_kc)));
          const yearByCat: Record<string, number> = {};
          monthCats.forEach((mc) => { for (const [c, v] of Object.entries(mc)) yearByCat[c] = (yearByCat[c] ?? 0) + v; });
          const orderedCats = Object.keys(yearByCat).sort((a, b) => yearByCat[b] - yearByCat[a]);
          const pieSlices = orderedCats.map((c) => ({ label: c, value: yearByCat[c], color: catColor(c) }));

          // ── ARCHIV: celá historie lekcí po klientech (napříč všemi měsíci) ──
          const archByClient = new Map<string, Line[]>();
          for (const ln of lessonLines) {
            if (!archByClient.has(ln.client)) archByClient.set(ln.client, []);
            archByClient.get(ln.client)!.push(ln);
          }
          const archClients = [...archByClient.keys()].sort((a, b) => a.localeCompare(b, "cs"));
          const archLines = (archClient && archByClient.get(archClient)
            ? [...archByClient.get(archClient)!].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
            : []);
          const archByMonth = new Map<string, Line[]>();
          for (const ln of archLines) {
            const mk = ln.date.slice(0, 7);
            if (!archByMonth.has(mk)) archByMonth.set(mk, []);
            archByMonth.get(mk)!.push(ln);
          }
          const archTotal = archLines.reduce((s, x) => s + x.amount, 0);

          return (
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-brand-dark mb-1">Faktury / měsíční vyúčtování</h2>
            <p className="text-sm text-gray-500 mb-5">
              Kolik komu naúčtovat za lekce + příjmy odjinud (MS GEM, fitness lekce). Čísla faktur přibydou,
              až poběží Stripe – zatím je to podklad pro fakturaci a celkový přehled příjmů.
            </p>

            {/* Subzáložky */}
            <div className="mb-5 inline-flex rounded-lg bg-gray-100 p-1">
              {([["mesic", "Měsíc"], ["individualy", "Individuály"], ["archiv", "Archiv"]] as const).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFinView(k)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${finView === k ? "bg-white shadow text-brand-dark" : "text-gray-500 hover:text-brand-dark"}`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Výběr měsíce + celkový příjem (Měsíc + Individuály) */}
            {finView !== "archiv" && (
            <div className="flex flex-wrap items-end gap-3 mb-6">
              <div>
                <label className="block text-xs font-semibold text-brand-dark mb-1">Měsíc</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="month"
                    value={invMonth}
                    onChange={(e) => setInvMonth(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => { const n = new Date(); setInvMonth(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`); }}
                    className="rounded-md border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Tento
                  </button>
                  <button
                    type="button"
                    onClick={() => { const n = new Date(); const p = new Date(n.getFullYear(), n.getMonth() - 1, 1); setInvMonth(`${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}`); }}
                    className="rounded-md border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Minulý
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-green-50 px-4 py-2">
                <p className="text-[11px] text-green-700 font-semibold uppercase tracking-wide">Příjem celkem · <span className="capitalize">{monthLabel}</span></p>
                <p className="text-xl font-bold text-green-800">{monthGrand.toLocaleString("cs-CZ")} Kč</p>
                {manualTotal > 0 && lessonsTotal > 0 && (
                  <p className="text-[11px] text-green-600">lekce {lessonsTotal.toLocaleString("cs-CZ")} + jinde {manualTotal.toLocaleString("cs-CZ")}</p>
                )}
              </div>
            </div>
            )}

            {/* INDIVIDUÁLY – vyúčtování lekcí po klientech */}
            {finView === "individualy" && (<>
            <h3 className="text-sm font-semibold text-brand-dark mb-2">Lekce – komu naúčtovat</h3>
            {invGroups.length === 0 ? (
              <p className="text-sm text-gray-400 mb-6">V tomto měsíci nejsou žádné lekce.</p>
            ) : (
              <div className="space-y-4 mb-6">
                {invGroups.map(([client, lines], ci) => {
                  const sub = lines.reduce((s, x) => s + x.amount, 0);
                  return (
                    <div key={client} className="rounded-xl border border-gray-100 overflow-hidden">
                      <div className="flex items-center justify-between gap-2 bg-gray-50 px-4 py-2">
                        <span className="font-semibold text-brand-dark">{client}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-green-700">{sub.toLocaleString("cs-CZ")} Kč</span>
                          <button
                            type="button"
                            onClick={() => openInvoice(client, lines.map((l) => ({ date: l.date, what: l.what, amount: l.amount })), ci + 1)}
                            className="inline-flex items-center gap-1 rounded-md bg-brand-dark px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90"
                          >
                            <Receipt className="h-3.5 w-3.5" /> Fakturu
                          </button>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {lines.map((ln, i) => (
                          <div key={i} className="flex items-center gap-2 px-4 py-2 text-sm">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${ln.kind === "staly" ? "bg-teal-500" : ln.kind === "lekce" ? "bg-violet-500" : "bg-brand-blue"}`}
                              title={ln.kind === "staly" ? "stálý klient" : ln.kind === "lekce" ? "jednorázová lekce" : "rezervace z webu"}
                            />
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
            </>)}

            {/* MĚSÍC – příjmy odjinud + celkem + grafy */}
            {finView === "mesic" && (<>
            {/* Příjmy odjinud (MS GEM, fitness lekce) */}
            <h3 className="text-sm font-semibold text-brand-dark mb-2 mt-6">Příjmy odjinud (MS GEM, fitness lekce…)</h3>
            {monthFin.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {monthFin.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-1.5 text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-brand-dark">
                      <span className="h-2 w-2 rounded-full" style={{ background: catColor(e.category) }} />{e.category}
                    </span>
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
                  {["MS GEM", "Fitness lekce", "Kurz", "Jiné"].map((c) => <option key={c} value={c}>{c}</option>)}
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

            {/* Roční přehled – grafy */}
            <h3 className="text-sm font-semibold text-brand-dark mb-1">Přehled roku {year} <span className="text-gray-400 font-normal">· celkem {yearTotal.toLocaleString("cs-CZ")} Kč</span></h3>
            <p className="text-xs text-gray-400 mb-3">Příjem po měsících, barevně podle zdroje. Klikni na měsíc pro detail nahoře.</p>

            {/* Sloupcový graf po měsících (stacked podle zdroje) */}
            <div className="rounded-xl border border-gray-100 p-4 mb-5">
              <div className="flex h-48 items-end gap-1.5">
                {yearMonths.map((m, i) => {
                  const cats = orderedCats.filter((c) => (monthCats[i][c] ?? 0) > 0);
                  const isSel = invMonth === `${year}-${m.mm}`;
                  return (
                    <button
                      key={m.mm}
                      type="button"
                      onClick={() => setInvMonth(`${year}-${m.mm}`)}
                      className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
                    >
                      <span className="text-[9px] font-semibold text-gray-400 group-hover:text-brand-dark">
                        {m.total > 0 ? `${Math.round(m.total / 1000)}k` : ""}
                      </span>
                      <div
                        className={`flex w-full flex-col-reverse overflow-hidden rounded-sm ${isSel ? "ring-2 ring-brand-dark ring-offset-1" : ""}`}
                        style={{ height: `${(m.total / maxMonth) * 100}%`, minHeight: m.total > 0 ? "4px" : "0" }}
                      >
                        {cats.map((c) => (
                          <div
                            key={c}
                            title={`${MSHORT[i]} · ${c}: ${Math.round(monthCats[i][c]).toLocaleString("cs-CZ")} Kč`}
                            style={{ height: `${(monthCats[i][c] / m.total) * 100}%`, background: catColor(c) }}
                          />
                        ))}
                      </div>
                      <span className={`text-[10px] ${isSel ? "font-bold text-brand-dark" : "text-gray-500"}`}>{MSHORT[i]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Koláč podle zdroje + legenda */}
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Příjmy podle zdroje · {year}</p>
              <Pie slices={pieSlices} />
            </div>
            </>)}

            {/* ARCHIV – historie lekcí podle klienta */}
            {finView === "archiv" && (
              <div>
                <p className="text-sm text-gray-500 mb-4">Vyber klienta a uvidíš všechny jeho lekce po měsících (data + částky), včetně součtu.</p>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-brand-dark mb-1">Klient</label>
                  <select value={archClient} onChange={(e) => setArchClient(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white min-w-[220px]">
                    <option value="">— vyber klienta —</option>
                    {archClients.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {!archClient ? null : archLines.length === 0 ? (
                  <p className="text-sm text-gray-400">Žádné lekce.</p>
                ) : (
                  <>
                    <div className="mb-4 inline-block rounded-lg bg-green-50 px-4 py-2">
                      <p className="text-[11px] text-green-700 font-semibold uppercase tracking-wide">Celkem za celou dobu</p>
                      <p className="text-xl font-bold text-green-800">{archTotal.toLocaleString("cs-CZ")} Kč</p>
                    </div>
                    <div className="space-y-4">
                      {[...archByMonth.entries()].map(([mk, lns]) => {
                        const sub = lns.reduce((s, x) => s + x.amount, 0);
                        const ml = new Date(mk + "-01T00:00:00").toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
                        return (
                          <div key={mk} className="rounded-xl border border-gray-100 overflow-hidden">
                            <div className="flex items-center justify-between gap-2 bg-gray-50 px-4 py-2">
                              <span className="font-semibold text-brand-dark capitalize">{ml}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-green-700">{sub.toLocaleString("cs-CZ")} Kč</span>
                                <button type="button" onClick={() => openInvoice(archClient, lns.map((l) => ({ date: l.date, what: l.what, amount: l.amount })), 1, mk)} className="inline-flex items-center gap-1 rounded-md bg-brand-dark px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90">
                                  <Receipt className="h-3.5 w-3.5" /> Fakturu
                                </button>
                              </div>
                            </div>
                            <div className="divide-y divide-gray-50">
                              {lns.map((ln, i) => (
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
                  </>
                )}
              </div>
            )}
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

        {tab === "produkty" && (
        <section className="card p-6 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <h2 className="text-lg font-semibold text-brand-dark">
              Produkty <span className="text-gray-400 font-normal">({products.length})</span>
            </h2>
            <Link href="/produkty" className="text-xs font-semibold text-brand-blue hover:underline">
              Otevřít stránku /produkty →
            </Link>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            Tady upravíš dlaždice na stránce Produkty. Zveřejní se jen produkty se zapnutým „Zveřejnit". Menší pořadí = dřív. Pole „Slug" vyplň jen u produktu s vlastní detailní stránkou (např. <code className="text-xs">pohybovy-audit</code>).
          </p>

          {products.length > 0 && (
            <div className="space-y-2 mb-6">
              {products.map((p) => {
                const tone = PRODUCT_ACCENTS[p.accent] ?? PRODUCT_ACCENTS.blue;
                return (
                  <div key={p.id} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone.bg} ${tone.icon}`}>
                      <Package className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brand-dark">
                        {p.name}
                        {p.price ? <span className="ml-2 text-xs font-medium text-gray-500">{p.price}</span> : null}
                        {!p.published && (
                          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">skryté</span>
                        )}
                        <span className="ml-2 text-[11px] text-gray-300">#{p.position}</span>
                      </p>
                      {p.tagline && <p className="text-xs font-medium text-brand-blue">{p.tagline}</p>}
                      {p.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={() => editProduct(p)} className="text-xs font-semibold text-brand-blue hover:text-brand-dark">Upravit</button>
                      <button type="button" onClick={() => toggleProductPublished(p.id, p.published)} className={`text-xs font-semibold ${p.published ? "text-gray-400 hover:text-gray-600" : "text-emerald-600 hover:text-emerald-700"}`}>
                        {p.published ? "Skrýt" : "Zveřejnit"}
                      </button>
                      <button type="button" onClick={() => deleteProduct(p.id)} className="text-xs font-semibold text-red-500 hover:text-red-700">Smazat</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={saveProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-100 pt-5">
            <p className="sm:col-span-2 text-sm font-semibold text-brand-dark">
              {prEditId ? "Upravit produkt" : "Přidat produkt"}
            </p>
            <AdminInput label="Název *" value={prName} onChange={setPrName} placeholder="Pohybový audit" required />
            <AdminInput label="Cena (volný text)" value={prPrice} onChange={setPrPrice} placeholder="od 2 900 Kč – prázdné = Brzy" />
            <AdminInput label="Podtitulek" value={prTagline} onChange={setPrTagline} placeholder="Najdi příčinu, ne jen symptom" />
            <AdminInput label="Slug detailu (nepovinné)" value={prSlug} onChange={setPrSlug} placeholder="pohybovy-audit" />
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">Barva dlaždice</label>
              <select value={prAccent} onChange={(e) => setPrAccent(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm bg-white">
                <option value="blue">Modrá</option>
                <option value="violet">Fialová</option>
                <option value="amber">Oranžová</option>
                <option value="emerald">Zelená</option>
                <option value="rose">Růžová</option>
              </select>
            </div>
            <AdminInput label="Pořadí (menší = dřív)" type="number" value={prPosition} onChange={setPrPosition} placeholder="0" />
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-brand-dark mb-1">Popis</label>
              <textarea value={prDesc} onChange={(e) => setPrDesc(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm resize-none" placeholder="Komplexní pohybová diagnostika, osobní plán…" />
            </div>
            <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-brand-dark">
              <input type="checkbox" checked={prPublished} onChange={(e) => setPrPublished(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-blue" />
              Zveřejnit na stránce /produkty
            </label>
            <div className="sm:col-span-2 flex items-center gap-3">
              <button type="submit" className="btn-primary text-sm">{prEditId ? "Uložit změny" : "Přidat produkt"}</button>
              {prEditId && (
                <button type="button" onClick={resetProductForm} className="text-sm font-semibold text-gray-400 hover:text-gray-600">Zrušit úpravu</button>
              )}
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
