import { google, youtube_v3 } from 'googleapis';
import { YouTubeVideo, YouTubeComment } from '@/types';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

export async function getVideoById(videoId: string): Promise<YouTubeVideo | null> {
  try {
    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: [videoId],
    });

    const item = response.data.items?.[0];
    if (!item) return null;

    return parseYouTubeVideo(item);
  } catch (error) {
    console.error('Failed to fetch YouTube video:', error);
    return null;
  }
}

export async function getPlaylistTitleById(playlistId: string): Promise<string | null> {
  try {
    const response = await youtube.playlists.list({
      part: ['snippet'],
      id: [playlistId],
      maxResults: 1,
    });

    return response.data.items?.[0]?.snippet?.title || null;
  } catch (error) {
    console.error('Failed to fetch YouTube playlist:', error);
    return null;
  }
}

export async function searchVideos(query: string, maxResults = 10): Promise<YouTubeVideo[]> {
  try {
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      q: query,
      type: ['video'],
      maxResults,
    });

    const videoIds = searchResponse.data.items
      ?.map((item) => item.id?.videoId)
      .filter(Boolean) as string[];

    if (!videoIds.length) return [];

    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: videoIds,
    });

    return (videosResponse.data.items || [])
      .map(parseYouTubeVideo)
      .filter(Boolean) as YouTubeVideo[];
  } catch (error) {
    console.error('Failed to search YouTube videos:', error);
    return [];
  }
}

export async function getVideoComments(
  videoId: string,
  maxResults = 100,
  pageToken?: string,
  order: 'time' | 'relevance' = 'relevance'
): Promise<{ comments: YouTubeComment[]; nextPageToken?: string; totalCount: number }> {
  try {
    const [threadsResponse, videoResponse] = await Promise.all([
      youtube.commentThreads.list({
        part: ['snippet', 'replies'],
        videoId,
        maxResults,
        pageToken: pageToken || undefined,
        order,
      }),
      youtube.videos.list({
        part: ['statistics'],
        id: [videoId],
        maxResults: 1,
      }),
    ]);

    const comments: YouTubeComment[] = [];
    const totalCount = parseInt(
      videoResponse.data.items?.[0]?.statistics?.commentCount || '0',
      10
    );

    for (const thread of threadsResponse.data.items || []) {
      const topComment = thread.snippet?.topLevelComment;
      if (topComment?.snippet) {
        comments.push(parseComment(topComment, thread.id || ''));
      }

      if (thread.replies?.comments) {
        for (const reply of thread.replies.comments) {
          if (reply.snippet) {
            comments.push(parseComment(reply, thread.id || '', topComment?.id || undefined));
          }
        }
      }
    }

    return {
      comments,
      nextPageToken: threadsResponse.data.nextPageToken || undefined,
      totalCount,
    };
  } catch (error) {
    console.error('Failed to fetch YouTube comments:', error);
    return { comments: [], totalCount: 0 };
  }
}

function parseYouTubeVideo(item: youtube_v3.Schema$Video): YouTubeVideo | null {
  const snippet = item.snippet;
  const contentDetails = item.contentDetails;
  const statistics = item.statistics;

  if (!snippet?.title || !item.id) return null;

  return {
    id: item.id,
    title: snippet.title,
    description: snippet.description || '',
    channelId: snippet.channelId || '',
    channelTitle: snippet.channelTitle || '',
    thumbnailUrl: snippet.thumbnails?.maxres?.url
      || snippet.thumbnails?.high?.url
      || snippet.thumbnails?.medium?.url
      || snippet.thumbnails?.default?.url
      || '',
    tags: snippet.tags || [],
    durationSeconds: parseDuration(contentDetails?.duration || 'PT0S'),
    viewCount: parseInt(statistics?.viewCount || '0', 10),
    publishedAt: snippet.publishedAt || '',
  };
}

function parseComment(
  comment: youtube_v3.Schema$Comment,
  threadId: string,
  parentId?: string
): YouTubeComment {
  const snippet = comment.snippet!;
  return {
    id: comment.id || threadId,
    textDisplay: snippet.textDisplay || '',
    textOriginal: snippet.textOriginal || snippet.textDisplay || '',
    authorDisplayName: snippet.authorDisplayName || '',
    authorProfileImageUrl: snippet.authorProfileImageUrl || '',
    authorChannelId: snippet.authorChannelId?.value || '',
    likeCount: snippet.likeCount || 0,
    publishedAt: snippet.publishedAt || '',
    updatedAt: snippet.updatedAt || '',
    parentId: parentId || null,
  };
}

function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}
