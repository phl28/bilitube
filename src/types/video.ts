export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  playlistId?: string;
  playlistTitle?: string;
  tags?: string[];
  thumbnailUrl: string;
  durationSeconds: number;
  viewCount: number;
  publishedAt: string;
}

export interface BilibiliVideo {
  bvid: string;
  aid: number;
  title: string;
  description: string;
  uploaderMid: number;
  uploaderName: string;
  thumbnailUrl: string;
  durationSeconds: number;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  publishedAtTimestamp: number;
}

export interface VideoMatch {
  youtubeVideo: YouTubeVideo;
  bilibiliReuploads: BilibiliReupload[];
  verified: boolean;
  matchMethod: 'thumbnail' | 'duration' | 'title' | 'manual';
}

export interface BilibiliReupload {
  video: BilibiliVideo;
  matchConfidence: number;
  matchMethod: 'thumbnail' | 'duration' | 'title' | 'manual';
}
