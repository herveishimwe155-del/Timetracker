// Error monitoring on the server and in the proxy. Off until NEXT_PUBLIC_SENTRY_DSN is set.
import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

export async function register() {
  if (!sentryOptions.dsn) return;
  Sentry.init({ ...sentryOptions, environment: process.env.VERCEL_ENV ?? "development" });
}

/** Reports errors thrown while rendering pages, route handlers and server actions. */
export const onRequestError = Sentry.captureRequestError;
