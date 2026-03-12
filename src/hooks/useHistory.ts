import { useState, useEffect } from 'react';

export interface HistoryItem {
  url: string;
  signal: 'safe' | 'caution' | 'danger';
  confidence: number;
  summaryKo: string;
  analyzedAt: string;
}

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('jinsilcheck_history') || '[]');
      setItems(stored);
    } catch { /* ignore */ }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('jinsilcheck_history');
    setItems([]);
  };

  return { items, clearHistory };
}
