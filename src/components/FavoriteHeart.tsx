"use client";

import { Heart } from "lucide-react";
import { useFavorite } from "@/lib/favorites";

/**
 * Srdíčko pro uložení videa mezi oblíbená. Zobrazí se jen přihlášenému členovi.
 * Funguje jako bílé kolečko (čitelné na tmavém náhledu i na světlém pozadí).
 */
export function FavoriteHeart({
  slug,
  className = "",
}: {
  slug: string;
  className?: string;
}) {
  const { isFavorite, toggle, ready, loggedIn } = useFavorite(slug);
  if (!ready || !loggedIn) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      aria-label={isFavorite ? "Odebrat z oblíbených" : "Uložit do oblíbených"}
      title={isFavorite ? "Uloženo v oblíbených" : "Uložit do oblíbených"}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-transform hover:scale-110 ${className}`}
    >
      <Heart
        className={`h-4 w-4 transition-colors ${isFavorite ? "fill-rose-500 text-rose-500" : "text-gray-400"}`}
        strokeWidth={2}
      />
    </button>
  );
}
