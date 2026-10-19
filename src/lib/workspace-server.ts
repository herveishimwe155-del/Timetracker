import "server-only";
import { cookies } from "next/headers";
import type { createClient } from "@/lib/supabase/server";
import type { WorkspaceRole, WorkspaceSummary } from "./workspace";

/** Cookie holding the chosen workspace id (absent = personal). */
export const WORKSPACE_COOKIE = "tickr-workspace";

/** The user's workspaces, and the current one if the cookie names a workspace they belong to. */
export async function loadWorkspaces(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ workspaces: WorkspaceSummary[]; current: WorkspaceSummary | null }> {
  const { data: memberships } = await supabase.from("workspace_members").select("workspace_id, role").eq("user_id", userId);
  const ids = (memberships ?? []).map((m) => m.workspace_id);
  let workspaces: WorkspaceSummary[] = [];
  if (ids.length) {
    const { data } = await supabase.from("workspaces").select("id, name").in("id", ids);
    const roles = new Map((memberships ?? []).map((m) => [m.workspace_id, m.role as WorkspaceRole]));
    workspaces = (data ?? [])
      .map((w) => ({ id: w.id, name: w.name, role: roles.get(w.id) ?? "member" }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }
  const chosen = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  return { workspaces, current: workspaces.find((w) => w.id === chosen) ?? null };
}
