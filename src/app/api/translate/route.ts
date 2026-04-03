import { NextResponse } from 'next/server';
import { z } from 'zod';
import { translateCommentText, type TranslationLanguage } from '@/lib/translation';

const translateRequestSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  targetLang: z.enum(['en', 'zh']),
});

export async function POST(request: Request) {
  try {
    const payload = translateRequestSchema.parse(await request.json());
    const result = await translateCommentText({
      text: payload.text,
      targetLang: payload.targetLang as TranslationLanguage,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message || 'Invalid translation request' },
        { status: 400 }
      );
    }

    console.error('Translation error:', error);

    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not configured') ? 503 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
