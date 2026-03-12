import { useHistory } from '../hooks/useHistory';
import DisclaimerFooter from '../components/DisclaimerFooter';

const SIGNAL_DISPLAY = {
  safe: { emoji: '🟢', label: '안전', color: 'var(--color-safe)' },
  caution: { emoji: '🟡', label: '주의', color: 'var(--color-caution)' },
  danger: { emoji: '🔴', label: '위험', color: 'var(--color-danger)' },
};

export default function HistoryView() {
  const { items, clearHistory } = useHistory();

  return (
    <div style={{ padding: '24px 20px', maxWidth: 480, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 'var(--font-heading)', fontWeight: 700 }}>
          📋 이전 기록
        </h1>
        <a href="/" style={{ fontSize: 18 }}>← 돌아가기</a>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#999' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>📭</p>
          <p style={{ fontSize: 18 }}>아직 확인한 링크가 없습니다.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item, i) => {
              const display = SIGNAL_DISPLAY[item.signal];
              return (
                <div
                  key={i}
                  style={{
                    background: 'var(--color-surface)',
                    borderRadius: 12,
                    padding: 16,
                    borderLeft: `4px solid ${display.color}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>{display.emoji}</span>
                    <span style={{ fontSize: 18, fontWeight: 600, color: display.color }}>
                      {display.label}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 14,
                    color: '#666',
                    wordBreak: 'break-all',
                    marginBottom: 4,
                  }}>
                    {item.url}
                  </p>
                  <p style={{ fontSize: 13, color: '#999' }}>
                    {new Date(item.analyzedAt).toLocaleString('ko-KR')}
                  </p>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={clearHistory}
            style={{
              marginTop: 24,
              background: 'transparent',
              color: '#999',
              border: '1px solid #ddd',
              width: '100%',
              fontSize: 16,
            }}
          >
            기록 전체 삭제
          </button>
        </>
      )}

      <DisclaimerFooter />
    </div>
  );
}
