import { NextRequest, NextResponse } from 'next/server';
import * as youtube from '@/lib/youtube';
import * as bilibili from '@/lib/bilibili';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const youtubeId = searchParams.get('youtubeId');
    const bilibiliAid = searchParams.get('bilibiliAid');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const sortBy = searchParams.get('sortBy') || 'top';

    const results: {
      youtube?: Awaited<ReturnType<typeof youtube.getVideoComments>>;
      bilibili?: Awaited<ReturnType<typeof bilibili.getVideoComments>>;
    } = {};

    if (youtubeId) {
      const youtubeSort = sortBy === 'new' ? 'time' : 'relevance';
      results.youtube = await youtube.getVideoComments(youtubeId, pageSize, undefined, youtubeSort);
    }

    if (bilibiliAid) {
      const bilibiliSort = sortBy === 'new' ? 1 : sortBy === 'hot' ? 0 : 2;
      results.bilibili = await bilibili.getVideoComments(
        parseInt(bilibiliAid, 10),
        page,
        pageSize,
        bilibiliSort
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
