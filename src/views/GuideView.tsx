import { useState } from 'react';

const STEPS = [
  {
    emoji: '📱',
    title: '1. 링크를 복사하세요',
    desc: '카카오톡이나 SNS에서 의심되는 링크를 길게 눌러 복사합니다.',
  },
  {
    emoji: '📋',
    title: '2. 붙여넣으세요',
    desc: '진실체크에서 "붙여넣기" 버튼을 누르면 자동으로 입력됩니다.',
  },
  {
    emoji: '🔍',
    title: '3. 결과를 확인하세요',
    desc: '🟢안전 🟡주의 🔴위험 — 신호등처럼 쉽게 확인할 수 있습니다.',
  },
];

interface Props {
  onComplete: () => void;
}

export default function GuideView({ onComplete }: Props) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('jinsilcheck_guide_seen', 'true');
      onComplete();
    }
  };

  const current = STEPS[step];

  return (
    <div
      style={{
        padding: '48px 24px',
        maxWidth: 480,
        margin: '0 auto',
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
      }}
    >
      <div style={{ fontSize: 80, marginBottom: 24 }}>{current.emoji}</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        {current.title}
      </h2>
      <p style={{ fontSize: 18, color: '#555', lineHeight: 1.7, marginBottom: 40 }}>
        {current.desc}
      </p>

      {/* 진행 표시 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: i === step ? 'var(--color-accent)' : '#ddd',
            }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleNext}
        style={{
          background: 'var(--color-action)',
          color: '#fff',
          width: '100%',
          minHeight: 'var(--touch-main)',
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        {step < STEPS.length - 1 ? '다음' : '시작하기'}
      </button>

      {step < STEPS.length - 1 && (
        <button
          type="button"
          onClick={() => {
            localStorage.setItem('jinsilcheck_guide_seen', 'true');
            onComplete();
          }}
          style={{
            marginTop: 16,
            background: 'transparent',
            color: '#999',
            fontSize: 16,
          }}
        >
          건너뛰기
        </button>
      )}
    </div>
  );
}
