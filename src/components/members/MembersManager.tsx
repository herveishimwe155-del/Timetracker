"use client";

import { useState } from "react";
import { Check, Copy, Link2, Loader2, LogOut, Plus, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shell/EmptyState";
import { CreateWorkspaceDialog } from "@/components/shell/WorkspaceSwitcher";
import { useInvites, useMembers, useWorkspaceActions, workspaceErrorMessage, type Member } from "@/lib/queries/workspace";
import { useRequireAccount } from "@/lib/guest";
import { useWorkspace, type WorkspaceRole } from "@/lib/workspace";

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** The Members page: who's in the workspace, their roles, and invite links. */
export function MembersManager() {
  const { workspace, workspaceId, userId } = useWorkspace();
  const requireAccount = useRequireAccount();
  const [creating, setCreating] = useState(false);

  if (!workspace) {
    return (
      <>
        <EmptyState icon={Users} title="Members are for team workspaces">
          You&apos;re in your personal space. Create a workspace for your team, class or company to share projects,
          clients and tags and invite people.{" "}
          <button
            type="button"
            onClick={() => requireAccount() || setCreating(true)}
            className="rounded-sm text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Create a workspace
          </button>
          .
        </EmptyState>
        <CreateWorkspaceDialog open={creating} onClose={() => setCreating(false)} />
      </>
    );
  }

  return <WorkspaceMembers workspaceId={workspaceId!} isAdmin={workspace.role === "admin"} me={userId} name={workspace.name} />;
}

function WorkspaceMembers({ workspaceId, isAdmin, me, name }: { workspaceId: string; isAdmin: boolean; me: string | null; name: string }) {
  const { data: members = [], isPending, isError, refetch } = useMembers(workspaceId);
  const [inviting, setInviting] = useState(false);
  const admins = members.filter((m) => m.role === "admin").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground">
          {members.length} {members.length === 1 ? "member" : "members"} in {name}
        </p>
        {isAdmin && (
          <Button className="ml-auto h-9" onClick={() => setInviting(true)}>
            <Plus />
            Invite people
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="h-24 animate-pulse rounded-md bg-surface" role="status" aria-busy="true" aria-label="Loading members" />
      ) : isError ? (
        <div className="flex items-center gap-3 rounded-md border border-danger/40 p-4">
          Members couldn&apos;t be loaded.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md shadow-sm" data-reveal>
          <table className="w-full min-w-[560px] text-left">
            <caption className="sr-only">Members</caption>
            <thead className="text-xs text-muted-foreground uppercase">
              <tr className="border-b border-line">
                <th scope="col" className="px-3 py-2 font-normal">Member</th>
                <th scope="col" className="px-3 py-2 font-normal">Role</th>
                <th scope="col" className="px-3 py-2 font-normal">Joined</th>
                <th scope="col" className="w-12 px-2 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <MemberRow key={m.userId} member={m} workspaceId={workspaceId} isAdmin={isAdmin} isMe={m.userId === me} lastAdmin={m.role === "admin" && admins === 1} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && <InviteLinks workspaceId={workspaceId} />}
      <InviteDialog open={inviting} onClose={() => setInviting(false)} workspaceId={workspaceId} name={name} />
    </div>
  );
}

function MemberRow({
  member,
  workspaceId,
  isAdmin,
  isMe,
  lastAdmin,
}: {
  member: Member;
  workspaceId: string;
  isAdmin: boolean;
  isMe: boolean;
  lastAdmin: boolean;
}) {
  const { setRole, removeMember, leave } = useWorkspaceActions(workspaceId);
  const label = member.name || member.email;
  const fail = (fallback: string) => (e: unknown) => toast.error(workspaceErrorMessage(e, fallback));

  const changeRole = (role: WorkspaceRole) =>
    setRole.mutate(
      { userId: member.userId, role },
      { onSuccess: () => toast.success(`${label} is now ${role === "admin" ? "an admin" : "a member"}`), onError: fail("The role couldn't be changed.") },
    );
  const onRemove = () => {
    if (isMe) {
      if (!window.confirm("Leave this workspace? Your entries here stay, but you'll lose access until someone invites you again.")) return;
      leave.mutate(member.userId, { onSuccess: () => toast.success("You left the workspace"), onError: fail("You couldn't leave. Try again.") });
      return;
    }
    if (!window.confirm(`Remove ${label} from the workspace? Their entries stay.`)) return;
    removeMember.mutate(member.userId, { onSuccess: () => toast.success(`${label} removed`), onError: fail("They couldn't be removed.") });
  };

  return (
    <tr className="border-b border-line last:border-b-0">
      <th scope="row" className="px-3 py-2 font-normal">
        <span className="block truncate">
          {label}
          {isMe && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
        </span>
        {member.name && <span className="block truncate text-xs text-muted-foreground">{member.email}</span>}
      </th>
      <td className="px-3 py-2">
        {isAdmin && !(isMe && lastAdmin) ? (
          <NativeSelect
            aria-label={`Role for ${label}`}
            value={member.role}
            onChange={(e) => changeRole(e.target.value as WorkspaceRole)}
            className="h-8 w-28"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </NativeSelect>
        ) : (
          <span className="text-muted-foreground">{member.role === "admin" ? "Admin" : "Member"}</span>
        )}
      </td>
      <td className="tabular px-3 py-2 text-muted-foreground">{dateFmt.format(new Date(member.joinedAt))}</td>
      <td className="px-2 py-2 text-right">
        {(isMe ? !lastAdmin : isAdmin) && (
          <Button variant="ghost" size="icon-sm" aria-label={isMe ? "Leave workspace" : `Remove ${label}`} title={isMe ? "Leave workspace" : "Remove"} onClick={onRemove}>
            {isMe ? <LogOut /> : <UserMinus />}
          </Button>
        )}
      </td>
    </tr>
  );
}

function InviteLinks({ workspaceId }: { workspaceId: string }) {
  const { data: invites = [] } = useInvites(workspaceId, true);
  const { revokeInvite } = useWorkspaceActions(workspaceId);
  if (!invites.length) return null;
  return (
    <section aria-labelledby="invites-title" className="flex flex-col gap-2">
      <h2 id="invites-title" className="font-medium">
        Active invite links
      </h2>
      <ul className="rounded-md shadow-sm">
        {invites.map((inv) => (
          <li key={inv.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-3 py-2 last:border-b-0">
            <Link2 className="size-4 text-muted-foreground" aria-hidden />
            <span>{inv.role === "admin" ? "Admin" : "Member"} link</span>
            <span className="text-muted-foreground">
              expires {dateFmt.format(new Date(inv.expiresAt))} · used {inv.uses} {inv.uses === 1 ? "time" : "times"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() =>
                revokeInvite.mutate(inv.id, {
                  onSuccess: () => toast.success("Invite link turned off"),
                  onError: (e) => toast.error(workspaceErrorMessage(e, "The link couldn't be turned off.")),
                })
              }
            >
              Turn off
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function InviteDialog({ open, onClose, workspaceId, name }: { open: boolean; onClose: () => void; workspaceId: string; name: string }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{open && <InviteForm workspaceId={workspaceId} name={name} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

function InviteForm({ workspaceId, name, onDone }: { workspaceId: string; name: string; onDone: () => void }) {
  const { createInvite } = useWorkspaceActions(workspaceId);
  const [role, setRole] = useState<WorkspaceRole>("member");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    try {
      setLink(await createInvite.mutateAsync(role));
    } catch (e) {
      toast.error(workspaceErrorMessage(e, "The invite link couldn't be created. Try again."));
    }
  }
  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy. Select the link and copy it yourself.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Invite people to {name}</DialogTitle>
        <DialogDescription>
          Create a link and send it by email, WhatsApp or chat. Anyone with the link can join for the next 7 days, so share
          it only with your team.
        </DialogDescription>
      </DialogHeader>
      {!link ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground">They join as</span>
          <NativeSelect value={role} onChange={(e) => setRole(e.target.value as WorkspaceRole)} className="h-9 w-40">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </NativeSelect>
        </label>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground">Invite link ({role === "admin" ? "admin" : "member"}). It won&apos;t be shown again.</span>
          <div className="flex gap-2">
            <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="h-9 font-mono text-xs" aria-label="Invite link" />
            <Button type="button" variant="outline" onClick={copy}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {link ? "Done" : "Cancel"}
        </Button>
        {!link && (
          <Button type="button" onClick={create} disabled={createInvite.isPending}>
            {createInvite.isPending ? <Loader2 className="animate-spin" /> : <Link2 />}
            Create invite link
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
