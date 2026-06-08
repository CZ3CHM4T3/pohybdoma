import { Star, Quote } from "lucide-react";
import { REVIEWS } from "@/lib/reviews";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}

/** Mřížka recenzí klientů. Když je jen pár, vypadá dobře taky. */
export function Reviews({ limit }: { limit?: number }) {
  const list = limit ? REVIEWS.slice(0, limit) : REVIEWS;
  if (list.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {list.map((r, i) => (
        <figure key={i} className="card card-3d p-6 flex flex-col">
          <Quote className="h-7 w-7 text-brand-light" strokeWidth={2} fill="currentColor" />
          <blockquote className="mt-3 flex-1 text-sm text-gray-700 leading-relaxed">
            {r.text}
          </blockquote>
          <figcaption className="mt-4 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-brand-dark">
              {r.name}
              {r.place ? <span className="font-normal text-gray-400"> · {r.place}</span> : null}
            </span>
            <Stars rating={r.rating} />
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
