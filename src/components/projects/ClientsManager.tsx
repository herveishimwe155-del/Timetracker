"use client";

import { useRef, useState } from "react";
import { Archive, ArchiveRestore, Briefcase, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shell/EmptyState";
import { useClientActions, useClients, useProjects, type Client } from "@/lib/queries/catalog";
import { ArchivedToggle } from "./ArchivedToggle";

export function ClientsManager() {
  const { data: clients = [], isPending, isError, refetch } = useClients();
  const { data: projects = [] } = useProjects();
  const { create } = useClientActions();
  const [name, setName] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const archivedCount = clients.filter((c) => c.archived).length;
  const visible = clients.filter((c) => showArchived || !c.archived);
  const projectCount = (id: string) => projects.filter((p) => p.client_id === id && !p.archived).length;

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(
      { name: trimmed },
      {
        onSuccess: (c) => {
          setName("");
          toast.success(`Client “${c.name}” added`);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={add} className="flex min-w-0 flex-1 gap-2">
          <Input
            aria-label="New client name"
            placeholder="New client name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 max-w-sm"
          />
          <Button type="submit" variant="outline" disabled={!name.trim() || create.isPending} className="h-9">
            <Plus />
            Add client
          </Button>
        </form>
        {archivedCount > 0 && <ArchivedToggle value={showArchived} onChange={setShowArchived} count={archivedCount} />}
      </div>

      {isPending ? (
        <div className="h-24 animate-pulse rounded-md bg-surface" aria-busy="true" aria-label="Loading clients" />
      ) : isError ? (
        <div className="flex items-center gap-3 rounded-md border border-danger/40 p-4">
          Clients couldn&apos;t be loaded.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={Briefcase} title="No clients yet">
          Clients group projects, so you can see time per customer. Add your first one above.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-md shadow-sm">
          {visible.map((client) => (
            <ClientRow key={client.id} client={client} projectCount={projectCount(client.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ClientRow({ client, projectCount }: { client: Client; projectCount: number }) {
  const { update } = useClientActions();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client.name);
  // Set when "Rename" is picked from the menu, so the menu doesn't pull focus back from the field.
  const renaming = useRef(false);

  const save = () => {
    const trimmed = name.trim();
    setEditing(false);
    if (!trimmed || trimmed === client.name) return setName(client.name);
    update.mutate({ id: client.id, changes: { name: trimmed } }, { onError: () => setName(client.name) });
  };

  const setArchived = (archived: boolean) =>
    update.mutate(
      { id: client.id, changes: { archived } },
      { onSuccess: () => toast.success(archived ? `“${client.name}” archived` : `“${client.name}” restored`) },
    );

  return (
    <li className="group flex h-11 items-center gap-3 px-3 hover:bg-surface/60 focus-within:bg-surface/60">
      {editing ? (
        <Input
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Client name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setName(client.name);
              setEditing(false);
            }
          }}
          className="h-8 max-w-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-w-0 truncate rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Rename ${client.name}`}
        >
          <span className={client.archived ? "text-muted-foreground" : undefined}>{client.name}</span>
        </button>
      )}
      {client.archived && <span className="text-xs text-muted-foreground">Archived</span>}
      <span className="tabular ml-auto shrink-0 text-xs text-muted-foreground">
        {projectCount} {projectCount === 1 ? "project" : "projects"}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${client.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-40"
          onCloseAutoFocus={(e) => {
            if (!renaming.current) return;
            renaming.current = false;
            // Open the rename field only once the menu has closed, so it keeps focus.
            e.preventDefault();
            setEditing(true);
          }}
        >
          <DropdownMenuItem
            onSelect={() => {
              renaming.current = true;
            }}
          >
            <Pencil />
            Rename
          </DropdownMenuItem>
          {client.archived ? (
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
