import { useState } from 'react';

interface Props {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export default function UrlInput({ value, onChange, disabled }: Props) {
  const [pasteSuccess, setPasteSuccess] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text.trim());
        setPasteSuccess(true);
        setTimeout(() => setPasteSuccess(false), 2000);
      }
    } catch {
      // clipboard API 불가 시 무시 (사용자가 직접 붙여넣기)
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="링크를 여기에 붙여넣으세요"
        disabled={disabled}
        style={{ fontSize: 18 }}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={handlePaste}
        disabled={disabled}
        style={{
          background: pasteSuccess ? 'var(--color-safe)' : 'var(--color-accent)',
          color: '#fff',
          width: '100%',
          minHeight: 56,
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        {pasteSuccess ? '붙여넣기 완료!' : '📋 붙여넣기'}
      </button>
    </div>
  );
}
