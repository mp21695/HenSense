import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import HistoryCard from './components/HistoryCard';
import Login from './components/Login';
import ModelInfo from './components/ModelInfo';
import Navbar from './components/Navbar';
import Optimizer from './components/Optimizer';
import Register from './components/Register';
import ResultCard from './components/ResultCard';
import Settings from './components/Settings';
import UploadCard from './components/UploadCard';
import { useAuth } from './contexts/AuthContext';
import useLocalStorage from './hooks/useLocalStorage';

export default function App() {
  const { user } = useAuth();
  const [route, setRoute] = useState(
    () => window.location.hash.replace('#', '') || '/'
  );

  // ✅ RESULT STATE (stable)
  const [result, setResult] = useState(null);

  useEffect(() => {
    const handler = () =>
      setRoute(window.location.hash.replace('#', '') || '/');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const historyKey = (username) => `cf_history_v1:${username || 'guest'}`;
  const [history, setHistory] = useLocalStorage(historyKey(user?.username), []);

  const addHistory = (entry) => {
    setHistory((prev) => [entry, ...(prev || [])].slice(0, 200));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(historyKey(user?.username));
  };

  /* ---------------- ROUTE CONTENT ---------------- */

  let content = null;

  if (route === '/login') {
    content = <Login onSuccess={() => (window.location.hash = '#/')} />;
  } else if (route === '/register') {
    content = <Register />;
  } else if (route === '/optimizer') {
    content = <Optimizer />;
  } else if (route === '/model') {
    content = <ModelInfo />;
  } else if (route === '/dashboard') {
    content = <Dashboard history={history} />;
  } else if (route === '/settings') {
    content = <Settings onClearHistory={clearHistory} />;
  } else {
    // ✅ WIDESCREEN HORIZONTAL HOME LAYOUT (LEFT: UPLOAD + HISTORY, RIGHT: HORIZONTAL RESULT CARD)
    content = (
      <main className="max-w-[1440px] mx-auto px-5 py-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <section className="lg:col-span-4 space-y-4">
          <UploadCard
            onResult={(d) => {
              setResult(d);
            }}
            addHistory={addHistory}
          />
          <HistoryCard items={history} />
        </section>

        <section className="lg:col-span-8">
          <ResultCard data={result} />
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      {content}
    </div>
  );
}
