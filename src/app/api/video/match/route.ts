import { NextRequest, NextResponse } from 'next/server';
import * as youtube from '@/lib/youtube';
import { findBilibiliReuploads } from '@/lib/matching';
import { getVideoMatch, getVideoMatchByBilibiliId, saveVideoMatch } from '@/lib/db';

type SubmittedVideoInfo =
  | { platform: 'youtube'; videoId: string; playlistId: string | null }
  | { platform: 'bilibili'; bvid: string | null; aid: number | null };

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const youtubeId = searchParams.get('id');
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!youtubeId) {
      return NextResponse.json(
        { success: false, error: 'Missing youtube video id' },
        { status: 400 }
      );
    }

    const cached = await getVideoMatch(youtubeId);

    if (!forceRefresh) {
      if (cached && cached.bilibiliReuploads.length > 0) {
        return NextResponse.json({ success: true, data: cached });
      }
    }

    const youtubeVideo = await youtube.getVideoById(youtubeId);
    if (!youtubeVideo) {
      return NextResponse.json(
        { success: false, error: 'YouTube video not found' },
        { status: 404 }
      );
    }

    if (cached?.youtubeVideo.playlistId) {
      youtubeVideo.playlistId = cached.youtubeVideo.playlistId;
      youtubeVideo.playlistTitle = cached.youtubeVideo.playlistTitle;
    }

    const match = await findBilibiliReuploads(youtubeVideo);

    await saveVideoMatch(match);

    return NextResponse.json({ success: true, data: match });
  } catch (error) {
    console.error('Video match error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { youtubeUrl?: string; url?: string };
    const submittedUrl = body.youtubeUrl ?? body.url;

    if (!submittedUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing youtubeUrl' },
        { status: 400 }
      );
    }

    const submittedVideo = extractSubmittedVideoInfo(submittedUrl);
    if (!submittedVideo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid video URL. Please paste a full YouTube or Bilibili link.',
        },
        { status: 400 }
      );
    }

    if (submittedVideo.platform === 'bilibili') {
      const cached = await getVideoMatchByBilibiliId(submittedVideo);

      if (cached && cached.bilibiliReuploads.length > 0) {
        return NextResponse.json({ success: true, hasMatches: true, data: cached });
      }

      return NextResponse.json({
        success: true,
        hasMatches: false,
        message: 'No cached matches found for this Bilibili video yet.',
        data: null,
      });
    }

    const cached = await getVideoMatch(submittedVideo.videoId);
    if (!submittedVideo.playlistId && cached && cached.bilibiliReuploads.length > 0) {
      return NextResponse.json({ success: true, hasMatches: true, data: cached });
    }

    const youtubeVideo = await youtube.getVideoById(submittedVideo.videoId);
    if (!youtubeVideo) {
      return NextResponse.json(
        { success: false, error: 'YouTube video not found' },
        { status: 404 }
      );
    }

    if (submittedVideo.playlistId) {
      const playlistTitle = await youtube.getPlaylistTitleById(submittedVideo.playlistId);
      if (playlistTitle) {
        youtubeVideo.playlistId = submittedVideo.playlistId;
        youtubeVideo.playlistTitle = playlistTitle;
      }
    } else if (cached?.youtubeVideo.playlistId) {
      youtubeVideo.playlistId = cached.youtubeVideo.playlistId;
      youtubeVideo.playlistTitle = cached.youtubeVideo.playlistTitle;
    }

    const match = await findBilibiliReuploads(youtubeVideo);

    await saveVideoMatch(match);

    return NextResponse.json({
      success: true,
      hasMatches: match.bilibiliReuploads.length > 0,
      data: match,
    });
  } catch (error) {
    console.error('Video match error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function extractSubmittedVideoInfo(url: string): SubmittedVideoInfo | null {
  const youtubeInfo = extractYoutubeInfo(url);
  if (youtubeInfo) {
    return { platform: 'youtube', ...youtubeInfo };
  }

  const bilibiliInfo = extractBilibiliInfo(url);
  if (bilibiliInfo) {
    return { platform: 'bilibili', ...bilibiliInfo };
  }

  return null;
}

function extractYoutubeInfo(url: string): { videoId: string; playlistId: string | null } | null {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname === 'youtu.be') {
      const videoId = parsedUrl.pathname.slice(1, 12);
      return videoId ? { videoId, playlistId: parsedUrl.searchParams.get('list') } : null;
    }

    if (parsedUrl.hostname.includes('youtube.com')) {
      const videoId = parsedUrl.searchParams.get('v')
        || parsedUrl.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/)?.[1]
        || null;

      if (!videoId) {
        return null;
      }

      return { videoId, playlistId: parsedUrl.searchParams.get('list') };
    }
  } catch {
    return null;
  }

  return null;
}

function extractBilibiliInfo(url: string): { bvid: string | null; aid: number | null } | null {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (!hostname.endsWith('bilibili.com')) {
      return null;
    }

    const searchBvid = matchBvid(parsedUrl.searchParams.get('bvid'));
    const searchAid = parseAid(parsedUrl.searchParams.get('aid'));

    const videoPathMatch = parsedUrl.pathname.match(/\/video\/([^/?#]+)/i)?.[1] ?? null;
    const pathBvid = matchBvid(videoPathMatch);
    const pathAid = parseAid(videoPathMatch);

    const bvid = pathBvid ?? searchBvid;
    const aid = pathAid ?? searchAid;

    if (!bvid && aid == null) {
      return null;
    }

    return { bvid, aid };
  } catch {
    return null;
  }
}

function matchBvid(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.match(/^(BV[0-9A-Za-z]+)$/i)?.[1] ?? null;
}

function parseAid(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();
  const aidString = normalizedValue.match(/^av(\d+)$/i)?.[1]
    ?? normalizedValue.match(/^(\d+)$/)?.[1]
    ?? null;

  if (!aidString) {
    return null;
  }

  const aid = Number.parseInt(aidString, 10);
  return Number.isNaN(aid) ? null : aid;
}
