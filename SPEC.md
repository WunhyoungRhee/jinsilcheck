# 진실체크 (JinsilCheck) — Technical Specification

> **Version**: 1.0.0  
> **Last Updated**: 2026-03-10  
> **Status**: Draft  

---

## 1. Product Overview

### 1.1 Mission
SNS를 통해 급속히 확산되는 딥페이크 영상/이미지를 60대 이상 노년층이 **링크(URL) 붙여넣기 한 번**으로 판별할 수 있는 PWA 웹앱.

### 1.2 Core Concept
```
"받은 링크, 붙여넣기만 하세요. 진실이 판별해 드립니다."
```

### 1.3 Key Constraints
| 항목 | 결정 사항 |
|------|----------|
| 앱 형태 | PWA (Progressive Web App) |
| 배포 환경 | Microsoft Azure (Static Web Apps + Functions) |
| 주 사용자 | 60대 이상 노년층 |
| 핵심 입력 | URL 붙여넣기 (+ 이미지 직접 업로드 보조) |
| 탐지 방식 | 외부 AI API 활용 (자체 모델 없음) |
| 언어 | 한국어 전용 (v1) |
| 인증 | 없음 (비로그인 서비스) |

---

## 2. System Architecture

### 2.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    사용자 스마트폰                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              PWA (React + Vite)                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │  │
│  │  │ URL 입력  │  │ 결과 표시 │  │  히스토리 뷰   │  │  │
│  │  │  화면     │  │   화면   │  │    (로컬)      │  │  │
│  │  └──────────┘  └──────────┘  └────────────────┘  │  │
│  │              Service Worker (캐시/오프라인)         │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────────────────────┐
│                 Azure Static Web Apps                     │
│                  (Global CDN + HTTPS)                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │          정적 자산 (HTML/CSS/JS/Icons)               │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────┘
                           │ /api/*
                           ▼
┌──────────────────────────────────────────────────────────┐
│              Azure Functions (Node.js 20)                 │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ /api/    │  │ /api/        │  │ /api/             │  │
│  │ analyze  │  │ analyze-image│  │ health            │  │
│  │          │  │              │  │                   │  │
│  └────┬─────┘  └──────┬───────┘  └───────────────────┘  │
│       │               │                                  │
│  ┌────▼───────────────▼──────────────────────────────┐  │
│  │              Core Detection Pipeline               │  │
│  │                                                    │  │
│  │  1. URL 검증 & 플랫폼 식별                          │  │
│  │  2. 캐시 확인 (Cosmos DB)                           │  │
│  │  3. 콘텐츠 추출 (OG/oEmbed/스크래핑)                │  │
│  │  4. 1차 탐지 → SightEngine API                     │  │
│  │  5. 2차 검증 → Hive AI API (조건부)                 │  │
│  │  6. 결과 종합 & 한국어 설명 생성                     │  │
│  │  7. 캐시 저장 & 응답 반환                           │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────┬────────────┬──────────────────────────────┘
               │            │
               ▼            ▼
┌──────────────────┐  ┌───────────────────┐
│  Azure Cosmos DB │  │  External AI APIs  │
│  (Serverless)    │  │                   │
│                  │  │  • SightEngine    │
│  • URL 캐시      │  │  • Hive AI        │
│  • 분석 결과     │  │                   │
│  • 통계 데이터   │  │                   │
│  (TTL: 24시간)   │  │                   │
└──────────────────┘  └───────────────────┘
```

### 2.2 Tech Stack

| Layer | Technology | Version | 근거 |
|-------|-----------|---------|------|
| Frontend Framework | React | 18.x | PWA 생태계 최강, SWA 네이티브 지원 |
| Build Tool | Vite | 5.x | 빠른 빌드, PWA 플러그인 지원 |
| PWA Plugin | vite-plugin-pwa | 0.20+ | Service Worker 자동 생성 |
| UI Library | 없음 (Custom CSS) | - | 노년층 최적화를 위해 직접 구현 |
| Language | TypeScript | 5.x | 타입 안정성 |
| Backend Runtime | Azure Functions | Node.js 20 | SWA 통합, Consumption Plan |
| Database | Azure Cosmos DB | Serverless | TTL 지원, 무료 티어 |
| Hosting | Azure Static Web Apps | Standard | CDN, HTTPS, CI/CD |
| CI/CD | GitHub Actions | - | SWA 자동 통합 |

### 2.3 External APIs

| API | 용도 | 무료 티어 | 과금 |
|-----|------|----------|------|
| SightEngine | 1차 딥페이크 탐지 (이미지) | 월 500건 | ~$0.001/건 |
| Hive AI | 2차 교차 검증 | 월 100건 (개발자) | 기업 문의 |
| Open Graph / oEmbed | URL 메타데이터 추출 | 무제한 | 무료 |

---

## 3. Frontend Specification

### 3.1 Page Structure

앱은 **단일 페이지(SPA)** 구조로, 3개의 뷰만 존재합니다:

```
/                → MainView     (URL 입력 + 결과 표시)
/history         → HistoryView  (이전 판별 내역)
/guide           → GuideView    (사용법 안내 — 최초 1회 표시)
```

### 3.2 MainView — 핵심 화면

```
┌──────────────────────────────────┐
│         🔍 진실체크               │  ← 앱 로고/이름 (24sp, bold)
│                                  │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  │   의심되는 링크를            │  │  ← 안내 텍스트 (18sp)
│  │   여기에 붙여넣으세요        │  │
│  │                            │  │
│  │  ┌──────────────────────┐  │  │
│  │  │ [URL 입력 필드]       │  │  │  ← 큰 입력 필드 (높이 60px)
│  │  │                      │  │  │     placeholder: "링크를 여기에..."
│  │  └──────────────────────┘  │  │
│  │                            │  │
│  │  ┌──────────────────────┐  │  │
│  │  │                      │  │  │
│  │  │    📋 붙여넣기        │  │  │  ← 큰 버튼 (높이 56px, 파란색)
│  │  │                      │  │  │
│  │  └──────────────────────┘  │  │
│  │                            │  │
│  │  ┌──────────────────────┐  │  │
│  │  │                      │  │  │
│  │  │   🔍 확인하기         │  │  │  ← 메인 버튼 (높이 64px, 주황색)
│  │  │                      │  │  │
│  │  └──────────────────────┘  │  │
│  │                            │  │
│  │       또는                  │  │
│  │                            │  │
│  │  ┌──────────────────────┐  │  │
│  │  │   📷 사진 직접 확인   │  │  │  ← 보조 버튼 (높이 52px, 회색)
│  │  └──────────────────────┘  │  │
│  └────────────────────────────┘  │
│                                  │
│  ─────────────────────────────── │
│  [📋 이전 기록]                   │  ← 하단 링크
│                                  │
│  ⓘ AI가 분석한 참고용 정보입니다   │  ← 면책 고지 (14sp, 회색)
└──────────────────────────────────┘
```

### 3.3 ResultView — 결과 화면 (MainView 내 표시)

```
┌──────────────────────────────────┐
│                                  │
│  ┌────────────────────────────┐  │
│  │       분석 결과              │  │
│  │                            │  │
│  │    ┌────────────────┐      │  │
│  │    │                │      │  │
│  │    │   🟢 안전       │      │  │  ← 신호등 (72sp 이모지 + 28sp 텍스트)
│  │    │                │      │  │     또는 🟡 주의 / 🔴 위험
│  │    └────────────────┘      │  │
│  │                            │  │
│  │  ┌──────────────────────┐  │  │
│  │  │ ████████████░░░ 87%  │  │  │  ← 신뢰도 게이지 (큰 프로그레스바)
│  │  └──────────────────────┘  │  │
│  │                            │  │
│  │  이 영상에서 AI가 조작한     │  │  ← 설명 (18sp, 평문 한국어)
│  │  흔적이 발견되지 않았습니다.  │  │
│  │  안심하고 보셔도 됩니다.     │  │
│  │                            │  │
│  │  ┌──────────────────────┐  │  │
│  │  │  📤 가족에게 알려주기  │  │  │  ← 카카오톡 공유 (P1)
│  │  └──────────────────────┘  │  │
│  │                            │  │
│  │  ┌──────────────────────┐  │  │
│  │  │  🔍 다른 링크 확인    │  │  │  ← 초기화 버튼
│  │  └──────────────────────┘  │  │
│  │                            │  │
│  │  ┌──────────────────────┐  │  │
│  │  │ ❓ 이것은 틀리지      │  │  │  ← 이의제기 버튼
│  │  │    않나요?            │  │  │
│  │  └──────────────────────┘  │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### 3.4 Loading State

```
┌──────────────────────────────────┐
│                                  │
│                                  │
│         🔍                       │  ← 돋보기 아이콘 애니메이션
│                                  │
│     분석 중입니다...              │  ← 18sp
│                                  │
│   AI가 이 링크의 내용을           │  ← 16sp, 회색
│   꼼꼼히 확인하고 있어요.         │
│                                  │
│   잠시만 기다려 주세요.           │
│                                  │
│   ████████░░░░░░░░ 45%          │  ← 진행 바
│                                  │
└──────────────────────────────────┘
```

### 3.5 UI Design Rules

```css
/* 노년층 UI 핵심 규칙 */

