import { NextRequest, NextResponse } from 'next/server';
import * as bilibili from '@/lib/bilibili';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const oid = searchParams.get('oid');
    const rootRpid = searchParams.get('root');
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (!oid || !rootRpid) {
      return NextResponse.json(
        { success: false, error: 'Missing oid or root parameter' },
        { status: 400 }
      );
    }

    const result = await bilibili.getCommentReplies(
      parseInt(oid, 10),
      parseInt(rootRpid, 10),
      page,
      20
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Replies fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
