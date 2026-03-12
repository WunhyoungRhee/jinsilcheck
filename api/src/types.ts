export type Signal = 'safe' | 'caution' | 'danger';
export type Platform = 'youtube' | 'facebook' | 'instagram' | 'x_twitter' | 'tiktok' | 'kakao' | 'naver' | 'generic';

export interface AnalyzeRequest {
  url: string;
  type: 'url' | 'image';
}

export interface AnalyzeResult {
  signal: Signal;
  confidence: number;
  summaryKo: string;
  details: {
    primaryEngine: string;
    primaryScore: number;
    secondaryEngine?: string;
    secondaryScore?: number;
    detectedFaces: number;
    manipulationType?: string;
  };
  sourcePlatform: Platform;
  analyzedAt: string;
  cached: boolean;
}

export interface CacheEntry {
  id: string;
  urlHash: string;
  originalUrl: string;
  platform: Platform;
  signal: Signal;
  confidence: number;
  primaryScore: number;
  secondaryScore?: number;
  summaryKo: string;
  analyzedAt: string;
  ttl: number;
}