/* 폰트 크기 */
--font-body: 18px;        /* 본문 최소 */
--font-heading: 24px;     /* 제목 */
--font-result: 28px;      /* 결과 텍스트 */
--font-signal: 72px;      /* 신호등 이모지 */
--font-caption: 14px;     /* 면책 고지 등 보조 텍스트 */

/* 터치 영역 */
--touch-min: 60px;        /* 최소 터치 높이 (일반 48px보다 큼) */
--touch-main: 64px;       /* 메인 버튼 높이 */
--touch-gap: 16px;        /* 버튼 간 최소 간격 */

/* 색상 — WCAG AAA (7:1 대비) */
--color-primary: #1B3A5C;     /* 네이비 (텍스트) */
--color-accent: #2E75B6;      /* 블루 (버튼) */
--color-action: #E67E22;      /* 오렌지 (메인 CTA) */
--color-bg: #FFFFFF;          /* 흰색 배경 */
--color-surface: #F5F8FC;     /* 연한 배경 */

/* 신호등 색상 */
--color-safe: #27AE60;        /* 파랑/초록 — 안전 */
--color-caution: #F39C12;     /* 노랑 — 주의 */
--color-danger: #E74C3C;      /* 빨강 — 위험 */

/* 배제할 UI 패턴 */
/* ❌ 드롭다운 메뉴 */
/* ❌ 슬라이더 */
/* ❌ 제스처 전용 조작 (스와이프 필수 등) */
/* ❌ 햄버거 메뉴 */
/* ❌ 작은 글씨의 링크 텍스트 */
/* ❌ 자동 슬라이드/캐러셀 */
/* ❌ 팝업/모달 레이어 */
/* ❌ 탭 바 네비게이션 */
```

---

## 4. Backend API Specification

### 4.1 Endpoints

#### `POST /api/analyze`
URL 기반 딥페이크 분석 요청

**Request:**
```json
{
  "url": "https://youtube.com/watch?v=abc123",
  "type": "url"
}
```

**Response (성공):**
```json
{
  "status": "success",
  "result": {
    "signal": "danger",
    "confidence": 0.87,
    "summary_ko": "AI가 조작한 흔적이 발견되었습니다. 이 영상을 신뢰하지 마세요.",
    "details": {
      "primary_engine": "sightengine",
      "primary_score": 0.85,
      "secondary_engine": "hive",
      "secondary_score": 0.89,
      "detected_faces": 1,
      "manipulation_type": "face_swap"
    },
    "source_platform": "youtube",
    "analyzed_at": "2026-03-10T09:30:00Z",
    "cached": false
  }
}
```

**Response (에러):**
```json
{
  "status": "error",
  "error": {
    "code": "UNSUPPORTED_URL",
    "message_ko": "이 링크는 분석할 수 없습니다. YouTube, Facebook, Instagram, X(트위터), TikTok 링크를 사용해 주세요."
  }
}
```

#### `POST /api/analyze-image`
이미지 직접 업로드 분석

**Request:** `multipart/form-data`
- `image`: 이미지 파일 (JPEG, PNG, WebP / 최대 10MB)

**Response:** `/api/analyze`와 동일한 형식

#### `GET /api/health`
서비스 상태 확인

**Response:**
```json
{
  "status": "ok",
  "engines": {
    "sightengine": "ok",
    "hive": "ok"
  },
  "timestamp": "2026-03-10T09:30:00Z"
}
```

### 4.2 Detection Pipeline Logic

```
입력 URL 수신
    │
    ▼
