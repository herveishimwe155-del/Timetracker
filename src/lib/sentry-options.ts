/**
 * Shared Sentry settings for the browser, server and proxy.
 *
 * Privacy: Sentry 11 collects cookies, headers and request bodies by default. Our
 * cookies hold the Supabase session, so all of it is off. Errors carry only the
 * stack trace, the page, and the account id set by MonitoringProvider.
 */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Sample a tenth of page loads and requests for performance data.
  tracesSampleRate: 0.1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
  },
};
