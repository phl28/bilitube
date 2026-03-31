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
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  if (!match) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
            <iframe
              src={`https://www.youtube.com/embed/${match.youtubeVideo.id}`}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {match.youtubeVideo.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {match.youtubeVideo.channelTitle} • {formatViewCount(match.youtubeVideo.viewCount)} views
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Comments
            </h2>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              >
                <option value="top">Top</option>
                <option value="new">Newest</option>
                <option value="hot">Hot</option>
              </select>
              <button
                onClick={refreshComments}
                disabled={loadingComments}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm"
              >
                {loadingComments ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
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

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Bilibili Reuploads ({match.bilibiliReuploads.length})
          </h2>

          {match.bilibiliReuploads.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              No Bilibili reuploads found.
            </p>
          ) : (
            <div className="space-y-3">
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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Match Info
          </h3>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between">
              <dt className="text-gray-500">Method</dt>
              <dd className="text-gray-900 dark:text-white capitalize">{match.matchMethod}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Verified</dt>
              <dd className="text-gray-900 dark:text-white">{match.verified ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
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
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            platform === 'youtube' ? 'bg-red-500' : 'bg-blue-500'
          }`}
        />
        {title} ({displayedCount.toLocaleString()}{showingSubset ? ` total, showing ${comments.length.toLocaleString()}` : ''})
      </h3>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-gray-500 text-sm">No comments available.</div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
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
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex items-start gap-3">
        <img
          src={isYouTube ? ytComment!.authorProfileImageUrl : biliComment!.avatar}
          alt=""
          className="w-8 h-8 rounded-full"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {isYouTube ? ytComment!.authorDisplayName : biliComment!.uname}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimeAgo(isYouTube ? ytComment!.publishedAt : new Date(biliComment!.ctime * 1000).toISOString())}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
            {isYouTube ? ytComment!.textDisplay : biliComment!.message}
          </p>
          <div className="mt-1 text-xs text-gray-500">
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
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={onSelect}
    >
      <div className="flex gap-3">
        {reupload.video.thumbnailUrl && (
          <img
            src={`/api/image?url=${encodeURIComponent(reupload.video.thumbnailUrl)}`}
            alt=""
            className="w-24 h-14 object-cover rounded"
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {reupload.video.title}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {reupload.video.uploaderName}
          </p>
          <div className="flex gap-3 mt-1 text-xs text-gray-500">
            <span>{formatViewCount(reupload.video.viewCount)} views</span>
            <span>{reupload.video.commentCount} comments</span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <a
          href={`https://www.bilibili.com/video/${reupload.video.bvid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-700"
          onClick={(e) => e.stopPropagation()}
        >
          Watch on Bilibili →
        </a>
        <span className="text-xs text-gray-400">
          {Math.round(reupload.matchConfidence * 100)}% match
        </span>
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
