// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://45312e8dcb67ebbdf015e23aa522953f@o4510547306283008.ingest.de.sentry.io/4510547389186128",

  // Set environment (development, staging, production)
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

  // Capture 100% of errors, but only 10% of transactions for performance monitoring
  // Adjust this value in production based on your needs
  tracesSampleRate: 0.1,

  // Capture replay sessions for debugging
  // This records user sessions to help reproduce errors
  replaysSessionSampleRate: 0.1, // 10% of normal sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Only send errors in production (optional - remove this line to test in development)
  enabled: process.env.NODE_ENV === 'production',

  // Ignore common non-critical errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'ChunkLoadError',
    'Loading chunk',
    'ChunkLoadError:',
    /Loading chunk [\d]+ failed/,
    'Multiple Sentry Session Replay instances are not supported',
  ],

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // This helps track which users experienced errors
  sendDefaultPii: true,

  // Filter sensitive data before sending to Sentry
  beforeSend(event, hint) {
    // Remove sensitive data from error reports
    if (event.request) {
      // Remove cookies (may contain auth tokens)
      delete event.request.cookies;

      // Remove potentially sensitive headers
      if (event.request.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.Cookie;
      }
    }

    // Don't send errors from browser extensions
    if (event.exception?.values?.[0]?.stacktrace?.frames) {
      const frames = event.exception.values[0].stacktrace.frames;
      const hasExtensionFrame = frames.some(frame =>
        frame.filename?.includes('extension://') ||
        frame.filename?.includes('chrome-extension://') ||
        frame.filename?.includes('moz-extension://')
      );

      if (hasExtensionFrame) {
        return null; // Don't send this error
      }
    }

    // Filter out localhost errors in production build
    if (event.request?.url?.includes('localhost')) {
      return null;
    }

    return event;
  },

  // Integration settings
  integrations: [
    Sentry.replayIntegration({
      // Mask all text and user input for privacy
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