[1] URL 유효성 검증
    ├── 유효하지 않음 → 에러 반환 ("올바른 링크를 입력해 주세요")
    │
    ▼
[2] 지원 플랫폼 식별
    │   YouTube, Facebook, Instagram, X, TikTok,
    │   카카오톡(공유링크), 네이버(블로그/카페), 기타 웹페이지
    ├── 미지원 → 에러 반환 ("이 링크는 분석할 수 없습니다")
    │
    ▼
[3] 캐시 확인 (Cosmos DB)
    │   Key: SHA256(normalized_url)
    │   TTL: 24시간
    ├── 캐시 HIT → 캐시된 결과 즉시 반환 (cached: true)
    │
    ▼
[4] 콘텐츠 추출
    │   4a. Open Graph 메타태그에서 og:image / og:video 추출
    │   4b. oEmbed API 호출 (YouTube, Instagram 등)
    │   4c. 플랫폼별 썸네일 URL 패턴 적용
    │       - YouTube: https://img.youtube.com/vi/{id}/maxresdefault.jpg
    │       - 기타: og:image 사용
    ├── 추출 실패 → 에러 반환 ("링크에서 이미지를 가져올 수 없습니다")
    │
    ▼
[5] 1차 탐지 (SightEngine API)
    │   POST https://api.sightengine.com/1.0/check.json
    │   params: { url: <image_url>, models: "deepfake" }
    │
    │   결과: deepfake_score (0.0 ~ 1.0)
    │
    ├── score ≥ 0.80 → signal: "danger"  → [7]로 이동
    ├── score ≤ 0.20 → signal: "safe"    → [7]로 이동
    │
    ▼
