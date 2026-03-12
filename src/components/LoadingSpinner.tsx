import { useState, useEffect } from 'react';

export default function LoadingSpinner() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + Math.random() * 15));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div
        style={{
          fontSize: 64,
          marginBottom: 24,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      >
        🔍
      </div>
      <p style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
        분석 중입니다...
      </p>
      <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
        AI가 이 링크의 내용을
        <br />
        꼼꼼히 확인하고 있어요.
        <br />
        잠시만 기다려 주세요.
      </p>
      <div
        style={{
          width: '100%',
          height: 12,
          background: '#eee',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'var(--color-accent)',
            borderRadius: 6,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <p style={{ fontSize: 14, color: '#999', marginTop: 8 }}>
        {Math.round(progress)}%
      </p>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
