import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';

// Initialize Sentry for frontend error tracking
const sentryDsn = import.meta.env.VITE_SENTRY_DSN || '';
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
  console.log('✅ Sentry frontend monitoring initialized');
} else {
  console.log('⚠️  VITE_SENTRY_DSN not set - frontend monitoring disabled');
}


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
if (typeof window !== 'undefined') {
  (window as Window & { __CAFEDUO_GOOGLE_CLIENT_ID__?: string }).__CAFEDUO_GOOGLE_CLIENT_ID__ = googleClientId;
}
const appTree = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>{appTree}</GoogleOAuthProvider>
      ) : (
        appTree
      )}
    </ErrorBoundary>
  </React.StrictMode>
);
