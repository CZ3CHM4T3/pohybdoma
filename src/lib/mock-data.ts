import type {
  Video,
  Course,
  CourseLesson,
  OpenSlot,
  MembershipPlan,
  Service,
  ScheduleSlot,
  SlotStatus,
  CalendarEvent,
} from "@/types";

// ─── Spádová oblast (kam Honza dojíždí na osobní lekce) ────────────────────────
// Osobní (dojezdové) lekce lze rezervovat jen v těchto obcích. Online konzultace
// jsou dostupné odkudkoliv. Stačí upravit seznam.

export const HOME_BASE = "Dobřichovice";

export const SERVICE_AREA: string[] = [
  "Dobřichovice",
  "Lety",
  "Řevnice",
  "Všenory",
  "Karlík",
  "Černošice",
  "Vonoklasy",
  "Roblín",
  "Černolice",
  "Mořinka",
  "Hlásná Třebaň",
  "Zadní Třebaň",
  "Karlštejn",
  "Řitka",
  "Radotín",
  "Lipence",
  "Zbraslav",
];

/** Je daná obec ve spádové oblasti? (case-insensitive, bez ohledu na diakritiku okolo) */
export function isInServiceArea(municipality: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase();
  return SERVICE_AREA.some((m) => norm(m) === norm(municipality));
}

/** Je datum víkend (sobota/neděle)? */
export function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

// ─── Služby k rezervaci ────────────────────────────────────────────────────────

export const SERVICES: Service[] = [
  {
    id: "svc-lekce-60",
    name: "Osobní lekce",
    durationMin: 60,
    priceKc: 1000,
    mode: "inPerson",
    icon: "🧍",
    tone: "blue",
    description:
      "Osobní lekce u tebe doma nebo na dohodnutém místě, přesně na míru tvému tělu. Ve dvojici 1500 Kč (napiš mi do poznámky).",
    highlighted: true,
  },
  {
    id: "svc-cvico",
    name: "Online lekce – CVÍČO ZA KILČO",
    durationMin: 60,
    priceKc: 100,
    mode: "online",
    icon: "📺",
    tone: "emerald",
    description:
      "Připoj se a zacvič si za stovku rovnou v obýváku – živě a s mým komentářem. Levný a snadný způsob, jak se hýbat pravidelně a lépe.",
  },
  {
    id: "svc-online-30",
    name: "Online konzultace",
    durationMin: 30,
    priceKc: 500,
    mode: "online",
    icon: "💬",
    tone: "indigo",
    description:
      "Konzultace přes video hovor odkudkoliv. Ideální prostor na tvoje otázky ohledně pohybové praxe, životního stylu, výběru a provedení cviků. Poradím, na co se kdy zaměřit.",
  },
  {
    id: "svc-masaz",
    name: "Sportovní masáž",
    durationMin: 60,
    priceKc: 1500,
    priceLabel: "1500 Kč/h",
    mode: "inPerson",
    icon: "💆",
    tone: "violet",
    description:
      "Regenerační a sportovní masáž pro uvolnění napětí, obnovu rozsahu pohybu a lepší regeneraci. V okolí Dobřichovic.",
  },
  {
    id: "svc-plan-doma",
    name: "Osobní pohybový plán na doma",
    durationMin: 0,
    durationLabel: "na celý týden",
    priceKc: 3000,
    mode: "online",
    icon: "📋",
    tone: "amber",
    description:
      "Pohybový plán na míru na každý den v týdnu, sestavený přesně pro tebe.",
    descBold: "Možné pouze po online konzultaci.",
  },
  {
    id: "svc-video-rozbor",
    name: "Video-rozbor na dálku",
    durationMin: 0,
    durationLabel: "na dálku",
    priceKc: 300,
    priceLabel: "od 300 Kč",
    mode: "online",
    inquiryOnly: true,
    icon: "🎥",
    tone: "rose",
    description:
      "Nahraj mi video, jak se hýbeš, cvičíš konkrétní cvik, nebo jaký pohybový problém řešíš a já ti pošlu podrobný rozbor s návodem na opravu a doporučeními. Bez domlouvání termínu.",
  },
];

/**
 * Cena služby pro daný den. U služeb s denní sazbou (priceWeekdayKc/
 * priceWeekendKc) vrátí cenu dle všedního dne / víkendu, jinak pevnou priceKc.
 * Bez data vrací výchozí (všední) cenu.
 */
export function getServicePrice(service: Service, date?: Date | null): number {
  if (service.priceWeekdayKc != null && service.priceWeekendKc != null) {
    if (date) return isWeekend(date) ? service.priceWeekendKc : service.priceWeekdayKc;
    return service.priceWeekdayKc;
  }
  return service.priceKc;
}

/** Má služba denní (všední/víkendovou) sazbu? */
export function hasDayPricing(service: Service): boolean {
  return service.priceWeekdayKc != null && service.priceWeekendKc != null;
}

