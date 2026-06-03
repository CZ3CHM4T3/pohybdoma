// ─── Access levels ───────────────────────────────────────────────────────────

export type AccessLevel = "FREE" | "MEMBER" | "VIP" | "VIP_PLUS";

export type UserTier = "FREE" | "MEMBER" | "VIP" | "VIP_PLUS";

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  tier: UserTier;
  avatarUrl?: string;
  createdAt: string;
}

// ─── Video ────────────────────────────────────────────────────────────────────

export type BodyPart =
  | "záda"
  | "noha"
  | "kyčle"
  | "rameno"
  | "krk"
  | "dech"
  | "celé tělo"
  | "core";

export type Difficulty = "začátečník" | "mírně pokročilý" | "pokročilý";

export type ProblemType =
  | "bolest"
  | "tuhnutí"
  | "slabost"
  | "rehabilitace"
  | "prevence"
  | "posílení"
  | "mobilita";

export type Equipment = "žádné" | "podložka" | "odporová guma" | "válec" | "míček" | "činky";

export interface Video {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  durationSeconds: number;
  accessLevel: AccessLevel;
  providerId: string; // Mux or Cloudflare Stream asset ID (future)
  bodyParts: BodyPart[];
  difficulty: Difficulty;
  problemTypes: ProblemType[];
  equipment: Equipment[];
  tags: string[];
  publishedAt: string;
}

// ─── Course ───────────────────────────────────────────────────────────────────

export interface CourseLesson {
  id: string;
  order: number;
  title: string;
  durationSeconds: number;
  accessLevel: AccessLevel;
  videoSlug?: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  thumbnailUrl: string;
  priceKc: number;
  lessons: CourseLesson[];
  tags: string[];
  publishedAt: string;
}

// ─── Services (rezervace) ─────────────────────────────────────────────────────

export type ServiceMode = "online" | "inPerson";

export interface Service {
  id: string;
  name: string;
  durationMin: number;
  /** Pevná cena. Pokud je cena závislá na dni, použijí se pole níže. */
  priceKc: number;
  /** Volitelně: cena ve všední den (Po–Pá). */
  priceWeekdayKc?: number;
  /** Volitelně: cena o víkendu (So–Ne). */
  priceWeekendKc?: number;
  /** "online" = odkudkoliv, "inPerson" = jen ve spádové oblasti. */
  mode: ServiceMode;
  description: string;
  /** Zvýraznit jako doporučenou / nejoblíbenější. */
  highlighted?: boolean;
}

// ─── Rozvrh / sloty ───────────────────────────────────────────────────────────

/** Stav slotu: "free" = volno (zeleně), "booked" = obsazeno (šedě). */
export type SlotStatus = "free" | "booked";

export interface ScheduleSlot {
  time: string; // "HH:MM"
  status: SlotStatus;
}

/** Akce / workshop v kalendáři (jiná barva puntíku). */
export interface CalendarEvent {
  id: string;
  date: string; // "YYYY-MM-DD"
  title: string;
  /** Typ akce – např. "Workshop", "Seminář", "Online". */
  kind: string;
  time?: string; // "HH:MM" nebo rozsah, volitelné
  location?: string;
  description: string;
  priceKc?: number;
  /** Cílová stránka / přihláška (volitelné). */
  href?: string;
}

// ─── Personal lessons / bookings ──────────────────────────────────────────────

export type LessonType = "online" | "domů" | "na místě";

export interface OpenSlot {
  id: string;
  dateTime: string; // ISO 8601
  durationMinutes: number;
  type: LessonType;
  isBooked: boolean;
}

export interface Booking {
  id: string;
  slotId: string;
  userId: string;
  address?: string;
  problemDescription: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

// ─── Membership plans ─────────────────────────────────────────────────────────

export interface MembershipPlan {
  id: string;
  tier: Exclude<UserTier, "FREE">;
  name: string;
  priceKcMonth: number;
  features: string[];
  highlighted: boolean;
}
