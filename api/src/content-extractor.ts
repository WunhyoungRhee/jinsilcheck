import { Platform } from './types';
import { extractVideoId } from './url-parser';

export interface ExtractedContent {
  imageUrl: string | null;
  videoUrl: string | null;
  title: string | null;
  description: string | null;
}

export async function extractContent(
  url: string,
  platform: Platform
): Promise<ExtractedContent> {
  if (platform === 'youtube') {
    return extractYouTube(url);
  }
  return extractFromOG(url);
}

async function extractYouTube(url: string): Promise<ExtractedContent> {
  const videoId = extractVideoId(url, 'youtube');
  if (!videoId) throw new Error('YouTube 비디오 ID를 찾을 수 없습니다.');

  const imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    const data = (await response.json()) as Record<string, unknown>;
    return {
      imageUrl,
      videoUrl: url,
      title: (data.title as string) || null,
      description: (data.author_name as string) || null,
    };
  } catch {
    return { imageUrl, videoUrl: url, title: null, description: null };
  }
}

async function extractFromOG(url: string): Promise<ExtractedContent> {
  const { load } = await import('cheerio');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JinsilCheckBot/1.0)',
      Accept: 'text/html',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok)
    throw new Error(`페이지를 가져올 수 없습니다 (${response.status})`);

  const html = await response.text();
  const $ = load(html);

  return {
    imageUrl:
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      null,
    videoUrl:
      $('meta[property="og:video"]').attr('content') ||
      $('meta[property="og:video:url"]').attr('content') ||
      null,
    title:
      $('meta[property="og:title"]').attr('content') ||
      $('title').text() ||
      null,
    description:
      $('meta[property="og:description"]').attr('content') || null,
  };
}
