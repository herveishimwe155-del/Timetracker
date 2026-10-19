"use client";

import { useEffect, useRef, useState } from "react";
import { DollarSign, Loader2, Play, Plus, Square, Timer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TIMER_INPUT_ID, useAppCommands } from "@/components/command/AppCommands";
import { ProjectPicker } from "@/components/projects/ProjectPicker";
import { TagPicker } from "@/components/projects/TagPicker";
import { useNow } from "@/lib/queries/clock";
import { entryErrorMessage, tagIdsOf, useEntryActions, useRunningEntry, type Entry } from "@/lib/queries/entries";
import { dayKey, entrySeconds, formatClock, formatDuration, timeOfDay, wallTimeToInstant } from "@/lib/time";
import { useLocalStorageFlag } from "@/hooks/use-local-storage-flag";
import { missingRequired, useEntryRules, useSettings } from "@/lib/queries/profile";
import { useRequireAccount } from "@/lib/guest";
import { TimerDigits } from "./TimerDigits";

export function TimerBar() {
  const { data: running = null } = useRunningEntry();
  const { update, create } = useEntryActions();
  const { toggleTimer, startFromBar, draft, setDraft } = useAppCommands();
  const { timeZone, durationFormat } = useSettings();
  const rules = useEntryRules();
  const requireAccount = useRequireAccount();
  const now = useNow(1000, running !== null);
  const elapsed = running ? entrySeconds(running, now) : 0;
  // Manual mode: type a start and end instead of running a timer (Toggl's "+" mode).
  const [manualPref, setManualPref] = useLocalStorageFlag("timer-manual-mode", false);
  const manual = manualPref && !running;
  // Last 30 minutes by default, so manual mode never opens with empty times.
  const [times, setTimes] = useState(() => {
    const at = Date.now();
    return { start: timeOfDay(at - 30 * 60_000, timeZone), end: timeOfDay(at, timeZone) };
  });
  const [inputKey, setInputKey] = useState(0);

  const enterManual = () => {
    const at = Date.now();
    setTimes({ start: timeOfDay(at - 30 * 60_000, timeZone), end: timeOfDay(at, timeZone) });
    setManualPref(true);
  };

  const manualSeconds = (() => {
    if (!times.start || !times.end) return 0;
    const [sh, sm] = times.start.split(":").map(Number);
    const [eh, em] = times.end.split(":").map(Number);
    return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) * 60);
  })();

  const addManual = () => {
    if (requireAccount()) return;
    const description = (document.getElementById(TIMER_INPUT_ID) as HTMLInputElement | null)?.value.trim() ?? "";
    if (!times.start || !times.end) return toast.error("Enter a start and an end time.");
    if (manualSeconds <= 0) return toast.error("The end time must be after the start time.");
    const problem = missingRequired(rules, { description, projectId: draft.projectId, tagIds: draft.tagIds });
    if (problem) return toast.error(problem);
    const day = dayKey(Date.now(), timeZone);
    create.mutate(
      {
        description,
        project_id: draft.projectId,
        billable: draft.billable,
        start_at: wallTimeToInstant(day, times.start, timeZone).toISOString(),
        stop_at: wallTimeToInstant(day, times.end, timeZone).toISOString(),
        tagIds: draft.tagIds,
      },
      {
        onSuccess: () => {
          toast.success("Entry added");
          setDraft((d) => ({ ...d, projectId: null, tagIds: [], billable: false }));
          setInputKey((k) => k + 1);
        },
        onError: (e) => toast.error(entryErrorMessage(e)),
      },
    );
  };

  useRunningTitle(running, elapsed);

  const saveRunning = (changes: Partial<Pick<Entry, "description" | "billable" | "project_id">>, tagIds?: string[]) => {
    if (!running || running.id.startsWith("temp-")) return;
    update.mutate({ id: running.id, changes, tagIds }, { onError: (e) => toast.error(entryErrorMessage(e)) });
  };

  const billable = running ? running.billable : draft.billable;
  const projectId = running ? running.project_id : draft.projectId;
  const tagIds = running ? tagIdsOf(running) : draft.tagIds;

  // One row from 640px; on phones the description gets its own row above the controls.
  return (
    <div role="region" aria-label="Current timer" className="glass relative z-10 flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 sm:h-14 sm:flex-nowrap sm:py-0 md:px-4">
      <DescriptionInput
        key={inputKey}
        initial={running?.description ?? ""}
        running={running !== null}
        onStart={manual ? addManual : startFromBar}
        onSave={(description) => saveRunning({ description })}
      />

      <ProjectPicker
        value={projectId}
        onChange={(id) => (running ? saveRunning({ project_id: id }) : setDraft((d) => ({ ...d, projectId: id })))}
      />

      <TagPicker
        value={tagIds}
        onChange={(ids) => (running ? saveRunning({}, ids) : setDraft((d) => ({ ...d, tagIds: ids })))}
      />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Billable"
            aria-pressed={billable}
            onClick={() => (running ? saveRunning({ billable: !billable }) : setDraft((d) => ({ ...d, billable: !billable })))}
            className={cn("text-muted-foreground", billable && "text-brand hover:text-brand")}
          >
            <DollarSign strokeWidth={1.75} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{billable ? "Billable" : "Not billable"}</TooltipContent>
      </Tooltip>

      {manual ? (
        <>
          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <Input
              type="time"
              aria-label="Start time"
              value={times.start}
              onChange={(e) => setTimes((t) => ({ ...t, start: e.target.value }))}
              className="tabular h-8 w-[6.75rem]"
            />
            <span aria-hidden className="text-muted-foreground">
              –
            </span>
            <Input
              type="time"
              aria-label="End time"
              value={times.end}
              onChange={(e) => setTimes((t) => ({ ...t, end: e.target.value }))}
              className="tabular h-8 w-[6.75rem]"
            />
          </div>
          <span className="tabular hidden w-[8ch] text-right text-muted-foreground sm:inline" aria-live="polite">
            {formatDuration(manualSeconds, durationFormat)}
          </span>
          <Button onClick={addManual} disabled={create.isPending} className="h-8">
            {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            Add
          </Button>
        </>
      ) : (
        <>
          <TimerDigits seconds={elapsed} size="lg" running={running !== null} className="ml-auto w-[8ch] text-right sm:ml-0" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={() => {
                  if (running) return toggleTimer();
                  startFromBar();
                }}
                aria-label={running ? "Stop timer" : "Start timer"}
                aria-keyshortcuts="S"
                className={cn("size-8 rounded-full", running && "animate-glow motion-reduce:animate-none")}
              >
                {running ? <Square className="fill-current" /> : <Play className="fill-current" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {running ? "Stop" : "Start"} <kbd className="tabular ml-1 text-muted-foreground">S</kbd>
            </TooltipContent>
          </Tooltip>
        </>
      )}

      {/* Timer mode or manual mode, stacked like Toggl's. Hidden while a timer runs. */}
      {!running && (
        <div className="flex flex-col" role="group" aria-label="Entry mode">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Timer mode"
            aria-pressed={!manual}
            title="Timer mode"
            onClick={() => setManualPref(false)}
            className={cn("text-muted-foreground", !manual && "text-foreground")}
          >
            <Timer />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Manual mode"
            aria-pressed={manual}
            title="Manual mode: type a start and end"
            onClick={enterManual}
            className={cn("text-muted-foreground", manual && "text-foreground")}
          >
            <Plus />
          </Button>
        </div>
      )}
    </div>
  );
}

function DescriptionInput({
  initial,
  running,
  onStart,
  onSave,
}: {
  initial: string;
  running: boolean;
  onStart: () => void;
  onSave: (description: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [synced, setSynced] = useState(initial);

  // Follow outside changes (start, stop, another tab) unless the user is mid-edit.
  if (initial !== synced) {
    setSynced(initial);
    if (value === synced) setValue(initial);
  }

  const commit = () => {
    const next = value.trim();
    if (running && next !== initial) {
      onSave(next);
      setSynced(next);
    }
  };

  return (
    <Input
      id={TIMER_INPUT_ID}
      aria-label="What are you working on?"
      placeholder="What are you working on?"
      autoComplete="off"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (running) {
            commit();
            e.currentTarget.blur();
          } else {
            onStart();
          }
        } else if (e.key === "Escape") {
          setValue(synced);
          e.currentTarget.blur();
        }
      }}
      className="h-8 min-w-0 flex-1 basis-full border-transparent bg-transparent shadow-none dark:bg-transparent focus-visible:border-line sm:basis-auto"
    />
  );
}

/** Shows the running time in the browser tab, like "00:12:03 · Design review". */
function useRunningTitle(running: Entry | null, elapsed: number) {
  const baseTitle = useRef<string | null>(null);

  useEffect(() => {
    if (!running) {
      if (baseTitle.current !== null) document.title = baseTitle.current;
      baseTitle.current = null;
      return;
    }
    baseTitle.current ??= document.title;
    document.title = `${formatClock(elapsed)} · ${running.description || "Timer running"}`;
  }, [running, elapsed]);
}
