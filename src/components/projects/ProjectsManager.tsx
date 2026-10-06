"use client";

import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, FolderKanban, MoreHorizontal, Pencil, Play, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/shell/EmptyState";
import { useAppCommands } from "@/components/command/AppCommands";
import { useClients, useProjectActions, useProjects, useProjectStats, type Project, type ProjectStats } from "@/lib/queries/catalog";
import { useNow } from "@/lib/queries/clock";
import { useSettings } from "@/lib/queries/profile";
import { dayKey, dayLabel, formatDuration, type DurationFormat } from "@/lib/time";
import { ProjectDialog, type ProjectDialogTarget } from "./ProjectDialog";
import { ProjectDot } from "./ProjectDot";
import { useRequireAccount } from "@/lib/guest";

const ALL = "__all__";
const NONE = "__none__";
type Status = "active" | "archived" | "all";
type SortKey = "name" | "client" | "last" | "tracked";
const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "name", label: "Project" },
  { key: "client", label: "Client" },
  { key: "last", label: "Last tracked" },
  { key: "tracked", label: "Tracked", align: "right" },
];

export function ProjectsManager() {
  const { data: projects = [], isPending, isError, refetch } = useProjects();
  const { data: clients = [] } = useClients();
  const { data: stats } = useProjectStats();
  const { timeZone, durationFormat } = useSettings();
  const now = useNow(60_000);
  const [dialog, setDialog] = useState<ProjectDialogTarget | null>(null);
  const requireAccount = useRequireAccount();
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState(ALL);
  const [status, setStatus] = useState<Status>("active");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "name", desc: false });

  const clientNames = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const statOf = (id: string): ProjectStats => stats?.get(id) ?? { trackedSeconds: 0, lastTrackedAt: null, entryCount: 0 };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const nameOf = (id: string | null) => (id ? (clientNames.get(id) ?? "") : "");
    const stat = (id: string) => stats?.get(id);
    const compare: Record<SortKey, (a: Project, b: Project) => number> = {
      name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      client: (a, b) => nameOf(a.client_id).localeCompare(nameOf(b.client_id), undefined, { sensitivity: "base" }),
      last: (a, b) => (stat(a.id)?.lastTrackedAt ?? "").localeCompare(stat(b.id)?.lastTrackedAt ?? ""),
      tracked: (a, b) => (stat(a.id)?.trackedSeconds ?? 0) - (stat(b.id)?.trackedSeconds ?? 0),
    };
    return projects
      .filter((p) => status === "all" || (status === "archived") === p.archived)
      .filter((p) => clientFilter === ALL || (clientFilter === NONE ? !p.client_id : p.client_id === clientFilter))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || nameOf(p.client_id).toLowerCase().includes(q))
      .sort((a, b) => (sort.desc ? -1 : 1) * (compare[sort.key](a, b) || compare.name(a, b)));
  }, [projects, clientNames, stats, search, clientFilter, status, sort]);

  const filtering = search.trim() !== "" || clientFilter !== ALL || status !== "active";
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key === "last" || key === "tracked" }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect aria-label="Show" value={status} onChange={(e) => setStatus(e.target.value as Status)} className="w-48">
          <option value="active">Show active</option>
          <option value="archived">Show archived</option>
          <option value="all">Show all</option>
        </NativeSelect>
        <NativeSelect aria-label="Filter by client" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="w-44">
          <option value={ALL}>All clients</option>
          <option value={NONE}>No client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        <div className="relative min-w-40 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search projects"
            placeholder="Search projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <Button className="ml-auto h-9" onClick={() => requireAccount() || setDialog({ mode: "create" })}>
          <Plus />
          New project
        </Button>
      </div>

      {isPending ? (
        <div className="h-24 animate-pulse rounded-md bg-surface" role="status" aria-busy="true" aria-label="Loading projects" />
      ) : isError ? (
        <div className="flex items-center gap-3 rounded-md border border-danger/40 p-4">
          Projects couldn&apos;t be loaded.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects yet">
          Projects group your time and give each entry a colour. Create one here, or type a new name in the timer&apos;s
          project picker.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-md shadow-sm" data-reveal>
          <table className="w-full min-w-[640px] text-left">
            <caption className="sr-only">Projects</caption>
            <thead className="text-xs text-muted-foreground uppercase">
              <tr className="border-b border-line">
                <th scope="col" className="w-10 px-2 py-2">
                  <span className="sr-only">Start timer</span>
                </th>
                {COLUMNS.map((col) => {
                  const active = sort.key === col.key;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={active ? (sort.desc ? "descending" : "ascending") : "none"}
                      className={cn("px-3 py-2 font-normal", col.align === "right" && "text-right")}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-sm uppercase outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                          active && "text-foreground",
                        )}
                      >
                        {col.label}
                        {active && (sort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
                      </button>
                    </th>
                  );
                })}
                <th scope="col" className="w-12 px-2 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  clientName={project.client_id ? (clientNames.get(project.client_id) ?? "") : ""}
                  stats={statOf(project.id)}
                  timeZone={timeZone}
                  nowMs={now}
                  durationFormat={durationFormat}
                  onEdit={() => setDialog({ mode: "edit", project })}
                />
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 2} className="px-3 py-8 text-center text-muted-foreground">
                    {filtering ? "No projects match these filters." : "No projects."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ProjectDialog target={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}

function ProjectRow({
  project,
  clientName,
  stats,
  timeZone,
  nowMs,
  durationFormat,
  onEdit,
}: {
  project: Project;
  clientName: string;
  stats: ProjectStats;
  timeZone: string;
  nowMs: number;
  durationFormat: DurationFormat;
  onEdit: () => void;
}) {
  const { update } = useProjectActions();
  const { startTimer } = useAppCommands();
  const setArchived = (archived: boolean) =>
    update.mutate(
      { id: project.id, changes: { archived } },
      { onSuccess: () => toast.success(archived ? `“${project.name}” archived` : `“${project.name}” restored`) },
    );
  const last = stats.lastTrackedAt;

  return (
    <tr className="group border-b border-line last:border-b-0 hover:bg-surface/60 focus-within:bg-surface/60">
      <td className="px-2 py-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Start timer on ${project.name}`}
              disabled={project.archived}
              onClick={() => {
                startTimer({ project_id: project.id });
                toast.success(`Timer started on ${project.name}`);
              }}
              className="text-brand opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            >
              <Play className="fill-current" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start timer</TooltipContent>
        </Tooltip>
      </td>
      <th scope="row" className="px-3 py-1.5 font-normal">
        <button
          type="button"
          onClick={onEdit}
          className="flex min-w-0 items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ProjectDot color={project.color} className="size-2.5" />
          <span className={cn("truncate", project.archived && "text-muted-foreground")}>{project.name}</span>
          {project.archived && <span className="text-xs text-muted-foreground">Archived</span>}
        </button>
      </th>
      <td className="truncate px-3 py-1.5 text-muted-foreground">{clientName || "—"}</td>
      <td className="tabular px-3 py-1.5 text-muted-foreground">
        {last ? dayLabel(dayKey(last, timeZone), timeZone, nowMs) : "Never"}
      </td>
      <td className="tabular px-3 py-1.5 text-right">{formatDuration(stats.trackedSeconds, durationFormat)}</td>
      <td className="px-2 py-1.5 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${project.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            {project.archived ? (
              <DropdownMenuItem onSelect={() => setArchived(false)}>
                <ArchiveRestore />
                Restore
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => setArchived(true)}>
                <Archive />
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
