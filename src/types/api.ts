/**
 * API response types
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface VideoSearchRequest {
  youtubeUrl?: string;
  youtubeId?: string;
  query?: string;
}

export interface VideoMatchResponse {
  youtube: {
    id: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
    duration: number;
    viewCount: number;
  };
  bilibili: Array<{
    bvid: string;
    aid: number;
    title: string;
    thumbnail: string;
    uploaderName: string;
    duration: number;
    viewCount: number;
    commentCount: number;
    matchConfidence: number;
  }>;
}

export interface CommentsRequest {
  youtubeId?: string;
  bilibiliAid?: number;
  page?: number;
  pageSize?: number;
  sortBy?: 'top' | 'new' | 'hot';
}
