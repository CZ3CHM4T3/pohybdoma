"use client";

import { useRef } from "react";
import { Star, Quote } from "lucide-react";
import type { Review } from "@/lib/reviews";

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

function Card({ name, place, rating, text }: Review) {
  return (
    <figure className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 transition-transform duration-300 ease-out hover:scale-[1.04] hover:shadow-xl">
      <Quote className="h-7 w-7 text-brand-light" strokeWidth={2} fill="currentColor" />
      <blockquote className="mt-3 flex-1 text-sm text-gray-700 leading-relaxed">{text}</blockquote>
      <figcaption className="mt-4 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-brand-dark">
          {name}
          {place ? <span className="font-normal text-gray-400"> · {place}</span> : null}
        </span>
        <Stars rating={rating} />
      </figcaption>
    </figure>
  );
}

export function Reviews({
  reviews,
  limit,
  carousel,
}: {
  reviews: Review[];
  limit?: number;
  carousel?: boolean;
}) {
  const list = limit ? reviews.slice(0, limit) : reviews;
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, scroll: 0, moved: false });

  if (list.length === 0) return null;

  // ── Grid (např. stránka /recenze) ──
  if (!carousel) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((r, i) => (
          <Card key={i} {...r} />
        ))}
      </div>
    );
  }

  // ── Karusel (homepage): swipe + zoom pod kurzorem ──
  function onDown(e: React.PointerEvent) {
    if (!ref.current) return;
    drag.current = { down: true, startX: e.clientX, scroll: ref.current.scrollLeft, moved: false };
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current.down || !ref.current) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    ref.current.scrollLeft = drag.current.scroll - dx;
  }
  function onUp() {
    drag.current.down = false;
  }
  function scrollBy(dir: number) {
    ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory px-1 py-6 cursor-grab active:cursor-grabbing select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {list.map((r, i) => (
          <div key={i} className="snap-center shrink-0 w-[280px] sm:w-[340px] hover:z-10">
            <Card {...r} />
          </div>
        ))}
      </div>

      {/* Šipky (desktop) – zobrazí se jen když je co posouvat */}
      {list.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Předchozí"
            onClick={() => scrollBy(-1)}
            className="hidden lg:flex absolute -left-3 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 text-brand-dark hover:bg-brand-light"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Další"
            onClick={() => scrollBy(1)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 text-brand-dark hover:bg-brand-light"
          >
            →
          </button>
        </>
      )}
    </div>
  );
}
