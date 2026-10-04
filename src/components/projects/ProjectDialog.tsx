"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { displayColor, nextProjectColor, PROJECT_COLORS } from "@/lib/project-colors";
import { catalogErrorMessage, useClients, useProjectActions, useProjects, type Project } from "@/lib/queries/catalog";

export type ProjectDialogTarget = { mode: "create" } | { mode: "edit"; project: Project };

export function ProjectDialog({ target, onClose }: { target: ProjectDialogTarget | null; onClose: () => void }) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {target && (
          <ProjectForm key={target.mode === "edit" ? target.project.id : "new"} target={target} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({ target, onDone }: { target: ProjectDialogTarget; onDone: () => void }) {
  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const { create, update } = useProjectActions();
  const editing = target.mode === "edit" ? target.project : null;

  const [name, setName] = useState(editing?.name ?? "");
  const [color, setColor] = useState(() => editing?.color ?? nextProjectColor(projects.map((p) => p.color)));
  const [clientId, setClientId] = useState(editing?.client_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  // Archived clients only appear if this project already belongs to one.
  const clientOptions = clients.filter((c) => !c.archived || c.id === editing?.client_id);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the project a name.");
    const values = { name: trimmed, color, client_id: clientId || null };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, changes: values });
        toast.success("Project updated");
      } else {
        await create.mutateAsync(values);
        toast.success(`Project “${trimmed}” created`);
      }
      onDone();
    } catch (e) {
      setError(catalogErrorMessage(e, "project"));
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle>
        <DialogDescription>Projects group your time and give each entry a colour.</DialogDescription>
      </DialogHeader>

      <label className="flex flex-col gap-1.5">
        <span className="text-muted-foreground">Name</span>
        <Input
          autoFocus
          value={name}
          onChange={(e) => (setName(e.target.value), setError(null))}
          placeholder="Website redesign"
          className="h-9"
        />
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-muted-foreground">Colour</legend>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Project colour">
          {PROJECT_COLORS.map((c) => {
            const checked = c.hex.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={c.hex}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-label={c.name}
                title={c.name}
                onClick={() => setColor(c.hex)}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full outline-none transition-shadow",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  checked && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                )}
                style={{ backgroundColor: displayColor(c.hex) }}
              >
                {checked && <Check className="size-3.5 text-background" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-muted-foreground">Client</span>
        <NativeSelect value={clientId} onChange={(e) => (setClientId(e.target.value), setError(null))}>
          <option value="">No client</option>
          {clientOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.archived ? " (archived)" : ""}
            </option>
          ))}
        </NativeSelect>
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
          {editing ? "Save" : "Create project"}
        </Button>
      </DialogFooter>
    </form>
  );
}
