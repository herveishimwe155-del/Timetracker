"use client";

import { Copy, DollarSign, MoreHorizontal, Pencil, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TimerDigits } from "@/components/timer/TimerDigits";
import { ProjectDot } from "@/components/projects/ProjectDot";
import { useCatalogMaps } from "@/lib/queries/catalog";
import { useSettings } from "@/lib/queries/profile";
import { useAppCommands } from "@/components/command/AppCommands";
import { dayKey, entrySeconds, timeOfDay } from "@/lib/time";
import { tagIdsOf, type Entry } from "@/lib/queries/entries";

export function EntryRow({ entry, timeZone, nowMs }: { entry: Entry; timeZone: string; nowMs: number }) {
  const { durationFormat } = useSettings();
  const { startTimer, openEditor, deleteEntry } = useAppCommands();
  const pending = entry.id.startsWith("temp-");
  const catalog = useCatalogMaps();
  const project = entry.project_id ? catalog.projects.get(entry.project_id) : undefined;
  const client = project?.client_id ? catalog.clients.get(project.client_id) : undefined;
  const tags = entry.time_entry_tags.map((t) => catalog.tags.get(t.tag_id)).filter((t) => t !== undefined);
  const seconds = entrySeconds(entry, nowMs);
  const crossesMidnight = entry.stop_at && dayKey(entry.stop_at, timeZone) !== dayKey(entry.start_at, timeZone);

  const restart = () =>
    startTimer({
      description: entry.description,
      project_id: entry.project_id,
      billable: entry.billable,
      tag_ids: tagIdsOf(entry),
    });

  const duplicate = () => {
    // Place the copy right after the original so it doesn't overlap it.
    const length = new Date(entry.stop_at!).getTime() - new Date(entry.start_at).getTime();
    const start = new Date(entry.stop_at!);
    openEditor({
      mode: "create",
      initial: {
        description: entry.description,
        project_id: entry.project_id,
        billable: entry.billable,
        tag_ids: tagIdsOf(entry),
        start_at: start.toISOString(),
        stop_at: new Date(start.getTime() + length).toISOString(),
      },
    });
  };

  return (
    <li
      className="group flex h-10 items-center gap-3 px-3 transition-colors hover:bg-surface/60 focus-within:bg-surface/60 data-[pending=true]:opacity-60"
      data-pending={pending}
    >
      <button
        type="button"
        onClick={() => openEditor({ mode: "edit", entry })}
        disabled={pending}
        className="min-w-0 flex-1 truncate rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {entry.description || <span className="text-muted-foreground">No description</span>}
      </button>

      {project && (
        <span className="flex min-w-0 max-w-[40%] shrink items-center gap-1.5 text-xs" title={client ? `${project.name} · ${client.name}` : project.name}>
          <ProjectDot color={project.color} />
          <span className="truncate text-muted-foreground">{project.name}</span>
          {client && <span className="hidden truncate text-muted-foreground lg:inline">· {client.name}</span>}
        </span>
      )}

      {tags.length > 0 && (
        <span className="hidden shrink-0 items-center gap-1 md:flex" aria-label={`Tags: ${tags.map((t) => t.name).join(", ")}`}>
          {tags.slice(0, 2).map((t) => (
            <span key={t.id} className="max-w-24 truncate rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground shadow-sm">
              {t.name}
            </span>
          ))}
          {tags.length > 2 && <span className="tabular text-xs text-muted-foreground">+{tags.length - 2}</span>}
        </span>
      )}

      {entry.billable && (
        <DollarSign className="size-3.5 shrink-0 text-brand" strokeWidth={2} aria-label="Billable" />
      )}

      <span className="tabular hidden shrink-0 text-xs text-muted-foreground sm:inline">
        {timeOfDay(entry.start_at, timeZone)}–{entry.stop_at ? timeOfDay(entry.stop_at, timeZone) : "now"}
        {crossesMidnight && <sup className="ml-0.5">+1</sup>}
      </span>

      <TimerDigits seconds={seconds} size="sm" format={durationFormat} className="w-[8ch] shrink-0 text-right" />

      <div className="flex shrink-0 items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={restart} disabled={pending} aria-label="Continue this entry">
              <Play />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Continue</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" disabled={pending} aria-label="More actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => openEditor({ mode: "edit", entry })}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={duplicate}>
              <Copy />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => deleteEntry(entry)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
