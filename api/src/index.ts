import { app, HttpRequest } from '@azure/functions';
import { isValidUrl } from './url-parser';
import { runPipeline } from './detection-pipeline';
import { checkRateLimit } from './rate-limiter';
import { sanitizeUrl } from './sanitize';
import { analyzeWithSightEngine } from './sightengine-client';
import { analyzeWithHive } from './hive-client';
import { composeResult } from './result-composer';

function getClientIp(request: HttpRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-client-ip') ||
    'unknown'
  );
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async () => {
    return {
      status: 200,
      jsonBody: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  },
});

app.http('analyze', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'analyze',
  handler: async (request) => {
    // Rate limiting (IP당 분당 10건)
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return {
        status: 429,
        jsonBody: {
          status: 'error',
          error: {
            code: 'RATE_LIMIT',
            message_ko: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
          },
        },
      };
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const rawUrl = body.url as string | undefined;

    if (!rawUrl) {
      return {
        status: 400,
        jsonBody: {
          status: 'error',
          error: {
            code: 'INVALID_URL',
            message_ko: '올바른 링크를 입력해 주세요.',
          },
        },
      };
    }

    // URL 정제 (XSS 방지)
    const url = sanitizeUrl(rawUrl);
    if (!url || !isValidUrl(url)) {
      return {
        status: 400,
        jsonBody: {
          status: 'error',
          error: {
            code: 'INVALID_URL',
            message_ko: '올바른 링크를 입력해 주세요.',
          },
        },
      };
    }

    try {
      const result = await runPipeline(url);
      return {
        status: 200,
        jsonBody: { status: 'success', result },
      };
    } catch (err: any) {
      const code =
        err.message === 'NO_CONTENT' ? 'NO_CONTENT' : 'ANALYZE_FAILED';
      const message_ko =
        code === 'NO_CONTENT'
          ? '이 링크에서 이미지를 가져올 수 없습니다. 다른 링크를 시도해 주세요.'
          : '링크를 분석하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';

      return {
        status: code === 'NO_CONTENT' ? 422 : 500,
        jsonBody: {
          status: 'error',
          error: { code, message_ko },
        },
      };
    }
  },
});

app.http('analyze-image', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'analyze-image',
  handler: async (request) => {
    // Rate limiting
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return {
        status: 429,
        jsonBody: {
          status: 'error',
          error: {
            code: 'RATE_LIMIT',
            message_ko: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
          },
        },
      };
    }

    try {
      const formData = await request.formData();
      const file = formData.get('image') as File | null;

      if (!file || !file.size) {
        return {
          status: 400,
          jsonBody: {
            status: 'error',
            error: {
              code: 'NO_IMAGE',
              message_ko: '이미지를 선택해 주세요.',
            },
          },
        };
      }

      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        return {
          status: 400,
          jsonBody: {
            status: 'error',
            error: {
              code: 'FILE_TOO_LARGE',
              message_ko: '이미지가 너무 큽니다. 10MB 이하의 이미지를 사용해 주세요.',
            },
          },
        };
      }

      // 이미지 타입 확인
      if (!file.type.startsWith('image/')) {
        return {
          status: 400,
          jsonBody: {
            status: 'error',
            error: {
              code: 'INVALID_FILE',
              message_ko: '이미지 파일만 분석할 수 있습니다.',
            },
          },
        };
      }

      // 이미지를 base64로 변환하여 AI API에 전송
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;

      // SightEngine 1차 분석
      const primary = await analyzeWithSightEngine(dataUrl);

      let secondaryScore: number | undefined;

      // 모호한 결과일 때 Hive 2차 검증
      if (primary.deepfakeScore > 0.2 && primary.deepfakeScore < 0.8) {
        try {
          const secondary = await analyzeWithHive(dataUrl);
          secondaryScore = Math.max(
            secondary.deepfakeScore,
            secondary.aiGeneratedScore
          );
        } catch {
          // Hive 실패 시 1차 결과만 사용
        }
      }

      const composed = composeResult({
        primaryScore: primary.deepfakeScore,
        secondaryScore,
        faces: primary.faces,
        platform: 'generic',
      });

      return {
        status: 200,
        jsonBody: {
          status: 'success',
          result: {
            signal: composed.signal,
            confidence: composed.confidence,
            summaryKo: composed.summaryKo,
            details: {
              primaryEngine: 'sightengine',
              primaryScore: primary.deepfakeScore,
              secondaryEngine: secondaryScore !== undefined ? 'hive' : undefined,
              secondaryScore,
              detectedFaces: primary.faces,
            },
            sourcePlatform: 'generic',
            analyzedAt: new Date().toISOString(),
            cached: false,
          },
        },
      };
    } catch {
      return {
        status: 500,
        jsonBody: {
          status: 'error',
          error: {
            code: 'IMAGE_ANALYZE_FAILED',
            message_ko: '이미지를 분석하는 중 오류가 발생했습니다. 다시 시도해 주세요.',
          },
        },
      };
    }
  },
});
