'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { VideoMatch, YouTubeComment, BilibiliComment } from '@/types';

interface VideoPageProps {
  params: Promise<{ id: string }>;
}

interface CommentThread<T> {
  comment: T;
  replies: T[];
  totalReplies: number;
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
  const [youtubeNextPage, setYoutubeNextPage] = useState<string | undefined>();
  const [bilibiliPage, setBilibiliPage] = useState(1);
  const [bilibiliHasMore, setBilibiliHasMore] = useState(false);
  const [selectedBilibili, setSelectedBilibili] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMore, setLoadingMore] = useState<'youtube' | 'bilibili' | null>(null);

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
    setYoutubeComments([]);
    setBilibiliComments([]);
    setYoutubeNextPage(undefined);
    setBilibiliPage(1);
    setBilibiliHasMore(false);

    try {
      const p = new URLSearchParams();
      p.set('youtubeId', match.youtubeVideo.id);
      if (selectedBilibili) {
        p.set('bilibiliAid', selectedBilibili);
      }
      p.set('sortBy', sortBy);
      p.set('pageSize', '100');

      const response = await fetch(`/api/video/comments?${p.toString()}`);
      const data = await response.json();

      if (data.success && data.data) {
        setYoutubeComments(data.data.youtube?.comments || []);
        setBilibiliComments(data.data.bilibili?.comments || []);
        setYoutubeCommentTotal(data.data.youtube?.totalCount || 0);
        setBilibiliCommentTotal(data.data.bilibili?.totalCount || 0);
        setYoutubeNextPage(data.data.youtube?.nextPageToken);
        setBilibiliHasMore(data.data.bilibili?.hasMore ?? false);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoadingComments(false);
    }
  }

  async function loadMoreYoutube() {
    if (!match || !youtubeNextPage || loadingMore) return;
    setLoadingMore('youtube');
    try {
      const p = new URLSearchParams();
      p.set('youtubeId', match.youtubeVideo.id);
      p.set('sortBy', sortBy);
      p.set('pageSize', '100');
      p.set('pageToken', youtubeNextPage);

      const response = await fetch(`/api/video/comments?${p.toString()}`);
      const data = await response.json();

      if (data.success && data.data?.youtube) {
        setYoutubeComments((prev) => [...prev, ...data.data.youtube.comments]);
        setYoutubeNextPage(data.data.youtube.nextPageToken);
      }
    } catch (err) {
      console.error('Failed to load more YouTube comments:', err);
    } finally {
      setLoadingMore(null);
    }
  }

  async function loadMoreBilibili() {
    if (!match || !selectedBilibili || !bilibiliHasMore || loadingMore) return;
    const nextPage = bilibiliPage + 1;
    setLoadingMore('bilibili');
    try {
      const p = new URLSearchParams();
      p.set('bilibiliAid', selectedBilibili);
      p.set('sortBy', sortBy);
      p.set('page', nextPage.toString());

      const response = await fetch(`/api/video/comments?${p.toString()}`);
      const data = await response.json();

      if (data.success && data.data?.bilibili) {
        setBilibiliComments((prev) => [...prev, ...data.data.bilibili.comments]);
        setBilibiliPage(nextPage);
        setBilibiliHasMore(data.data.bilibili.hasMore ?? false);
      }
    } catch (err) {
      console.error('Failed to load more Bilibili comments:', err);
    } finally {
      setLoadingMore(null);
    }
  }

  const youtubeThreads = useMemo(() => threadYoutubeComments(youtubeComments), [youtubeComments]);
  const bilibiliThreads = useMemo(() => threadBilibiliComments(bilibiliComments), [bilibiliComments]);

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
    <div className="max-w-[1280px] mx-auto px-6 py-4">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-3">
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
                  onClick={() => fetchComments()}
                  disabled={loadingComments}
                  className="px-3 py-1.5 bg-surface-hover hover:bg-border disabled:opacity-40 text-foreground rounded-lg text-sm transition-colors"
                >
                  {loadingComments ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <ThreadedCommentSection
                title="YouTube Comments"
                platform="youtube"
                threads={youtubeThreads}
                totalCount={youtubeCommentTotal}
                loading={loadingComments}
                hasMore={!!youtubeNextPage}
                loadingMore={loadingMore === 'youtube'}
                onLoadMore={loadMoreYoutube}
              />

              {selectedBilibili && (
                <ThreadedCommentSection
                  title="Bilibili Comments"
                  platform="bilibili"
                  threads={bilibiliThreads}
                  totalCount={bilibiliCommentTotal}
                  loading={loadingComments}
                  hasMore={bilibiliHasMore}
                  loadingMore={loadingMore === 'bilibili'}
                  onLoadMore={loadMoreBilibili}
                />
              )}
            </div>
          </div>
        </div>

        <div className="lg:w-[380px] shrink-0 space-y-4">
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

function threadYoutubeComments(comments: YouTubeComment[]): CommentThread<YouTubeComment>[] {
  const topLevel: YouTubeComment[] = [];
  const repliesByParent = new Map<string, YouTubeComment[]>();

  for (const c of comments) {
    if (!c.parentId) {
      topLevel.push(c);
    } else {
      const list = repliesByParent.get(c.parentId) || [];
      list.push(c);
      repliesByParent.set(c.parentId, list);
    }
  }

  return topLevel.map((c) => {
    const replies = repliesByParent.get(c.id) || [];
    return { comment: c, replies, totalReplies: replies.length };
  });
}

function threadBilibiliComments(comments: BilibiliComment[]): CommentThread<BilibiliComment>[] {
  const topLevel: BilibiliComment[] = [];
  const repliesByParent = new Map<number, BilibiliComment[]>();

  for (const c of comments) {
    if (c.parent === 0) {
      topLevel.push(c);
    } else {
      const list = repliesByParent.get(c.parent) || [];
      list.push(c);
      repliesByParent.set(c.parent, list);
    }
  }

  return topLevel.map((c) => {
    const replies = repliesByParent.get(c.rpid) || [];
    return { comment: c, replies, totalReplies: c.rcount };
  });
}

function ThreadedCommentSection({
  title,
  platform,
  threads,
  totalCount,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  title: string;
  platform: 'youtube' | 'bilibili';
  threads: CommentThread<YouTubeComment>[] | CommentThread<BilibiliComment>[];
  totalCount?: number;
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const commentCount = totalCount && totalCount > 0 ? totalCount : threads.length;

  return (
    <div>
      <h3 className="text-sm font-medium text-muted mb-3 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${platform === 'youtube' ? 'bg-red-500' : 'bg-sky-500'}`} />
        {title} ({commentCount.toLocaleString()})
      </h3>

      {loading ? (
        <div className="text-muted text-sm py-4">Loading comments...</div>
      ) : threads.length === 0 ? (
        <div className="text-muted text-sm py-4">No comments available.</div>
      ) : (
        <div>
          <div className="space-y-0">
            {(threads as CommentThread<any>[]).map((thread) => (
              <CommentThreadView
                key={platform === 'youtube' ? (thread.comment as YouTubeComment).id : `bili-${(thread.comment as BilibiliComment).rpid}`}
                thread={thread}
                platform={platform}
              />
            ))}
          </div>
          {hasMore && (
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="mt-3 w-full py-2.5 text-sm font-medium text-accent hover:text-accent-hover disabled:opacity-40 transition-colors rounded-lg hover:bg-surface-hover"
            >
              {loadingMore ? 'Loading more...' : 'Show more comments'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CommentThreadView({
  thread,
  platform,
}: {
  thread: CommentThread<any>;
  platform: 'youtube' | 'bilibili';
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [fetchedReplies, setFetchedReplies] = useState<any[]>([]);
  const [repliesPage, setRepliesPage] = useState(1);
  const [repliesHasMore, setRepliesHasMore] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [hasFetchedAll, setHasFetchedAll] = useState(false);

  const displayReplies = hasFetchedAll ? fetchedReplies : thread.replies;
  const hasReplies = thread.totalReplies > 0 || thread.replies.length > 0;
  const hiddenCount = thread.totalReplies - displayReplies.length;

  async function fetchAllReplies() {
    if (platform !== 'bilibili' || loadingReplies) return;
    const biliComment = thread.comment as BilibiliComment;
    setLoadingReplies(true);
    try {
      const p = new URLSearchParams();
      p.set('oid', biliComment.oid.toString());
      p.set('root', biliComment.rpid.toString());
      p.set('page', '1');

      const response = await fetch(`/api/video/replies?${p.toString()}`);
      const data = await response.json();

      if (data.success && data.data) {
        setFetchedReplies(data.data.comments);
        setRepliesHasMore(data.data.hasMore);
        setRepliesPage(1);
        setHasFetchedAll(true);
      }
    } catch (err) {
      console.error('Failed to fetch replies:', err);
    } finally {
      setLoadingReplies(false);
    }
  }

  async function loadMoreReplies() {
    if (platform !== 'bilibili' || loadingReplies) return;
    const biliComment = thread.comment as BilibiliComment;
    const nextPage = repliesPage + 1;
    setLoadingReplies(true);
    try {
      const p = new URLSearchParams();
      p.set('oid', biliComment.oid.toString());
      p.set('root', biliComment.rpid.toString());
      p.set('page', nextPage.toString());

      const response = await fetch(`/api/video/replies?${p.toString()}`);
      const data = await response.json();

      if (data.success && data.data) {
        setFetchedReplies((prev) => [...prev, ...data.data.comments]);
        setRepliesHasMore(data.data.hasMore);
        setRepliesPage(nextPage);
      }
    } catch (err) {
      console.error('Failed to load more replies:', err);
    } finally {
      setLoadingReplies(false);
    }
  }

  return (
    <div className="py-2.5">
      <SingleComment comment={thread.comment} platform={platform} />

      {hasReplies && (
        <div className="ml-11 mt-1">
          {!showReplies ? (
            <button
              onClick={() => {
                setShowReplies(true);
                if (platform === 'bilibili' && thread.totalReplies > thread.replies.length && !hasFetchedAll) {
                  fetchAllReplies();
                }
              }}
              className="text-xs font-medium text-accent hover:text-accent-hover py-1"
            >
              {thread.totalReplies > 0 ? thread.totalReplies : thread.replies.length} {thread.totalReplies === 1 ? 'reply' : 'replies'}
            </button>
          ) : (
            <div>
              <button
                onClick={() => setShowReplies(false)}
                className="text-xs font-medium text-accent hover:text-accent-hover py-1 mb-1"
              >
                Hide replies
              </button>
              <div className="space-y-0 border-l-2 border-border pl-4">
                {loadingReplies && displayReplies.length === 0 ? (
                  <p className="text-xs text-muted py-2">Loading replies...</p>
                ) : (
                  displayReplies.map((reply: any) => (
                    <SingleComment
                      key={platform === 'youtube' ? reply.id : `bili-${reply.rpid}`}
                      comment={reply}
                      platform={platform}
                      isReply
                    />
                  ))
                )}
                {platform === 'bilibili' && hasFetchedAll && repliesHasMore && (
                  <button
                    onClick={loadMoreReplies}
                    disabled={loadingReplies}
                    className="text-xs font-medium text-accent hover:text-accent-hover py-2 disabled:opacity-40"
                  >
                    {loadingReplies ? 'Loading...' : `Show more replies`}
                  </button>
                )}
                {platform === 'youtube' && hiddenCount > 0 && (
                  <p className="text-xs text-muted py-2">
                    View all replies on YouTube
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SingleComment({
  comment,
  platform,
  isReply = false,
}: {
  comment: YouTubeComment | BilibiliComment;
  platform: 'youtube' | 'bilibili';
  isReply?: boolean;
}) {
  const isYouTube = platform === 'youtube';
  const ytComment = isYouTube ? (comment as YouTubeComment) : null;
  const biliComment = !isYouTube ? (comment as BilibiliComment) : null;

  return (
    <div className={`py-2 ${isReply ? '' : ''}`}>
      <div className="flex items-start gap-3">
        <img
          src={isYouTube ? ytComment!.authorProfileImageUrl : `/api/image?url=${encodeURIComponent(biliComment!.avatar)}`}
          alt=""
          className={`rounded-full shrink-0 ${isReply ? 'w-6 h-6' : 'w-8 h-8'}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`font-medium truncate ${isReply ? 'text-[11px]' : 'text-xs'}`}>
              {isYouTube ? ytComment!.authorDisplayName : biliComment!.uname}
            </span>
            <span className={`text-muted shrink-0 ${isReply ? 'text-[11px]' : 'text-xs'}`}>
              {formatTimeAgo(isYouTube ? ytComment!.publishedAt : new Date(biliComment!.ctime * 1000).toISOString())}
            </span>
          </div>
          {isYouTube ? (
            <div
              className={`leading-relaxed break-words [&_a]:text-accent [&_a]:hover:underline ${isReply ? 'text-xs' : 'text-sm'}`}
              dangerouslySetInnerHTML={{ __html: ytComment!.textDisplay }}
            />
          ) : (
            <p className={`leading-relaxed break-words ${isReply ? 'text-xs' : 'text-sm'}`}>
              {biliComment!.message}
            </p>
          )}
          <div className={`mt-1 text-muted ${isReply ? 'text-[11px]' : 'text-xs'}`}>
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
