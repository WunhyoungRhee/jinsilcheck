import SignalLight from './SignalLight';
import ConfidenceGauge from './ConfidenceGauge';
import type { AnalyzeResultData } from '../hooks/useAnalyze';

interface Props {
  result: AnalyzeResultData;
  onReset: () => void;
  originalUrl?: string;
}

export default function ResultCard({ result, onReset, originalUrl }: Props) {
  const handleShare = async () => {
    const signalText = { safe: '✅ 안전', caution: '⚠️ 주의', danger: '❌ 위험' };
    const text = `[진실체크 결과]\n${signalText[result.signal]}\n${result.summaryKo}${originalUrl ? `\n\n원본 링크: ${originalUrl}` : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: '진실체크 결과', text });
      } catch { /* 사용자가 공유 취소 */ }
    } else {
      await navigator.clipboard.writeText(text);
      alert('결과가 복사되었습니다. 카카오톡에 붙여넣기 하세요.');
    }
  };

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 16,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        alignItems: 'center',
      }}
    >
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>분석 결과</h2>

      <SignalLight signal={result.signal} />

      <ConfidenceGauge confidence={result.confidence} signal={result.signal} />

      <p style={{ fontSize: 18, lineHeight: 1.7, textAlign: 'center' }}>
        {result.summaryKo}
      </p>

      <button
        type="button"
        onClick={handleShare}
        style={{
          background: 'var(--color-accent)',
          color: '#fff',
          width: '100%',
          minHeight: 56,
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        📤 가족에게 알려주기
      </button>

      <button
        type="button"
        onClick={onReset}
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-primary)',
          border: '2px solid #ddd',
          width: '100%',
          minHeight: 56,
          fontSize: 18,
        }}
      >
        🔍 다른 링크 확인
      </button>
    </div>
  );
}
