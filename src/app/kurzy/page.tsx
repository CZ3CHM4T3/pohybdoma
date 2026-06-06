import type { Metadata } from "next";
import Link from "next/link";
import { MOCK_COURSES } from "@/lib/mock-data";
import { COURSE_ICONS, DEFAULT_COURSE_ICON } from "@/lib/course-icons";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Videokurzy",
  description: "Strukturované pohybové programy od office cvičení přes bolavá záda až po dech a rodičovské cvičení.",
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
            Ucelené programy krok za krokem. <strong>Kurzy se připravují</strong> – níže je
            přehled toho, co chystám. Brzy je bude možné zakoupit.
          </p>
        </div>
      </section>

      {/* Courses grid */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {MOCK_COURSES.map((course) => {
              const Icon = COURSE_ICONS[course.slug] ?? DEFAULT_COURSE_ICON;
              return (
              <div key={course.id} className="card card-3d flex flex-col">
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-brand-dark to-[#1256c0] flex items-center justify-center">
                  <Icon className="h-14 w-14 text-white/90" strokeWidth={1.5} />
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
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-blue opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-blue" />
                      </span>
                      Připravujeme
                    </span>
                    <span className="text-xs text-gray-400">{course.lessons.length} lekcí</span>
                  </div>

                  <div className="mt-4">
                    <Link href={`/kurzy/${course.slug}`} className="btn-outline w-full text-sm py-2.5">
                      Zobrazit obsah
                    </Link>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Upsell */}
      <section className="bg-brand-dark text-white py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-semibold mb-3">Než kurzy vyjdou, mrkni do knihovny</h2>
          <p className="text-white/70 mb-6">Členství ti dá přístup k video-knihovně a VIP+ navíc 15% slevu na kurzy.</p>
          <Link href="/clenstvi" className="btn-primary">
            Zobrazit členství
          </Link>
        </div>
      </section>
    </>
  );
}
