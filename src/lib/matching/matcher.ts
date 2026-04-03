import { YouTubeVideo, BilibiliVideo, BilibiliReupload, VideoMatch } from '@/types';
import * as bilibili from '@/lib/bilibili';
import { compareThumbnails } from './thumbnail';

interface MatchConfig {
  thumbnailSimilarityThreshold: number;
  durationToleranceSeconds: number;
  exactDurationToleranceSeconds: number;
  titleSimilarityThreshold: number;
  veryHighTitleSimilarity: number;
  maxResults: number;
  maxCandidates: number;
  maxQueries: number;
  maxPagesPerQuery: number;
  pageSize: number;
}

const DEFAULT_CONFIG: MatchConfig = {
  thumbnailSimilarityThreshold: 0.75,
  durationToleranceSeconds: 30,
  exactDurationToleranceSeconds: 2,
  titleSimilarityThreshold: 0.92,
  veryHighTitleSimilarity: 0.97,
  maxResults: 20,
  maxCandidates: 120,
  maxQueries: 6,
  maxPagesPerQuery: 3,
  pageSize: 20,
};

export async function findBilibiliReuploads(
  youtubeVideo: YouTubeVideo,
  config: MatchConfig = DEFAULT_CONFIG
): Promise<VideoMatch> {
  const searchQueries = generateSearchQueries(youtubeVideo);

  const allBilibiliVideos = await collectCandidates(searchQueries, config);

  const uniqueVideos = deduplicateByBvid(allBilibiliVideos);
  const candidates = uniqueVideos.slice(0, config.maxCandidates);

  const reuploads = await matchByThumbnail(youtubeVideo, candidates, config);

  return {
    youtubeVideo,
    bilibiliReuploads: reuploads.slice(0, config.maxResults),
    verified: false,
    matchMethod: reuploads[0]?.matchMethod || 'title',
  };
}

async function matchByThumbnail(
  youtubeVideo: YouTubeVideo,
  candidates: BilibiliVideo[],
  config: MatchConfig
): Promise<BilibiliReupload[]> {
  const thumbnailComparisons = await Promise.allSettled(
    candidates.map(async (biliVideo) => {
      const result = await compareThumbnails(
        youtubeVideo.thumbnailUrl,
        biliVideo.thumbnailUrl
      );
      return { biliVideo, ...result };
    })
  );

  const reuploads: BilibiliReupload[] = [];

  for (const comparison of thumbnailComparisons) {
    if (comparison.status === 'rejected') continue;

    const { biliVideo, similarity } = comparison.value;

    const durationDiff = Math.abs(youtubeVideo.durationSeconds - biliVideo.durationSeconds);
    const durationMatches = durationDiff <= config.durationToleranceSeconds;
    const exactDurationMatch = durationDiff <= config.exactDurationToleranceSeconds;
    const titleSimilarity = calculateTitleSimilarity(youtubeVideo.title, biliVideo.title);

    let confidence = 0;
    let method: BilibiliReupload['matchMethod'] = 'title';

    if (similarity >= config.thumbnailSimilarityThreshold) {
      confidence = 0.78 + (similarity - config.thumbnailSimilarityThreshold) * 0.8;
      method = 'thumbnail';

      if (durationMatches) {
        confidence += 0.1;
      }

      if (exactDurationMatch) {
        confidence += 0.06;
      }

      if (titleSimilarity >= config.titleSimilarityThreshold) {
        confidence += 0.02;
      }
    } else {
      if (durationMatches && titleSimilarity >= config.veryHighTitleSimilarity) {
        confidence = 0.38;
        method = 'duration';
      }
    }

    if (confidence >= 0.38) {
      reuploads.push({
        video: biliVideo,
        matchConfidence: Math.min(confidence, 1),
        matchMethod: method,
      });
    }
  }

  return reuploads.sort((a, b) => {
    if (Math.abs(b.matchConfidence - a.matchConfidence) > 0.1) {
      return b.matchConfidence - a.matchConfidence;
    }
    return b.video.viewCount - a.video.viewCount;
  });
}

