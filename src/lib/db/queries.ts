import db, { initDatabase } from './client';
import { YouTubeVideo, VideoMatch, BilibiliReupload } from '@/types';

export interface CommentTranslationRecord {
  id: number;
  textHash: string;
  sourceLang: string;
  targetLang: string;
  originalText: string;
  translatedText: string;
  provider: string;
  createdAt: string;
}

export async function getVideoMatch(youtubeId: string): Promise<VideoMatch | null> {
  await initDatabase();

  const youtubeResult = await db.execute({
    sql: 'SELECT * FROM video_matches WHERE youtube_id = ?',
    args: [youtubeId],
  });

  const youtubeRow = youtubeResult.rows[0];
  if (!youtubeRow) return null;

  const bilibiliResult = await db.execute({
    sql: 'SELECT * FROM bilibili_reuploads WHERE youtube_id = ? ORDER BY views DESC',
    args: [youtubeId],
  });

  const youtubeVideo: YouTubeVideo = {
    id: youtubeRow.youtube_id as string,
    title: youtubeRow.youtube_title as string,
    description: '',
    channelId: '',
    channelTitle: youtubeRow.youtube_channel as string,
    playlistId: (youtubeRow.youtube_playlist_id as string) || undefined,
    playlistTitle: (youtubeRow.youtube_playlist_title as string) || undefined,
    tags: [],
    thumbnailUrl: youtubeRow.youtube_thumbnail as string,
    durationSeconds: youtubeRow.youtube_duration as number,
    viewCount: youtubeRow.youtube_views as number,
    publishedAt: '',
  };

  const bilibiliReuploads: BilibiliReupload[] = bilibiliResult.rows.map((row) => ({
    video: {
      bvid: row.bvid as string,
      aid: row.aid as number,
      title: row.title as string,
      description: '',
      uploaderMid: 0,
      uploaderName: row.uploader_name as string,
      thumbnailUrl: row.thumbnail as string,
      durationSeconds: row.duration as number,
      viewCount: row.views as number,
      commentCount: row.comments as number,
      likeCount: row.likes as number,
      publishedAtTimestamp: 0,
    },
    matchConfidence: row.match_confidence as number,
    matchMethod: row.match_method as BilibiliReupload['matchMethod'],
  }));

  return {
    youtubeVideo,
    bilibiliReuploads,
    verified: youtubeRow.verified === 1,
    matchMethod: bilibiliReuploads[0]?.matchMethod || 'title',
  };
}

