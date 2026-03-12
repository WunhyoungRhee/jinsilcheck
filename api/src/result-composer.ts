import { Signal, Platform } from './types';

const TEMPLATES = {
  safe: {
    high: '이 영상에서 AI가 조작한 흔적이 발견되지 않았습니다. 안심하고 보셔도 됩니다.',
    medium:
      '이 영상은 대체로 안전해 보입니다. 다만, AI 분석이 완벽하지는 않으니 참고해 주세요.',
  },
  caution: {
    default:
      '일부 의심스러운 부분이 발견되었습니다. 확신할 수 없으니 신중하게 판단하세요. 다른 뉴스에서도 같은 내용인지 확인해 보시는 것을 권합니다.',
  },
  danger: {
    face_swap:
      '얼굴이 다른 사람으로 바뀐 흔적이 발견되었습니다. 이 영상을 신뢰하지 마세요.',
    ai_generated:
      'AI가 만들어낸 영상일 가능성이 높습니다. 이 영상을 다른 사람에게 보내지 마세요.',
    default:
      'AI가 조작한 흔적이 발견되었습니다. 이 영상을 신뢰하지 마세요.',
  },
};

export interface ScoreInput {
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
    finalScore = input.primaryScore * 0.4 + input.secondaryScore * 0.6;
  } else {
    finalScore = input.primaryScore;
  }

  // 신호등 결정
  let signal: Signal;
  if (finalScore >= 0.7) signal = 'danger';
  else if (finalScore >= 0.4) signal = 'caution';
  else signal = 'safe';

  // 한국어 설명 생성
  let summaryKo: string;
  if (signal === 'safe') {
    summaryKo =
      finalScore <= 0.15 ? TEMPLATES.safe.high : TEMPLATES.safe.medium;
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
