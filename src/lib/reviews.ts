export type Review = {
  name: string;
  place?: string;
  rating: number; // 1–5
  text: string;
};

/**
 * Recenze klientů.
 * 👉 Až ti dorazí reálné ohlasy, prostě je sem přidej (nebo nahraď placeholder).
 *    Pořadí = pořadí zobrazení. Drž se pravdy – žádné vymýšlení.
 */
export const REVIEWS: Review[] = [
  {
    name: "[DOPLŇ jméno]",
    place: "[obec]",
    rating: 5,
    text: "[Sem přijde tvoje první reálná recenze – tu mi pošleš a já ji vložím.]",
  },
];
