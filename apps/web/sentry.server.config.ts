// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://45312e8dcb67ebbdf015e23aa522953f@o4510547306283008.ingest.de.sentry.io/4510547389186128",

  // Set environment
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  // Lower in production to reduce costs (10% instead of 100%)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,

  // Only send errors in production
  enabled: process.env.NODE_ENV === 'production',

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Filter sensitive data on server-side
  beforeSend(event) {
    // Remove environment variables from error reports (may contain secrets)
    if (event.contexts?.runtime?.env) {
      delete event.contexts.runtime.env;
    }

    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers.Authorization;
      delete event.request.headers.Cookie;
      delete event.request.headers['X-Api-Key'];
    }

    return event;
  },
});
