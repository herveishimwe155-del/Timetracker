"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Last-resort error page when the root layout itself fails. It renders its own
 * document without the app's stylesheet, so the Monolith colours are inline.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#09090B",
          color: "#FAFAFA",
          fontFamily: "system-ui, sans-serif",
          fontSize: 14,
        }}
      >
        <title>Something went wrong · Time Tracker</title>
        <main role="alert" style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 16, fontWeight: 500 }}>Something went wrong</h1>
          <p style={{ color: "#A1A1AA" }}>Your time entries are safe. Try again or reload the page.</p>
          <button
            onClick={() => retry()}
            style={{
              marginTop: 8,
              padding: "8px 14px",
              border: 0,
              borderRadius: 4,
              background: "#10B981",
              color: "#09090B",
              font: "inherit",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
