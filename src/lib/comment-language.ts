export type TranslationLanguage = 'en' | 'zh';

export function detectCommentLanguage(text: string): TranslationLanguage | null {
  const normalized = text.trim();

  if (!normalized) {
    return null;
  }

  const chineseChars = normalized.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g)?.length ?? 0;
  const latinChars = normalized.match(/[A-Za-z]/g)?.length ?? 0;

  if (chineseChars === 0 && latinChars === 0) {
    return null;
  }

  return chineseChars > latinChars ? 'zh' : 'en';
}
