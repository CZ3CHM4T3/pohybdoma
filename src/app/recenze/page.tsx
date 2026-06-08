import type { Metadata } from "next";
import { Reviews } from "@/components/Reviews";
import { ReviewForm } from "@/components/ReviewForm";
import { getApprovedReviews } from "@/lib/reviews-server";

export const metadata: Metadata = {
  title: "Recenze",
  description: "Co o spolupráci říkají lidé, se kterými pracuji na jejich pohybu.",
};

export default async function RecenzePage() {
  const reviews = await getApprovedReviews();
  return (
    <div className="min-h-screen bg-brand-light py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-2">Recenze</p>
        <h1 className="text-4xl lg:text-5xl font-semibold text-brand-dark mb-4">Co říkají lidé</h1>
        <p className="text-lg text-gray-600 max-w-2xl mb-10">
          Skutečné ohlasy lidí, se kterými pracuji na jejich pohybu. Přibývají postupně,
          jak roste komunita.
        </p>

        {reviews.length > 0 ? (
          <Reviews reviews={reviews} />
        ) : (
          <p className="text-gray-400">Zatím tu nejsou žádné recenze. Brzy přibydou. 🙂</p>
        )}

        <div className="mt-12 max-w-xl">
          <ReviewForm />
        </div>
      </div>
    </div>
  );
}
