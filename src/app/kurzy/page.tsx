import type { Metadata } from "next";
import Link from "next/link";
import { MOCK_COURSES } from "@/lib/mock-data";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Videokurzy",
  description: "Strukturované pohybové programy od office cvičení přes bolavá záda až po dech a rodičovské cvičení.",
};

const COURSE_ICONS: Record<string, string> = {
  "znovuzrozeni": "🌱",
  "kalistenika-doma": "🤸",
  "kettlebell": "🏋️",
  "animal-flow": "🐾",
  "flowrope": "🪢",
  "schody": "🪜",
  "office": "💼",
  "rodic-a-dite": "👨‍👧",
  "reset-dychani": "🌬️",
  "noha": "🦵",
  "kycel": "🔄",
  "rameno": "💪",
  "panev": "🧘",
};

export default function KuryPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-light py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-2">Videokurzy</p>
          <h1 className="text-4xl lg:text-5xl font-semibold text-brand-dark mb-4">
            Strukturované programy
          </h1>
          <p className="text-lg text-gray-600 max-w-xl">
            Každý kurz je ucelený program krok za krokem. Zakoupíte jednou – máte navždy.
          </p>
        </div>
      </section>

      {/* Courses grid */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {MOCK_COURSES.map((course) => (
              <div key={course.id} className="card flex flex-col hover:shadow-lg transition-shadow duration-200">
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-brand-dark to-[#1256c0] flex items-center justify-center">
                  <span className="text-5xl">{COURSE_ICONS[course.slug] ?? "📚"}</span>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <h2 className="text-lg font-semibold text-brand-dark leading-snug mb-1">
                    {course.title}
                  </h2>
                  <p className="text-sm text-brand-blue font-medium mb-3">{course.subtitle}</p>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1 line-clamp-3">
                    {course.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1 mb-4">
                    {course.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-brand-light text-brand-blue px-2 py-0.5 rounded-full font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <span className="text-2xl font-semibold text-brand-dark">{course.priceKc} Kč</span>
                      <span className="text-xs text-gray-400 ml-1">jednorázově</span>
                    </div>
                    <span className="text-xs text-gray-400">{course.lessons.length} lekcí</span>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <Link href={`/kurzy/${course.slug}`} className="btn-outline flex-1 text-sm py-2.5">
                      Detail
                    </Link>
                    <button type="button" className="btn-primary flex-1 text-sm py-2.5">
                      Koupit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upsell */}
      <section className="bg-brand-dark text-white py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-semibold mb-3">Máte zájem o celou knihovnu?</h2>
          <p className="text-white/70 mb-6">Členství VIP zahrnuje slevy na kurzy a přístup k videoknihovně.</p>
          <Link href="/clenstvi" className="btn-primary">
            Zobrazit členství
          </Link>
        </div>
      </section>
    </>
  );
}