// ─── Týdenní rozvrh ─────────────────────────────────────────────────────────
// Rozvrh je každý týden STEJNÝ. Pracuje se se dvěma seznamy:
//
//   WORKING_HOURS = všechny tvoje pracovní hodiny (zobrazí se klientům).
//   FREE_HOURS    = které hodiny jsou VOLNÉ k rezervaci (zeleně).
//
// 👉 ZMĚNA DOSTUPNOSTI = upravuješ JEN seznam FREE_HOURS:
//    • Uvolnila se ti hodina? Přidej její čas do FREE_HOURS[den].
//    • Zase je obsazená? Čas zase odeber.
//    Vše ostatní z WORKING_HOURS se ukáže šedě jako „obsazeno".
//
// Dny: 1=Po, 2=Út, 3=St, 4=Čt, 5=Pá, 6=So, 0=Ne. Čas = začátek hodiny "HH:MM".

// Celý pracovní den 8–19 (začátky hodin 08:00 … 18:00). Všechny hodiny se zobrazí;
// obsazené šedě, volné (z FREE_HOURS) zeleně – působí to, že je hodně práce.
const FULL_DAY = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
];

const WORKING_HOURS: Record<number, string[]> = {
  0: [], // neděle – nepracuji
  1: FULL_DAY, // pondělí
  2: FULL_DAY, // úterý
  3: FULL_DAY, // středa
  4: FULL_DAY, // čtvrtek
  5: FULL_DAY, // pátek
  6: [], // sobota – zatím nepracuji (klidně doplň hodiny)
};

// 🟢 VOLNÉ HODINY – pravidelně volné hodiny (platí každý týden stejně).
const FREE_HOURS: Record<number, string[]> = {
  0: [],
  1: ["10:00"], // pondělí: volno 10–11
  2: ["14:00"], // úterý: volno 14–15
  3: [], // středa: zatím nic volného
  4: ["13:00"], // čtvrtek: volno 13–14
  5: [], // pátek: zatím nic volného
  6: [],
};

// ─── Výjimky pro KONKRÉTNÍ datum ("pro tentokrát") ─────────────────────────────
// Mají PŘEDNOST před týdenním rozvrhem. Klíč = datum "YYYY-MM-DD".
// U času nastav "free" (uvolnit) nebo "booked" (zabrat) – jen pro ten den.
//
// Příklady (odkomentuj a uprav):
//   "2026-06-25": { "16:00": "free" },                 // tento čtvrtek NAVÍC volno 16–17
//   "2026-06-08": { "10:00": "booked" },               // toto pondělí 10–11 zrušeno
//   "2026-06-13": { "09:00": "free", "10:00": "free" } // mimořádně i v sobotu volno
const DATE_OVERRIDES: Record<string, Record<string, SlotStatus>> = {
  // zatím žádné výjimky
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Datum → klíč "YYYY-MM-DD" (lokální čas). */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Akce / workshopy v kalendáři ──────────────────────────────────────────────
// Zobrazí se v kalendáři jiným (oranžovým) puntíkem. Po rozkliku dne se ukáže
// detail akce. Stačí přidat položku s datem "YYYY-MM-DD".

export const CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "ev1",
    date: "2026-06-13",
    title: "Workshop: Zdravá záda",
    kind: "Workshop",
    time: "10:00–13:00",
    location: "Dobřichovice",
    description:
      "Půldenní workshop zaměřený na úlevu a prevenci bolestí zad. Teorie i praxe, vhodné pro každého.",
    priceKc: 890,
  },
  {
    id: "ev2",
    date: "2026-06-21",
    title: "Mobilita pro běžce",
    kind: "Seminář",
    time: "09:00–11:30",
    location: "Řevnice",
    description:
      "Praktický seminář, jak si jako běžec udržet zdravé kyčle, kolena a kotníky.",
    priceKc: 690,
  },
  {
    id: "ev3",
    date: "2026-07-04",
    title: "Letní pohybový den pro rodiny",
    kind: "Akce",
    time: "14:00–17:00",
    location: "Karlík",
    description:
      "Odpoledne plné pohybu a her pro rodiče s dětmi. Společně, venku, v pohodě.",
    priceKc: 0,
  },
];

/** Akce pro daný den (může být víc). */
export function getEventsForDate(date: Date): CalendarEvent[] {
  const key = dateKey(date);
  return CALENDAR_EVENTS.filter((e) => e.date === key);
}

/** Má den nějakou akci? */
export function hasEvent(date: Date): boolean {
  return getEventsForDate(date).length > 0;
}

/**
 * Vrátí všechny sloty (volné i obsazené) pro daný den. Minulé dny jsou prázdné.
 * Nejprve týdenní rozvrh, poté se aplikují výjimky pro konkrétní datum.
 */