[6] 2차 검증 (Hive AI API) — score 0.20 ~ 0.80일 때만
    │   POST https://api.thehive.ai/api/v2/task/sync
    │   body: { url: <image_url> }
    │   header: { Authorization: "token <HIVE_API_KEY>" }
    │
    │   결과: is_deepfake score
    │
    │   최종 점수 = (sightengine * 0.4) + (hive * 0.6)
    │
    ├── 최종 ≥ 0.70 → signal: "danger"
    ├── 최종 0.40~0.70 → signal: "caution"
    ├── 최종 ≤ 0.40 → signal: "safe"
    │
    ▼
[7] 결과 종합
    │   - signal 결정 (safe / caution / danger)
    │   - confidence 점수 (0~100%)
    │   - 한국어 설명 생성 (템플릿 기반)
    │   - Cosmos DB에 캐시 저장 (TTL: 24h)
    │
    ▼
[8] JSON 응답 반환
```

### 4.3 Korean Explanation Templates

```javascript
const TEMPLATES = {
  safe: {
    high: "이 영상에서 AI가 조작한 흔적이 발견되지 않았습니다. 안심하고 보셔도 됩니다.",
    medium: "이 영상은 대체로 안전해 보입니다. 다만, AI 분석이 완벽하지는 않으니 참고해 주세요."
  },
  caution: {
    default: "일부 의심스러운 부분이 발견되었습니다. 확신할 수 없으니 신중하게 판단하세요. 다른 뉴스에서도 같은 내용인지 확인해 보시는 것을 권합니다."
  },
  danger: {
    face_swap: "얼굴이 다른 사람으로 바뀐 흔적이 발견되었습니다. 이 영상을 신뢰하지 마세요.",
    ai_generated: "AI가 만들어낸 영상일 가능성이 높습니다. 이 영상을 다른 사람에게 보내지 마세요.",
    default: "AI가 조작한 흔적이 발견되었습니다. 이 영상을 신뢰하지 마세요."
  }
};
```

### 4.4 Supported Platforms & URL Parsing

```javascript
const PLATFORM_PATTERNS = {
  youtube: [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ],
  facebook: [
    /facebook\.com\/.*\/videos\//,
    /fb\.watch\//,
  ],
  instagram: [
    /instagram\.com\/(p|reel|tv)\//,
  ],
  x_twitter: [
    /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
  ],
  tiktok: [
    /tiktok\.com\/@[\w.]+\/video\/(\d+)/,
    /vm\.tiktok\.com\//,
  ],
  kakao: [
    /open\.kakao\.com\//,
    /pf\.kakao\.com\//,
  ],
  naver: [
    /blog\.naver\.com\//,
    /cafe\.naver\.com\//,
    /n\.news\.naver\.com\//,
  ],
  generic: [
    /^https?:\/\/.+/,  // 기타 모든 URL
  ]
};
```

---

## 5. PWA Configuration

### 5.1 Web App Manifest (`manifest.json`)

```json
{
  "name": "진실체크 - 딥페이크 판별",
  "short_name": "진실체크",
  "description": "받은 링크를 붙여넣으면 AI가 딥페이크를 판별해 드립니다",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FFFFFF",
  "theme_color": "#1B3A5C",
  "lang": "ko",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "categories": ["utilities", "news"],
  "share_target": {
    "action": "/",
    "method": "GET",
    "params": {
      "url": "shared_url"
    }
  }
}
```

> **`share_target`**: 다른 앱에서 "공유하기"를 누르면 진실체크가 공유 대상으로 표시되어 URL이 자동 입력됩니다.

### 5.2 Service Worker Strategy

```javascript
// Workbox 전략

