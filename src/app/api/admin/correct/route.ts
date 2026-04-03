import { NextRequest, NextResponse } from 'next/server';
import { addAdminCorrection, addBilibiliReupload, removeBilibiliReupload } from '@/lib/db';
import { getVideoByBvid } from '@/lib/bilibili/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { youtubeId, bvid, action } = body;

    if (!youtubeId || !action || !['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (action === 'add') {
      if (!bvid) {
        return NextResponse.json(
          { success: false, error: 'BV ID is required when adding a match' },
          { status: 400 }
        );
      }

      const bilibiliVideo = await getVideoByBvid(bvid);
      if (!bilibiliVideo) {
        return NextResponse.json(
          { success: false, error: 'Bilibili video not found' },
          { status: 404 }
        );
      }

      await addBilibiliReupload(youtubeId, bilibiliVideo);
    } else {
      await removeBilibiliReupload(youtubeId, bvid || null);
    }

    await addAdminCorrection(youtubeId, bvid || null, action);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin correction error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
