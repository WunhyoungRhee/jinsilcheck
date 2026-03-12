interface Props {
  signal: 'safe' | 'caution' | 'danger';
}

const SIGNAL_MAP = {
  safe: { emoji: '🟢', label: '안전', color: 'var(--color-safe)' },
  caution: { emoji: '🟡', label: '주의', color: 'var(--color-caution)' },
  danger: { emoji: '🔴', label: '위험', color: 'var(--color-danger)' },
};

export default function SignalLight({ signal }: Props) {
  const { emoji, label, color } = SIGNAL_MAP[signal];

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--font-signal)', lineHeight: 1.2 }}>
        {emoji}
      </div>
      <div
        style={{
          fontSize: 'var(--font-result)',
          fontWeight: 700,
          color,
          marginTop: 8,
        }}
      >
        {label}
      </div>
    </div>
  );
}
