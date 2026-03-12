interface Props {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function AnalyzeButton({ onClick, disabled, loading }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: 'var(--color-action)',
        color: '#fff',
        width: '100%',
        minHeight: 'var(--touch-main)',
        fontSize: 20,
        fontWeight: 700,
      }}
    >
      {loading ? '분석 중...' : '🔍 확인하기'}
    </button>
  );
}
