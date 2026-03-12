# 진실체크 (JinsilCheck) — Implementation Plan

> **Version**: 1.0.0  
> **Last Updated**: 2026-03-10  
> **Reference**: [SPEC.md](./SPEC.md)  

---

## Overview

이 문서는 SPEC.md에 정의된 진실체크 PWA를 실제로 구현하기 위한 **단계별 작업 계획**입니다.
전체 MVP를 **6개의 Sprint (각 2주)**로 나누어 12주(약 3개월) 내에 베타 출시를 목표로 합니다.

```
Sprint 1: 프로젝트 세팅 + Azure 환경 구축
Sprint 2: Backend API — URL 파싱 + 콘텐츠 추출
Sprint 3: Backend API — AI 탐지 엔진 연동
Sprint 4: Frontend — 핵심 UI 구현
Sprint 5: 통합 + PWA 완성
Sprint 6: 테스트 + 베타 배포
```

---

## Prerequisites (시작 전 준비)

### 계정 및 API 키
- [ ] Azure 계정 생성 (무료 평가판 또는 종량제)
- [ ] GitHub 계정 + 새 Repository 생성 (`jinsilcheck`)
- [ ] SightEngine 계정 생성 → API User/Secret 발급 (https://sightengine.com)
- [ ] Hive AI 계정 생성 → API Key 발급 (https://thehive.ai)

### 개발 환경
- [ ] Node.js 20.x LTS 설치
- [ ] VS Code + 확장: Azure Static Web Apps, Azure Functions, ESLint, Prettier
- [ ] Azure CLI 설치 (`az` command)
- [ ] Azure Functions Core Tools 설치 (`func` command)
- [ ] SWA CLI 설치 (`npm install -g @azure/static-web-apps-cli`)

---

## Sprint 1: 프로젝트 세팅 + Azure 환경 (Week 1-2)

### 목표
프로젝트 스캐폴딩 완료, Azure 리소스 생성, 빈 PWA가 Azure에서 동작하는 것을 확인

### Task 1.1 — 프로젝트 초기화

```bash
# 1. 프로젝트 생성
npm create vite@latest jinsilcheck -- --template react-ts
cd jinsilcheck
npm install

# 2. PWA 플러그인 설치
npm install -D vite-plugin-pwa

# 3. 핵심 의존성
npm install react-router-dom

# 4. API 디렉토리 생성
mkdir -p api/lib
cd api
npm init -y
npm install @azure/cosmos @azure/functions node-fetch cheerio
npm install -D typescript @types/node
cd ..
```

### Task 1.2 — Vite + PWA 설정

**`vite.config.ts`**:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: '진실체크 - 딥페이크 판별',
        short_name: '진실체크',
        description: '받은 링크를 붙여넣으면 AI가 딥페이크를 판별해 드립니다',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFFFFF',
        theme_color: '#1B3A5C',
        lang: 'ko',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        share_target: {
          action: '/',
          method: 'GET',
          params: { url: 'shared_url' }
        }
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages' }
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
});
```

### Task 1.3 — Azure 리소스 생성

```bash
# Azure 로그인
az login

# 리소스 그룹 생성
az group create --name rg-jinsilcheck --location koreacentral

# Static Web App 생성 (GitHub 연결)
az staticwebapp create \
  --name jinsilcheck-app \
  --resource-group rg-jinsilcheck \
  --source https://github.com/<YOUR_GITHUB>/jinsilcheck \
  --location "East Asia" \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location "dist" \
  --sku Free

# Cosmos DB 생성 (Serverless)
az cosmosdb create \
  --name jinsilcheck-db \
  --resource-group rg-jinsilcheck \
  --kind GlobalDocumentDB \
  --capabilities EnableServerless \
  --locations regionName=koreacentral

# Cosmos DB 데이터베이스 + 컨테이너 생성
az cosmosdb sql database create \
  --account-name jinsilcheck-db \
  --resource-group rg-jinsilcheck \
  --name jinsilcheck