export async function saveVideoMatch(match: VideoMatch): Promise<void> {
  await initDatabase();

  await db.execute({
    sql: `INSERT OR REPLACE INTO video_matches 
          (youtube_id, youtube_title, youtube_thumbnail, youtube_channel, youtube_playlist_id, youtube_playlist_title, youtube_duration, youtube_views, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [
      match.youtubeVideo.id,
      match.youtubeVideo.title,
      match.youtubeVideo.thumbnailUrl,
      match.youtubeVideo.channelTitle,
      match.youtubeVideo.playlistId || null,
      match.youtubeVideo.playlistTitle || null,
      match.youtubeVideo.durationSeconds,
      match.youtubeVideo.viewCount,
    ],
  });

  for (const reupload of match.bilibiliReuploads) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO bilibili_reuploads 
            (youtube_id, bvid, aid, title, uploader_name, thumbnail, duration, views, comments, likes, match_confidence, match_method, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        match.youtubeVideo.id,
        reupload.video.bvid,
        reupload.video.aid,
        reupload.video.title,
        reupload.video.uploaderName,
        reupload.video.thumbnailUrl,
        reupload.video.durationSeconds,
        reupload.video.viewCount,
        reupload.video.commentCount,
        reupload.video.likeCount,
        reupload.matchConfidence,
        reupload.matchMethod,
      ],
    });
  }
}

export async function addAdminCorrection(
  youtubeId: string,
  bvid: string | null,
  action: 'add' | 'remove'
): Promise<void> {
  await initDatabase();

  await db.execute({
    sql: 'INSERT INTO admin_corrections (youtube_id, bvid, action) VALUES (?, ?, ?)',
    args: [youtubeId, bvid, action],
  });
}

export async function getRecentMatches(limit: number = 12): Promise<VideoMatch[]> {
  await initDatabase();

  const result = await db.execute({
    sql: `SELECT vm.*,
            (SELECT COUNT(*) FROM bilibili_reuploads br WHERE br.youtube_id = vm.youtube_id) as reupload_count
          FROM video_matches vm
          ORDER BY vm.updated_at DESC
          LIMIT ?`,
    args: [limit],
  });

  const matches: VideoMatch[] = [];

  for (const row of result.rows) {
    const bilibiliResult = await db.execute({
      sql: 'SELECT * FROM bilibili_reuploads WHERE youtube_id = ? ORDER BY views DESC',
      args: [row.youtube_id as string],
    });

    const youtubeVideo: YouTubeVideo = {
      id: row.youtube_id as string,
      title: row.youtube_title as string,
      description: '',
      channelId: '',
      channelTitle: row.youtube_channel as string,
      playlistId: (row.youtube_playlist_id as string) || undefined,
      playlistTitle: (row.youtube_playlist_title as string) || undefined,
      tags: [],
      thumbnailUrl: row.youtube_thumbnail as string,
      durationSeconds: row.youtube_duration as number,
      viewCount: row.youtube_views as number,
      publishedAt: '',
    };

    const bilibiliReuploads: BilibiliReupload[] = bilibiliResult.rows.map((r) => ({
      video: {
        bvid: r.bvid as string,
        aid: r.aid as number,
        title: r.title as string,
        description: '',
        uploaderMid: 0,
        uploaderName: r.uploader_name as string,
        thumbnailUrl: r.thumbnail as string,
        durationSeconds: r.duration as number,
        viewCount: r.views as number,
        commentCount: r.comments as number,
        likeCount: r.likes as number,
        publishedAtTimestamp: 0,
      },
      matchConfidence: r.match_confidence as number,
      matchMethod: r.match_method as BilibiliReupload['matchMethod'],
    }));

    matches.push({
      youtubeVideo,
      bilibiliReuploads,
      verified: row.verified === 1,
      matchMethod: bilibiliReuploads[0]?.matchMethod || 'title',
    });
  }

  return matches;
}

export async function getAdminCorrections(youtubeId: string) {
  await initDatabase();

  const result = await db.execute({
    sql: 'SELECT * FROM admin_corrections WHERE youtube_id = ? ORDER BY created_at DESC',
    args: [youtubeId],
  });

  return result.rows;
}

export async function getCommentTranslation(
  textHash: string,
  sourceLang: string,
  targetLang: string,
  provider: string
): Promise<CommentTranslationRecord | null> {
  await initDatabase();

  const result = await db.execute({
    sql: `SELECT * FROM comment_translations
          WHERE text_hash = ? AND source_lang = ? AND target_lang = ? AND provider = ?
          LIMIT 1`,
    args: [textHash, sourceLang, targetLang, provider],
  });

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id as number,
    textHash: row.text_hash as string,
    sourceLang: row.source_lang as string,
    targetLang: row.target_lang as string,
    originalText: row.original_text as string,
    translatedText: row.translated_text as string,
    provider: row.provider as string,
    createdAt: row.created_at as string,
  };
}

export async function saveCommentTranslation(input: {
  textHash: string;
  sourceLang: string;
  targetLang: string;
  originalText: string;
  translatedText: string;
  provider: string;
}): Promise<void> {
  await initDatabase();

  await db.execute({
    sql: `INSERT OR REPLACE INTO comment_translations
          (text_hash, source_lang, target_lang, original_text, translated_text, provider)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      input.textHash,
      input.sourceLang,
      input.targetLang,
      input.originalText,
      input.translatedText,
      input.provider,
    ],
  });
}
