import { NextRequest, NextResponse } from 'next/server';
import { addAdminCorrection } from '@/lib/db';

const ADMIN_KEY = process.env.ADMIN_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-admin-key');
    if (!ADMIN_KEY || authHeader !== ADMIN_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { youtubeId, bvid, action } = body;

    if (!youtubeId || !action || !['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
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
