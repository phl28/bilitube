import { NextRequest, NextResponse } from 'next/server';
import * as youtube from '@/lib/youtube';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Missing search query' },
        { status: 400 }
      );
    }

    const videos = await youtube.searchVideos(query, limit);

    return NextResponse.json({ success: true, data: videos });
  } catch (error) {
    console.error('YouTube search error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
