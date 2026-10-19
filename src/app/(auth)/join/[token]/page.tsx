import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JoinCard } from "./JoinCard";

export const metadata: Metadata = { title: "Join a workspace" };

export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect(`/login?mode=signup&next=${encodeURIComponent(`/join/${token}`)}`);

  const { data: preview } = await supabase.rpc("invite_preview", { p_token: token });
  const invite = preview?.[0];

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <JoinCard
        token={token}
        workspaceName={invite?.valid ? invite.workspace_name : null}
        role={invite?.role === "admin" ? "admin" : "member"}
      />
    </main>
  );
}
