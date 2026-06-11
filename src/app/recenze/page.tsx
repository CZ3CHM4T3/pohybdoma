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
        <p className="text-lg text-gray-600 max-w-2xl mb-6">
          Skutečné ohlasy lidí, se kterými pracuji na jejich pohybu. Přibývají postupně,
          jak roste komunita.
        </p>

        <a
          href="https://www.instagram.com/pohybdoma/"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-10 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-dark shadow-sm ring-1 ring-gray-100 transition hover:ring-brand-blue"
        >
          <svg className="h-4 w-4 text-brand-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
          </svg>
          Další ohlasy a pohyb každý den: <span className="text-brand-blue">@pohybdoma</span> →
        </a>

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
