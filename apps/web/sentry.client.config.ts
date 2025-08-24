import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: false,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      
      // Don't send events in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Sentry Event:', event, hint);
        return null;
      }
      
      return event;
    },
    
    ignoreErrors: [
      // Ignore common browser errors
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Ignore network errors
      'NetworkError',
      'Failed to fetch',
    ],
  });
}