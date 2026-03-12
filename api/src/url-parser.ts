import { Platform } from './types';

const PLATFORM_PATTERNS: Record<Platform, RegExp[]> = {
  youtube: [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ],
  facebook: [/facebook\.com\/.*\/videos\//, /fb\.watch\//],
  instagram: [/instagram\.com\/(p|reel|tv)\//],
  x_twitter: [/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/],
  tiktok: [/tiktok\.com\/@[\w.]+\/video\/(\d+)/, /vm\.tiktok\.com\//],
  kakao: [/open\.kakao\.com\//, /pf\.kakao\.com\//],
  naver: [/blog\.naver\.com\//, /cafe\.naver\.com\//, /n\.news\.naver\.com\//],
  generic: [/^https?:\/\/.+/],
};

export function identifyPlatform(url: string): Platform {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    if (platform === 'generic') continue;
    if (patterns.some((p) => p.test(url))) return platform as Platform;
  }
  return 'generic';
}

export function extractVideoId(
  url: string,
  platform: Platform
): string | null {
  if (platform === 'youtube') {
    const match = url.match(
      /(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  }
  return null;
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'ref'].forEach(
      (p) => parsed.searchParams.delete(p)
    );
    return parsed.toString();
  } catch {
    return url;
  }
}
