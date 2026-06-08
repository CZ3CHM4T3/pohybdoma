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
    name: "Veronika Š.",
    rating: 5,
    text:
      "Honzu mít jako svého trenéra, to je absolutní must-have, pokud vám záleží na svém těle a chcete se cítit dobře. Ne, není to jako posilování ve fitku nebo pilates, ale Honzu potřebujete k tomu, aby vás tělo podrželo a nic vás nebolelo. Pokud bychom mohli doma dát hvězdičky, tak jednoznačně 10 z 10!",
  },
];
