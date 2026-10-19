"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, MoreHorizontal, Pencil, Plus, Search, Tag as TagIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shell/EmptyState";
import { catalogErrorMessage, useTagActions, useTags, useTagStats, type Tag } from "@/lib/queries/catalog";
import { useNow } from "@/lib/queries/clock";
import { useSettings } from "@/lib/queries/profile";
import { useRequireAccount } from "@/lib/guest";
import { dayKey, dayLabel, formatDuration } from "@/lib/time";

type SortKey = "name" | "entries" | "last" | "tracked";
type Row = Tag & { entries: number; trackedSeconds: number; lastUsedAt: string | null };
type DialogTarget = { mode: "create" } | { mode: "edit"; tag: Tag };

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "name", label: "Tag" },
  { key: "entries", label: "Entries", align: "right" },
  { key: "last", label: "Last used" },
  { key: "tracked", label: "Tracked", align: "right" },
];

/** The Tags page: every tag with how much it's used, plus create, rename and delete. */
export function TagsManager() {
  const { data: tags = [], isPending, isError, refetch } = useTags();
  const { data: stats } = useTagStats();
  const { timeZone, durationFormat } = useSettings();
  const now = useNow(60_000);
  const requireAccount = useRequireAccount();
  const [dialog, setDialog] = useState<DialogTarget | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "name", desc: false });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows: Row[] = tags.map((t) => {
      const s = stats?.get(t.id);
      return { ...t, entries: s?.entryCount ?? 0, trackedSeconds: s?.trackedSeconds ?? 0, lastUsedAt: s?.lastUsedAt ?? null };
    });
    const compare: Record<SortKey, (a: Row, b: Row) => number> = {
      name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      entries: (a, b) => a.entries - b.entries,
      last: (a, b) => (a.lastUsedAt ?? "").localeCompare(b.lastUsedAt ?? ""),
      tracked: (a, b) => a.trackedSeconds - b.trackedSeconds,
    };
    return rows
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) => (sort.desc ? -1 : 1) * (compare[sort.key](a, b) || compare.name(a, b)));
  }, [tags, stats, search, sort]);

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== "name" }));
  const create = () => requireAccount() || setDialog({ mode: "create" });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search tags" placeholder="Search tags" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8" />
        </div>
        <Button className="ml-auto h-9" onClick={create}>
          <Plus />
          New tag
        </Button>
      </div>

      {isPending ? (
        <div className="h-24 animate-pulse rounded-md bg-surface" role="status" aria-busy="true" aria-label="Loading tags" />
      ) : isError ? (
        <div className="flex items-center gap-3 rounded-md border border-danger/40 p-4">
          Tags couldn&apos;t be loaded.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : tags.length === 0 ? (
        <EmptyState icon={TagIcon} title="No tags yet">
          Tags label entries across projects, like &ldquo;meeting&rdquo; or &ldquo;research&rdquo;.{" "}
          <button
            type="button"
            onClick={create}
            className="rounded-sm text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Create your first tag
          </button>
          .
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-md shadow-sm" data-reveal>
          <table className="w-full min-w-[520px] text-left">
            <caption className="sr-only">Tags</caption>
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
                <TagRow
                  key={row.id}
                  row={row}
                  lastLabel={row.lastUsedAt ? dayLabel(dayKey(row.lastUsedAt, timeZone), timeZone, now) : "Never"}
                  tracked={formatDuration(row.trackedSeconds, durationFormat)}
                  onEdit={() => setDialog({ mode: "edit", tag: row })}
                />
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-3 py-8 text-center text-muted-foreground">
                    No tags match &ldquo;{search}&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <TagDialog target={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}

function TagRow({ row, lastLabel, tracked, onEdit }: { row: Row; lastLabel: string; tracked: string; onEdit: () => void }) {
  const { remove } = useTagActions();
  const onDelete = () => {
    const where = row.entries ? ` It will be removed from ${row.entries} ${row.entries === 1 ? "entry" : "entries"}.` : "";
    if (!window.confirm(`Delete the tag “${row.name}”?${where} The entries themselves stay.`)) return;
    remove.mutate(row.id, { onSuccess: () => toast.success(`Tag “${row.name}” deleted`) });
  };

  return (
    <tr className="border-b border-line last:border-b-0 hover:bg-surface/60 focus-within:bg-surface/60">
      <th scope="row" className="px-3 py-2 font-normal">
        <button
          type="button"
          onClick={onEdit}
          className="flex min-w-0 items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <TagIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{row.name}</span>
        </button>
      </th>
      <td className="tabular px-3 py-2 text-right text-muted-foreground">{row.entries}</td>
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
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function TagDialog({ target, onClose }: { target: DialogTarget | null; onClose: () => void }) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {target && <TagForm key={target.mode === "edit" ? target.tag.id : "new"} target={target} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function TagForm({ target, onDone }: { target: DialogTarget; onDone: () => void }) {
  const { create, update } = useTagActions();
  const editing = target.mode === "edit" ? target.tag : null;
  const [name, setName] = useState(editing?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the tag a name.");
    try {
      if (editing) {
        if (trimmed !== editing.name) await update.mutateAsync({ id: editing.id, name: trimmed });
        toast.success("Tag renamed");
      } else {
        await create.mutateAsync(trimmed);
        toast.success(`Tag “${trimmed}” created`);
      }
      onDone();
    } catch (e) {
      setError(catalogErrorMessage(e, "tag"));
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{editing ? "Rename tag" : "New tag"}</DialogTitle>
        <DialogDescription>Renaming updates the tag on every entry that has it.</DialogDescription>
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
          placeholder="meeting"
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
          {editing ? "Save" : "Create tag"}
        </Button>
      </DialogFooter>
    </form>
  );
}
