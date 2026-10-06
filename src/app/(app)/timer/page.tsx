import { Suspense } from "react";
import type { Metadata } from "next";
import { TimerViews } from "@/components/timer-views/TimerViews";

export const metadata: Metadata = { title: "Timer" };

export default function TimerPage() {
  return (
    <>
      {/* Server-rendered so the page always has its heading, even while the views load. */}
      <h1 className="sr-only">Timer</h1>
      {/* TimerViews reads ?view= and ?date= from the URL, which needs a Suspense boundary. */}
      <Suspense
        fallback={<div role="status" aria-label="Loading" aria-busy="true" className="mt-3 h-64 animate-pulse rounded-md bg-surface" />}
      >
        <TimerViews />
      </Suspense>
    </>
  );
}
