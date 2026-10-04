"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NewEntryButton } from "@/components/entries/NewEntryButton";
import { EntryList } from "@/components/entries/EntryList";
import { useNow } from "@/lib/queries/clock";
import { useRangeEntries } from "@/lib/queries/entries";
import { useSettings } from "@/lib/queries/profile";
import { useIsClient } from "@/hooks/use-is-client";
import { useLocalStorageFlag } from "@/hooks/use-local-storage-flag";
import { addDaysToKey, dayKey, dayLabel, formatDuration, shortDayLabel } from "@/lib/time";
import { isoWeek, weekOf } from "@/lib/views";
import { splitByDay, rangeInstants } from "@/lib/reports";
import { CalendarView } from "./CalendarView";
import { GoalsPanel } from "./GoalsPanel";
import { ProjectSummaryBar } from "./ProjectSummaryBar";
import { TimesheetView } from "./TimesheetView";

export const VIEWS = ["calendar", "list", "timesheet"] as const;
export type TimerView = (typeof VIEWS)[number];
const VIEW_LABELS: Record<TimerView, string> = { calendar: "Calendar", list: "List view", timesheet: "Timesheet" };
const KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The Timer page: Calendar, List and Timesheet views over the user's entries. */
export function TimerViews() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { timeZone, weekStart, durationFormat } = useSettings();
  const now = useNow(1000);
  const today = dayKey(now, timeZone);
  const [weekMode, setWeekMode] = useLocalStorageFlag("calendar-week-view", false);

  const view: TimerView = (VIEWS as readonly string[]).includes(params.get("view") ?? "")
    ? (params.get("view") as TimerView)
    : "list";
  const dateParam = params.get("date");
  const anchor = dateParam && KEY_PATTERN.test(dateParam) ? dateParam : today;

  const setParams = useCallback(
    (next: { view?: TimerView; date?: string | null }) => {
      const q = new URLSearchParams(params);
      if (next.view) q.set("view", next.view);
      if (next.date !== undefined) {
        if (next.date && next.date !== today) q.set("date", next.date);
        else q.delete("date");
      }
      router.replace(`${pathname}?${q}`, { scroll: false });
    },
    [params, pathname, router, today],
  );

  // The week around the anchor date feeds the totals, summary bar, calendar and timesheet.
  const week = useMemo(() => weekOf(anchor, weekStart), [anchor, weekStart]);
  const { data: weekEntries = [], isSuccess: weekLoaded } = useRangeEntries(week, timeZone);
  // Goals always measure the present week (same cache entry when viewing this week).
  const currentWeek = useMemo(() => weekOf(today, weekStart), [today, weekStart]);
  const { data: currentEntries = [] } = useRangeEntries(currentWeek, timeZone);

  const totals = useMemo(() => {
    const { fromMs, toMs } = rangeInstants(week, timeZone);
    let weekMs = 0;
    let dayMs = 0;
    for (const e of weekEntries) {
      for (const part of splitByDay(e, timeZone, now, fromMs, toMs)) {
        weekMs += part.ms;
        if (part.key === (view === "list" ? today : anchor)) dayMs += part.ms;
      }
    }
    return { weekMs, dayMs };
  }, [weekEntries, week, timeZone, now, today, anchor, view]);

  const dayMode = view === "calendar" && !weekMode;
  const step = dayMode ? 1 : 7;
  const isCurrent = dayMode ? anchor === today : week.from <= today && today < week.to;
  const label =
    view === "list"
      ? "All dates"
      : dayMode
        ? `${anchor === today ? "Today" : dayLabel(anchor, timeZone, now)} · ${shortDayLabel(anchor).split(" ")[0]}`
        : `${isCurrent ? "This week" : `${shortDayLabel(week.from)} – ${shortDayLabel(addDaysToKey(week.to, -1))}`} · W${isoWeek(week.from)}`;
  const fmt = (ms: number) => formatDuration(Math.floor(ms / 1000), durationFormat);
  const isClient = useIsClient();

  // Everything here depends on the current time and the browser's time zone, which the
  // server can't know; drawing it only in the browser avoids hydration mismatches.
  if (!isClient) {
    return <div className="mt-3 h-64 animate-pulse rounded-md bg-surface" aria-busy="true" aria-label="Loading" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Timer</h1>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
        {/* Date navigator */}
        <div className="flex h-9 items-center rounded-md shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            aria-label={dayMode ? "Previous day" : "Previous week"}
            disabled={view === "list"}
            onClick={() => setParams({ date: addDaysToKey(anchor, -step) })}
          >
            <ChevronLeft />
          </Button>
          <button
            type="button"
            onClick={() => setParams({ date: null })}
            disabled={view === "list" || isCurrent}
            title={isCurrent ? undefined : "Back to today"}
            className="flex min-w-44 items-center justify-center gap-2 rounded-sm px-2 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
          >
            <CalendarDays className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            {label}
          </button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={dayMode ? "Next day" : "Next week"}
            disabled={view === "list"}
            onClick={() => setParams({ date: addDaysToKey(anchor, step) })}
          >
            <ChevronRight />
          </Button>
        </div>

        {/* Totals */}
        <dl className="flex items-baseline gap-4 text-xs text-muted-foreground uppercase">
          <div className="flex items-baseline gap-2">
            <dt>{view === "list" || anchor === today ? "Today" : shortDayLabel(anchor)}</dt>
            <dd className="tabular text-sm text-foreground normal-case">{fmt(totals.dayMs)}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt>Week total</dt>
            <dd className="tabular text-sm text-foreground normal-case">{fmt(totals.weekMs)}</dd>
          </div>
        </dl>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {view === "calendar" && (
            <div className="flex rounded-md p-0.5 shadow-sm" role="group" aria-label="Calendar range">
              {[false, true].map((week) => (
                <button
                  key={String(week)}
                  type="button"
                  aria-pressed={weekMode === week}
                  onClick={() => setWeekMode(week)}
                  className={cn(
                    "rounded-sm px-2.5 py-1 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                    weekMode === week && "bg-surface-2 text-foreground",
                  )}
                >
                  {week ? "Week" : "Day"}
                </button>
              ))}
            </div>
          )}

          {/* View switch */}
          <div className="flex rounded-md p-0.5 shadow-sm" role="group" aria-label="View">
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setParams({ view: v })}
                className={cn(
                  "rounded-sm px-3 py-1 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                  view === v && "bg-brand/10 text-brand shadow-[inset_0_0_0_1px_var(--brand)]",
                )}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
          <NewEntryButton />
        </div>
      </div>

      <ProjectSummaryBar entries={weekEntries} week={week} timeZone={timeZone} nowMs={now} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
      {view === "list" && <EntryList />}
      {view === "calendar" && (
        <CalendarView
          days={dayMode ? [anchor] : (Array.from({ length: 7 }, (_, i) => addDaysToKey(week.from, i)))}
          entries={weekEntries}
          today={today}
          timeZone={timeZone}
          nowMs={now}
          durationFormat={durationFormat}
          ready={weekLoaded}
        />
      )}
      {view === "timesheet" && (
        <TimesheetView week={week} entries={weekEntries} today={today} timeZone={timeZone} nowMs={now} durationFormat={durationFormat} />
      )}
        </div>
        <GoalsPanel
          entries={currentEntries}
          today={today}
          week={currentWeek}
          timeZone={timeZone}
          nowMs={now}
          durationFormat={durationFormat}
        />
      </div>
    </div>
  );
}
