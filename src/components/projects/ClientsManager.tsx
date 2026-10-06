"use client";

import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Briefcase, Loader2, MoreHorizontal, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shell/EmptyState";
import { catalogErrorMessage, useClientActions, useClients, useProjects, useProjectStats, type Client } from "@/lib/queries/catalog";
import { useNow } from "@/lib/queries/clock";
import { useSettings } from "@/lib/queries/profile";
import { dayKey, dayLabel, formatDuration } from "@/lib/time";
import { useRequireAccount } from "@/lib/guest";

type Status = "active" | "archived" | "all";
type SortKey = "name" | "projects" | "last" | "tracked";
type Row = Client & { projects: number; trackedSeconds: number; lastTrackedAt: string | null };
type DialogTarget = { mode: "create" } | { mode: "edit"; client: Client };

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "name", label: "Client" },
  { key: "projects", label: "Projects", align: "right" },
  { key: "last", label: "Last tracked" },
  { key: "tracked", label: "Tracked", align: "right" },
];

export function ClientsManager() {
  const { data: clients = [], isPending, isError, refetch } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: stats } = useProjectStats();
  const { timeZone, durationFormat } = useSettings();
  const now = useNow(60_000);
  const [dialog, setDialog] = useState<DialogTarget | null>(null);
  const requireAccount = useRequireAccount();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("active");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "name", desc: false });

  // Per client: active projects, and tracked time / last activity summed over its projects.
  const rows = useMemo<Row[]>(() => {
    return clients.map((c) => {
      const own = projects.filter((p) => p.client_id === c.id);
      let trackedSeconds = 0;
      let lastTrackedAt: string | null = null;
      for (const p of own) {
        const s = stats?.get(p.id);
        if (!s) continue;
        trackedSeconds += s.trackedSeconds;
        if (s.lastTrackedAt && (!lastTrackedAt || s.lastTrackedAt > lastTrackedAt)) lastTrackedAt = s.lastTrackedAt;
      }
      return { ...c, projects: own.filter((p) => !p.archived).length, trackedSeconds, lastTrackedAt };
    });
  }, [clients, projects, stats]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const compare: Record<SortKey, (a: Row, b: Row) => number> = {
      name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      projects: (a, b) => a.projects - b.projects,
      last: (a, b) => (a.lastTrackedAt ?? "").localeCompare(b.lastTrackedAt ?? ""),
      tracked: (a, b) => a.trackedSeconds - b.trackedSeconds,
    };
    return rows
      .filter((r) => status === "all" || (status === "archived") === r.archived)
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) => (sort.desc ? -1 : 1) * (compare[sort.key](a, b) || compare.name(a, b)));
  }, [rows, search, status, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== "name" }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect aria-label="Show" value={status} onChange={(e) => setStatus(e.target.value as Status)} className="w-48">
          <option value="active">Show active</option>
          <option value="archived">Show archived</option>
          <option value="all">Show all</option>
        </NativeSelect>
        <div className="relative min-w-40 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search clients"
            placeholder="Search clients"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <Button className="ml-auto h-9" onClick={() => requireAccount() || setDialog({ mode: "create" })}>
          <Plus />
          New client
        </Button>
      </div>

      {isPending ? (
        <div className="h-24 animate-pulse rounded-md bg-surface" role="status" aria-busy="true" aria-label="Loading clients" />
      ) : isError ? (
        <div className="flex items-center gap-3 rounded-md border border-danger/40 p-4">
          Clients couldn&apos;t be loaded.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : clients.length === 0 ? (
        <EmptyState icon={Briefcase} title="No clients yet">
          Clients group projects, so you can see time per customer.{" "}
          <button
            type="button"
            onClick={() => requireAccount() || setDialog({ mode: "create" })}
            className="rounded-sm text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Create your first client
          </button>
          .
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-md shadow-sm" data-reveal>
          <table className="w-full min-w-[560px] text-left">
            <caption className="sr-only">Clients</caption>
            <thead className="text-xs text-muted-foreground uppercase">
              <tr className="border-b border-line">
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
              {visible.map((row) => (
                <ClientRow
                  key={row.id}
                  row={row}
                  lastLabel={row.lastTrackedAt ? dayLabel(dayKey(row.lastTrackedAt, timeZone), timeZone, now) : "Never"}
                  tracked={formatDuration(row.trackedSeconds, durationFormat)}
                  onEdit={() => setDialog({ mode: "edit", client: row })}
                />
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-3 py-8 text-center text-muted-foreground">
                    No clients match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ClientDialog target={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}

function ClientRow({ row, lastLabel, tracked, onEdit }: { row: Row; lastLabel: string; tracked: string; onEdit: () => void }) {
  const { update } = useClientActions();
  const setArchived = (archived: boolean) =>
    update.mutate(
      { id: row.id, changes: { archived } },
      { onSuccess: () => toast.success(archived ? `“${row.name}” archived` : `“${row.name}” restored`) },
    );

  return (
    <tr className="border-b border-line last:border-b-0 hover:bg-surface/60 focus-within:bg-surface/60">
      <th scope="row" className="px-3 py-2 font-normal">
        <button
          type="button"
          onClick={onEdit}
          className="flex min-w-0 items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className={cn("truncate", row.archived && "text-muted-foreground")}>{row.name}</span>
          {row.archived && <span className="text-xs text-muted-foreground">Archived</span>}
        </button>
      </th>
      <td className="tabular px-3 py-2 text-right text-muted-foreground">{row.projects}</td>
      <td className="tabular px-3 py-2 text-muted-foreground">{lastLabel}</td>
      <td className="tabular px-3 py-2 text-right">{tracked}</td>
      <td className="px-2 py-2 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              Rename
            </DropdownMenuItem>
            {row.archived ? (
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

function ClientDialog({ target, onClose }: { target: DialogTarget | null; onClose: () => void }) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {target && <ClientForm key={target.mode === "edit" ? target.client.id : "new"} target={target} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ClientForm({ target, onDone }: { target: DialogTarget; onDone: () => void }) {
  const { create, update } = useClientActions();
  const editing = target.mode === "edit" ? target.client : null;
  const [name, setName] = useState(editing?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the client a name.");
    try {
      if (editing) {
        if (trimmed !== editing.name) await update.mutateAsync({ id: editing.id, changes: { name: trimmed } });
        toast.success("Client renamed");
      } else {
        await create.mutateAsync({ name: trimmed });
        toast.success(`Client “${trimmed}” created`);
      }
      onDone();
    } catch (e) {
      setError(catalogErrorMessage(e, "client"));
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{editing ? "Rename client" : "New client"}</DialogTitle>
        <DialogDescription>Clients group projects so you can see time per customer.</DialogDescription>
      </DialogHeader>
      <label className="flex flex-col gap-1.5">
        <span className="text-muted-foreground">Name</span>
        <Input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="Acme Inc."
          className="h-9"
        />
      </label>
      <p aria-live="polite" className="min-h-5 text-danger">
        {error}
      </p>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {editing ? "Save" : "Create client"}
        </Button>
      </DialogFooter>
    </form>
  );
}
