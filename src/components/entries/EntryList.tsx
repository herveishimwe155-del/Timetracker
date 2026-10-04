"use client";

import { useMemo } from "react";
import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shell/EmptyState";
import { TimerDigits } from "@/components/timer/TimerDigits";
import { useNow } from "@/lib/queries/clock";
import { useEntryPages, useRunningEntry } from "@/lib/queries/entries";
import { useSettings } from "@/lib/queries/profile";
import { groupByDay } from "@/lib/time";
import { EntryRow } from "./EntryRow";

export function EntryList() {
  const { timeZone } = useSettings();
  const { data, isPending, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useEntryPages(timeZone);
  const { data: running = null } = useRunningEntry();
  const now = useNow(1000, running !== null);

  const groups = useMemo(() => {
    const entries = data?.pages.flatMap((p) => p.entries) ?? [];
    // Include the running timer so today's total ticks with it; its row lives in the timer bar.
    return groupByDay(running ? [running, ...entries] : entries, timeZone, now);
  }, [data, running, timeZone, now]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading entries">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-sm bg-surface" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-md border border-danger/40 p-4">
        <p>Your entries couldn&apos;t be loaded.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const listed = groups.filter((g) => g.entries.some((e) => e.stop_at));
  if (listed.length === 0) {
    return (
      <EmptyState icon={Clock} title={running ? "Timer running" : "No time entries yet"}>
        {running ? (
          "Stop the timer to see the entry here."
        ) : (
          <>
            Press <kbd className="tabular text-foreground">S</kbd> to start the timer, or{" "}
            <kbd className="tabular text-foreground">N</kbd> to add an entry by hand.
          </>
        )}
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {listed.map((group) => (
        <section key={group.key} aria-labelledby={`day-${group.key}`} className="rounded-md bg-surface/30 shadow-sm">
          <header className="flex h-10 items-center justify-between border-b border-line px-3">
            <h2 id={`day-${group.key}`} className="font-medium">
              {group.label}
            </h2>
            <span className="flex items-center gap-3 text-muted-foreground">
              <span className="text-xs">Total</span>
              <TimerDigits seconds={group.seconds} size="sm" className="w-[8ch] text-right" />
              {/* Keeps totals aligned with the row durations above the action buttons. */}
              <span className="w-14" aria-hidden />
            </span>
          </header>
          <ul className="divide-y divide-line">
            {group.entries
              .filter((e) => e.stop_at)
              .map((entry) => (
                <EntryRow key={entry.id} entry={entry} timeZone={timeZone} nowMs={now} />
              ))}
          </ul>
        </section>
      ))}

      {hasNextPage && (
        <Button variant="outline" className="self-center" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage && <Loader2 className="animate-spin" />}
          Load earlier entries
        </Button>
      )}
    </div>
  );
}
