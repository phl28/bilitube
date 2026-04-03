import { BilibiliVideo, BilibiliComment } from '@/types';
import { signParams, getBuvid3 } from './wbi';

const BILIBILI_API_BASE = 'https://api.bilibili.com';

interface BilibiliSearchResponse {
  code: number;
  message: string;
  data: {
    numPages: number;
    numResults: number;
    page: number;
    pagesize: number;
    result: BilibiliSearchResult[];
    v_voucher?: string;
  };
}

interface BilibiliSearchResult {
  bvid: string;
  aid: number;
  title: string;
  description: string;
  mid: number;
  author: string;
  pic: string;
  duration: string;
  play: number;
  danmaku: number;
  review: number;
  favorites: number;
  like: number;
  pubdate: number;
}

interface BilibiliCommentsResponse {
  code: number;
  message: string;
  data: {
    cursor: {
      is_end: boolean;
      all_count: number;
      pagination_reply?: {
        next_offset: string;
      };
    };
    replies: BilibiliRawComment[] | null;
  };
}

interface BilibiliRawComment {
  rpid: number;
  oid: number;
  mid: number;
  like: number;
  ctime: number;
  parent: number;
  rcount: number;
  member: {
    uname: string;
    avatar: string;
  };
  content: {
    message: string;
  };
  replies?: BilibiliRawComment[];
}

interface BilibiliVideoInfoResponse {
  code: number;
  message: string;
  data: {
    bvid: string;
    aid: number;
    title: string;
    desc: string;
    duration: number;
    owner: {
      mid: number;
      name: string;
    };
    pic: string;
    stat: {
      view: number;
      danmaku: number;
      reply: number;
      favorite: number;
      coin: number;
      share: number;
      like: number;
    };
    pubdate: number;
  };
}

async function getHeaders(cookie?: string, includeCookie = true) {
  const buvid3 = await getBuvid3();

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.bilibili.com',
    'Origin': 'https://www.bilibili.com',
    'Accept': 'application/json',
  };

  if (includeCookie) {
    headers.Cookie = cookie || `buvid3=${buvid3}`;
  }

  return headers;
}

export async function searchVideos(
  keyword: string,
  page = 1,
  pageSize = 20,
  order: 'totalrank' | 'click' | 'pubdate' | 'dm' | 'stow' = 'totalrank'
): Promise<BilibiliVideo[]> {
  try {
    const baseParams = {
      search_type: 'video',
      keyword,
      page: page.toString(),
      page_size: pageSize.toString(),
      order,
    };

    const signedParams = await signParams(baseParams);
    const signedUrl = new URL('/x/web-interface/wbi/search/type', BILIBILI_API_BASE);
    for (const [key, value] of Object.entries(signedParams)) {
      signedUrl.searchParams.set(key, value);
    }

    const headers = await getHeaders();
    const signedResponse = await fetch(signedUrl.toString(), {
      headers,
      next: { revalidate: 60 },
    });

    if (!signedResponse.ok) {
      console.error('Bilibili signed search failed:', signedResponse.status);
      return await searchVideosUnsigned(baseParams, headers);
    }

    const signedData: BilibiliSearchResponse = await signedResponse.json();
    const signedResults = normalizeSearchResults(signedData);

    if (signedResults) {
      return signedResults.map(parseSearchResult);
    }

    console.warn('Bilibili signed search returned unexpected payload', {
      code: signedData?.code,
      message: signedData?.message,
      hasData: Boolean(signedData?.data),
      dataKeys: signedData?.data ? Object.keys(signedData.data) : [],
    });

    return await searchVideosUnsigned(baseParams, headers);
  } catch (error) {
    console.error('Failed to search Bilibili:', error);
    return [];
  }
}

async function searchVideosUnsigned(
  params: Record<string, string>,
  headers: Record<string, string>
): Promise<BilibiliVideo[]> {
  try {
    const url = new URL('/x/web-interface/search/type', BILIBILI_API_BASE);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), {
      headers,
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Bilibili unsigned search failed:', response.status);
      return [];
    }

    const data: BilibiliSearchResponse = await response.json();

    const results = normalizeSearchResults(data);
    if (results) {
      return results.map(parseSearchResult);
    }

    if (data?.code !== 0) {
      console.error('Bilibili unsigned search error:', data?.code, data?.message);
      return [];
    }

    console.warn('Bilibili unsigned search returned unexpected payload', {
      code: data?.code,
      message: data?.message,
      hasData: Boolean(data?.data),
      dataKeys: data?.data ? Object.keys(data.data) : [],
    });

    return [];
  } catch (error) {
    console.error('Failed unsigned Bilibili search:', error);
    return [];
  }
}

function normalizeSearchResults(data: BilibiliSearchResponse | null | undefined): BilibiliSearchResult[] | null {
  if (data?.code !== 0 || !data?.data) {
    return null;
  }

  if (Array.isArray(data.data.result)) {
    return data.data.result;
  }

  return null;
}

