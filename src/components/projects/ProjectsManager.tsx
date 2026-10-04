"use client";

import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, FolderKanban, MoreHorizontal, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shell/EmptyState";
import { useClients, useProjectActions, useProjects, type Project } from "@/lib/queries/catalog";
import { ArchivedToggle } from "./ArchivedToggle";
import { ProjectDialog, type ProjectDialogTarget } from "./ProjectDialog";
import { ProjectDot } from "./ProjectDot";

const ALL = "__all__";
const NONE = "__none__";

export function ProjectsManager() {
  const { data: projects = [], isPending, isError, refetch } = useProjects();
  const { data: clients = [] } = useClients();
  const [dialog, setDialog] = useState<ProjectDialogTarget | null>(null);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState(ALL);
  const [showArchived, setShowArchived] = useState(false);

  const clientNames = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const clientName = (id: string | null) => (id ? (clientNames.get(id) ?? "") : "");
  const archivedCount = projects.filter((p) => p.archived).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const nameOf = (id: string | null) => (id ? (clientNames.get(id) ?? "") : "");
    return projects
      .filter((p) => showArchived || !p.archived)
      .filter((p) => clientFilter === ALL || (clientFilter === NONE ? !p.client_id : p.client_id === clientFilter))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || nameOf(p.client_id).toLowerCase().includes(q))
      .sort(
        (a, b) =>
          nameOf(a.client_id).localeCompare(nameOf(b.client_id), undefined, { sensitivity: "base" }) ||
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  }, [projects, clientNames, search, clientFilter, showArchived]);

  const filtering = search.trim() !== "" || clientFilter !== ALL;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
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
        <NativeSelect
          aria-label="Filter by client"
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="w-44"
        >
          <option value={ALL}>All clients</option>
          <option value={NONE}>No client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        {archivedCount > 0 && <ArchivedToggle value={showArchived} onChange={setShowArchived} count={archivedCount} />}
        <Button className="ml-auto h-9" onClick={() => setDialog({ mode: "create" })}>
          <Plus />
          New project
        </Button>
      </div>

      {isPending ? (
        <div className="h-24 animate-pulse rounded-md bg-surface" aria-busy="true" aria-label="Loading projects" />
      ) : isError ? (
        <div className="flex items-center gap-3 rounded-md border border-danger/40 p-4">
          Projects couldn&apos;t be loaded.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : visible.length === 0 ? (
        filtering ? (
          <p className="py-8 text-center text-muted-foreground">No projects match these filters.</p>
        ) : (
          <EmptyState icon={FolderKanban} title="No projects yet">
            Projects group your time and give each entry a colour. Create one here, or type a new name in the timer&apos;s
            project picker.
          </EmptyState>
        )
      ) : (
        <ul className="divide-y divide-line rounded-md shadow-sm">
          {visible.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              clientName={clientName(project.client_id)}
              onEdit={() => setDialog({ mode: "edit", project })}
            />
          ))}
        </ul>
      )}

      <ProjectDialog target={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}

function ProjectRow({ project, clientName, onEdit }: { project: Project; clientName: string; onEdit: () => void }) {
  const { update } = useProjectActions();
  const setArchived = (archived: boolean) =>
    update.mutate(
      { id: project.id, changes: { archived } },
      { onSuccess: () => toast.success(archived ? `“${project.name}” archived` : `“${project.name}” restored`) },
    );

  return (
    <li className="group flex h-11 items-center gap-3 px-3 hover:bg-surface/60 focus-within:bg-surface/60">
      <ProjectDot color={project.color} className="size-2.5" />
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 truncate rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={project.archived ? "text-muted-foreground" : undefined}>{project.name}</span>
      </button>
      {project.archived && <span className="text-xs text-muted-foreground">Archived</span>}
      <span className="ml-auto truncate text-xs text-muted-foreground">{clientName || "No client"}</span>
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
    </li>
  );
}
