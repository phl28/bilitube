import { NextRequest, NextResponse } from 'next/server';
import * as bilibili from '@/lib/bilibili';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Missing search query' },
        { status: 400 }
      );
    }

    const videos = await bilibili.searchVideos(query, page, limit);

    return NextResponse.json({ success: true, data: videos });
  } catch (error) {
    console.error('Bilibili search error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
