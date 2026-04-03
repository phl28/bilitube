import type { VideoMatch, YouTubeVideo, YouTubeComment, BilibiliComment } from '@/types';

export const queryKeys = {
  recentMatches: () => ['recentMatches'] as const,
  videoInfo: (id: string) => ['videoInfo', id] as const,
  videoMatch: (id: string) => ['videoMatch', id] as const,
  youtubeComments: (id: string, sortBy: string) => ['youtubeComments', id, sortBy] as const,
  bilibiliComments: (aid: string, sortBy: string) => ['bilibiliComments', aid, sortBy] as const,
  bilibiliReplies: (oid: number, root: number) => ['bilibiliReplies', oid, root] as const,
};

export async function fetchRecentMatches(): Promise<VideoMatch[]> {
  const res = await fetch('/api/video/recent?limit=12');
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch recent matches');
  return data.data;
}

export async function fetchVideoInfo(id: string): Promise<YouTubeVideo> {
  const res = await fetch(`/api/video/info?id=${id}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch video info');
  return data.data;
}

export async function fetchVideoMatch(id: string): Promise<VideoMatch> {
  const res = await fetch(`/api/video/match?id=${id}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to load video');
  return data.data;
}

export interface YouTubeCommentsPage {
  comments: YouTubeComment[];
  nextPageToken?: string;
  totalCount: number;
}

export async function fetchYoutubeComments({
  id,
  sortBy,
  pageParam,
}: {
  id: string;
  sortBy: string;
  pageParam?: string;
}): Promise<YouTubeCommentsPage> {
  const p = new URLSearchParams();
  p.set('youtubeId', id);
  p.set('sortBy', sortBy);
  p.set('pageSize', '100');
  if (pageParam) p.set('pageToken', pageParam);

  const res = await fetch(`/api/video/comments?${p.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch YouTube comments');
  return {
    comments: data.data?.youtube?.comments || [],
    nextPageToken: data.data?.youtube?.nextPageToken,
    totalCount: data.data?.youtube?.totalCount || 0,
  };
}

export interface BilibiliCommentsPage {
  comments: BilibiliComment[];
  nextOffset?: string;
  hasMore: boolean;
  totalCount: number;
}

export async function fetchBilibiliComments({
  aid,
  sortBy,
  pageParam,
}: {
  aid: string;
  sortBy: string;
  pageParam?: string;
}): Promise<BilibiliCommentsPage> {
  const p = new URLSearchParams();
  p.set('bilibiliAid', aid);
  p.set('sortBy', sortBy);
  p.set('pageSize', '100');
  if (pageParam) p.set('bilibiliCursor', pageParam);

  const res = await fetch(`/api/video/comments?${p.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch Bilibili comments');
  return {
    comments: data.data?.bilibili?.comments || [],
    nextOffset: data.data?.bilibili?.nextOffset,
    hasMore: data.data?.bilibili?.hasMore ?? false,
    totalCount: data.data?.bilibili?.totalCount || 0,
  };
}

export interface BilibiliRepliesPage {
  comments: BilibiliComment[];
  hasMore: boolean;
  page: number;
}

export async function fetchBilibiliReplies({
  oid,
  root,
  pageParam,
}: {
  oid: number;
  root: number;
  pageParam: number;
}): Promise<BilibiliRepliesPage> {
  const p = new URLSearchParams();
  p.set('oid', oid.toString());
  p.set('root', root.toString());
  p.set('page', pageParam.toString());

  const res = await fetch(`/api/video/replies?${p.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch replies');
  return {
    comments: data.data?.comments || [],
    hasMore: data.data?.hasMore ?? false,
    page: pageParam,
  };
}
