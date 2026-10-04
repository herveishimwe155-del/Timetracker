"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorageNumber } from "@/hooks/use-local-storage-flag";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAppCommands } from "@/components/command/AppCommands";
import { useCatalogMaps } from "@/lib/queries/catalog";
import type { Entry } from "@/lib/queries/entries";
import { NO_PROJECT_COLOR, splitByDay } from "@/lib/reports";
import { addDaysToKey, formatDuration, shortDayLabel, timeOfDay, wallTimeToInstant, weekdayOfKey, type DurationFormat } from "@/lib/time";
import { layoutDay, minutesToTime, snapMinutes } from "@/lib/views";

/** Pixels per hour at each zoom level. */
const ZOOM = [40, 60, 90, 120];
const DEFAULT_ZOOM = 1; // 60px per hour, like Toggl
const FULL_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Shortest block, so a few-second entry is still readable and clickable. */
const MIN_BLOCK = 24;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

type Props = {
  days: string[];
  entries: Entry[];
  today: string;
  timeZone: string;
  nowMs: number;
  durationFormat: DurationFormat;
  /** False until the entries have loaded, so the first scroll lands on real entries. */
  ready: boolean;
};

type Drag = { day: string; fromMin: number; toMin: number };

export function CalendarView({ days, entries, today, timeZone, nowMs, durationFormat, ready }: Props) {
  const { openEditor } = useAppCommands();
  const catalog = useCatalogMaps();
  const [zoom, setZoom] = useLocalStorageNumber("calendar-zoom", DEFAULT_ZOOM, 0, ZOOM.length - 1);
  const [drag, setDrag] = useState<Drag | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const hour = ZOOM[zoom];
  const pxToMin = (px: number) => (px / hour) * 60;

  // Start scrolled to an hour before the first entry, or to 08:00.
  const firstMinute = useMemo(() => {
    const starts = days.flatMap((d) => layoutDay(entries, d, timeZone, nowMs).map((b) => b.startMin));
    return starts.length ? Math.min(...starts) : 8 * 60;
  }, [days, entries, timeZone, nowMs]);
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    const key = days.join(",");
    if (!ready || !scroller.current || scrolledFor.current === key) return;
    scrolledFor.current = key;
    scroller.current.scrollTop = Math.max(0, ((firstMinute - 60) / 60) * hour);
  }, [days, firstMinute, hour, ready]);

  const dayTotal = (day: string) => {
    const from = wallTimeToInstant(day, "00:00", timeZone).getTime();
    const to = wallTimeToInstant(addDaysToKey(day, 1), "00:00", timeZone).getTime();
    return entries.reduce((sum, e) => sum + splitByDay(e, timeZone, nowMs, from, to).reduce((s, p) => s + p.ms, 0), 0);
  };

  const minuteAt = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return pxToMin(event.clientY - rect.top);
  };

  const finishDrag = () => {
    if (!drag) return;
    let from = Math.min(drag.fromMin, drag.toMin);
    let to = Math.max(drag.fromMin, drag.toMin);
    if (to - from < 15) to = Math.min(1440, from + 30); // a click makes a half-hour slot
    if (to >= 1440) to = 1439;
    from = Math.min(from, to - 1);
    setDrag(null);
    openEditor({
      mode: "create",
      initial: {
        start_at: wallTimeToInstant(drag.day, minutesToTime(from), timeZone).toISOString(),
        stop_at: wallTimeToInstant(drag.day, minutesToTime(to), timeZone).toISOString(),
      },
    });
  };

  return (
    // On narrow screens a week scrolls sideways inside this box; the page itself never does.
    <div className="overflow-x-auto rounded-md shadow-sm">
    <div className={cn("flex flex-col", days.length > 1 && "min-w-[640px]")}>
      {/* Day headers + zoom */}
      <div className="flex border-b border-line">
        <div className="flex w-16 shrink-0 items-center justify-center gap-0.5 py-3">
          <Button variant="ghost" size="icon-xs" aria-label="Zoom out" disabled={zoom === 0} onClick={() => setZoom(zoom - 1)}>
            <Minus />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="Zoom in" disabled={zoom === ZOOM.length - 1} onClick={() => setZoom(zoom + 1)}>
            <Plus />
          </Button>
        </div>
        {days.map((day) => (
          <div key={day} className="flex min-w-0 flex-1 items-center gap-2.5 border-l border-line px-3 py-3">
            <span
              className={cn(
                "tabular flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-medium",
                day === today ? "bg-brand text-primary-foreground" : "text-foreground",
              )}
            >
              {Number(day.slice(8))}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {days.length === 1 ? FULL_WEEKDAYS[weekdayOfKey(day)] : shortDayLabel(day).split(" ")[0]}
              </span>
              <span className="tabular block text-sm">{formatDuration(Math.floor(dayTotal(day) / 1000), durationFormat)}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Hour grid */}
      <div ref={scroller} className="relative h-[calc(100dvh-240px)] min-h-[28rem] overflow-y-auto" role="region" aria-label="Calendar" tabIndex={-1}>
        <div className="flex" style={{ height: 24 * hour }}>
          <div className="relative w-16 shrink-0" aria-hidden>
            {HOURS.map((h) => (
              <span key={h} className="tabular absolute right-3 -translate-y-1/2 text-xs text-muted-foreground" style={{ top: h * hour }}>
                {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </span>
            ))}
          </div>

          {days.map((day) => {
            const blocks = layoutDay(entries, day, timeZone, nowMs);
            const nowMin = day === today ? (nowMs - wallTimeToInstant(day, "00:00", timeZone).getTime()) / 60_000 : null;
            const preview = drag?.day === day ? drag : null;
            return (
              <div
                key={day}
                className="relative min-w-0 flex-1 cursor-crosshair border-l border-line select-none"
                style={{
                  backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px ${hour}px)`,
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0 || e.target !== e.currentTarget) return;
                  try {
                    // Keep receiving moves if the pointer leaves the column while dragging.
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // Not an active pointer (e.g. a synthetic event); dragging still works inside the column.
                  }
                  const m = snapMinutes(minuteAt(e));
                  setDrag({ day, fromMin: m, toMin: m });
                }}
                onPointerMove={(e) => {
                  if (drag?.day !== day) return;
                  setDrag({ ...drag, toMin: snapMinutes(minuteAt(e)) });
                }}
                onPointerUp={finishDrag}
                onPointerCancel={() => setDrag(null)}
              >
                {blocks.map(({ entry, startMin, endMin, running }) => {
                  const project = entry.project_id ? catalog.projects.get(entry.project_id) : undefined;
                  const color = project?.color ?? NO_PROJECT_COLOR;
                  const height = Math.max(((endMin - startMin) / 60) * hour, MIN_BLOCK);
                  const seconds = Math.floor((endMin - startMin) * 60);
                  const range = `${timeOfDay(entry.start_at, timeZone)}–${entry.stop_at ? timeOfDay(entry.stop_at, timeZone) : "now"}`;
                  return (
                    <button
                      key={`${entry.id}-${day}`}
                      type="button"
                      disabled={running || entry.id.startsWith("temp-")}
                      onClick={() => openEditor({ mode: "edit", entry })}
                      aria-label={`${entry.description || "No description"}, ${project?.name ?? "no project"}, ${range}`}
                      className={cn(
                        "absolute inset-x-1.5 flex flex-col gap-0.5 overflow-hidden rounded-sm px-2.5 py-1 text-left text-sm outline-none",
                        "cursor-pointer hover:brightness-125 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                        running && "animate-pulse motion-reduce:animate-none",
                      )}
                      style={{
                        top: (startMin / 60) * hour,
                        height,
                        backgroundColor: `color-mix(in oklab, ${color} 22%, var(--background))`,
                        boxShadow: `inset 3px 0 0 ${color}`,
                      }}
                    >
                      <span className="truncate font-medium text-foreground">{entry.description || "No description"}</span>
                      {height >= 44 && project && <span className="truncate text-xs text-muted-foreground">{project.name}</span>}
                      {height >= 64 && (
                        <span className="tabular mt-auto truncate text-xs text-muted-foreground">
                          {formatDuration(seconds, durationFormat)} ({range})
                        </span>
                      )}
                    </button>
                  );
                })}

                {preview && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-1 rounded-sm border border-dashed border-brand bg-brand/10"
                    style={{
                      top: (Math.min(preview.fromMin, preview.toMin) / 60) * hour,
                      height: Math.max((Math.abs(preview.toMin - preview.fromMin) / 60) * hour, 4),
                    }}
                  />
                )}

                {nowMin !== null && nowMin >= 0 && nowMin <= 1440 && (
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10" style={{ top: (nowMin / 60) * hour }}>
                    <div className="h-0.5 bg-brand" />
                    <div className="absolute -top-1 -left-1 size-2.5 rounded-full bg-brand" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="border-t border-line px-3 py-2 text-xs text-muted-foreground">
        Drag on an empty slot to add an entry, or click one for half an hour. Click an entry to edit it.
      </p>
    </div>
    </div>
  );
}
