"use client";

import { useEffect, useRef, useState } from "react";
import { DollarSign, FolderKanban, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TIMER_INPUT_ID, useAppCommands } from "@/components/command/AppCommands";
import { useNow } from "@/lib/queries/clock";
import { entryErrorMessage, useEntryActions, useRunningEntry, type Entry } from "@/lib/queries/entries";
import { entrySeconds, formatClock } from "@/lib/time";
import { TimerDigits } from "./TimerDigits";

export function TimerBar() {
  const { data: running = null } = useRunningEntry();
  const { update } = useEntryActions();
  const { startTimer, toggleTimer } = useAppCommands();
  const now = useNow(1000, running !== null);
  const [draftBillable, setDraftBillable] = useState(false);
  const elapsed = running ? entrySeconds(running, now) : 0;

  useRunningTitle(running, elapsed);

  const saveRunning = (changes: Partial<Pick<Entry, "description" | "billable">>) => {
    if (!running || running.id.startsWith("temp-")) return;
    update.mutate({ id: running.id, changes }, { onError: (e) => toast.error(entryErrorMessage(e)) });
  };

  const billable = running ? running.billable : draftBillable;

  return (
    <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-line bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-4">
      <DescriptionInput
        initial={running?.description ?? ""}
        running={running !== null}
        onStart={(description) => {
          startTimer({ description, billable: draftBillable });
          setDraftBillable(false);
        }}
        onSave={(description) => saveRunning({ description })}
      />

      <Button
        variant="ghost"
        size="sm"
        disabled
        className="hidden text-muted-foreground sm:inline-flex"
        title="Projects arrive in the next update"
      >
        <FolderKanban strokeWidth={1.75} />
        No project
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Billable"
            aria-pressed={billable}
            onClick={() => (running ? saveRunning({ billable: !billable }) : setDraftBillable(!billable))}
            className={cn("text-muted-foreground", billable && "text-brand hover:text-brand")}
          >
            <DollarSign strokeWidth={1.75} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{billable ? "Billable" : "Not billable"}</TooltipContent>
      </Tooltip>

      <TimerDigits seconds={elapsed} size="lg" running={running !== null} className="w-[8ch] text-right" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            onClick={() => {
              if (running) return toggleTimer();
              const input = document.getElementById(TIMER_INPUT_ID) as HTMLInputElement | null;
              startTimer({ description: input?.value.trim() ?? "", billable: draftBillable });
              setDraftBillable(false);
            }}
            aria-label={running ? "Stop timer" : "Start timer"}
            aria-keyshortcuts="S"
            className={cn("size-8 rounded-full", running && "animate-glow")}
          >
            {running ? <Square className="fill-current" /> : <Play className="fill-current" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {running ? "Stop" : "Start"} <kbd className="tabular ml-1 text-muted-foreground">S</kbd>
        </TooltipContent>
      </Tooltip>
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
  onStart: (description: string) => void;
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
            onStart(value.trim());
          }
        } else if (e.key === "Escape") {
          setValue(synced);
          e.currentTarget.blur();
        }
      }}
      className="h-8 min-w-0 flex-1 border-transparent bg-transparent shadow-none dark:bg-transparent focus-visible:border-line"
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
