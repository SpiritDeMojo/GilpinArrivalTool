import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeProvider';
import { ViewProvider } from './contexts/ViewProvider';
import { HotkeysProvider } from './contexts/HotkeysProvider';
import { UserProvider } from './contexts/UserProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <UserProvider>
    <ThemeProvider>
      <ViewProvider>
        <HotkeysProvider>
          <App />
        </HotkeysProvider>
      </ViewProvider>
    </ThemeProvider>
  </UserProvider>
);
