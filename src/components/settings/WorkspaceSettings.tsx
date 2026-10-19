"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceActions, workspaceErrorMessage } from "@/lib/queries/workspace";
import { useWorkspace } from "@/lib/workspace";

type Rights = { members_see_activity: boolean; members_create_projects: boolean; members_create_tags: boolean };

/** Settings → Workspace: name, team member rights, and deleting or leaving. */
export function WorkspaceSettings() {
  const { workspace, workspaceId } = useWorkspace();
  const { data, isPending } = useQuery({
    queryKey: ["workspace-settings", workspaceId],
    enabled: workspaceId !== null,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("workspaces")
        .select("name, members_see_activity, members_create_projects, members_create_tags")
        .eq("id", workspaceId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
  if (!workspace) return null;
  if (isPending || !data) {
    return <div className="h-48 animate-pulse rounded-md bg-surface" role="status" aria-busy="true" aria-label="Loading workspace settings" />;
  }
  return <Form key={JSON.stringify(data)} saved={data} isAdmin={workspace.role === "admin"} />;
}

function Form({ saved, isAdmin }: { saved: Rights & { name: string }; isAdmin: boolean }) {
  const { workspaceId, userId } = useWorkspace();
  const { update, remove, leave } = useWorkspaceActions(workspaceId);
  const [values, setValues] = useState(saved);
  const [confirmName, setConfirmName] = useState("");
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => setValues((v) => ({ ...v, [key]: value }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!values.name.trim()) return toast.error("Give the workspace a name.");
    update.mutate(
      { ...values, name: values.name.trim() },
      {
        onSuccess: () => toast.success("Workspace settings saved"),
        onError: (e) => toast.error(workspaceErrorMessage(e, "The settings couldn't be saved.")),
      },
    );
  }

  const rights: { key: keyof Rights; title: string }[] = [
    { key: "members_see_activity", title: "Who can see team activity" },
    { key: "members_create_projects", title: "Who can create projects and clients" },
    { key: "members_create_tags", title: "Who can create tags" },
  ];

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="font-medium">Workspace name</span>
          <Input value={values.name} maxLength={80} disabled={!isAdmin} onChange={(e) => set("name", e.target.value)} className="h-9 sm:w-80" />
        </label>

        <div className="flex flex-col gap-4">
          <div>
            <p className="font-medium">Team member rights</p>
            <p className="text-muted-foreground">
              {isAdmin ? "Admins can always do all of these." : "Set by the workspace admins."}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {rights.map((r) => (
              <fieldset key={r.key} className="flex flex-col gap-1.5" disabled={!isAdmin}>
                <legend className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{r.title}</legend>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name={r.key} checked={!values[r.key]} onChange={() => set(r.key, false)} className="size-4 accent-[var(--brand)]" />
                  Admins
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name={r.key} checked={values[r.key]} onChange={() => set(r.key, true)} className="size-4 accent-[var(--brand)]" />
                  Everyone
                </label>
              </fieldset>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div>
            <Button type="submit" disabled={!dirty || update.isPending}>
              {update.isPending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </div>
        )}
      </form>

      <div className="flex flex-col items-start gap-2 rounded-md border border-danger/40 p-4">
        {isAdmin ? (
          <>
            <p className="font-medium">Delete this workspace</p>
            <p className="text-muted-foreground">
              Removes the workspace with its projects, clients, tags and everyone&apos;s entries in it. This can&apos;t be
              undone. Type the workspace name to confirm.
            </p>
            <Input
              aria-label="Type the workspace name to confirm"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={saved.name}
              className="h-9 sm:w-80"
            />
            <Button
              variant="destructive"
              disabled={confirmName !== saved.name || remove.isPending}
              onClick={() =>
                remove.mutate(undefined, {
                  onSuccess: () => toast.success("Workspace deleted"),
                  onError: (e) => toast.error(workspaceErrorMessage(e, "The workspace couldn't be deleted.")),
                })
              }
            >
              {remove.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete workspace
            </Button>
          </>
        ) : (
          <>
            <p className="font-medium">Leave this workspace</p>
            <p className="text-muted-foreground">Your entries here stay. You&apos;ll need a new invite to come back.</p>
            <Button
              variant="destructive"
              disabled={leave.isPending}
              onClick={() => {
                if (!userId || !window.confirm("Leave this workspace?")) return;
                leave.mutate(userId, {
                  onSuccess: () => toast.success("You left the workspace"),
                  onError: (e) => toast.error(workspaceErrorMessage(e, "You couldn't leave. Try again.")),
                });
              }}
            >
              Leave workspace
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
