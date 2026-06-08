import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MOCK_COURSES } from "@/lib/mock-data";
import { COURSE_ICONS, DEFAULT_COURSE_ICON } from "@/lib/course-icons";
import { formatDuration } from "@/lib/access";
import { CourseLessons } from "@/components/CourseLessons";
import { SafetyNote } from "@/components/SafetyNote";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return MOCK_COURSES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = MOCK_COURSES.find((c) => c.slug === slug);
  if (!course) return { title: "Kurz nenalezen" };
  return { title: course.title, description: course.description };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = MOCK_COURSES.find((c) => c.slug === slug);
  if (!course) notFound();

  const totalDuration = course.lessons.reduce((sum, l) => sum + l.durationSeconds, 0);

  return (
    <div className="min-h-screen bg-brand-light">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/kurzy" className="inline-flex items-center gap-2 text-sm text-brand-blue font-semibold mb-6 hover:underline">
          ← Zpět na kurzy
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2">
            {/* Hero card */}
            <div className="card mb-6">
              <div className="aspect-video bg-gradient-to-br from-brand-dark to-[#1256c0] flex items-center justify-center">
                {(() => {
                  const Icon = COURSE_ICONS[course.slug] ?? DEFAULT_COURSE_ICON;
                  return <Icon className="h-20 w-20 text-white/90" strokeWidth={1.5} />;
                })()}
              </div>
              <div className="p-6">
                <h1 className="text-2xl lg:text-3xl font-semibold text-brand-dark mb-2">{course.title}</h1>
                <p className="text-brand-blue font-medium mb-4">{course.subtitle}</p>
                <p className="text-gray-600 leading-relaxed">{course.description}</p>
                <div className="mt-4 flex flex-wrap gap-1">
                  {course.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-brand-light text-brand-blue px-2.5 py-1 rounded-full font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Kontraindikace / bezpečnost */}
            <SafetyNote note={course.caution} className="mb-6" />

            {/* Lessons list + postup + poznámky */}
            <CourseLessons courseSlug={course.slug} lessons={course.lessons} />
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="card p-6 sticky top-24">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-sm font-semibold text-brand-blue mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-blue opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-blue" />
                </span>
                Připravujeme
              </div>
              <p className="text-xs text-gray-400 mb-5">Kurz finišuje – cena a koupě budou doplněny brzy.</p>

              <Link href="/ucet" className="btn-primary w-full mb-3">
                Dej mi vědět, až vyjde
              </Link>

              <div className="mt-6 space-y-2 text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <span className="text-brand-blue">✓</span> {course.lessons.length} videolekcí
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-brand-blue">✓</span> Celkem {formatDuration(totalDuration)} obsahu
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-brand-blue">✓</span> Přístup navždy
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-brand-blue">✓</span> Na mobilu i PC
                </p>
              </div>

              <p className="mt-5 pt-5 border-t border-gray-100 text-xs text-center text-gray-400">
                Členové VIP+ budou mít slevu 15 % →{" "}
                <Link href="/clenstvi" className="text-brand-blue hover:underline">
                  Zjistit více
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