function generateSearchQueries(youtubeVideo: YouTubeVideo): string[] {
  const queries = new Set<string>();
  const cleanedTitle = youtubeVideo.title
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/【.*?】/g, '')
    .replace(/「.*?」/g, '')
    .trim();
  const titleKeywords = extractTitleKeywords(cleanedTitle);

  const addQuery = (query: string) => {
    const cleaned = query.replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 3) {
      queries.add(cleaned);
    }
  };

  addQuery(youtubeVideo.channelTitle);
  addQuery(`${youtubeVideo.channelTitle} ${youtubeVideo.title}`);
  addQuery(youtubeVideo.title);

  if (cleanedTitle !== youtubeVideo.title && cleanedTitle.length > 10) {
    addQuery(cleanedTitle);
  }

  if (titleKeywords.length >= 2) {
    addQuery(`${youtubeVideo.channelTitle} ${titleKeywords.slice(0, 2).join(' ')}`);
    addQuery(titleKeywords.slice(0, 3).join(' '));
  }

  if (youtubeVideo.playlistTitle) {
    addQuery(`${youtubeVideo.channelTitle} ${youtubeVideo.playlistTitle}`);
    addQuery(youtubeVideo.playlistTitle);
  }

  for (const tag of selectSearchTags(youtubeVideo.tags || [], youtubeVideo)) {
    addQuery(`${youtubeVideo.channelTitle} ${tag}`);
    addQuery(tag);
  }

  for (const phrase of extractDescriptionPhrases(youtubeVideo.description)) {
    addQuery(`${youtubeVideo.channelTitle} ${phrase}`);
    addQuery(phrase);
  }

  return Array.from(queries).slice(0, DEFAULT_CONFIG.maxQueries);
}

function extractDescriptionPhrases(description: string): string[] {
  const normalized = description.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [];
  }

  const matches = normalized.match(/(?:[A-Z][a-z]+|to)(?:\s+(?:[A-Z][a-z]+|to)){1,4}/g) || [];
  const phrases = new Set<string>();

  for (const match of matches) {
    const phrase = match.trim();
    if (phrase.length >= 6) {
      phrases.add(phrase);
    }
  }

  return Array.from(phrases).slice(0, 3);
}

function selectSearchTags(tags: string[], youtubeVideo: Pick<YouTubeVideo, 'title' | 'channelTitle'>): string[] {
  const titleText = normalizeSearchText(youtubeVideo.title);
  const channelText = normalizeSearchText(youtubeVideo.channelTitle);

  const cleaned = tags
    .map((tag) => tag.replace(/\s+/g, ' ').trim())
    .filter((tag) => tag.length >= 4)
    .filter((tag) => !/^#/.test(tag))
    .filter((tag) => scoreTag(tag) > 0)
    .filter((tag) => {
      const normalizedTag = normalizeSearchText(tag);
      return normalizedTag.length > 0
        && !titleText.includes(normalizedTag)
        && !channelText.includes(normalizedTag);
    });

  const ranked = cleaned.sort((left, right) => scoreTag(right) - scoreTag(left));
  return ranked.slice(0, 4);
}

function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function scoreTag(tag: string): number {
  let score = 0;
  if (/\s/.test(tag)) score += 3;
  if (/\d/.test(tag)) score += 2;
  if (/[A-Z]/.test(tag)) score += 2;
  if (/china|michael|ludwig|tip to tip|day|episode/i.test(tag)) score += 5;
  return score;
}

function extractTitleKeywords(title: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'we', 'might', 'have', 'to', 'is', 'are', 'of', 'in', 'on', 'for', 'with',
    'this', 'that', 'it', 'our', 'your', 'his', 'her', 'their', 'be', 'at', 'from', 'day'
  ]);

  return title
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^\w\u4e00-\u9fff]/g, ''))
    .filter((token) => token.length >= 4)
    .filter((token) => !stopWords.has(token));
}

async function collectCandidates(
  searchQueries: string[],
  config: MatchConfig
): Promise<BilibiliVideo[]> {
  const candidates: BilibiliVideo[] = [];

  for (const query of searchQueries) {
    for (const order of ['totalrank', 'click', 'pubdate'] as const) {
      for (let page = 1; page <= config.maxPagesPerQuery; page += 1) {
        const results = await bilibili.searchVideos(query, page, config.pageSize, order);
        candidates.push(...results);
      }
    }
  }

  return candidates;
}

function deduplicateByBvid(videos: BilibiliVideo[]): BilibiliVideo[] {
  const seen = new Set<string>();
  return videos.filter((v) => {
    if (seen.has(v.bvid)) return false;
    seen.add(v.bvid);
    return true;
  });
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  const normalize = (s: string) => s.toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const norm1 = normalize(title1);
  const norm2 = normalize(title2);

  if (norm1 === norm2) return 1;

  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.9;
  }

  const words1 = new Set(norm1.split(' ').filter((word) => word.length > 2));
  const words2 = new Set(norm2.split(' ').filter((word) => word.length > 2));

  let intersection = 0;
  for (const word of words1) {
    if (words2.has(word) && word.length > 2) {
      intersection++;
    }
  }

  const union = words1.size + words2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export async function enrichMatchWithThumbnails(
  match: VideoMatch
): Promise<VideoMatch> {
  return match;
}
