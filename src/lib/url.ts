export function extractYoutubeInfo(url: string): { videoId: string; playlistId: string | null } | null {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname === 'youtu.be') {
      const videoId = parsedUrl.pathname.slice(1, 12);
      return videoId ? { videoId, playlistId: parsedUrl.searchParams.get('list') } : null;
    }

    if (parsedUrl.hostname.includes('youtube.com')) {
      const videoId = parsedUrl.searchParams.get('v')
        || parsedUrl.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/)?.[1]
        || null;

      if (!videoId) {
        return null;
      }

      return { videoId, playlistId: parsedUrl.searchParams.get('list') };
    }
  } catch {
    return null;
  }

  return null;
}

export function isBilibiliUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.toLowerCase().endsWith('bilibili.com');
  } catch {
    return false;
  }
}
