import type { Video, AccessLevel, BodyPart, Difficulty, ProblemType, Equipment } from "@/types";

export type VideoRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  body_parts: string[] | null;
  difficulty: string | null;
  access_level: string;
  problem_types: string[] | null;
  equipment: string[] | null;
  tags: string[] | null;
  cf_uid: string | null;
  duration_seconds: number | null;
  caution: string | null;
  published: boolean;
  position: number | null;
  created_at: string;
};

/** Sloupce pro select (sdílené server i klient). */
export const VIDEO_COLS =
  "id, slug, title, description, body_parts, difficulty, access_level, problem_types, equipment, tags, cf_uid, duration_seconds, caution, published, position, created_at";

export function rowToVideo(r: VideoRow): Video {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description ?? "",
    thumbnailUrl: "",
    durationSeconds: r.duration_seconds ?? 0,
    accessLevel: (r.access_level as AccessLevel) ?? "FREE",
    providerId: r.cf_uid ?? "",
    bodyParts: (r.body_parts ?? []) as BodyPart[],
    difficulty: (r.difficulty as Difficulty) ?? "začátečník",
    problemTypes: (r.problem_types ?? []) as ProblemType[],
    equipment: (r.equipment ?? []) as Equipment[],
    tags: r.tags ?? [],
    publishedAt: r.created_at,
    caution: r.caution ?? undefined,
  };
}
