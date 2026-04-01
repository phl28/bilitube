import { getRecentMatches } from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') || '12'), 50);

  try {
    const matches = await getRecentMatches(limit);

    return Response.json({
      success: true,
      data: matches,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: 'Failed to fetch recent matches' },
      { status: 500 }
    );
  }
}
