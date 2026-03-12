import { useRef } from 'react';

interface Props {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export default function ImageUpload({ onFileSelect, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-primary)',
          border: '2px solid #ddd',
          width: '100%',
          minHeight: 52,
          fontSize: 18,
        }}
      >
        📷 사진 직접 확인
      </button>
    </>
  );
}
