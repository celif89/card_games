import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import './style.css';

// Gra wczytała się poprawnie — kolejna awaria wczytywania znów może spróbować przeładować stronę.
try {
  sessionStorage.removeItem('miasteczko-reloaded');
} catch {
  // brak dostępu do pamięci sesji
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
