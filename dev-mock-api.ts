import type { Plugin } from 'vite';

// URL에 따라 다른 mock 결과를 반환하는 개발용 API
function getMockResult(url: string) {
  const lowerUrl = url.toLowerCase();

  // "fake", "deepfake", "scam" 등이 포함된 URL → 위험
  if (/fake|deepfake|scam|fraud|조작|가짜/.test(lowerUrl)) {
    return {
      signal: 'danger',
      confidence: 0.87,
      summaryKo: 'AI가 조작한 흔적이 발견되었습니다. 이 영상을 신뢰하지 마세요.',
      details: {
        primaryEngine: 'sightengine',
        primaryScore: 0.85,
        secondaryEngine: 'hive',
        secondaryScore: 0.89,
        detectedFaces: 1,
        manipulationType: 'face_swap',
      },
      sourcePlatform: identifyPlatform(url),
      analyzedAt: new Date().toISOString(),
      cached: false,
    };
  }

  // "의심", "suspect", "weird" 등 → 주의
  if (/suspect|의심|weird|이상|주의/.test(lowerUrl)) {
    return {
      signal: 'caution',
      confidence: 0.55,
      summaryKo:
        '일부 의심스러운 부분이 발견되었습니다. 확신할 수 없으니 신중하게 판단하세요. 다른 뉴스에서도 같은 내용인지 확인해 보시는 것을 권합니다.',
      details: {
        primaryEngine: 'sightengine',
        primaryScore: 0.45,
        secondaryEngine: 'hive',
        secondaryScore: 0.62,
        detectedFaces: 1,
      },
      sourcePlatform: identifyPlatform(url),
      analyzedAt: new Date().toISOString(),
      cached: false,
    };
  }

  // 그 외 모든 URL → 안전
  return {
    signal: 'safe',
    confidence: 0.12,
    summaryKo:
      '이 영상에서 AI가 조작한 흔적이 발견되지 않았습니다. 안심하고 보셔도 됩니다.',
    details: {
      primaryEngine: 'sightengine',
      primaryScore: 0.12,
      detectedFaces: 1,
    },
    sourcePlatform: identifyPlatform(url),
    analyzedAt: new Date().toISOString(),
    cached: false,
  };
}

function identifyPlatform(url: string): string {
  if (/youtube|youtu\.be/i.test(url)) return 'youtube';
  if (/facebook|fb\.watch/i.test(url)) return 'facebook';
  if (/instagram/i.test(url)) return 'instagram';
  if (/twitter|x\.com/i.test(url)) return 'x_twitter';
  if (/tiktok/i.test(url)) return 'tiktok';
  if (/naver/i.test(url)) return 'naver';
  if (/kakao/i.test(url)) return 'kakao';
  return 'generic';
}

export function mockApiPlugin(): Plugin {
  return {
    name: 'mock-api',
    configureServer(server) {
      server.middlewares.use('/api/health', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      });

      server.middlewares.use('/api/analyze', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');

          try {
            const { url } = JSON.parse(body);

            if (!url || !/^https?:\/\/.+/.test(url)) {
              res.statusCode = 400;
              res.end(JSON.stringify({
                status: 'error',
                error: { code: 'INVALID_URL', message_ko: '올바른 링크를 입력해 주세요.' },
              }));
              return;
            }

            // 2~4초 지연으로 실제 분석 시간 시뮬레이션
            const delay = 2000 + Math.random() * 2000;
            setTimeout(() => {
              res.end(JSON.stringify({
                status: 'success',
                result: getMockResult(url),
              }));
            }, delay);
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({
              status: 'error',
              error: { code: 'INVALID_REQUEST', message_ko: '올바른 링크를 입력해 주세요.' },
            }));
          }
        });
      });

      server.middlewares.use('/api/analyze-image', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        const delay = 2000 + Math.random() * 2000;
        setTimeout(() => {
          res.end(JSON.stringify({
            status: 'success',
            result: {
              signal: 'safe',
              confidence: 0.15,
              summaryKo: '이 이미지에서 AI가 조작한 흔적이 발견되지 않았습니다. 안심하셔도 됩니다.',
              analyzedAt: new Date().toISOString(),
              cached: false,
            },
          }));
        }, delay);
      });
    },
  };
}