export function getDaySlots(date: Date): ScheduleSlot[] {
  const today = startOfDay(new Date());
  const day = startOfDay(date);
  if (day < today) return [];

  const wd = date.getDay();
  const free = FREE_HOURS[wd] ?? [];

  // Základ z týdenního rozvrhu
  const map = new Map<string, SlotStatus>();
  (WORKING_HOURS[wd] ?? []).forEach((time) => {
    map.set(time, free.includes(time) ? "free" : "booked");
  });

  // Výjimky pro tento konkrétní den (přidají nebo přepíšou hodinu)
  const overrides = DATE_OVERRIDES[dateKey(date)];
  if (overrides) {
    for (const [time, status] of Object.entries(overrides)) {
      map.set(time, status);
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, status]) => ({ time, status }));
}

/** Má den aspoň jeden VOLNÝ termín? */
export function hasFreeSlot(date: Date): boolean {
  return getDaySlots(date).some((s) => s.status === "free");
}

// ─── Videos ──────────────────────────────────────────────────────────────────

export const MOCK_VIDEOS: Video[] = [
  {
    id: "v1",
    slug: "ranní-protazeni-10-minut",
    title: "Ranní protažení – 10 minut",
    description: "Ideální start dne. Zahřejeme celé tělo jemnými pohyby a uvolníme klouby.",
    thumbnailUrl: "/thumbnails/morning-stretch.jpg",
    durationSeconds: 600,
    accessLevel: "FREE",
    providerId: "placeholder-mux-id-1",
    bodyParts: ["celé tělo"],
    difficulty: "začátečník",
    problemTypes: ["mobilita", "prevence"],
    equipment: ["podložka"],
    tags: ["ráno", "protažení", "začátečník"],
    publishedAt: "2024-01-10T08:00:00Z",
  },
  {
    id: "v2",
    slug: "zada-ulevova-sestava",
    title: "Záda – úlevová sestava",
    description: "Přesně cílená cvičení pro úlevu od bolesti zad. Ideální po dlouhém sezení.",
    thumbnailUrl: "/thumbnails/back-relief.jpg",
    durationSeconds: 900,
    accessLevel: "FREE",
    providerId: "placeholder-mux-id-2",
    bodyParts: ["záda"],
    difficulty: "začátečník",
    problemTypes: ["bolest", "po zranění"],
    equipment: ["podložka"],
    tags: ["záda", "bolest", "kancelář"],
    publishedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "v3",
    slug: "kycle-mobilita-hloubkova",
    title: "Kyčle – hloubková mobilita",
    description: "Séria cviků pro uvolnění kyčlí, které tuhnou při sezení u stolu.",
    thumbnailUrl: "/thumbnails/hip-mobility.jpg",
    durationSeconds: 1200,
    accessLevel: "MEMBER",
    providerId: "placeholder-mux-id-3",
    bodyParts: ["kyčle"],
    difficulty: "mírně pokročilý",
    problemTypes: ["tuhnutí", "mobilita"],
    equipment: ["podložka"],
    tags: ["kyčle", "mobilita", "VIP"],
    publishedAt: "2024-02-01T10:00:00Z",
  },
  {
    id: "v4",
    slug: "rameno-navrat-do-pohybu",
    title: "Rameno – návrat do pohybu",
    description: "Šetrný postup, jak po zklidnění obtíží postupně vracet rameni pohyblivost a sílu.",
    thumbnailUrl: "/thumbnails/shoulder-rehab.jpg",
    durationSeconds: 1500,
    accessLevel: "MEMBER",
    providerId: "placeholder-mux-id-4",
    bodyParts: ["rameno"],
    difficulty: "mírně pokročilý",
    problemTypes: ["po zranění", "bolest"],
    equipment: ["odporová guma"],
    tags: ["rameno", "po zranění"],
    caution: "Po úrazu, operaci nebo při ostré/vystřelující bolesti ramene cvič až po konzultaci s lékařem nebo fyzioterapeutem. Cvič jen v rozsahu bez bolesti.",
    publishedAt: "2024-02-10T10:00:00Z",
  },
  {
    id: "v5",
    slug: "dech-pro-pohodu-a-silu",
    title: "Dech pro pohodu a sílu",
    description: "Naučte se správně dýchat. Cvičení pro hluboký stabilizační systém.",
    thumbnailUrl: "/thumbnails/breathing.jpg",
    durationSeconds: 1800,
    accessLevel: "VIP",
    providerId: "placeholder-mux-id-5",
    bodyParts: ["dech", "core"],
    difficulty: "mírně pokročilý",
    problemTypes: ["posílení", "prevence"],
    equipment: ["podložka"],
    tags: ["dech", "core", "VIP"],
    publishedAt: "2024-02-20T10:00:00Z",
  },
  {
    id: "v6",
    slug: "nocni-uvolneni-pred-spanim",
    title: "Noční uvolnění před spaním",
    description: "Zklidňující rutina. Uvolní napětí celého dne a připraví tělo ke spánku.",
    thumbnailUrl: "/thumbnails/night-relax.jpg",
    durationSeconds: 1080,
    accessLevel: "FREE",
    providerId: "placeholder-mux-id-6",
    bodyParts: ["celé tělo"],
    difficulty: "začátečník",
    problemTypes: ["mobilita", "prevence"],
    equipment: ["podložka"],
    tags: ["večer", "uvolnění", "spánek"],
    publishedAt: "2024-03-01T10:00:00Z",
  },
  {
    id: "v7",
    slug: "noha-koleno-stabilizace",
    title: "Noha & koleno – stabilizace",
    description: "Cílené posilování pro stabilní koleno a zdravou nohu.",
    thumbnailUrl: "/thumbnails/knee-stability.jpg",
    durationSeconds: 1320,
    accessLevel: "VIP",
    providerId: "placeholder-mux-id-7",
    bodyParts: ["noha"],
    difficulty: "pokročilý",
    problemTypes: ["slabost", "po zranění"],
    equipment: ["odporová guma", "podložka"],
    tags: ["koleno", "noha", "VIP"],
    publishedAt: "2024-03-10T10:00:00Z",
  },
  {
    id: "v8",
    slug: "office-cviceni-v-kancelare",
    title: "Office cvičení v kanceláři",
    description: "5 cviků které zvládnete u stolu. Bez podložky, bez převlékání.",
    thumbnailUrl: "/thumbnails/office.jpg",
    durationSeconds: 480,
    accessLevel: "FREE",
    providerId: "placeholder-mux-id-8",
    bodyParts: ["záda", "krk", "rameno"],
    difficulty: "začátečník",
    problemTypes: ["prevence", "tuhnutí"],
    equipment: ["žádné"],
    tags: ["kancelář", "sezení", "rychlé"],
    publishedAt: "2024-03-15T10:00:00Z",
  },
  {
    id: "v9",
    slug: "vip-plus-exkluzivni-trening",
    title: "VIP PLUS – Exkluzivní trénink",
    description: "Komplexní tréninková jednotka jen pro VIP PLUS členy. Intenzivní a efektivní.",
    thumbnailUrl: "/thumbnails/vip-plus.jpg",
    durationSeconds: 2700,
    accessLevel: "VIP_PLUS",
    providerId: "placeholder-mux-id-9",
    bodyParts: ["celé tělo"],
    difficulty: "pokročilý",
    problemTypes: ["posílení"],
    equipment: ["podložka", "odporová guma", "činky"],
    tags: ["VIP PLUS", "pokročilý", "komplexní"],
    publishedAt: "2024-04-01T10:00:00Z",
  },
];

