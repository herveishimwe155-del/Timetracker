"use client";

import { useActionState, useState } from "react";
import { Download, KeyRound, Loader2, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePassword, deleteAccount, signOutEverywhere, type AccountState } from "@/lib/auth/actions";

/** Email, password and sign-in sessions. */
export function SecuritySettings({ email }: { email: string | null }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(changePassword, {});
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="font-medium">Email</span>
        <span className="text-muted-foreground">{email ?? "—"}</span>
      </div>

      <form
        key={formKey}
        action={action}
        className="flex flex-col gap-3"
        noValidate
      >
        <span className="font-medium">Change password</span>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground">New password</span>
            <Input name="password" type="password" autoComplete="new-password" minLength={8} required className="h-9" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground">Repeat new password</span>
            <Input name="confirm" type="password" autoComplete="new-password" minLength={8} required className="h-9" />
          </label>
        </div>
        <p aria-live="polite" className="min-h-5">
          {state.error && <span className="text-danger">{state.error}</span>}
          {state.success && <span className="text-brand">{state.success}</span>}
        </p>
        <div className="flex gap-2">
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
            Change password
          </Button>
          {state.success && (
            <Button type="button" variant="ghost" onClick={() => setFormKey((k) => k + 1)}>
              Clear
            </Button>
          )}
        </div>
      </form>

      <form action={signOutEverywhere} className="flex flex-col items-start gap-2">
        <span className="font-medium">Sessions</span>
        <p className="text-muted-foreground">Signed in on a shared or lost device? End every session, including this one.</p>
        <Button type="submit" variant="outline">
          <LogOut />
          Sign out on all devices
        </Button>
      </form>
    </div>
  );
}

/** Download everything. */
export function DataSettings() {
  return (
    <div className="flex max-w-xl flex-col items-start gap-2">
      <p className="text-muted-foreground">
        Every time entry you have tracked, as a CSV file you can open in Excel, Numbers or Google Sheets.
      </p>
      <Button asChild variant="outline">
        <a href="/api/export?all=1" download>
          <Download />
          Export all my data
        </a>
      </Button>
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ["S", "Start or stop the timer"],
  ["N", "New time entry"],
  ["Ctrl / ⌘ K", "Command palette"],
  ["Ctrl / ⌘ B", "Collapse or expand the sidebar"],
  ["Enter", "Start the timer from the description field"],
  ["Esc", "Close a dialog or menu"],
];

export function ShortcutsList() {
  return (
    <table className="w-full max-w-xl text-left">
      <caption className="sr-only">Keyboard shortcuts</caption>
      <tbody>
        {SHORTCUTS.map(([keys, what]) => (
          <tr key={keys} className="border-b border-line last:border-b-0">
            <th scope="row" className="w-40 py-2 font-normal">
              <kbd className="tabular rounded-sm px-1.5 py-0.5 text-xs shadow-sm">{keys}</kbd>
            </th>
            <td className="py-2 text-muted-foreground">{what}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Permanent account deletion, behind a typed confirmation. */
export function DangerZone() {
  const [state, action, pending] = useActionState<AccountState, FormData>(deleteAccount, {});
  const [confirm, setConfirm] = useState("");

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3 rounded-md border border-danger/40 p-4">
      <span className="font-medium text-danger">Delete account</span>
      <p className="text-muted-foreground">
        This permanently deletes your account with every time entry, project, client, tag and goal. It cannot be
        undone. Export your data first if you want a copy.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-muted-foreground">
          Type <span className="tabular text-foreground">DELETE</span> to confirm
        </span>
        <Input
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          className="h-9 w-48"
        />
      </label>
      {state.error && <p className="text-danger">{state.error}</p>}
      <Button type="submit" variant="destructive" disabled={confirm !== "DELETE" || pending} className="self-start">
        {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
        Delete my account
      </Button>
    </form>
  );
}
