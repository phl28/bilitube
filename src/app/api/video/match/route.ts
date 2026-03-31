import { NextRequest, NextResponse } from 'next/server';
import * as youtube from '@/lib/youtube';
import { findBilibiliReuploads } from '@/lib/matching';
import { getVideoMatch, saveVideoMatch } from '@/lib/db';

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
    const body = await request.json();
    const { youtubeUrl } = body;

    if (!youtubeUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing youtubeUrl' },
        { status: 400 }
      );
    }

    const youtubeInfo = extractYoutubeInfo(youtubeUrl);
    if (!youtubeInfo?.videoId) {
      return NextResponse.json(
        { success: false, error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    const cached = await getVideoMatch(youtubeInfo.videoId);
    if (!youtubeInfo.playlistId && cached && cached.bilibiliReuploads.length > 0) {
      return NextResponse.json({ success: true, data: cached });
    }

    const youtubeVideo = await youtube.getVideoById(youtubeInfo.videoId);
    if (!youtubeVideo) {
      return NextResponse.json(
        { success: false, error: 'YouTube video not found' },
        { status: 404 }
      );
    }

    if (youtubeInfo.playlistId) {
      const playlistTitle = await youtube.getPlaylistTitleById(youtubeInfo.playlistId);
      if (playlistTitle) {
        youtubeVideo.playlistId = youtubeInfo.playlistId;
        youtubeVideo.playlistTitle = playlistTitle;
      }
    } else if (cached?.youtubeVideo.playlistId) {
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

function extractYoutubeInfo(url: string): { videoId: string; playlistId: string | null } | null {
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return { videoId: url, playlistId: null };
  }

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
