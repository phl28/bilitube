import { NextRequest, NextResponse } from 'next/server';
import * as youtube from '@/lib/youtube';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('id');

  if (!videoId) {
    return NextResponse.json(
      { success: false, error: 'Missing video id' },
      { status: 400 }
    );
  }

  try {
    const video = await youtube.getVideoById(videoId);
    if (!video) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: video });
  } catch (error) {
    console.error('Video info error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
