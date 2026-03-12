import { analyzeWithSightEngine } from './sightengine-client';
import { analyzeWithHive } from './hive-client';
import { composeResult } from './result-composer';
import { getCached, setCache, hashUrl } from './cosmos-cache';
import { normalizeUrl, identifyPlatform } from './url-parser';
import { extractContent } from './content-extractor';
import { AnalyzeResult, CacheEntry } from './types';

export async function runPipeline(rawUrl: string): Promise<AnalyzeResult> {
  const url = normalizeUrl(rawUrl);
  const urlHash = hashUrl(url);
  const platform = identifyPlatform(url);

  // 1. 캐시 확인
  const cached = await getCached(urlHash);
  if (cached) {
    return {
      signal: cached.signal,
      confidence: cached.confidence,
      summaryKo: cached.summaryKo,
      details: {
        primaryEngine: 'sightengine',
        primaryScore: cached.primaryScore,
        secondaryEngine: cached.secondaryScore ? 'hive' : undefined,
        secondaryScore: cached.secondaryScore,
        detectedFaces: 0,
      },
      sourcePlatform: cached.platform,
      analyzedAt: cached.analyzedAt,
      cached: true,
    };
  }

  // 2. 콘텐츠 추출
  const content = await extractContent(url, platform);
  if (!content.imageUrl) {
    throw new Error('NO_CONTENT');
  }

  // 3. 1차 탐지 (SightEngine)
  const primary = await analyzeWithSightEngine(content.imageUrl);

  let secondaryScore: number | undefined;
  let secondaryEngine: string | undefined;

  // 4. 2차 검증 (조건부: 점수가 0.20~0.80일 때만)
  if (primary.deepfakeScore > 0.2 && primary.deepfakeScore < 0.8) {
    try {
      const secondary = await analyzeWithHive(content.imageUrl);
      secondaryScore = Math.max(
        secondary.deepfakeScore,
        secondary.aiGeneratedScore
      );
      secondaryEngine = 'hive';
    } catch (err) {
      // Hive 실패 시 1차 결과만 사용 (graceful degradation)
      console.warn('Hive AI fallback:', err);
    }
  }

  // 5. 결과 종합
  const composed = composeResult({
    primaryScore: primary.deepfakeScore,
    secondaryScore,
    faces: primary.faces,
    platform,
  });

  // 6. 캐시 저장
  const entry: CacheEntry = {
    id: urlHash,
    urlHash,
    originalUrl: url,
    platform,
    signal: composed.signal,
    confidence: composed.confidence,
    primaryScore: primary.deepfakeScore,
    secondaryScore,
    summaryKo: composed.summaryKo,
    analyzedAt: new Date().toISOString(),
    ttl: 86400,
  };
  await setCache(entry).catch((err) =>
    console.warn('Cache write failed:', err)
  );

  // 7. 응답 반환
  return {
    signal: composed.signal,
    confidence: composed.confidence,
    summaryKo: composed.summaryKo,
    details: {
      primaryEngine: 'sightengine',
      primaryScore: primary.deepfakeScore,
      secondaryEngine,
      secondaryScore,
      detectedFaces: primary.faces,
    },
    sourcePlatform: platform,
    analyzedAt: entry.analyzedAt,
    cached: false,
  };
}
