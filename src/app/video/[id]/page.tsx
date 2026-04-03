'use client';

import { useState, useMemo, use } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { detectCommentLanguage } from '@/lib/comment-language';
import { VideoMatch, YouTubeVideo, YouTubeComment, BilibiliComment } from '@/types';
import {
  queryKeys,
  fetchVideoInfo,
  fetchVideoMatch,
  fetchYoutubeComments,
  fetchBilibiliComments,
  fetchBilibiliReplies,
} from '@/lib/queries';

interface VideoPageProps {
  params: Promise<{ id: string }>;
}

interface CommentThread<T> {
  comment: T;
  replies: T[];
  totalReplies: number;
}

type PlatformComment = YouTubeComment | BilibiliComment;
type PlatformCommentThread = CommentThread<PlatformComment>;

export default function VideoPage({ params }: VideoPageProps) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<'top' | 'new' | 'hot'>('top');
  const [selectedBilibili, setSelectedBilibili] = useState<string | null>(null);

  const { data: videoInfo } = useQuery({
    queryKey: queryKeys.videoInfo(id),
    queryFn: () => fetchVideoInfo(id),
  });

  const { data: match, isPending: matchLoading, error: matchError } = useQuery({
    queryKey: queryKeys.videoMatch(id),
    queryFn: () => fetchVideoMatch(id),
  });

  const activeBilibili = selectedBilibili ?? match?.bilibiliReuploads[0]?.video.aid.toString() ?? null;
  const youtubeVideo = videoInfo ?? match?.youtubeVideo ?? null;
  const error = matchError ? (matchError instanceof Error ? matchError.message : 'Failed to load video data') : '';

  const ytComments = useInfiniteQuery({
    queryKey: queryKeys.youtubeComments(id, sortBy),
    queryFn: ({ pageParam }) => fetchYoutubeComments({ id, sortBy, pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
  });

  const biliComments = useInfiniteQuery({
    queryKey: queryKeys.bilibiliComments(activeBilibili!, sortBy),
    queryFn: ({ pageParam }) => fetchBilibiliComments({ aid: activeBilibili!, sortBy, pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextOffset : undefined,
    enabled: !!activeBilibili,
  });

  const youtubeComments = useMemo(
    () => ytComments.data?.pages.flatMap((p) => p.comments) ?? [],
    [ytComments.data],
  );
  const bilibiliCommentsList = useMemo(
    () => biliComments.data?.pages.flatMap((p) => p.comments) ?? [],
    [biliComments.data],
  );
  const youtubeCommentTotal = ytComments.data?.pages[0]?.totalCount ?? 0;
  const bilibiliCommentTotal = biliComments.data?.pages[0]?.totalCount ?? 0;

  const loadingYoutubeComments = ytComments.isPending;
  const loadingBilibiliComments = biliComments.isPending;

  const youtubeThreads = useMemo(() => threadYoutubeComments(youtubeComments), [youtubeComments]);
  const bilibiliThreads = useMemo(() => threadBilibiliComments(bilibiliCommentsList), [bilibiliCommentsList]);

  const sortedReuploads = useMemo(() =>
    [...match?.bilibiliReuploads ?? []].sort((a, b) =>
      b.matchConfidence - a.matchConfidence
      || b.video.viewCount - a.video.viewCount
      || b.video.commentCount - a.video.commentCount
    ), [match?.bilibiliReuploads]);

  const isRefreshing = !matchLoading && (ytComments.isFetching || biliComments.isFetching);

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: queryKeys.youtubeComments(id, sortBy) });
    if (activeBilibili) {
      queryClient.invalidateQueries({ queryKey: queryKeys.bilibiliComments(activeBilibili, sortBy) });
    }
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-4">
      <div className="relative">
        <div className="lg:mr-[404px]">
          <div className="aspect-video bg-black rounded-xl overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${id}`}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>

        <div className="mt-4 lg:mt-0 lg:absolute lg:top-0 lg:right-0 lg:bottom-0 lg:w-[380px] flex flex-col">
          {error ? (
            <>
              <h2 className="text-base font-semibold mb-3 shrink-0">Bilibili Reuploads</h2>
              <p className="text-sm text-red-500">{error}</p>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold mb-3 shrink-0 flex items-center gap-2">
                Bilibili Reuploads ({matchLoading ? '...' : sortedReuploads.length})
                {matchLoading && (
                  <svg className="w-3.5 h-3.5 animate-spin text-muted" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )}
              </h2>

              {!matchLoading && sortedReuploads.length === 0 ? (
                <p className="text-muted text-sm">No Bilibili reuploads found.</p>
              ) : sortedReuploads.length > 0 ? (
                <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                  {sortedReuploads.map((reupload) => (
                    <BilibiliCard
                      key={reupload.video.bvid}
                      reupload={reupload}
                      isSelected={activeBilibili === reupload.video.aid.toString()}
                      onSelect={() => setSelectedBilibili(reupload.video.aid.toString())}
                    />
                  ))}
                </div>
              ) : null}

              {!matchLoading && match && (
                <div className="bg-surface rounded-xl p-4 mt-4 shrink-0">
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
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-3">
        {youtubeVideo ? (
          <>
            <h1 className="text-lg font-semibold leading-snug">
              {youtubeVideo.title}
            </h1>
            <p className="text-sm text-muted mt-1">
              {youtubeVideo.channelTitle} &middot; {formatViewCount(youtubeVideo.viewCount)} views
            </p>
          </>
        ) : (
          <>
            <div className="h-5 w-3/4 bg-surface-hover rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-surface-hover rounded animate-pulse mt-2" />
          </>
        )}
      </div>

      <div className="mt-6 border-t border-border pt-4">
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
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-surface-hover hover:bg-border disabled:opacity-40 text-foreground rounded-lg text-sm transition-colors"
            >
              {isRefreshing ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <ThreadedCommentSection
              title="YouTube Comments"
              platform="youtube"
              threads={youtubeThreads}
              totalCount={youtubeCommentTotal}
              loading={loadingYoutubeComments}
              hasMore={ytComments.hasNextPage}
              loadingMore={ytComments.isFetchingNextPage}
              onLoadMore={() => ytComments.fetchNextPage()}
            />
          </div>

          {activeBilibili && (
            <div>
              <ThreadedCommentSection
                title="Bilibili Comments"
                platform="bilibili"
                threads={bilibiliThreads}
                totalCount={bilibiliCommentTotal}
                loading={loadingBilibiliComments}
                hasMore={biliComments.hasNextPage}
                loadingMore={biliComments.isFetchingNextPage}
                onLoadMore={() => biliComments.fetchNextPage()}
              />
            </div>
          )}
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
            {(threads as PlatformCommentThread[]).map((thread) => (
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
  thread: PlatformCommentThread;
  platform: 'youtube' | 'bilibili';
}) {
  const [showReplies, setShowReplies] = useState(false);

  const needsFetch = platform === 'bilibili' && thread.totalReplies > thread.replies.length;
  const biliComment = platform === 'bilibili' ? (thread.comment as BilibiliComment) : null;

  const repliesQuery = useInfiniteQuery({
    queryKey: queryKeys.bilibiliReplies(biliComment?.oid ?? 0, biliComment?.rpid ?? 0),
    queryFn: ({ pageParam }) =>
      fetchBilibiliReplies({ oid: biliComment!.oid, root: biliComment!.rpid, pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled: showReplies && needsFetch,
  });

  const fetchedReplies = useMemo(
    () => repliesQuery.data?.pages.flatMap((p) => p.comments) ?? [],
    [repliesQuery.data],
  );

  const displayReplies = (showReplies && needsFetch && repliesQuery.data) ? fetchedReplies : thread.replies;
  const hasReplies = thread.totalReplies > 0 || thread.replies.length > 0;
  const hiddenCount = thread.totalReplies - displayReplies.length;

  return (
    <div className="py-2.5">
      <SingleComment comment={thread.comment} platform={platform} />

      {hasReplies && (
        <div className="ml-11 mt-1">
          {!showReplies ? (
            <button
              onClick={() => setShowReplies(true)}
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
                {repliesQuery.isPending && needsFetch ? (
                  <p className="text-xs text-muted py-2">Loading replies...</p>
                ) : (
                  displayReplies.map((reply) => (
                    <SingleComment
                      key={platform === 'youtube' ? (reply as YouTubeComment).id : `bili-${(reply as BilibiliComment).rpid}`}
                      comment={reply}
                      platform={platform}
                      isReply
                    />
                  ))
                )}
                {platform === 'bilibili' && repliesQuery.hasNextPage && (
                  <button
                    onClick={() => repliesQuery.fetchNextPage()}
                    disabled={repliesQuery.isFetchingNextPage}
                    className="text-xs font-medium text-accent hover:text-accent-hover py-2 disabled:opacity-40"
                  >
                    {repliesQuery.isFetchingNextPage ? 'Loading...' : `Show more replies`}
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
  const originalText = isYouTube ? ytComment!.textOriginal : biliComment!.message;
  const detectedLanguage = detectCommentLanguage(originalText);
  const sourceLanguage = detectedLanguage ?? (isYouTube ? 'en' : 'zh');
  const targetLang = sourceLanguage === 'zh' ? 'en' : 'zh';
  const translateButtonLabel = targetLang === 'zh' ? 'Show Chinese' : 'Show English';

  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationError, setTranslationError] = useState(false);

  async function handleTranslate() {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    if (translatedText) {
      setShowTranslation(true);
      return;
    }

    setIsTranslating(true);
    setTranslationError(false);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalText, targetLang }),
      });
      const data = await res.json();

      if (data.success && data.data?.translatedText) {
        setTranslatedText(data.data.translatedText);
        setShowTranslation(true);
      } else {
        setTranslationError(true);
      }
    } catch (err) {
      setTranslationError(true);
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <div className={`py-2 ${isReply ? '' : ''}`}>
      <div className="flex items-start gap-3">
        <img
          src={proxyImageUrl(isYouTube ? ytComment!.authorProfileImageUrl : biliComment!.avatar)}
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
            showTranslation && translatedText ? (
              <p className={`leading-relaxed break-words ${isReply ? 'text-xs' : 'text-sm'}`}>
                {translatedText}
              </p>
            ) : (
              <div
                className={`leading-relaxed break-words [&_a]:text-accent [&_a]:hover:underline ${isReply ? 'text-xs' : 'text-sm'}`}
                dangerouslySetInnerHTML={{ __html: ytComment!.textDisplay }}
              />
            )
          ) : (
            <div className={`leading-relaxed break-words ${isReply ? 'text-xs' : 'text-sm'}`}>
              <div className="whitespace-pre-wrap">
                {showTranslation && translatedText
                  ? translatedText
                  : renderBilibiliText(biliComment!.message, biliComment!.emotes)}
              </div>
              {biliComment!.pictures.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {biliComment!.pictures.map((picture, index) => (
                    <a
                      key={`${picture.imgSrc}-${index}`}
                      href={picture.imgSrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={proxyImageUrl(picture.imgSrc)}
                        alt={`Comment attachment ${index + 1}`}
                        className="max-w-[160px] max-h-[160px] rounded-lg object-cover border border-border"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className={`mt-1 flex items-center gap-3 text-muted ${isReply ? 'text-[11px]' : 'text-xs'}`}>
            <span>{formatLikeCount(isYouTube ? ytComment!.likeCount : biliComment!.like)} likes</span>
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className="hover:text-foreground transition-colors disabled:opacity-50"
            >
              {isTranslating ? 'Translating...' : showTranslation ? 'Show original' : translateButtonLabel}
            </button>
            {translationError && <span className="text-red-500">Translation failed</span>}
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

function proxyImageUrl(url: string): string {
  return `/api/image?url=${encodeURIComponent(url)}`;
}

function renderBilibiliText(text: string, emotes: BilibiliComment['emotes']) {
  if (!emotes || Object.keys(emotes).length === 0) {
    return <>{text}</>;
  }

  const parts = text.split(/(\[.*?\])/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          const emote = emotes[part];
          if (emote?.url) {
            return (
              <img
                key={i}
                src={proxyImageUrl(emote.url)}
                alt={emote.text}
                className="inline-block h-6 w-auto align-middle mx-0.5"
                title={emote.text}
              />
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
