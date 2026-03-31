import sharp from 'sharp';

const HASH_WIDTH = 9;
const HASH_HEIGHT = 8;
const HASH_BITS = (HASH_WIDTH - 1) * HASH_HEIGHT;
const PIXEL_COMPARE_SIZE = 32;

export async function compareThumbnails(
  url1: string,
  url2: string
): Promise<{ similarity: number; hash1: string; hash2: string }> {
  const [buffer1, buffer2] = await Promise.all([fetchImage(url1), fetchImage(url2)]);

  if (!buffer1 || !buffer2) {
    return { similarity: 0, hash1: '', hash2: '' };
  }

  const [hash1, hash2, pixels1, pixels2] = await Promise.all([
    generateDHash(buffer1),
    generateDHash(buffer2),
    generateComparisonPixels(buffer1),
    generateComparisonPixels(buffer2),
  ]);

  const distance = hammingDistance(hash1, hash2);
  const dhashSimilarity = 1 - distance / HASH_BITS;
  const pixelSimilarity = calculatePixelSimilarity(pixels1, pixels2);

  return {
    similarity: dhashSimilarity * 0.6 + pixelSimilarity * 0.4,
    hash1,
    hash2,
  };
}

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const normalizedUrl = url.startsWith('//') ? `https:${url}` : url;
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://www.bilibili.com/',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return null;
    }

    const bytes = await response.arrayBuffer();
    return Buffer.from(bytes);
  } catch {
    return null;
  }
}

async function generateDHash(imageBuffer: Buffer): Promise<string> {
  const pixels = await generateNormalizedPixels(imageBuffer, HASH_WIDTH, HASH_HEIGHT);

  let hash = '';

  for (let y = 0; y < HASH_HEIGHT; y += 1) {
    for (let x = 0; x < HASH_WIDTH - 1; x += 1) {
      const left = pixels[y * HASH_WIDTH + x];
      const right = pixels[y * HASH_WIDTH + x + 1];
      hash += left > right ? '1' : '0';
    }
  }

  return hash;
}

async function generateComparisonPixels(imageBuffer: Buffer): Promise<Buffer> {
  return generateNormalizedPixels(imageBuffer, PIXEL_COMPARE_SIZE, PIXEL_COMPARE_SIZE);
}

async function generateNormalizedPixels(
  imageBuffer: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .greyscale()
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .raw()
    .toBuffer();
}

function calculatePixelSimilarity(left: Buffer, right: Buffer): number {
  if (left.length !== right.length || left.length === 0) {
    return 0;
  }

  let diffSum = 0;

  for (let index = 0; index < left.length; index += 1) {
    diffSum += Math.abs(left[index] - right[index]);
  }

  const normalizedDiff = diffSum / (left.length * 255);
  return 1 - normalizedDiff;
}

function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    return HASH_BITS;
  }

  let distance = 0;

  for (let index = 0; index < hash1.length; index += 1) {
    if (hash1[index] !== hash2[index]) {
      distance += 1;
    }
  }

  return distance;
}
