"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { startAnalytics } from "@/lib/analytics";

/** Tags errors and analytics with the account id (never the email). */
export function MonitoringProvider({ userId, children }: { userId: string | null; children: React.ReactNode }) {
  useEffect(() => {
    if (!userId) return; // guests: nothing to tag, no analytics
    Sentry.setUser({ id: userId });
    startAnalytics(userId);
  }, [userId]);
  return children;
}
