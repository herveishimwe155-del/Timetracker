"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shell/Logo";
import { createClient } from "@/lib/supabase/client";
import { switchWorkspace } from "@/lib/workspace-actions";
import { workspaceErrorMessage } from "@/lib/queries/workspace";

export function JoinCard({ token, workspaceName, role }: { token: string; workspaceName: string | null; role: "admin" | "member" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setPending(true);
    setError(null);
    const { data: workspaceId, error } = await createClient().rpc("accept_invite", { p_token: token });
    if (error) {
      setPending(false);
      return setError(workspaceErrorMessage(error, "Couldn't join. Try again."));
    }
    await switchWorkspace(workspaceId);
    router.replace("/timer");
    router.refresh();
  }

  return (
    <div className="glass w-full max-w-sm p-6">
      <div className="mb-6">
        <Logo />
      </div>
      <Users className="size-5 text-brand" strokeWidth={1.75} aria-hidden />
      {workspaceName ? (
        <>
          <h1 className="mt-3 text-lg font-medium tracking-tight">Join {workspaceName}</h1>
          <p className="mt-1 text-muted-foreground">
            You&apos;ve been invited as {role === "admin" ? "an admin" : "a member"}. You&apos;ll share its projects, clients
            and tags; your personal entries stay private.
          </p>
          <p aria-live="polite" className="mt-3 min-h-5 text-danger">
            {error}
          </p>
          <Button className="mt-2 h-9 w-full" onClick={join} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Join workspace
          </Button>
        </>
      ) : (
        <>
          <h1 className="mt-3 text-lg font-medium tracking-tight">This invite link doesn&apos;t work</h1>
          <p className="mt-1 text-muted-foreground">It may have expired or been turned off. Ask whoever sent it for a new one.</p>
          <Button asChild variant="outline" className="mt-6 h-9 w-full">
            <Link href="/timer">Go to Tickr</Link>
          </Button>
        </>
      )}
    </div>
  );
}