// 1. 정적 자산: Cache First (앱 셸)
registerRoute(
  ({ request }) => request.destination === 'style' ||
                   request.destination === 'script' ||
                   request.destination === 'image',
  new CacheFirst({ cacheName: 'static-assets', plugins: [
    new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 })
  ]})
);

// 2. API 호출: Network Only (실시간 분석 필수)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkOnly()
);

// 3. HTML: Network First (최신 UI 우선, 오프라인 시 캐시)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages' })
);
```

### 5.3 Offline Page

오프라인 시 간단한 안내 페이지를 표시합니다:
```
"인터넷에 연결되어 있지 않습니다.
 링크를 확인하려면 인터넷 연결이 필요합니다.
 Wi-Fi 또는 데이터를 켜고 다시 시도해 주세요."
```

---

## 6. Azure Configuration

### 6.1 Static Web Apps Config (`staticwebapp.config.json`)

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/icons/*", "/assets/*", "*.css", "*.js", "*.png", "*.svg", "*.ico"]
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    }
  ],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html"
    }
  },
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'; connect-src 'self' https://api.sightengine.com https://api.thehive.ai; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'"
  }
}
```

### 6.2 Azure Functions Config

```
api/
├── package.json
├── host.json
├── analyze/
│   ├── function.json
│   └── index.ts
├── analyze-image/
│   ├── function.json
│   └── index.ts
├── health/
│   ├── function.json
│   └── index.ts
└── lib/
    ├── detection-pipeline.ts
    ├── url-parser.ts
    ├── content-extractor.ts
    ├── sightengine-client.ts
    ├── hive-client.ts
    ├── result-composer.ts
    ├── cosmos-cache.ts
    └── types.ts
```

### 6.3 Environment Variables

```
# Azure Functions Application Settings
SIGHTENGINE_API_USER=<your_api_user>
SIGHTENGINE_API_SECRET=<your_api_secret>
HIVE_API_KEY=<your_hive_api_key>
COSMOS_DB_ENDPOINT=<your_cosmos_endpoint>
COSMOS_DB_KEY=<your_cosmos_key>
COSMOS_DB_DATABASE=jinsilcheck
COSMOS_DB_CONTAINER=analysis-cache
```

### 6.4 Cosmos DB Schema

```javascript
// Container: analysis-cache
// Partition Key: /urlHash
// TTL: 86400 (24시간)
{
  "id": "<uuid>",
  "urlHash": "<sha256_of_normalized_url>",
  "originalUrl": "https://youtube.com/watch?v=abc",
  "platform": "youtube",
  "signal": "danger",
  "confidence": 0.87,
  "primaryScore": 0.85,
  "secondaryScore": 0.89,
  "summaryKo": "AI가 조작한 흔적이 발견되었습니다.",
  "analyzedAt": "2026-03-10T09:30:00Z",
  "ttl": 86400
}
```

