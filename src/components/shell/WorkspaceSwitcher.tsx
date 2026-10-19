"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Loader2, Plus, User, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSwitchWorkspace, useWorkspaceActions, workspaceErrorMessage } from "@/lib/queries/workspace";
import { useWorkspace } from "@/lib/workspace";

/** Sidebar dropdown: your personal space, your team workspaces, and "New workspace". */
export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { workspace, workspaces } = useWorkspace();
  const switchTo = useSwitchWorkspace();
  const [creating, setCreating] = useState(false);
  const label = workspace?.name ?? "Personal";
  const Icon = workspace ? Users : User;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Workspace: ${label}. Switch workspace`}
            title={collapsed ? label : undefined}
            className={cn(
              "flex h-9 w-full items-center justify-center gap-2 rounded-sm text-left outline-none transition-colors",
              "hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring",
              !collapsed && "md:justify-start md:px-2",
            )}
          >
            <Icon className="size-4 shrink-0 text-brand" strokeWidth={1.75} aria-hidden />
            {!collapsed && (
              <>
                <span className="hidden min-w-0 flex-1 truncate font-medium md:inline">{label}</span>
                <ChevronsUpDown className="hidden size-3.5 shrink-0 text-muted-foreground md:inline" aria-hidden />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Track time in</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => workspace && void switchTo(null)}>
            <User />
            <span className="flex-1">Personal</span>
            {!workspace && <Check className="text-brand" />}
          </DropdownMenuItem>
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} onSelect={() => w.id !== workspace?.id && void switchTo(w.id)}>
              <Users />
              <span className="min-w-0 flex-1 truncate">{w.name}</span>
              {w.role === "admin" && <span className="text-xs text-muted-foreground">Admin</span>}
              {w.id === workspace?.id && <Check className="text-brand" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <Plus />
            New workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

export function CreateWorkspaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">{open && <CreateWorkspaceForm onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

function CreateWorkspaceForm({ onDone }: { onDone: () => void }) {
  const { create } = useWorkspaceActions(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the workspace a name.");
    try {
      await create.mutateAsync(trimmed);
      toast.success(`Workspace “${trimmed}” created`);
      onDone();
    } catch (e) {
      setError(workspaceErrorMessage(e, "The workspace couldn't be created. Try again."));
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>New workspace</DialogTitle>
        <DialogDescription>
          A shared space for a team, class or company: shared projects, clients and tags, and you can invite people. Your
          personal entries stay private.
        </DialogDescription>
      </DialogHeader>
      <label className="flex flex-col gap-1.5">
        <span className="text-muted-foreground">Name</span>
        <Input
          autoFocus
          maxLength={80}
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
        <Button type="submit" disabled={create.isPending}>
          {create.isPending && <Loader2 className="animate-spin" />}
          Create workspace
        </Button>
      </DialogFooter>
    </form>
  );
}
