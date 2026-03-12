import { useState } from 'react';
import { analyzeUrl, analyzeImage } from '../utils/api-client';

export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface AnalyzeResultData {
  signal: 'safe' | 'caution' | 'danger';
  confidence: number;
  summaryKo: string;
  sourcePlatform?: string;
  analyzedAt?: string;
  cached?: boolean;
}

function saveToHistory(url: string, result: AnalyzeResultData) {
  try {
    const history = JSON.parse(localStorage.getItem('jinsilcheck_history') || '[]');
    history.unshift({
      url,
      signal: result.signal,
      confidence: result.confidence,
      summaryKo: result.summaryKo,
      analyzedAt: result.analyzedAt || new Date().toISOString(),
    });
    // 최근 20건만 유지
    localStorage.setItem('jinsilcheck_history', JSON.stringify(history.slice(0, 20)));
  } catch { /* localStorage 사용 불가 시 무시 */ }
}

export function useAnalyze() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<AnalyzeResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (url: string) => {
    setStatus('loading');
    setError(null);
    try {
      const data = await analyzeUrl(url);
      setResult(data.result);
      setStatus('success');
      saveToHistory(url, data.result);
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다. 다시 시도해 주세요.');
      setStatus('error');
    }
  };

  const analyzeFile = async (file: File) => {
    setStatus('loading');
    setError(null);
    try {
      const data = await analyzeImage(file);
      setResult(data.result);
      setStatus('success');
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다. 다시 시도해 주세요.');
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setResult(null);
    setError(null);
  };

  return { status, result, error, analyze, analyzeFile, reset };
}