---

## 7. Project Structure

```
jinsilcheck/
├── .github/
│   └── workflows/
│       └── azure-static-web-apps.yml      # CI/CD
├── api/                                    # Azure Functions
│   ├── package.json
│   ├── tsconfig.json
│   ├── host.json
│   ├── analyze/
│   │   ├── function.json
│   │   └── index.ts
│   ├── analyze-image/
│   │   ├── function.json
│   │   └── index.ts
│   ├── health/
│   │   ├── function.json
│   │   └── index.ts
│   └── lib/
│       ├── detection-pipeline.ts
│       ├── url-parser.ts
│       ├── content-extractor.ts
│       ├── sightengine-client.ts
│       ├── hive-client.ts
│       ├── result-composer.ts
│       ├── cosmos-cache.ts
│       └── types.ts
├── src/                                    # React PWA
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                           # 전역 스타일 (노년층 최적화)
│   ├── views/
│   │   ├── MainView.tsx                    # URL 입력 + 결과
│   │   ├── HistoryView.tsx                 # 판별 내역
│   │   └── GuideView.tsx                   # 사용법 (온보딩)
│   ├── components/
│   │   ├── UrlInput.tsx                    # URL 입력 필드 + 붙여넣기 버튼
│   │   ├── ImageUpload.tsx                 # 이미지 업로드 버튼
│   │   ├── AnalyzeButton.tsx               # 확인하기 메인 버튼
│   │   ├── LoadingSpinner.tsx              # 분석 중 화면
│   │   ├── ResultCard.tsx                  # 결과 카드 (신호등 + 설명)
│   │   ├── SignalLight.tsx                 # 신호등 컴포넌트
│   │   ├── ConfidenceGauge.tsx             # 신뢰도 게이지
│   │   ├── ShareButton.tsx                 # 카카오톡 공유
│   │   └── DisclaimerFooter.tsx            # 면책 고지
│   ├── hooks/
│   │   ├── useAnalyze.ts                   # 분석 API 호출 훅
│   │   └── useHistory.ts                   # localStorage 히스토리 관리
│   ├── utils/
│   │   ├── api-client.ts                   # API 호출 래퍼
│   │   └── url-validator.ts                # 클라이언트 URL 사전 검증
│   └── assets/
│       ├── icons/                          # PWA 아이콘
│       └── images/                         # 가이드 이미지
├── public/
│   ├── manifest.json
│   ├── staticwebapp.config.json
│   ├── favicon.ico
│   ├── offline.html
│   └── icons/
├── swa-cli.config.json
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 8. Performance Targets

| Metric | Target | 측정 방법 |
|--------|--------|----------|
| 첫 로딩 (LCP) | < 2초 | Lighthouse |
| URL 분석 (캐시 HIT) | < 500ms | API 응답 시간 |
| URL 분석 (1차만) | < 5초 | API 응답 시간 |
| URL 분석 (1차+2차) | < 12초 | API 응답 시간 |
| PWA 설치 가능 | Yes | Lighthouse PWA audit |
| Lighthouse Performance | ≥ 90 | Lighthouse |
| Lighthouse Accessibility | ≥ 95 | Lighthouse |
| 오프라인 동작 | 안내 페이지 표시 | Service Worker |
| 번들 크기 | < 200KB (gzip) | Vite build |

---

## 9. Security Considerations

- **HTTPS Only**: Azure SWA가 자동 제공
- **API Keys**: Azure Functions Application Settings에 저장 (코드에 절대 포함 금지)
- **CORS**: SWA 도메인만 허용
- **Rate Limiting**: Azure Functions에서 IP당 분당 10건 제한
- **CSP**: 엄격한 Content-Security-Policy 헤더 적용
- **입력 검증**: URL 형식 검증, XSS 방지
- **데이터 최소화**: 원본 이미지 저장 안 함, URL 해시와 결과만 24시간 캐시
- **면책 고지**: 모든 결과에 "AI 참고용" 문구 표시