az cosmosdb sql container create \
  --account-name jinsilcheck-db \
  --resource-group rg-jinsilcheck \
  --database-name jinsilcheck \
  --name analysis-cache \
  --partition-key-path /urlHash \
  --default-ttl 86400
```

### Task 1.4 — SWA 설정 파일

**`public/staticwebapp.config.json`**:
```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/icons/*", "/assets/*", "*.css", "*.js", "*.png", "*.svg", "*.ico"]
  },
  "routes": [
    { "route": "/api/*", "allowedRoles": ["anonymous"] }
  ],
  "responseOverrides": {
    "404": { "rewrite": "/index.html" }
  },
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  }
}
```

**`swa-cli.config.json`**:
```json
{
  "configurations": {
    "jinsilcheck": {
      "appLocation": ".",
      "apiLocation": "api",
      "outputLocation": "dist",
      "appBuildCommand": "npm run build",
      "apiBuildCommand": "cd api && npm run build",
      "run": "npm run dev",
      "appDevserverUrl": "http://localhost:5173"
    }
  }
}
```

### Task 1.5 — 로컬 개발 환경 확인

```bash
# 로컬에서 SWA 에뮬레이터 실행
swa start

# 브라우저에서 http://localhost:4280 접속
# 빈 React 앱이 표시되면 성공
```

### Task 1.6 — 첫 배포 확인

```bash
# main 브랜치에 push → GitHub Actions 자동 빌드/배포
git add -A
git commit -m "feat: initial project setup with PWA config"
git push origin main

# Azure Portal에서 배포 URL 확인
# https://jinsilcheck-app.azurestaticapps.net 에서 앱 확인
```

### ✅ Sprint 1 완료 기준
- [ ] 빈 React PWA가 Azure Static Web Apps에서 HTTPS로 접속 가능
- [ ] Lighthouse PWA audit 통과 (설치 가능, 오프라인 동작)
- [ ] Azure Functions `/api/health` 엔드포인트가 `{ "status": "ok" }` 반환
- [ ] Cosmos DB 연결 확인
- [ ] 로컬 개발 환경(`swa start`)에서 프론트+API 통합 동작

---

## Sprint 2: Backend — URL 파싱 + 콘텐츠 추출 (Week 3-4)

### 목표
URL을 받아 콘텐츠(이미지)를 추출하는 파이프라인의 앞부분 완성

### Task 2.1 — 타입 정의

**`api/lib/types.ts`**:
```typescript
export type Signal = 'safe' | 'caution' | 'danger';
export type Platform = 'youtube' | 'facebook' | 'instagram' | 'x_twitter' | 'tiktok' | 'kakao' | 'naver' | 'generic';

export interface AnalyzeRequest {
  url: string;
  type: 'url' | 'image';
}

export interface AnalyzeResult {
  signal: Signal;
  confidence: number;         // 0.0 ~ 1.0
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
```

### Task 2.2 — URL 파서 구현

**`api/lib/url-parser.ts`**:
```typescript
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
    if (patterns.some(p => p.test(url))) return platform as Platform;
  }
  return 'generic';
}

export function extractVideoId(url: string, platform: Platform): string | null {
  if (platform === 'youtube') {
    const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
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
    // 트래킹 파라미터 제거
    ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'ref'].forEach(
      p => parsed.searchParams.delete(p)
    );
    return parsed.toString();
  } catch {
    return url;
  }
}
```

### Task 2.3 — 콘텐츠 추출기 구현

**`api/lib/content-extractor.ts`**:
```typescript
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { Platform, extractVideoId } from './url-parser';

export interface ExtractedContent {
  imageUrl: string | null;
  videoUrl: string | null;
  title: string | null;
  description: string | null;
}

export async function extractContent(url: string, platform: Platform): Promise<ExtractedContent> {
  // 플랫폼별 최적화 경로
  if (platform === 'youtube') {
    return extractYouTube(url);
  }

  // 기본: OG 태그 기반 추출
  return extractFromOG(url);
}

async function extractYouTube(url: string): Promise<ExtractedContent> {
  const videoId = extractVideoId(url, 'youtube');
  if (!videoId) throw new Error('YouTube 비디오 ID를 찾을 수 없습니다.');

  // YouTube 썸네일 직접 구성 (API 호출 불필요)
  const imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  // oEmbed로 제목 가져오기
  try {
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`
    );
    const data = await oembed.json() as any;
    return {
      imageUrl,
      videoUrl: url,
      title: data.title || null,
      description: data.author_name || null,
    };
  } catch {
    return { imageUrl, videoUrl: url, title: null, description: null };
  }
}

async function extractFromOG(url: string): Promise<ExtractedContent> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JinsilCheckBot/1.0)',
      'Accept': 'text/html',
    },
    redirect: 'follow',
    timeout: 10000,
  });

  if (!response.ok) throw new Error(`페이지를 가져올 수 없습니다 (${response.status})`);

  const html = await response.text();
  const $ = cheerio.load(html);

  return {
    imageUrl: $('meta[property="og:image"]').attr('content')
           || $('meta[name="twitter:image"]').attr('content')
           || null,
    videoUrl: $('meta[property="og:video"]').attr('content')
           || $('meta[property="og:video:url"]').attr('content')
           || null,
    title: $('meta[property="og:title"]').attr('content')
        || $('title').text()
        || null,
    description: $('meta[property="og:description"]').attr('content') || null,
  };
}
```

### Task 2.4 — Cosmos DB 캐시 구현

**`api/lib/cosmos-cache.ts`**:
```typescript
import { CosmosClient } from '@azure/cosmos';
import { createHash } from 'crypto';
import { CacheEntry } from './types';

const client = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT!,
  key: process.env.COSMOS_DB_KEY!,
});
const container = client
  .database(process.env.COSMOS_DB_DATABASE || 'jinsilcheck')
  .container(process.env.COSMOS_DB_CONTAINER || 'analysis-cache');

export function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex').substring(0, 32);
}

export async function getCached(urlHash: string): Promise<CacheEntry | null> {
  try {
    const { resource } = await container.item(urlHash, urlHash).read<CacheEntry>();
    return resource || null;
  } catch (e: any) {
    if (e.code === 404) return null;
    throw e;
  }
}

export async function setCache(entry: CacheEntry): Promise<void> {
  await container.items.upsert(entry);
}
```

### Task 2.5 — `/api/analyze` 엔드포인트 (Phase 1 — 추출까지)

```typescript
// api/analyze/index.ts
import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { isValidUrl, normalizeUrl, identifyPlatform } from '../lib/url-parser';
import { extractContent } from '../lib/content-extractor';
import { getCached, hashUrl } from '../lib/cosmos-cache';

const analyze: AzureFunction = async function (context: Context, req: HttpRequest) {
  const { url } = req.body || {};

  // 1. URL 검증
  if (!url || !isValidUrl(url)) {
    context.res = {
      status: 400,
      body: {
        status: 'error',
        error: { code: 'INVALID_URL', message_ko: '올바른 링크를 입력해 주세요.' }
      }
    };
    return;
  }

  const normalized = normalizeUrl(url);
  const urlHash = hashUrl(normalized);
  const platform = identifyPlatform(normalized);

  // 2. 캐시 확인
  const cached = await getCached(urlHash);
  if (cached) {
    context.res = {
      status: 200,
      body: { status: 'success', result: { ...cached, cached: true } }
    };
    return;
  }

  // 3. 콘텐츠 추출
  try {
    const content = await extractContent(normalized, platform);

    if (!content.imageUrl) {
      context.res = {
        status: 422,
        body: {
          status: 'error',
          error: { code: 'NO_CONTENT', message_ko: '이 링크에서 이미지를 가져올 수 없습니다. 다른 링크를 시도해 주세요.' }
        }
      };
      return;
    }

    // TODO: Sprint 3에서 AI 탐지 연동
    context.res = {
      status: 200,
      body: {
        status: 'success',
        result: {
          signal: 'caution',
          confidence: 0.5,
          summaryKo: '분석 엔진 연동 중입니다. (개발 중)',
          details: { extractedImage: content.imageUrl, platform },
          cached: false
        }
      }
    };
  } catch (err: any) {
    context.res = {
      status: 500,
      body: {
        status: 'error',
        error: { code: 'EXTRACT_FAILED', message_ko: '링크를 분석하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }
      }
    };
  }
};

export default analyze;
```

### ✅ Sprint 2 완료 기준
- [ ] URL 입력 시 플랫폼 식별 정상 동작 (YouTube, Facebook, Instagram, X, TikTok, 네이버, 카카오, 기타)
- [ ] YouTube URL → 썸네일 이미지 URL 추출 성공
- [ ] 일반 웹페이지 URL → OG 이미지 추출 성공
- [ ] Cosmos DB 캐시 저장/조회 동작
- [ ] `/api/analyze` 엔드포인트가 콘텐츠 정보를 반환
- [ ] 에러 케이스 (잘못된 URL, 이미지 없음 등) 한국어 메시지 반환

---

## Sprint 3: Backend — AI 탐지 엔진 연동 (Week 5-6)

### 목표
SightEngine + Hive AI 연동 완료, 듀얼 엔진 파이프라인 동작

### Task 3.1 — SightEngine 클라이언트

**`api/lib/sightengine-client.ts`**:
```typescript
import fetch from 'node-fetch';

interface SightEngineResult {
  deepfakeScore: number;      // 0.0 ~ 1.0
  faces: number;
  rawResponse: any;
}

export async function analyzeWithSightEngine(imageUrl: string): Promise<SightEngineResult> {
  const params = new URLSearchParams({
    url: imageUrl,
    models: 'deepfake',
    api_user: process.env.SIGHTENGINE_API_USER!,
    api_secret: process.env.SIGHTENGINE_API_SECRET!,
  });

  const response = await fetch(
    `https://api.sightengine.com/1.0/check.json?${params}`,
    { method: 'GET', timeout: 15000 }
  );

  const data = await response.json() as any;

  if (data.status !== 'success') {
    throw new Error(`SightEngine error: ${data.error?.message || 'unknown'}`);
  }

  // SightEngine deepfake 응답 구조:
  // data.faces[0].deepfake = 0.0~1.0 (높을수록 딥페이크)
  const faces = data.faces || [];
  const maxScore = faces.length > 0
    ? Math.max(...faces.map((f: any) => f.deepfake || 0))
    : 0;

  return {
    deepfakeScore: maxScore,
    faces: faces.length,
    rawResponse: data,
  };
}
```

### Task 3.2 — Hive AI 클라이언트

**`api/lib/hive-client.ts`**:
```typescript
import fetch from 'node-fetch';

interface HiveResult {
  deepfakeScore: number;
  aiGeneratedScore: number;
  rawResponse: any;
}

export async function analyzeWithHive(imageUrl: string): Promise<HiveResult> {
  const response = await fetch('https://api.thehive.ai/api/v2/task/sync', {
    method: 'POST',
    headers: {
      'Authorization': `token ${process.env.HIVE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: imageUrl }),
    timeout: 20000,
  });

  const data = await response.json() as any;
  const output = data.status?.[0]?.response?.output || [];

  // Hive 응답에서 deepfake + AI generated 점수 추출
  let deepfakeScore = 0;
  let aiGeneratedScore = 0;

  for (const item of output) {
    for (const cls of item.classes || []) {
      if (cls.class === 'yes_deepfake') deepfakeScore = cls.score || 0;
      if (cls.class === 'ai_generated') aiGeneratedScore = cls.score || 0;
    }
  }

  return { deepfakeScore, aiGeneratedScore, rawResponse: data };
}
```

### Task 3.3 — 결과 종합기

**`api/lib/result-composer.ts`**:
```typescript
import { Signal, AnalyzeResult, Platform } from './types';

const TEMPLATES = {
  safe: {
    high: '이 영상에서 AI가 조작한 흔적이 발견되지 않았습니다. 안심하고 보셔도 됩니다.',
    medium: '이 영상은 대체로 안전해 보입니다. 다만, AI 분석이 완벽하지는 않으니 참고해 주세요.',
  },
  caution: {
    default: '일부 의심스러운 부분이 발견되었습니다. 확신할 수 없으니 신중하게 판단하세요. 다른 뉴스에서도 같은 내용인지 확인해 보시는 것을 권합니다.',
  },
  danger: {
    face_swap: '얼굴이 다른 사람으로 바뀐 흔적이 발견되었습니다. 이 영상을 신뢰하지 마세요.',
    ai_generated: 'AI가 만들어낸 영상일 가능성이 높습니다. 이 영상을 다른 사람에게 보내지 마세요.',
    default: 'AI가 조작한 흔적이 발견되었습니다. 이 영상을 신뢰하지 마세요.',
  },
};

interface ScoreInput {
  primaryScore: number;
  secondaryScore?: number;
  faces: number;
  manipulationType?: string;
  platform: Platform;
}

export function composeResult(input: ScoreInput): {
  signal: Signal;
  confidence: number;
  summaryKo: string;
} {
  let finalScore: number;

  if (input.secondaryScore !== undefined) {
    // 듀얼 엔진: 가중 평균
    finalScore = input.primaryScore * 0.4 + input.secondaryScore * 0.6;
  } else {
    finalScore = input.primaryScore;
  }

  // 신호등 결정
  let signal: Signal;
  if (finalScore >= 0.70) signal = 'danger';
  else if (finalScore >= 0.40) signal = 'caution';
  else signal = 'safe';

  // 한국어 설명 생성
  let summaryKo: string;
  if (signal === 'safe') {
    summaryKo = finalScore <= 0.15 ? TEMPLATES.safe.high : TEMPLATES.safe.medium;
  } else if (signal === 'caution') {
    summaryKo = TEMPLATES.caution.default;
  } else {
    if (input.manipulationType === 'face_swap') {
      summaryKo = TEMPLATES.danger.face_swap;
    } else if (input.manipulationType === 'ai_generated') {
      summaryKo = TEMPLATES.danger.ai_generated;
    } else {
      summaryKo = TEMPLATES.danger.default;
    }
  }

  return { signal, confidence: finalScore, summaryKo };
}
```

### Task 3.4 — 전체 탐지 파이프라인 통합

**`api/lib/detection-pipeline.ts`**:
```typescript
import { analyzeWithSightEngine } from './sightengine-client';
import { analyzeWithHive } from './hive-client';
import { composeResult } from './result-composer';
import { getCached, setCache, hashUrl } from './cosmos-cache';
import { normalizeUrl, identifyPlatform } from './url-parser';
import { extractContent } from './content-extractor';
import { AnalyzeResult, CacheEntry } from './types';
import { v4 as uuid } from 'uuid';

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
  if (primary.deepfakeScore > 0.20 && primary.deepfakeScore < 0.80) {
    try {
      const secondary = await analyzeWithHive(content.imageUrl);
      secondaryScore = Math.max(secondary.deepfakeScore, secondary.aiGeneratedScore);
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
  await setCache(entry).catch(err => console.warn('Cache write failed:', err));

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
```

### Task 3.5 — `/api/analyze` 최종 연동

`analyze/index.ts`를 업데이트하여 `runPipeline()`을 호출하도록 변경합니다.

### ✅ Sprint 3 완료 기준
- [ ] YouTube URL → SightEngine 분석 → 결과 반환 (end-to-end)
- [ ] 모호한 결과(0.20~0.80)일 때 Hive 2차 검증 호출
- [ ] 확실한 결과(≥0.80 또는 ≤0.20)일 때 1차만으로 빠른 반환
- [ ] 신호등(safe/caution/danger) + 한국어 설명 정상 생성
- [ ] 동일 URL 재요청 시 캐시에서 즉시 반환 (< 500ms)
- [ ] SightEngine 실패 시 에러 메시지, Hive 실패 시 1차 결과만 반환 (graceful)
- [ ] Rate limiting: IP당 분당 10건

---

## Sprint 4: Frontend — 핵심 UI 구현 (Week 7-8)

### 목표
노년층 최적화 UI 완성, API와 연동하여 실제 분석 결과 표시

### Task 4.1 — 글로벌 스타일 (노년층 최적화)

**`src/index.css`**: SPEC.md의 UI Design Rules에 따라 구현합니다. 모든 폰트 18px 이상, 터치 영역 60px 이상, WCAG AAA 대비.

### Task 4.2 — 핵심 컴포넌트 구현

구현 순서:
1. `UrlInput.tsx` — URL 입력 필드 + "📋 붙여넣기" 버튼 (Clipboard API 사용)
2. `AnalyzeButton.tsx` — "🔍 확인하기" 메인 CTA 버튼
3. `LoadingSpinner.tsx` — 분석 중 화면 (돋보기 애니메이션 + 진행 바)
4. `SignalLight.tsx` — 신호등 이모지 표시 (🟢/🟡/🔴)
5. `ConfidenceGauge.tsx` — 큰 프로그레스 바 (퍼센트 표시)
6. `ResultCard.tsx` — 신호등 + 게이지 + 한국어 설명을 조합
7. `ImageUpload.tsx` — "📷 사진 직접 확인" 버튼 (file input)
8. `DisclaimerFooter.tsx` — "ⓘ AI가 분석한 참고용 정보입니다"

### Task 4.3 — MainView 조립

**`src/views/MainView.tsx`**: SPEC.md의 와이어프레임에 따라 구현합니다. 상태 흐름:

```
idle → inputting → loading → result → idle
```

### Task 4.4 — useAnalyze 훅

```typescript
// src/hooks/useAnalyze.ts
import { useState } from 'react';
import { analyzeUrl, analyzeImage } from '../utils/api-client';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function useAnalyze() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (url: string) => {
    setStatus('loading');
    setError(null);
    try {
      const data = await analyzeUrl(url);
      setResult(data.result);
      setStatus('success');
      // 히스토리에 저장
      saveToHistory(url, data.result);
    } catch (err: any) {
      setError(err.message_ko || '오류가 발생했습니다. 다시 시도해 주세요.');
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setResult(null);
    setError(null);
  };

  return { status, result, error, analyze, reset };
}
```

### Task 4.5 — HistoryView

`localStorage`에 최근 20건의 판별 내역을 저장합니다. 결과 목록을 카드 형태로 표시하며, 각 카드에 신호등 + URL + 분석 시각을 표시합니다.

### Task 4.6 — GuideView (온보딩)

최초 접속 시 1회 표시되는 3장짜리 카드 가이드:
1. "의심되는 링크를 복사하세요" (스크린샷 예시)
2. "진실체크에 붙여넣으세요" (스크린샷 예시)
3. "결과를 확인하세요" (신호등 예시)

### ✅ Sprint 4 완료 기준
- [ ] MainView에서 URL 붙여넣기 → 확인하기 → 결과 표시 전체 흐름 동작
- [ ] 신호등 3단계 (safe/caution/danger) 시각적으로 명확히 구분
- [ ] 신뢰도 게이지 표시
- [ ] 한국어 설명 표시
- [ ] 로딩 상태 애니메이션
- [ ] 에러 메시지 한국어 표시
- [ ] 이미지 직접 업로드 동작
- [ ] HistoryView에서 이전 판별 내역 조회
- [ ] 모바일(375px~) 반응형 레이아웃 완벽 동작
- [ ] 모든 버튼/입력 필드 터치 영역 60px 이상
- [ ] 폰트 크기 18px 이상 (면책 고지 14px 제외)

---

## Sprint 5: 통합 + PWA 완성 (Week 9-10)

### 목표
프론트+백엔드 완전 통합, PWA 기능 완성, 공유 기능

### Task 5.1 — 프론트-백 통합 테스트

실제 Azure Functions와 연동하여 다양한 URL로 end-to-end 테스트:
- YouTube 일반 영상
- YouTube Shorts
- Instagram Reel
- X(Twitter) 포스트
- Facebook 영상
- TikTok 영상
- 네이버 블로그/뉴스
- 일반 웹페이지

### Task 5.2 — Web Share Target 구현

PWA가 설치된 상태에서 다른 앱의 "공유하기" 대상으로 표시되도록 합니다. 사용자가 카카오톡에서 링크를 길게 눌러 "공유 → 진실체크"를 선택하면 URL이 자동 입력됩니다.

```typescript
// App.tsx에서 URL 파라미터 감지
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const sharedUrl = params.get('shared_url');
  if (sharedUrl) {
    setInputUrl(sharedUrl);
    // 자동으로 분석 시작하지는 않음 — 사용자가 "확인하기" 터치 필요
  }
}, []);
```

### Task 5.3 — 카카오톡 공유 버튼 (P1)

```typescript
function shareToKakao(result: AnalyzeResult, originalUrl: string) {
  const signalText = { safe: '✅ 안전', caution: '⚠️ 주의', danger: '❌ 위험' };
  const text = `[진실체크 결과]\n${signalText[result.signal]}\n${result.summaryKo}\n\n원본 링크: ${originalUrl}`;

  if (navigator.share) {
    navigator.share({ title: '진실체크 결과', text });
  } else {
    navigator.clipboard.writeText(text);
    alert('결과가 복사되었습니다. 카카오톡에 붙여넣기 하세요.');
  }
}
```

### Task 5.4 — 오프라인 페이지

`public/offline.html` 생성 및 Service Worker에서 네트워크 실패 시 표시

### Task 5.5 — PWA 최종 점검

- [ ] Lighthouse PWA audit 통과
- [ ] "홈 화면에 추가" 동작
- [ ] 앱 아이콘 (192px, 512px, maskable) 적용
- [ ] 스플래시 스크린 표시
- [ ] `theme-color` 메타태그 적용
- [ ] 오프라인 안내 페이지 표시

### ✅ Sprint 5 완료 기준
- [ ] 10종 이상 URL로 end-to-end 테스트 통과
- [ ] Web Share Target으로 외부 앱에서 공유 수신
- [ ] 카카오톡/문자 공유 동작
- [ ] PWA 설치 가능 (Android Chrome, iOS Safari)
- [ ] Lighthouse: Performance ≥ 90, Accessibility ≥ 95, PWA ✓
- [ ] 번들 크기 < 200KB (gzip)

---

## Sprint 6: 테스트 + 베타 배포 (Week 11-12)

### 목표
노년층 사용성 테스트, 버그 수정, 베타 공개

### Task 6.1 — 노년층 사용성 테스트

**대상**: 60세 이상 10명 이상  
**장소**: 주민센터, 경로당, 또는 가족 대상  

**테스트 시나리오**:
1. 카카오톡에서 YouTube 링크를 받았다고 가정
2. 진실체크에 접속 (홈 화면 아이콘 또는 URL 직접 입력)
3. 링크를 붙여넣기
4. "확인하기" 탭
5. 결과를 읽고 이해했는지 확인
6. "다른 링크 확인" 으로 초기화

**관찰 항목**:
- 붙여넣기 동작을 성공하는가?
- 결과를 올바르게 이해하는가?
- 글씨 크기가 충분한가?
- 버튼을 정확히 탭하는가?
- 전체 과정에 몇 초 걸리는가?
- 혼동하거나 멈추는 지점은?

### Task 6.2 — 사용성 테스트 피드백 반영

테스트에서 발견된 문제를 우선순위 정하여 수정합니다.

### Task 6.3 — 보안 점검

- [ ] API 키가 프론트엔드 코드에 노출되지 않음
- [ ] CSP 헤더 적용 확인
- [ ] Rate limiting 동작 확인
- [ ] URL 입력 XSS 방지 확인
- [ ] HTTPS 강제 확인

### Task 6.4 — Azure 모니터링 설정

```bash
# Application Insights 연동
az monitor app-insights component create \
  --app jinsilcheck-insights \
  --location koreacentral \
  --resource-group rg-jinsilcheck
```

### Task 6.5 — 베타 배포

```bash
# 프로덕션 배포 (main 브랜치 push로 자동)
git tag v0.1.0-beta
git push origin v0.1.0-beta

# 커스텀 도메인 연결 (선택)
az staticwebapp hostname set \
  --name jinsilcheck-app \
  --resource-group rg-jinsilcheck \
  --hostname jinsilcheck.kr
```

### Task 6.6 — 베타 테스터 모집

- 목표: 100명 이상 베타 테스터
- 채널: 시니어 커뮤니티, 가족 네트워크, 주민센터 홍보
- 피드백: 인앱 "이것은 틀리지 않나요?" 버튼 + 간단한 설문

### ✅ Sprint 6 완료 기준 (= MVP 완료)
- [ ] 노년층 10명+ 사용성 테스트 완료, 주요 문제 해결
- [ ] 보안 점검 통과
- [ ] Azure 모니터링 작동
- [ ] 베타 URL로 100명+ 접속 가능
- [ ] 주요 에러율 < 5%
- [ ] 평균 분석 시간 < 8초

---

## Post-MVP Roadmap

### Phase 2 (v0.2 — MVP+3개월)
- [ ] 영상 딥페이크 탐지 (프레임 추출 → 분석)
- [ ] 판별 히스토리 클라우드 동기화 (선택적 가입)
- [ ] 가족 알림 기능 (카카오톡 알림 API)
- [ ] 한국어 음성 인터페이스 (Web Speech API)
- [ ] 오디오 딥페이크 탐지

### Phase 3 (v1.0 — MVP+6개월)
- [ ] 실시간 영상통화 딥페이크 탐지
- [ ] 브라우저 확장 (Chrome/Edge)
- [ ] AI 맞춤 미디어 리터러시 교육 콘텐츠
- [ ] 정부 팩트체크 DB 연동 (다음 뉴스 팩트체크 등)
- [ ] 가족 대시보드 (자녀가 부모의 판별 현황 확인)
- [ ] 다국어 지원 (영어)

---

## Quick Reference: 핵심 명령어

```bash
# 로컬 개발
swa start                               # 프론트+API 통합 로컬 실행

# 빌드
npm run build                           # 프론트엔드 빌드
cd api && npm run build                 # API 빌드

# 배포 (자동)
git push origin main                    # GitHub Actions → Azure 자동 배포

# 수동 배포
swa deploy dist --api-location api      # SWA CLI 직접 배포

# 로그 확인
az functionapp log tail \
  --name jinsilcheck-app \
  --resource-group rg-jinsilcheck

# Cosmos DB 데이터 확인
az cosmosdb sql query \
  --account-name jinsilcheck-db \
  --database-name jinsilcheck \
  --container-name analysis-cache \
  --query "SELECT * FROM c ORDER BY c.analyzedAt DESC OFFSET 0 LIMIT 10"
```
