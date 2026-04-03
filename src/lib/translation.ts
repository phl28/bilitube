import { createHash, randomUUID } from 'crypto';
import { getCommentTranslation, saveCommentTranslation } from '@/lib/db';
import { detectCommentLanguage, type TranslationLanguage } from '@/lib/comment-language';

export type { TranslationLanguage } from '@/lib/comment-language';

export interface TranslationResult {
  translatedText: string;
  sourceLang: TranslationLanguage;
  targetLang: TranslationLanguage;
  provider: 'azure-translator' | 'none';
  cached: boolean;
}

const AZURE_LANGUAGE_CODES: Record<TranslationLanguage, string> = {
  en: 'en',
  zh: 'zh-Hans',
};

const TRANSLATION_PROVIDER = 'azure-translator';

export function normalizeTranslationText(text: string): string {
  return text.trim();
}

function getTranslationCacheText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function getTranslationTextHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export async function translateCommentText(input: {
  text: string;
  targetLang: TranslationLanguage;
}): Promise<TranslationResult> {
  const normalizedText = normalizeTranslationText(input.text);
  const cacheText = getTranslationCacheText(input.text);

  if (!normalizedText) {
    throw new Error('Text is required for translation.');
  }

  const detectedLang = detectCommentLanguage(normalizedText);

  if (detectedLang && detectedLang === input.targetLang) {
    return {
      translatedText: normalizedText,
      sourceLang: detectedLang,
      targetLang: input.targetLang,
      provider: 'none',
      cached: false,
    };
  }

  if (detectedLang) {
    const cacheKey = getTranslationTextHash(cacheText);
    const cachedTranslation = await getCommentTranslation(cacheKey, detectedLang, input.targetLang, TRANSLATION_PROVIDER);

    if (cachedTranslation) {
      return {
        translatedText: cachedTranslation.translatedText,
        sourceLang: normalizeAzureLanguage(cachedTranslation.sourceLang) ?? detectedLang,
        targetLang: input.targetLang,
        provider: TRANSLATION_PROVIDER,
        cached: true,
      };
    }
  }

  const azureResult = await requestAzureTranslation(normalizedText, input.targetLang);

  if (azureResult.sourceLang === input.targetLang) {
    return {
      translatedText: normalizedText,
      sourceLang: azureResult.sourceLang,
      targetLang: input.targetLang,
      provider: 'none',
      cached: false,
    };
  }

  await saveCommentTranslation({
    textHash: getTranslationTextHash(cacheText),
    sourceLang: azureResult.sourceLang,
    targetLang: input.targetLang,
    originalText: normalizedText,
    translatedText: azureResult.translatedText,
    provider: TRANSLATION_PROVIDER,
  });

  return {
    translatedText: azureResult.translatedText,
    sourceLang: azureResult.sourceLang,
    targetLang: input.targetLang,
    provider: TRANSLATION_PROVIDER,
    cached: false,
  };
}

async function requestAzureTranslation(
  text: string,
  targetLang: TranslationLanguage
): Promise<{ translatedText: string; sourceLang: TranslationLanguage }> {
  const apiKey = process.env.AZURE_TRANSLATOR_KEY;
  const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';
  const region = process.env.AZURE_TRANSLATOR_REGION;

  if (!apiKey) {
    throw new Error('Azure Translator is not configured. Set AZURE_TRANSLATOR_KEY to enable translations.');
  }

  const url = new URL('/translate', endpoint);
  url.searchParams.set('api-version', '3.0');
  url.searchParams.set('to', AZURE_LANGUAGE_CODES[targetLang]);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': apiKey,
    'X-ClientTraceId': randomUUID(),
  };

  if (region) {
    headers['Ocp-Apim-Subscription-Region'] = region;
  }

  const response = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers,
    body: JSON.stringify([{ text }]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure Translator request failed: ${response.status} ${errorText}`);
  }

  const body = (await response.json()) as AzureTranslationResponse[];
  const item = body[0];
  const translatedText = item?.translations?.[0]?.text?.trim();

  if (!translatedText) {
    throw new Error('Azure Translator returned an empty translation.');
  }

  const sourceLang = normalizeAzureLanguage(item?.detectedLanguage?.language) ?? detectCommentLanguage(text) ?? 'en';

  return {
    translatedText,
    sourceLang,
  };
}

function normalizeAzureLanguage(language: string | null | undefined): TranslationLanguage | null {
  if (!language) {
    return null;
  }

  if (language.startsWith('zh')) {
    return 'zh';
  }

  if (language.startsWith('en')) {
    return 'en';
  }

  return null;
}

interface AzureTranslationResponse {
  detectedLanguage?: {
    language?: string;
    score?: number;
  };
  translations?: Array<{
    text?: string;
    to?: string;
  }>;
}
