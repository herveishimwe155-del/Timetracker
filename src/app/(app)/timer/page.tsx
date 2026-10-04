import { Suspense } from "react";
import type { Metadata } from "next";
import { TimerViews } from "@/components/timer-views/TimerViews";

export const metadata: Metadata = { title: "Timer" };

export default function TimerPage() {
  return (
    // TimerViews reads ?view= and ?date= from the URL, which needs a Suspense boundary.
    <Suspense fallback={<div className="mt-3 h-64 animate-pulse rounded-md bg-surface" aria-busy="true" aria-label="Loading" />}>
      <TimerViews />
    </Suspense>
  );
}
