"use client";

import posthog from "posthog-js";

/**
 * Product analytics (PostHog). Off until NEXT_PUBLIC_POSTHOG_KEY is set.
 * Privacy: no cookies or local storage (memory persistence), users are known only
 * by their account id, no autocapture of clicks or text, no session recordings.
 */
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

/** Every event the app sends, so names stay consistent. */
export type AnalyticsEvent =
  | "timer_started"
  | "timer_stopped"
  | "entry_created"
  | "entry_updated"
  | "entry_deleted"
  | "project_created"
  | "client_created"
  | "tag_created"
  | "report_viewed"
  | "csv_exported"
  | "settings_saved"
  | "goal_created"
  | "week_copied";

let started = false;

/** Starts analytics for a signed-in user (once per page load). */
export function startAnalytics(userId: string) {
  if (!KEY || started || typeof window === "undefined") return;
  posthog.init(KEY, {
    api_host: HOST,
    persistence: "memory",
    autocapture: false,
    capture_pageview: "history_change",
    capture_pageleave: true,
    disable_session_recording: true,
    respect_dnt: true,
    person_profiles: "identified_only",
  });
  posthog.identify(userId);
  started = true;
}

export function track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean | null>) {
  if (started) posthog.capture(event, properties);
}

/** Forget the user on sign-out. */
export function stopAnalytics() {
  if (started) posthog.reset();
}
