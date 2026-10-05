/**
 * Content Security Policy, built per request with a fresh nonce (see src/proxy.ts).
 * Scripts run only from this origin or with the nonce; data goes only to Supabase,
 * and to Sentry / PostHog EU when those are switched on.
 */
export function contentSecurityPolicy(nonce: string, supabaseUrl: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const supabase = new URL(supabaseUrl);
  const connect = [
    "'self'",
    supabase.origin,
    `wss://${supabase.host}`,
    "https://*.ingest.sentry.io",
    "https://*.ingest.de.sentry.io",
    "https://eu.i.posthog.com",
    "https://eu-assets.i.posthog.com",
  ];
  if (isDev) connect.push("ws:");

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes (Radix positioning, chart sizes) can't carry a nonce.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src ${connect.join(" ")}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${supabase.origin}`,
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
