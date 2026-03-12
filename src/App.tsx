import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import MainView from './views/MainView';
import HistoryView from './views/HistoryView';
import GuideView from './views/GuideView';

export default function App() {
  const [showGuide, setShowGuide] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const seen = localStorage.getItem('jinsilcheck_guide_seen');
    if (!seen) setShowGuide(true);
  }, []);

  if (showGuide) {
    return <GuideView onComplete={() => { setShowGuide(false); navigate('/'); }} />;
  }

  return (
    <Routes>
      <Route path="/" element={<MainView />} />
      <Route path="/history" element={<HistoryView />} />
    </Routes>
  );
}
