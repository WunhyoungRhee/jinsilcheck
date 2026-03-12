interface Props {
  confidence: number; // 0.0 ~ 1.0
  signal: 'safe' | 'caution' | 'danger';
}

const COLOR_MAP = {
  safe: 'var(--color-safe)',
  caution: 'var(--color-caution)',
  danger: 'var(--color-danger)',
};

export default function ConfidenceGauge({ confidence, signal }: Props) {
  const percent = Math.round(confidence * 100);

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          width: '100%',
          height: 20,
          background: '#eee',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: COLOR_MAP[signal],
            borderRadius: 10,
            transition: 'width 0.8s ease',
          }}
        />
      </div>
      <p
        style={{
          textAlign: 'center',
          fontSize: 20,
          fontWeight: 600,
          marginTop: 8,
          color: COLOR_MAP[signal],
        }}
      >
        확신도 {percent}%
      </p>
    </div>
  );
}
