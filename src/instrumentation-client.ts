// Error monitoring in the browser. Off until NEXT_PUBLIC_SENTRY_DSN is set.
import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

if (sentryOptions.dsn) {
  Sentry.init({ ...sentryOptions, environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development" });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
