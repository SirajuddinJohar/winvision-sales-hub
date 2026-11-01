import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import { initLiveUpdates } from './lib/updater'
import './index.css'

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('App root element is missing');
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

// Capgo OTA: report the app as ready so automatic live updates can roll out.
void initLiveUpdates();
