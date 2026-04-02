import { NextRequest, NextResponse } from 'next/server';
import * as youtube from '@/lib/youtube';
import * as bilibili from '@/lib/bilibili';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const youtubeId = searchParams.get('youtubeId');
    const bilibiliAid = searchParams.get('bilibiliAid');
    const pageSize = parseInt(searchParams.get('pageSize') || '100', 10);
    const sortBy = searchParams.get('sortBy') || 'top';
    const pageToken = searchParams.get('pageToken') || undefined;
    const bilibiliCursor = searchParams.get('bilibiliCursor') || undefined;

    const results: {
      youtube?: Awaited<ReturnType<typeof youtube.getVideoComments>>;
      bilibili?: Awaited<ReturnType<typeof bilibili.getVideoComments>>;
    } = {};

    if (youtubeId) {
      const youtubeSort = sortBy === 'new' ? 'time' : 'relevance';
      results.youtube = await youtube.getVideoComments(youtubeId, pageSize, pageToken, youtubeSort);
    }

    if (bilibiliAid) {
      const bilibiliMode: 2 | 3 = sortBy === 'new' ? 2 : 3;
      results.bilibili = await bilibili.getVideoComments(
        parseInt(bilibiliAid, 10),
        bilibiliMode,
        pageSize,
        bilibiliCursor
      );
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Comments fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