// ─── Courses ─────────────────────────────────────────────────────────────────

const BASE_COURSES: Course[] = [
  {
    id: "c1",
    slug: "znovuzrozeni",
    title: "ZNOVUZROZENÍ",
    subtitle: "Tělesný reset – návrat do vlastního těla",
    description:
      "Kompletní restart pro tělo i hlavu. Postupně znovu objevíš základní pohybové vzory, uvolníš dlouhé roky nasbírané napětí a vrátíš se ke svobodnému pohybu. Ideální start, pokud nevíš, kde začít.",
    thumbnailUrl: "/thumbnails/course-znovuzrozeni.jpg",
    priceKc: 1490,
    lessons: [
      { id: "l1", order: 1, title: "Kde právě jsi – tělesný sken", durationSeconds: 720, accessLevel: "FREE" },
      { id: "l2", order: 2, title: "Dech jako základ resetu", durationSeconds: 900, accessLevel: "FREE" },
      { id: "l3", order: 3, title: "Uvolnění hlavních bloků", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l4", order: 4, title: "Návrat základních vzorů", durationSeconds: 1500, accessLevel: "MEMBER" },
      { id: "l5", order: 5, title: "Síla zevnitř ven", durationSeconds: 1500, accessLevel: "MEMBER" },
      { id: "l6", order: 6, title: "Tvoje nová denní rutina", durationSeconds: 900, accessLevel: "MEMBER" },
    ],
    tags: ["reset", "začátek", "mobilita"],
    publishedAt: "2024-01-20T10:00:00Z",
  },
  {
    id: "c2",
    slug: "kalistenika-doma",
    title: "KALISTENIKA DOMA",
    subtitle: "Síla z vlastní váhy, bez vybavení",
    description:
      "Vybuduj reálnou sílu jen s vlastním tělem. Od prvního kliku a dřepu až po pokročilejší cviky – krok za krokem, bezpečně a s pochopením techniky.",
    thumbnailUrl: "/thumbnails/course-kalistenika.jpg",
    priceKc: 1290,
    lessons: [
      { id: "l7", order: 1, title: "Základy a bezpečná technika", durationSeconds: 900, accessLevel: "FREE" },
      { id: "l8", order: 2, title: "Tlak – kliky od nuly", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l9", order: 3, title: "Tah – záda a paže", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l10", order: 4, title: "Nohy a dřepová síla", durationSeconds: 1080, accessLevel: "MEMBER" },
      { id: "l11", order: 5, title: "Core a stabilita", durationSeconds: 1080, accessLevel: "MEMBER" },
      { id: "l12", order: 6, title: "Tvůj domácí trénink", durationSeconds: 1500, accessLevel: "MEMBER" },
    ],
    tags: ["síla", "vlastní váha", "bez vybavení"],
    publishedAt: "2024-02-01T10:00:00Z",
  },
  {
    id: "c3",
    slug: "kettlebell",
    title: "KETTLEBELL",
    subtitle: "Jedna kettlebell, celé tělo",
    description:
      "Naučíš se ovládat kettlebell od základů. Swing, get-up a další pohyby, které propojí sílu, kondici a koordinaci – stačí jedno závaží a kousek místa.",
    thumbnailUrl: "/thumbnails/course-kettlebell.jpg",
    priceKc: 1190,
    lessons: [
      { id: "l13", order: 1, title: "Výběr váhy a úchop", durationSeconds: 720, accessLevel: "FREE" },
      { id: "l14", order: 2, title: "Hip hinge a swing", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l15", order: 3, title: "Turkish get-up", durationSeconds: 1500, accessLevel: "MEMBER" },
      { id: "l16", order: 4, title: "Clean a press", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l17", order: 5, title: "Kondiční komplexy", durationSeconds: 1080, accessLevel: "MEMBER" },
    ],
    tags: ["kettlebell", "síla", "kondice"],
    publishedAt: "2024-02-15T10:00:00Z",
  },
  {
    id: "c4",
    slug: "animal-flow",
    title: "ANIMAL FLOW",
    subtitle: "Pohyb po zemi, hravost a mobilita",
    description:
      "Plynulý pohyb inspirovaný zvířaty. Posílíš celé tělo, zlepšíš mobilitu a koordinaci a znovu si užiješ pohyb jako hru. Vhodné pro každého, kdo chce být silný i mrštný.",
    thumbnailUrl: "/thumbnails/course-animal-flow.jpg",
    priceKc: 1190,
    lessons: [
      { id: "l18", order: 1, title: "Pozice a aktivace", durationSeconds: 900, accessLevel: "FREE" },
      { id: "l19", order: 2, title: "Beast a crab", durationSeconds: 1080, accessLevel: "MEMBER" },
      { id: "l20", order: 3, title: "Přechody a switche", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l21", order: 4, title: "První flow sestava", durationSeconds: 1500, accessLevel: "MEMBER" },
    ],
    tags: ["mobilita", "flow", "koordinace"],
    publishedAt: "2024-03-01T10:00:00Z",
  },
  {
    id: "c5",
    slug: "flowrope",
    title: "FLOWROPE",
    subtitle: "Švihadlo jinak – rytmus, flow a kondice",
    description:
      "Flowrope spojuje kondici, rytmus a hravost. Naučíš se základní i plynulé pohyby se švihadlem, které procvičí celé tělo a skvěle naladí hlavu.",
    thumbnailUrl: "/thumbnails/course-flowrope.jpg",
    priceKc: 990,
    lessons: [
      { id: "l22", order: 1, title: "Základní skok a rytmus", durationSeconds: 720, accessLevel: "FREE" },
      { id: "l23", order: 2, title: "Variace a přehozy", durationSeconds: 1080, accessLevel: "MEMBER" },
      { id: "l24", order: 3, title: "Flow kombinace", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l25", order: 4, title: "Kondiční výzva", durationSeconds: 900, accessLevel: "MEMBER" },
    ],
    tags: ["švihadlo", "kondice", "flow"],
    publishedAt: "2024-03-15T10:00:00Z",
  },
  {
    id: "c6",
    slug: "schody",
    title: "SCHODY",
    subtitle: "Trénink, který máš pořád po ruce",
    description:
      "Obyčejné schody jako kompletní tělocvična. Kondice, síla nohou i srdce – chytré sestavy, které zvládneš na schodišti doma nebo venku.",
    thumbnailUrl: "/thumbnails/course-schody.jpg",
    priceKc: 790,
    lessons: [
      { id: "l26", order: 1, title: "Bezpečně a správně", durationSeconds: 600, accessLevel: "FREE" },
      { id: "l27", order: 2, title: "Kondiční intervaly", durationSeconds: 900, accessLevel: "MEMBER" },
      { id: "l28", order: 3, title: "Síla nohou na schodech", durationSeconds: 1080, accessLevel: "MEMBER" },
      { id: "l29", order: 4, title: "Kompletní schodišťový trénink", durationSeconds: 1200, accessLevel: "MEMBER" },
    ],
    tags: ["kondice", "nohy", "doma i venku"],
    publishedAt: "2024-03-25T10:00:00Z",
  },
  {
    id: "c7",
    slug: "office",
    title: "OFFICE",
    subtitle: "Cvič u stolu a zůstaň bez bolestí",
    description:
      "Pro všechny, kdo tráví den u počítače. Micro-cvičení a pohybové návyky, které ochrání tvoje záda, krk i ramena před následky dlouhého sezení.",
    thumbnailUrl: "/thumbnails/course-office.jpg",
    priceKc: 890,
    lessons: [
      { id: "l30", order: 1, title: "Proč sezení ničí tělo", durationSeconds: 720, accessLevel: "FREE" },
      { id: "l31", order: 2, title: "Nastavení pracovního místa", durationSeconds: 900, accessLevel: "FREE" },
      { id: "l32", order: 3, title: "Micro-cvičení každou hodinu", durationSeconds: 600, accessLevel: "MEMBER" },
      { id: "l33", order: 4, title: "Záda, krk a ramena", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l34", order: 5, title: "Odpolední reset", durationSeconds: 480, accessLevel: "MEMBER" },
    ],
    tags: ["kancelář", "záda", "prevence"],
    publishedAt: "2024-04-01T10:00:00Z",
  },
  {
    id: "c8",
    slug: "rodic-a-dite",
    title: "RODIČ A DÍTĚ",
    subtitle: "Pohyb jako společná hra",
    description:
      "Program pro rodiče a děti 3–8 let. Pohybové hry a aktivity, které baví celou rodinu a přirozeně rozvíjejí motoriku dítěte.",
    thumbnailUrl: "/thumbnails/course-rodic-dite.jpg",
    priceKc: 790,
    lessons: [
      { id: "l35", order: 1, title: "Proč cvičit s dítětem", durationSeconds: 600, accessLevel: "FREE" },
      { id: "l36", order: 2, title: "Ranní pohybová hra", durationSeconds: 900, accessLevel: "MEMBER" },
      { id: "l37", order: 3, title: "Zvířecí pohyby", durationSeconds: 1080, accessLevel: "MEMBER" },
      { id: "l38", order: 4, title: "Rovnovážné hry", durationSeconds: 900, accessLevel: "MEMBER" },
      { id: "l39", order: 5, title: "Silové hry pro rodiče", durationSeconds: 1200, accessLevel: "MEMBER" },
    ],
    tags: ["děti", "rodina", "hry"],
    publishedAt: "2024-04-15T10:00:00Z",
  },
  {
    id: "c9",
    slug: "reset-dychani",
    title: "RESET DÝCHÁNÍ",
    subtitle: "Dýchej správně. Funguj lépe.",
    description:
      "Správný dech je základ pohybu, výkonu i klidu. Naučíš se dechovou mechaniku, práci bránice a dech jako nástroj pro snížení stresu a lepší regeneraci.",
    thumbnailUrl: "/thumbnails/course-dech.jpg",
    priceKc: 890,
    lessons: [
      { id: "l40", order: 1, title: "Jak správně dýcháme (a jak ne)", durationSeconds: 900, accessLevel: "FREE" },
      { id: "l41", order: 2, title: "Bránice – hlavní dechový sval", durationSeconds: 1080, accessLevel: "MEMBER" },
      { id: "l42", order: 3, title: "Dechová cvičení pro klid", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l43", order: 4, title: "Dech a pohybový výkon", durationSeconds: 900, accessLevel: "MEMBER" },
    ],
    tags: ["dech", "klid", "regenerace"],
    publishedAt: "2024-04-25T10:00:00Z",
  },
  {
    id: "c10",
    slug: "noha",
    title: "NOHA",
    subtitle: "Zdravá chodidla, kolena a kotníky",
    description:
      "Péče o nohu od prstů až po koleno. Silná a mobilní chodidla jsou základ celého těla. Vhodné po zranění i jako prevence.",
    thumbnailUrl: "/thumbnails/course-noha.jpg",
    priceKc: 990,
    lessons: [
      { id: "l44", order: 1, title: "Chodidlo – základ všeho", durationSeconds: 900, accessLevel: "FREE" },
      { id: "l45", order: 2, title: "Kotník – mobilita", durationSeconds: 900, accessLevel: "MEMBER" },
      { id: "l46", order: 3, title: "Koleno – stabilizace", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l47", order: 4, title: "Silná noha do pohybu", durationSeconds: 1200, accessLevel: "MEMBER" },
    ],
    tags: ["noha", "koleno", "chodidlo"],
    publishedAt: "2024-05-01T10:00:00Z",
  },
  {
    id: "c11",
    slug: "kycel",
    title: "KYČEL",
    subtitle: "Mobilní kyčle = zdravá záda",
    description:
      "Tuhé kyčle jsou nejčastější příčinou bolavých zad. Tento kurz ti vrátí mobilitu a uvolní kyčelní klouby do plného rozsahu.",
    thumbnailUrl: "/thumbnails/course-kycel.jpg",
    priceKc: 1090,
    lessons: [
      { id: "l48", order: 1, title: "Anatomie kyčle jednoduše", durationSeconds: 720, accessLevel: "FREE" },
      { id: "l49", order: 2, title: "Test tvojí mobility", durationSeconds: 600, accessLevel: "FREE" },
      { id: "l50", order: 3, title: "Uvolnění flexorů kyčle", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l51", order: 4, title: "Rotátory a abduktory", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l52", order: 5, title: "Kompletní mobilizační sestava", durationSeconds: 1800, accessLevel: "MEMBER" },
    ],
    tags: ["kyčle", "mobilita", "záda"],
    publishedAt: "2024-05-10T10:00:00Z",
  },
  {
    id: "c12",
    slug: "rameno",
    title: "RAMENO",
    subtitle: "Vrať rameni pohyblivost a sílu",
    description:
      "Ucelený pohybový průvodce pro silné a pohyblivé rameno. Vhodné při přetížení i jako prevence pro každého, kdo pracuje rukama nad hlavou.",
    thumbnailUrl: "/thumbnails/course-rameno.jpg",
    priceKc: 1090,
    lessons: [
      { id: "l53", order: 1, title: "Ramenní kloub – jak funguje", durationSeconds: 900, accessLevel: "FREE" },
      { id: "l54", order: 2, title: "Orientační test pohyblivosti ramene", durationSeconds: 720, accessLevel: "FREE" },
      { id: "l55", order: 3, title: "Rotátorová manžeta – základ", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l56", order: 4, title: "Lopatkové stabilizátory", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l57", order: 5, title: "Síla a stabilita", durationSeconds: 1500, accessLevel: "MEMBER" },
    ],
    tags: ["rameno", "po zranění", "posílení"],
    caution: "Kurz je pohybová edukace, ne léčba. Po úrazu nebo operaci ramene, při ostré či vystřelující bolesti, necitlivosti nebo slabosti paže se nejdřív poraď s lékařem nebo fyzioterapeutem.",
    publishedAt: "2024-05-20T10:00:00Z",
  },
  {
    id: "c13",
    slug: "panev",
    title: "PÁNEV",
    subtitle: "Stabilní střed a pevné pánevní dno",
    description:
      "Pánev je centrum pohybu i stability. Naučíš se vnímat a posilovat pánevní dno a hluboký stabilizační systém – základ pro zdravá záda, dech i sílu.",
    thumbnailUrl: "/thumbnails/course-panev.jpg",
    priceKc: 1090,
    lessons: [
      { id: "l58", order: 1, title: "Pánev a její role", durationSeconds: 720, accessLevel: "FREE" },
      { id: "l59", order: 2, title: "Pánevní dno – jak ho vnímat", durationSeconds: 1080, accessLevel: "MEMBER" },
      { id: "l60", order: 3, title: "Propojení dechu a středu", durationSeconds: 1200, accessLevel: "MEMBER" },
      { id: "l61", order: 4, title: "Stabilní pánev v pohybu", durationSeconds: 1200, accessLevel: "MEMBER" },
    ],
    tags: ["pánev", "core", "stabilita"],
    publishedAt: "2024-05-30T10:00:00Z",
  },
];

// Doplní kurzům lekce na deterministický počet 10–20 (zatím placeholder).
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function padLessons(course: Course): Course {
  const target = 10 + (hashStr(course.id) % 11); // 10–20
  if (course.lessons.length >= target) return course;
  const extra: CourseLesson[] = [];
  for (let order = course.lessons.length + 1; order <= target; order++) {
    extra.push({
      id: `${course.id}-l${order}`,
      order,
      title: `Lekce ${order}`,
      durationSeconds: 600 + ((order * 7) % 11) * 90, // 10–25 min variabilně
      accessLevel: "MEMBER",
    });
  }
  return { ...course, lessons: [...course.lessons, ...extra] };
}

export const MOCK_COURSES: Course[] = BASE_COURSES.map(padLessons);

// ─── Open slots ───────────────────────────────────────────────────────────────

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const baseDate = new Date("2026-06-09T00:00:00");

export const MOCK_OPEN_SLOTS: OpenSlot[] = [
  { id: "s1", dateTime: new Date(addDays(baseDate, 0).setHours(9, 0)).toISOString(), durationMinutes: 60, type: "online", isBooked: false },
  { id: "s2", dateTime: new Date(addDays(baseDate, 0).setHours(11, 0)).toISOString(), durationMinutes: 60, type: "online", isBooked: true },
  { id: "s3", dateTime: new Date(addDays(baseDate, 1).setHours(10, 0)).toISOString(), durationMinutes: 90, type: "domů", isBooked: false },
  { id: "s4", dateTime: new Date(addDays(baseDate, 2).setHours(9, 0)).toISOString(), durationMinutes: 60, type: "online", isBooked: false },
  { id: "s5", dateTime: new Date(addDays(baseDate, 2).setHours(14, 0)).toISOString(), durationMinutes: 60, type: "na místě", isBooked: false },
  { id: "s6", dateTime: new Date(addDays(baseDate, 3).setHours(16, 0)).toISOString(), durationMinutes: 60, type: "online", isBooked: false },
  { id: "s7", dateTime: new Date(addDays(baseDate, 5).setHours(10, 0)).toISOString(), durationMinutes: 90, type: "domů", isBooked: false },
  { id: "s8", dateTime: new Date(addDays(baseDate, 5).setHours(13, 0)).toISOString(), durationMinutes: 60, type: "online", isBooked: false },
  { id: "s9", dateTime: new Date(addDays(baseDate, 7).setHours(9, 0)).toISOString(), durationMinutes: 60, type: "online", isBooked: false },
  { id: "s10", dateTime: new Date(addDays(baseDate, 8).setHours(11, 0)).toISOString(), durationMinutes: 90, type: "na místě", isBooked: false },
];

// ─── Membership plans ─────────────────────────────────────────────────────────

export const MOCK_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "mp1",
    tier: "MEMBER",
    name: "MEMBER",
    tagline: "Cvič podle sebe",
    priceKcMonth: 199,
    highlighted: false,
    features: [
      "Celá videoknihovna pro členy – cvič přesně na to, co tě trápí (záda, kyčle, dech, koleno…)",
      "Chytré filtry: podle části těla, systému, délky, obtížnosti i toho, co máš doma",
      "Kurzy krok za krokem + sledování postupu a oblíbená videa",
      "Komunita Kruhů – přidej se k lidem, co řeší totéž",
      "Cvič kdy a kde chceš, vlastním tempem",
    ],
  },
  {
    id: "mp2",
    tier: "VIP",
    name: "VIP",
    tagline: "Konec tápání – cvič s vedením",
    priceKcMonth: 399,
    highlighted: false,
    features: [
      "Všechno z MEMBER, a navíc:",
      "Exkluzivní VIP videa a pokročilé kurzy navíc",
      "Můj deník – sleduj váhu, bolest, energii a pokrok v přehledných grafech",
      "Členská sleva 10 % na osobní lekce a konzultace",
      "Přednost při rezervaci termínů",
    ],
  },
  {
    id: "mp3",
    tier: "VIP_PLUS",
    name: "VIP+",
    tagline: "Jako bys měl trenéra po ruce",
    priceKcMonth: 599,
    highlighted: true,
    features: [
      "Všechno z VIP, a k tomu to nejlepší:",
      "VIP+ Klub – ptej se mě přímo (Q&A) a sdílej pokrok v uzavřené komunitě",
      "Zakládej vlastní Kruhy a veď svou skupinu",
      "Živé online lekce a vysílání se mnou",
      "Všechno dřív – předběžný přístup k novým videím i kurzům",
      "Nejvyšší sleva 15 % na vše (lekce, konzultace, kurzy, workshopy)",
      "Nejvyšší priorita termínů",
    ],
  },
];

// Srovnávací matice členství – co je v které úrovni (✓/✗ nebo hodnota).
export type MatrixCell = boolean | string;
export const MEMBERSHIP_MATRIX: {
  label: string;
  free: MatrixCell;
  member: MatrixCell;
  vip: MatrixCell;
  vipPlus: MatrixCell;
}[] = [
  { label: "Ukázková videa zdarma", free: true, member: true, vip: true, vipPlus: true },
  { label: "Plná videoknihovna pro členy", free: false, member: true, vip: true, vipPlus: true },
  { label: "Chytré filtry knihovny", free: false, member: true, vip: true, vipPlus: true },
  { label: "Kurzy pro členy (krok za krokem)", free: false, member: true, vip: true, vipPlus: true },
  { label: "Oblíbená videa a sledování postupu", free: false, member: true, vip: true, vipPlus: true },
  { label: "Komunita Kruhů – připojení", free: false, member: true, vip: true, vipPlus: true },
  { label: "Možnost napsat recenzi", free: false, member: true, vip: true, vipPlus: true },
  { label: "Exkluzivní VIP videa a pokročilé kurzy", free: false, member: false, vip: true, vipPlus: true },
  { label: "Můj deník (váha, bolest, energie, grafy)", free: false, member: false, vip: true, vipPlus: true },
  { label: "Členská sleva na lekce a konzultace", free: false, member: false, vip: "10 %", vipPlus: "15 %" },
  { label: "Přednost při rezervaci termínů", free: false, member: false, vip: true, vipPlus: "nejvyšší" },
  { label: "Zakládání vlastních Kruhů", free: false, member: false, vip: false, vipPlus: true },
  { label: "VIP+ Klub – Q&A přímo s Honzou", free: false, member: false, vip: false, vipPlus: true },
  { label: "Živé online lekce a vysílání", free: false, member: false, vip: false, vipPlus: true },
  { label: "Předběžný přístup k novinkám", free: false, member: false, vip: false, vipPlus: true },
];
