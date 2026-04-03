export interface YouTubeComment {
  id: string;
  textDisplay: string;
  textOriginal: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  authorChannelId: string;
  likeCount: number;
  publishedAt: string;
  updatedAt: string;
  parentId: string | null;
}

export interface BilibiliComment {
  rpid: number;
  oid: number;
  mid: number;
  uname: string;
  avatar: string;
  message: string;
  like: number;
  ctime: number;
  parent: number;
  rcount: number;
}

export interface UnifiedComment {
  id: string;
  platform: 'youtube' | 'bilibili';
  text: string;
  authorName: string;
  authorAvatar: string;
  likeCount: number;
  publishedAt: Date;
  isReply: boolean;
  parentId: string | null;
  replies?: UnifiedComment[];
  youtubeComment?: YouTubeComment;
  bilibiliComment?: BilibiliComment;
}

export interface CommentThread {
  topComment: UnifiedComment;
  replies: UnifiedComment[];
  platform: 'youtube' | 'bilibili';
  sortScore: number;
}
