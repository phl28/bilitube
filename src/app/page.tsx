'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { VideoMatch } from '@/types';
import { extractYoutubeInfo, isBilibiliUrl } from '@/lib/url';
import { queryKeys, fetchRecentMatches } from '@/lib/queries';

export default function HomePage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { data: recentMatches = [], isPending: loadingRecent } = useQuery({
    queryKey: queryKeys.recentMatches(),
    queryFn: fetchRecentMatches,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ytInfo = extractYoutubeInfo(youtubeUrl.trim());
    if (ytInfo) {
      router.push(`/video/${ytInfo.videoId}`);
      return;
    }

    if (!isBilibiliUrl(youtubeUrl.trim())) {
      toast.error('Invalid video URL. Please paste a YouTube or Bilibili link.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/video/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || 'Failed to find video');
        return;
      }

      if (data.hasMatches === false) {
        toast.info(data.message || 'No matches found for this video.');
        return;
      }

      const youtubeId = data.data?.youtubeVideo?.id;
      if (!youtubeId) {
        toast.error('Invalid response from server.');
        return;
      }

      router.push(`/video/${youtubeId}`);
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)]">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center animate-fade-up">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.15] mb-3">
            One video, <span className="text-accent">two worlds</span> of comments
          </h1>

          <p className="text-base text-muted max-w-md mx-auto mb-8">
            Paste a YouTube or Bilibili link to find its mirror and read
            comments from both platforms side by side.
          </p>

          <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto animate-fade-up stagger-2">
            <div className="flex items-center gap-2 p-1 rounded-full bg-surface border border-border transition-colors focus-within:border-muted">
              <div className="pl-3.5 text-muted">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Paste a YouTube or Bilibili URL..."
                className="flex-1 px-1 py-2.5 bg-transparent text-foreground placeholder:text-muted/50 outline-none text-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !youtubeUrl.trim()}
                className="px-5 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent text-white font-medium rounded-full text-sm transition-colors"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Searching
                  </span>
                ) : (
                  'Find matches'
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Recent Matches */}
      {!loadingRecent && recentMatches.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-20 animate-fade-up stagger-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Recently matched</h2>
              <p className="text-sm text-muted mt-1">Videos already linked across platforms</p>
            </div>
            <div className="text-xs text-muted font-medium tracking-wide uppercase">
              {recentMatches.length} video{recentMatches.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
            {recentMatches.map((match, i) => (
              <VideoCard key={match.youtubeVideo.id} match={match} index={i} />
            ))}
          </div>
        </section>
      )}

      {loadingRecent && (
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-7 w-48 bg-surface-hover rounded-lg animate-pulse" />
              <div className="h-4 w-64 bg-surface-hover rounded mt-2 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function VideoCard({ match, index }: { match: VideoMatch; index: number }) {
  const router = useRouter();
  const yt = match.youtubeVideo;
  const reuploadCount = match.bilibiliReuploads.length;
  const topConfidence = match.bilibiliReuploads[0]?.matchConfidence;

  return (
    <div
      onClick={() => router.push(`/video/${yt.id}`)}
      className={`group cursor-pointer animate-fade-up stagger-${Math.min(index + 1, 8)}`}
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-hover">
        {yt.thumbnailUrl ? (
          <img
            src={yt.thumbnailUrl}
            alt={yt.title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:rounded-none group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        )}

        {yt.durationSeconds > 0 && (
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 text-white text-xs font-medium rounded-md">
            {formatDuration(yt.durationSeconds)}
          </span>
        )}

        {reuploadCount > 0 && topConfidence != null && (
          <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[11px] font-medium ${
            topConfidence >= 0.75
              ? 'bg-emerald-600/90 text-white'
              : topConfidence >= 0.5
                ? 'bg-amber-600/90 text-white'
                : 'bg-zinc-600/90 text-white'
          }`}>
            {Math.round(topConfidence * 100)}%
          </span>
        )}
      </div>

      <div className="pt-3">
        <h3 className="font-medium text-sm leading-snug line-clamp-2 mb-1">
          {yt.title}
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          {yt.channelTitle}
        </p>
        <p className="text-xs text-muted">
          {yt.viewCount > 0 && <>{formatViewCount(yt.viewCount)} views</>}
          {yt.viewCount > 0 && reuploadCount > 0 && <> &middot; </>}
          {reuploadCount > 0 && (
            <span className="text-accent">
              {reuploadCount} Bilibili {reuploadCount === 1 ? 'mirror' : 'mirrors'}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div>
      <div className="aspect-video bg-surface-hover rounded-xl animate-pulse" />
      <div className="pt-3 space-y-2">
        <div className="h-4 w-full bg-surface-hover rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-surface-hover rounded animate-pulse" />
        <div className="h-3 w-1/3 bg-surface-hover rounded animate-pulse" />
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}