export async function getVideoByBvid(bvid: string): Promise<BilibiliVideo | null> {
  try {
    const url = new URL('/x/web-interface/view', BILIBILI_API_BASE);
    url.searchParams.set('bvid', bvid);

    const response = await fetch(url.toString(), {
      headers: await getHeaders(),
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;

    const data: BilibiliVideoInfoResponse = await response.json();

    if (data.code !== 0) return null;

    return parseVideoInfo(data.data);
  } catch (error) {
    console.error('Failed to fetch Bilibili video:', error);
    return null;
  }
}

export async function getVideoByAid(aid: number): Promise<BilibiliVideo | null> {
  try {
    const url = new URL('/x/web-interface/view', BILIBILI_API_BASE);
    url.searchParams.set('aid', aid.toString());

    const response = await fetch(url.toString(), {
      headers: await getHeaders(),
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;

    const data: BilibiliVideoInfoResponse = await response.json();

    if (data.code !== 0) return null;

    return parseVideoInfo(data.data);
  } catch (error) {
    console.error('Failed to fetch Bilibili video:', error);
    return null;
  }
}

export async function getVideoComments(
  aid: number,
  mode: 2 | 3 = 3,
  pageSize = 20,
  nextOffset?: string
): Promise<{ comments: BilibiliComment[]; hasMore: boolean; totalCount: number; nextOffset?: string }> {
  try {
    const safePageSize = Math.min(Math.max(pageSize, 1), 30);
    const url = new URL('/x/v2/reply/main', BILIBILI_API_BASE);
    url.searchParams.set('oid', aid.toString());
    url.searchParams.set('type', '1');
    url.searchParams.set('mode', mode.toString());
    url.searchParams.set('ps', safePageSize.toString());

    if (nextOffset) {
      url.searchParams.set('pagination_str', JSON.stringify({ offset: nextOffset }));
    }

    const headers = await getHeaders(undefined, false);
    const response = await fetch(url.toString(), {
      headers,
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return { comments: [], hasMore: false, totalCount: 0 };
    }

    const data: BilibiliCommentsResponse = await response.json();

    if (data.code !== 0) {
      return { comments: [], hasMore: false, totalCount: 0 };
    }

    const comments = (data.data.replies || []).flatMap(flattenReplies);
    const totalCount = data.data.cursor.all_count || comments.length;

    return {
      comments,
      hasMore: !data.data.cursor.is_end,
      totalCount,
      nextOffset: data.data.cursor.pagination_reply?.next_offset,
    };
  } catch (error) {
    console.error('Failed to fetch Bilibili comments:', error);
    return { comments: [], hasMore: false, totalCount: 0 };
  }
}

export async function getCommentReplies(
  oid: number,
  rootRpid: number,
  page = 1,
  pageSize = 20
): Promise<{ comments: BilibiliComment[]; hasMore: boolean }> {
  try {
    const safePageSize = Math.min(Math.max(pageSize, 1), 20);
    const url = new URL('/x/v2/reply/reply', BILIBILI_API_BASE);
    url.searchParams.set('oid', oid.toString());
    url.searchParams.set('type', '1');
    url.searchParams.set('root', rootRpid.toString());
    url.searchParams.set('pn', page.toString());
    url.searchParams.set('ps', safePageSize.toString());

    const headers = await getHeaders(undefined, false);
    const response = await fetch(url.toString(), {
      headers,
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return { comments: [], hasMore: false };
    }

    const data = await response.json();

    if (data.code !== 0 || !data.data) {
      return { comments: [], hasMore: false };
    }

    const replies: BilibiliComment[] = (data.data.replies || []).map(parseComment);
    const total = data.data.page?.count || 0;

    return {
      comments: replies,
      hasMore: page * safePageSize < total,
    };
  } catch (error) {
    console.error('Failed to fetch Bilibili comment replies:', error);
    return { comments: [], hasMore: false };
  }
}

function flattenReplies(comment: BilibiliRawComment): BilibiliComment[] {
  const result: BilibiliComment[] = [parseComment(comment)];
  if (comment.replies) {
    for (const reply of comment.replies) {
      result.push(...flattenReplies(reply));
    }
  }
  return result;
}

function parseSearchResult(item: BilibiliSearchResult): BilibiliVideo {
  const durationParts = item.duration.split(':');
  const durationSeconds = durationParts.length === 2
    ? parseInt(durationParts[0], 10) * 60 + parseInt(durationParts[1], 10)
    : durationParts.length === 3
      ? parseInt(durationParts[0], 10) * 3600 + parseInt(durationParts[1], 10) * 60 + parseInt(durationParts[2], 10)
      : 0;

  return {
    bvid: item.bvid,
    aid: item.aid,
    title: item.title.replace(/<[^>]*>/g, ''),
    description: item.description,
    uploaderMid: item.mid,
    uploaderName: item.author,
    thumbnailUrl: item.pic.startsWith('//') ? `https:${item.pic}` : item.pic,
    durationSeconds,
    viewCount: item.play,
    commentCount: item.review,
    likeCount: item.like,
    publishedAtTimestamp: item.pubdate,
  };
}

function parseVideoInfo(data: BilibiliVideoInfoResponse['data']): BilibiliVideo {
  return {
    bvid: data.bvid,
    aid: data.aid,
    title: data.title,
    description: data.desc,
    uploaderMid: data.owner.mid,
    uploaderName: data.owner.name,
    thumbnailUrl: data.pic.startsWith('//') ? `https:${data.pic}` : data.pic,
    durationSeconds: data.duration,
    viewCount: data.stat.view,
    commentCount: data.stat.reply,
    likeCount: data.stat.like,
    publishedAtTimestamp: data.pubdate,
  };
}

function parseComment(comment: BilibiliRawComment): BilibiliComment {
  const avatar = comment.member?.avatar || '';

  return {
    rpid: comment.rpid,
    oid: comment.oid,
    mid: comment.mid,
    uname: comment.member?.uname || '',
    avatar: avatar.startsWith('//') ? `https:${avatar}` : avatar,
    message: comment.content?.message || '',
    like: comment.like,
    ctime: comment.ctime,
    parent: comment.parent,
    rcount: comment.rcount,
  };
}
