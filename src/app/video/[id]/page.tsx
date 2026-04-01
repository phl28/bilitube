'use client';

import { useState, useEffect, use } from 'react';
import { VideoMatch, YouTubeComment, BilibiliComment } from '@/types';

interface VideoPageProps {
  params: Promise<{ id: string }>;
}

export default function VideoPage({ params }: VideoPageProps) {
  const { id } = use(params);
  const [match, setMatch] = useState<VideoMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'top' | 'new' | 'hot'>('top');
  const [youtubeComments, setYoutubeComments] = useState<YouTubeComment[]>([]);
  const [bilibiliComments, setBilibiliComments] = useState<BilibiliComment[]>([]);
  const [youtubeCommentTotal, setYoutubeCommentTotal] = useState(0);
  const [bilibiliCommentTotal, setBilibiliCommentTotal] = useState(0);
  const [selectedBilibili, setSelectedBilibili] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    fetchVideoMatch();
  }, [id]);

  useEffect(() => {
    if (match) {
      fetchComments();
    }
  }, [match, sortBy, selectedBilibili]);

  async function fetchVideoMatch() {
    try {
      const response = await fetch(`/api/video/match?id=${id}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load video');
        return;
      }

      setMatch(data.data);

      if (data.data.bilibiliReuploads.length > 0) {
        setSelectedBilibili(data.data.bilibiliReuploads[0].video.aid.toString());
      }
    } catch (err) {
      setError('Failed to load video data');
    } finally {
      setLoading(false);
    }
  }

  async function fetchComments() {
    if (!match) return;

    setLoadingComments(true);
    try {
      const params = new URLSearchParams();
      params.set('youtubeId', match.youtubeVideo.id);
      if (selectedBilibili) {
        params.set('bilibiliAid', selectedBilibili);
      }
      params.set('sortBy', sortBy);

      const response = await fetch(`/api/video/comments?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.data) {
        setYoutubeComments(data.data.youtube?.comments || []);
        setBilibiliComments(data.data.bilibili?.comments || []);
        setYoutubeCommentTotal(data.data.youtube?.totalCount || 0);
        setBilibiliCommentTotal(data.data.bilibili?.totalCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoadingComments(false);
    }
  }

  async function refreshComments() {
    await fetchComments();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-accent">{error}</div>
      </div>
    );
  }

  if (!match) return null;

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${match.youtubeVideo.id}`}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
            <h1 className="text-lg font-semibold mt-3 leading-snug">
              {match.youtubeVideo.title}
            </h1>
            <p className="text-sm text-muted mt-1">
              {match.youtubeVideo.channelTitle} &middot; {formatViewCount(match.youtubeVideo.viewCount)} views
            </p>
          </div>

          <div className="bg-surface rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Comments</h2>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground outline-none"
                >
                  <option value="top">Top</option>
                  <option value="new">Newest</option>
                  <option value="hot">Hot</option>
                </select>
                <button
                  onClick={refreshComments}
                  disabled={loadingComments}
                  className="px-3 py-1.5 bg-surface-hover hover:bg-border disabled:opacity-40 text-foreground rounded-lg text-sm transition-colors"
                >
                  {loadingComments ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <CommentSection
                title="YouTube Comments"
                platform="youtube"
                comments={youtubeComments}
                totalCount={youtubeCommentTotal}
                loading={loadingComments}
              />

              {selectedBilibili && (
                <CommentSection
                  title="Bilibili Comments"
                  platform="bilibili"
                  comments={bilibiliComments}
                  totalCount={bilibiliCommentTotal}
                  loading={loadingComments}
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold mb-3">
              Bilibili Reuploads ({match.bilibiliReuploads.length})
            </h2>

            {match.bilibiliReuploads.length === 0 ? (
              <p className="text-muted text-sm">No Bilibili reuploads found.</p>
            ) : (
              <div className="space-y-2">
                {match.bilibiliReuploads.map((reupload) => (
                  <BilibiliCard
                    key={reupload.video.bvid}
                    reupload={reupload}
                    isSelected={selectedBilibili === reupload.video.aid.toString()}
                    onSelect={() => setSelectedBilibili(reupload.video.aid.toString())}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-2">Match Info</h3>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-muted">Method</dt>
                <dd className="capitalize">{match.matchMethod}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Verified</dt>
                <dd>{match.verified ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentSection({
  title,
  platform,
  comments,
  totalCount,
  loading,
}: {
  title: string;
  platform: 'youtube' | 'bilibili';
  comments: (YouTubeComment | BilibiliComment)[];
  totalCount?: number;
  loading: boolean;
}) {
  const displayedCount = totalCount && totalCount > 0 ? totalCount : comments.length;
  const showingSubset = displayedCount > comments.length;

  return (
    <div>
      <h3 className="text-sm font-medium text-muted mb-3 flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            platform === 'youtube' ? 'bg-red-500' : 'bg-sky-500'
          }`}
        />
        {title} ({displayedCount.toLocaleString()}{showingSubset ? ` total, showing ${comments.length.toLocaleString()}` : ''})
      </h3>

      {loading ? (
        <div className="text-muted text-sm py-4">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-muted text-sm py-4">No comments available.</div>
      ) : (
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {comments.map((comment) => (
            <CommentCard key={getId(comment)} comment={comment} platform={platform} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentCard({
  comment,
  platform,
}: {
  comment: YouTubeComment | BilibiliComment;
  platform: 'youtube' | 'bilibili';
}) {
  const isYouTube = platform === 'youtube';
  const ytComment = isYouTube ? (comment as YouTubeComment) : null;
  const biliComment = !isYouTube ? (comment as BilibiliComment) : null;

  return (
    <div className="py-2.5">
      <div className="flex items-start gap-3">
        <img
          src={isYouTube ? ytComment!.authorProfileImageUrl : `/api/image?url=${encodeURIComponent(biliComment!.avatar)}`}
          alt=""
          className="w-8 h-8 rounded-full shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-xs truncate">
              {isYouTube ? ytComment!.authorDisplayName : biliComment!.uname}
            </span>
            <span className="text-xs text-muted shrink-0">
              {formatTimeAgo(isYouTube ? ytComment!.publishedAt : new Date(biliComment!.ctime * 1000).toISOString())}
            </span>
          </div>
          <p className="text-sm leading-relaxed break-words">
            {isYouTube ? ytComment!.textDisplay : biliComment!.message}
          </p>
          <div className="mt-1 text-xs text-muted">
            {formatLikeCount(isYouTube ? ytComment!.likeCount : biliComment!.like)} likes
          </div>
        </div>
      </div>
    </div>
  );
}

function BilibiliCard({
  reupload,
  isSelected,
  onSelect,
}: {
  reupload: VideoMatch['bilibiliReuploads'][0];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`p-2.5 rounded-xl cursor-pointer transition-colors ${
        isSelected
          ? 'bg-surface-hover'
          : 'hover:bg-surface'
      }`}
      onClick={onSelect}
    >
      <div className="flex gap-3">
        {reupload.video.thumbnailUrl && (
          <img
            src={`/api/image?url=${encodeURIComponent(reupload.video.thumbnailUrl)}`}
            alt=""
            className="w-[168px] h-[94px] object-cover rounded-lg shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium leading-snug line-clamp-2">
            {reupload.video.title}
          </h4>
          <p className="text-xs text-muted mt-1">
            {reupload.video.uploaderName}
          </p>
          <div className="flex gap-2 mt-0.5 text-xs text-muted">
            <span>{formatViewCount(reupload.video.viewCount)} views</span>
            <span>&middot;</span>
            <span>{reupload.video.commentCount} comments</span>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <a
              href={`https://www.bilibili.com/video/${reupload.video.bvid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:text-accent-hover"
              onClick={(e) => e.stopPropagation()}
            >
              Watch on Bilibili
            </a>
            <span className="text-xs text-muted">
              {Math.round(reupload.matchConfidence * 100)}% match
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getId(comment: YouTubeComment | BilibiliComment): string {
  if ('id' in comment) return comment.id;
  return `bili-${comment.rpid}`;
}

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function formatLikeCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
