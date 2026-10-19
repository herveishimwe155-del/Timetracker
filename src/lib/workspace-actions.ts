"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { WORKSPACE_COOKIE } from "./workspace-server";

const COOKIE = { path: "/", sameSite: "lax" as const, httpOnly: true, secure: process.env.NODE_ENV === "production" };

/** Switches the current space. null = personal. Only workspaces the user belongs to are accepted. */
export async function switchWorkspace(workspaceId: string | null): Promise<{ error?: string }> {
  const store = await cookies();
  if (!workspaceId) {
    store.delete(WORKSPACE_COOKIE);
    return {};
  }
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: "Sign in first." };
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { error: "You're not a member of that workspace." };
  store.set(WORKSPACE_COOKIE, workspaceId, { ...COOKIE, maxAge: 60 * 60 * 24 * 365 });
  return {};
}
