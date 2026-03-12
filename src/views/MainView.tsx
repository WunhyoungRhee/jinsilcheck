import { useState, useEffect } from 'react';
import UrlInput from '../components/UrlInput';
import AnalyzeButton from '../components/AnalyzeButton';
import ImageUpload from '../components/ImageUpload';
import LoadingSpinner from '../components/LoadingSpinner';
import ResultCard from '../components/ResultCard';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { useAnalyze } from '../hooks/useAnalyze';
import { isValidUrl } from '../utils/url-validator';

export default function MainView() {
  const [url, setUrl] = useState('');
  const { status, result, error, analyze, analyzeFile, reset } = useAnalyze();

  // Web Share Target: URL 파라미터로 공유된 URL 감지
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get('shared_url');
    if (sharedUrl) {
      setUrl(sharedUrl);
    }
  }, []);

  const handleAnalyze = () => {
    if (isValidUrl(url)) {
      analyze(url);
    }
  };

  const handleFileSelect = (file: File) => {
    analyzeFile(file);
  };

  const handleReset = () => {
    setUrl('');
    reset();
  };

  // 로딩 상태
  if (status === 'loading') {
    return (
      <div style={{ padding: '0 20px', maxWidth: 480, margin: '0 auto', width: '100%' }}>
        <LoadingSpinner />
      </div>
    );
  }

  // 결과 상태
  if (status === 'success' && result) {
    return (
      <div style={{ padding: '24px 20px', maxWidth: 480, margin: '0 auto', width: '100%' }}>
        <ResultCard result={result} onReset={handleReset} originalUrl={url} />
        <DisclaimerFooter />
      </div>
    );
  }

  // 기본(idle) + 에러 상태
  return (
    <div style={{ padding: '24px 20px', maxWidth: 480, margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 'var(--font-heading)', fontWeight: 700 }}>
          🔍 진실체크
        </h1>
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--touch-gap)',
        }}
      >
        <p style={{ fontSize: 18, textAlign: 'center', lineHeight: 1.6 }}>
          의심되는 링크를
          <br />
          여기에 붙여넣으세요
        </p>

        <UrlInput value={url} onChange={setUrl} />

        <AnalyzeButton
          onClick={handleAnalyze}
          disabled={!isValidUrl(url)}
        />

        <div
          style={{
            textAlign: 'center',
            fontSize: 16,
            color: '#999',
            padding: '4px 0',
          }}
        >
          또는
        </div>

        <ImageUpload onFileSelect={handleFileSelect} />
      </div>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: '#FEF2F2',
            borderRadius: 12,
            color: 'var(--color-danger)',
            fontSize: 16,
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <a
          href="/history"
          style={{ fontSize: 18, color: 'var(--color-accent)' }}
        >
          📋 이전 기록
        </a>
      </div>

      <DisclaimerFooter />
    </div>
  );
}
