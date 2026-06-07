import Link from "next/link";
import type { Video, UserTier } from "@/types";
import { canAccess, formatDuration } from "@/lib/access";
import { AccessBadge } from "@/components/ui/Badge";
import { LockBadge } from "@/components/ui/LockBadge";
import { TIER_STYLES } from "@/lib/tiers";

interface VideoCardProps {
  video: Video;
  userTier: UserTier;
}

export function VideoCard({ video, userTier }: VideoCardProps) {
  const accessible = canAccess(userTier, video.accessLevel);

  return (
    <Link href={`/videoknihovna/${video.slug}`} className="card card-3d group block">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-brand-dark to-[#1256c0] overflow-hidden">
        {/* Placeholder thumbnail */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/20 text-5xl select-none">▶</div>
        </div>

        {/* Lock overlay for inaccessible VIP content */}
        {!accessible && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1C9.24 1 7 3.24 7 6v2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-2V6c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3zm0 9c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
              </svg>
            </div>
            <span className="text-white text-xs font-semibold">Odemknout {TIER_STYLES[video.accessLevel].label}</span>
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
          {formatDuration(video.durationSeconds)}
        </div>

        {/* Access badge / zámeček */}
        <div className="absolute top-2 left-2">
          {accessible ? (
            <AccessBadge level={video.accessLevel} />
          ) : (
            <LockBadge level={video.accessLevel} />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-brand-dark leading-snug group-hover:text-brand-blue transition-colors line-clamp-2">
          {video.title}
        </h3>
        <p className="mt-1 text-xs text-gray-500 line-clamp-2">{video.description}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {video.bodyParts.slice(0, 2).map((bp) => (
            <span key={bp} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {bp}
            </span>
          ))}
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
            {video.difficulty}
          </span>
        </div>
      </div>
    </Link>
  );
}
