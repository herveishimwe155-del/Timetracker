"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

/** Shown in place of a page that crashed; the sidebar and timer bar stay usable. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div role="alert" className="mt-8 flex flex-col items-center gap-3 rounded-md border border-danger/40 px-6 py-12 text-center">
      <AlertTriangle className="size-5 text-danger" strokeWidth={1.75} aria-hidden />
      <h1 className="text-base font-medium">This page hit a problem</h1>
      <p className="max-w-sm text-muted-foreground">
        Your time entries are safe. Try again, and if it keeps happening, reload the page.
      </p>
      {error.digest && <p className="tabular text-xs text-muted-foreground">Reference: {error.digest}</p>}
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  );
}
