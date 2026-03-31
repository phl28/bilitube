import { createHash } from 'node:crypto';

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

let cachedKey: { imgKey: string; subKey: string; timestamp: number } | null = null;
const KEY_CACHE_DURATION = 60 * 60 * 1000;

async function getWbiKeys(): Promise<{ imgKey: string; subKey: string }> {
  if (cachedKey && Date.now() - cachedKey.timestamp < KEY_CACHE_DURATION) {
    return { imgKey: cachedKey.imgKey, subKey: cachedKey.subKey };
  }

  const response = await fetch('https://api.bilibili.com/x/web-interface/nav', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.bilibili.com',
    },
  });

  const data = await response.json();
  const imgUrl: string = data.data.wbi_img.img_url;
  const subUrl: string = data.data.wbi_img.sub_url;

  const imgKey = imgUrl.split('/').pop()!.split('.')[0];
  const subKey = subUrl.split('/').pop()!.split('.')[0];

  cachedKey = { imgKey, subKey, timestamp: Date.now() };

  return { imgKey, subKey };
}

function getMixinKey(orig: string): string {
  return MIXIN_KEY_ENC_TAB.map((i) => orig[i]).join('').slice(0, 32);
}

function md5Hash(message: string): string {
  return createHash('md5').update(message).digest('hex');
}

export async function signParams(
  params: Record<string, string | number>
): Promise<Record<string, string>> {
  const { imgKey, subKey } = await getWbiKeys();
  const mixinKey = getMixinKey(imgKey + subKey);

  const wts = Math.floor(Date.now() / 1000);
  const paramsWithWts: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
    wts: String(wts),
  };

  const sortedKeys = Object.keys(paramsWithWts).sort();
  const query = sortedKeys
    .map((k) => `${k}=${encodeURIComponent(paramsWithWts[k])}`)
    .join('&');

  const wRid = md5Hash(query + mixinKey);

  return {
    ...paramsWithWts,
    w_rid: wRid,
  };
}

let buvid3Cache: string | null = null;
let buvid3Timestamp = 0;
const BUID3_CACHE_DURATION = 24 * 60 * 60 * 1000;

export async function getBuvid3(): Promise<string> {
  if (buvid3Cache && Date.now() - buvid3Timestamp < BUID3_CACHE_DURATION) {
    return buvid3Cache;
  }

  try {
    const response = await fetch(
      'https://api.bilibili.com/x/frontend/finger/spi',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    const data = await response.json();
    buvid3Cache = data.data.b_3;
    buvid3Timestamp = Date.now();
    return buvid3Cache || '';
  } catch {
    return '';
  }
}
