# 진실체크 (JinsilCheck)

가짜 영상들을 걸러내는 AI 팩트 체크 앱

## 앱 실행

> **https://victorious-bay-0dc3bad00.1.azurestaticapps.net**

위 링크를 클릭하면 바로 사용할 수 있습니다.

## 사용 방법

1. 의심되는 영상 링크를 붙여넣기
2. "확인하기" 버튼 클릭
3. AI가 딥페이크 여부를 분석하여 결과 표시
   - 안전 (초록) / 주의 (노랑) / 위험 (빨강)

## 지원 플랫폼

YouTube, Facebook, Instagram, X(Twitter), TikTok, 카카오, 네이버 등

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | React + TypeScript + Vite |
| 백엔드 | Azure Functions (Node.js) |
| AI 분석 | SightEngine (1차) + Hive (2차) |
| 배포 | Azure Static Web Apps |
| 캐시 | Azure Cosmos DB |

## 로컬 개발

```bash
# 의존성 설치
npm install
cd api && npm install && cd ..

# 개발 서버 실행
npm run dev
```

## 프로젝트 구조

```
jinsilcheck/
├── src/           # 프론트엔드 (React)
├── api/           # 백엔드 (Azure Functions)
├── public/        # 정적 파일
├── dist/          # 빌드 결과물
└── .github/       # CI/CD 워크플로우
```
