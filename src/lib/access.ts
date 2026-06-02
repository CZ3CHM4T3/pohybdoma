import type { AccessLevel, UserTier } from "@/types";

const TIER_RANK: Record<UserTier, number> = {
  FREE: 0,
  MEMBER: 1,
  VIP: 2,
  VIP_PLUS: 3,
};

const ACCESS_RANK: Record<AccessLevel, number> = {
  FREE: 0,
  MEMBER: 1,
  VIP: 2,
  VIP_PLUS: 3,
};

export function canAccess(userTier: UserTier, requiredLevel: AccessLevel): boolean {
  return TIER_RANK[userTier] >= ACCESS_RANK[requiredLevel];
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h} h ${m % 60} min`;
  return `${m} min`;
}
