import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MOCK_VIDEOS } from "@/lib/mock-data";
import { canAccess, formatDuration } from "@/lib/access";
import { AccessBadge } from "@/components/ui/Badge";
import { TIER_STYLES } from "@/lib/tiers";
import { getUserTier } from "@/lib/supabase/user";

interface Props {
  params: Promise<{ slug: string }>;
}

// Stránka zobrazuje obsah podle úrovně přihlášeného uživatele → musí se
// renderovat dynamicky (per-uživatel), ne staticky.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const video = MOCK_VIDEOS.find((v) => v.slug === slug);
  if (!video) return { title: "Video nenalezeno" };
  return { title: video.title, description: video.description };
}

export default async function VideoDetailPage({ params }: Props) {
  const { slug } = await params;
  const video = MOCK_VIDEOS.find((v) => v.slug === slug);
  if (!video) notFound();

  const userTier = await getUserTier();
  const accessible = canAccess(userTier, video.accessLevel);

  return (
    <div className="min-h-screen bg-brand-light">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Back */}
        <Link href="/videoknihovna" className="inline-flex items-center gap-2 text-sm text-brand-blue font-semibold mb-6 hover:underline">
          ← Zpět do videoknihovy
        </Link>

        {/* Player area */}
        <div className="card overflow-hidden mb-8">
          {accessible ? (
            <div className="aspect-video bg-brand-dark flex items-center justify-center">
              <div className="text-center text-white/50">
                <div className="text-6xl mb-4">▶</div>
                <p className="font-semibold">Video přehrávač</p>
                <p className="text-sm opacity-60">Bude napojeno na Mux / Cloudflare Stream</p>
                <p className="text-xs opacity-40 mt-1">providerId: {video.providerId}</p>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-brand-dark relative flex items-center justify-center">
              <div className="absolute inset-0 backdrop-blur-md bg-black/60 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1C9.24 1 7 3.24 7 6v2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-2V6c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3zm0 9c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
                  </svg>
                </div>
                <h3 className="text-white text-xl font-semibold">Toto video je {TIER_STYLES[video.accessLevel].label}</h3>
                <p className="text-white/70 text-sm max-w-sm">Odemkněte přístup ke všem VIP videím s členstvím.</p>
                <Link href="/clenstvi" className="btn-primary mt-2">
                  Odemknout VIP přístup
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-start gap-3 mb-4 flex-wrap">
              <AccessBadge level={video.accessLevel} />
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-semibold capitalize">
                {video.difficulty}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-semibold">
                {formatDuration(video.durationSeconds)}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-brand-dark mb-4">{video.title}</h1>
            <p className="text-gray-600 leading-relaxed">{video.description}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {video.tags.map((tag) => (
                <span key={tag} className="text-xs bg-brand-light text-brand-blue px-2.5 py-1 rounded-full font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <aside className="card p-5">
            <h3 className="font-semibold text-brand-dark mb-4 text-sm uppercase tracking-wide">Detaily</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Část těla</dt>
                <dd className="text-brand-dark font-medium">{video.bodyParts.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Typ problému</dt>
                <dd className="text-brand-dark font-medium">{video.problemTypes.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Pomůcky</dt>
                <dd className="text-brand-dark font-medium">{video.equipment.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Délka</dt>
                <dd className="text-brand-dark font-medium">{formatDuration(video.durationSeconds)}</dd>
              </div>
            </dl>

            {!accessible && (
              <Link href="/clenstvi" className="btn-primary mt-6 w-full text-sm">
                Odemknout {TIER_STYLES[video.accessLevel].label}
              </Link>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
