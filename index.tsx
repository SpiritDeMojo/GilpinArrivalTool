import './tailwind.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './contexts/ThemeProvider';
import { ViewProvider } from './contexts/ViewProvider';
import { HotkeysProvider } from './contexts/HotkeysProvider';
import { UserProvider } from './contexts/UserProvider';
import { GuestProvider } from './contexts/GuestProvider';
import './styles/design-tokens.css';

// ── Legacy query-param redirect ────────────────────────────────────────────
// Redirects old ?session=ID URLs to /session/ID for backward compatibility.
const LegacyRedirect: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session');
  if (sessionId) {
    return <Navigate to={`/session/${sessionId}`} replace />;
  }
  return <App />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Cache the React root on the DOM element to prevent double-createRoot during Vite HMR.
// On HMR re-execution, reuse the existing root instead of creating a new one.
const existingRoot = (rootElement as any).__reactRoot;
const root = existingRoot || createRoot(rootElement);
if (!existingRoot) (rootElement as any).__reactRoot = root;

root.render(
  <BrowserRouter>
    <UserProvider>
      <ThemeProvider>
        <ViewProvider>
          <HotkeysProvider>
            <GuestProvider>
              <Routes>
                <Route path="/" element={<LegacyRedirect />} />
                <Route path="/session/:sessionId" element={<App />} />
                <Route path="/session/:sessionId/:tab" element={<App />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </GuestProvider>
          </HotkeysProvider>
        </ViewProvider>
      </ThemeProvider>
    </UserProvider>
  </BrowserRouter>
);
