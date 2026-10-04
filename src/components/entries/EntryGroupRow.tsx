"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TimerDigits } from "@/components/timer/TimerDigits";
import { ProjectDot } from "@/components/projects/ProjectDot";
import { useAppCommands } from "@/components/command/AppCommands";
import { useCatalogMaps } from "@/lib/queries/catalog";
import { useSettings } from "@/lib/queries/profile";
import { tagIdsOf, type Entry } from "@/lib/queries/entries";
import { entrySeconds, timeOfDay } from "@/lib/time";
import { EntryRow } from "./EntryRow";

/**
 * Several entries on one day with the same description, project, tags and billable,
 * stacked into one row with a count (like Toggl). The count expands the entries.
 */
export function EntryGroupRow({ entries, timeZone, nowMs }: { entries: Entry[]; timeZone: string; nowMs: number }) {
  const [open, setOpen] = useState(false);
  const { startTimer } = useAppCommands();
  const { durationFormat } = useSettings();
  const catalog = useCatalogMaps();
  const first = entries[0];
  const project = first.project_id ? catalog.projects.get(first.project_id) : undefined;
  const seconds = entries.reduce((sum, e) => sum + entrySeconds(e, nowMs), 0);
  const earliest = entries.reduce((a, e) => (e.start_at < a ? e.start_at : a), first.start_at);
  const latest = entries.reduce((a, e) => (e.stop_at && e.stop_at > a ? e.stop_at : a), first.stop_at ?? first.start_at);
  const listId = `group-${first.id}`;

  return (
    <li>
      <div className="group flex h-10 items-center gap-3 px-3 transition-colors hover:bg-surface/60 focus-within:bg-surface/60">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`${entries.length} entries: ${first.description || "No description"}. ${open ? "Hide" : "Show"} them`}
          onClick={() => setOpen(!open)}
          className={cn(
            "tabular flex size-6 shrink-0 items-center justify-center rounded-sm text-xs shadow-sm outline-none",
            "hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring",
            open && "bg-surface-2 text-brand",
          )}
        >
          {entries.length}
        </button>
        <span className="min-w-0 flex-1 truncate">
          {first.description || <span className="text-muted-foreground">No description</span>}
        </span>
        {project && (
          <span className="flex min-w-0 max-w-[40%] shrink items-center gap-1.5 text-xs">
            <ProjectDot color={project.color} />
            <span className="truncate text-muted-foreground">{project.name}</span>
          </span>
        )}
        <span className="tabular hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {timeOfDay(earliest, timeZone)}–{timeOfDay(latest, timeZone)}
        </span>
        <TimerDigits seconds={seconds} size="sm" format={durationFormat} className="w-[8ch] shrink-0 text-right" />
        <div className="flex w-14 shrink-0 items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Continue this entry"
                onClick={() =>
                  startTimer({
                    description: first.description,
                    project_id: first.project_id,
                    billable: first.billable,
                    tag_ids: tagIdsOf(first),
                  })
                }
              >
                <Play />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Continue</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {open && (
        <ul id={listId} className="divide-y divide-line border-t border-line bg-surface/20 pl-6">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} timeZone={timeZone} nowMs={nowMs} />
          ))}
        </ul>
      )}
    </li>
  );
}
