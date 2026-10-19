"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { switchWorkspace } from "@/lib/workspace-actions";
import type { WorkspaceRole } from "@/lib/workspace";

export type Member = { userId: string; role: WorkspaceRole; joinedAt: string; name: string | null; email: string };
export type Invite = { id: string; role: WorkspaceRole; createdAt: string; expiresAt: string; uses: number; revoked: boolean };

const keys = {
  members: (ws: string) => ["workspace-members", ws] as const,
  invites: (ws: string) => ["workspace-members", "invites", ws] as const,
};

/** A plain-language message for a failed workspace action. */
export function workspaceErrorMessage(error: unknown, fallback: string): string {
  const e = error as Partial<PostgrestError> | undefined;
  if (e?.code === "TK409") return "A workspace needs at least one admin. Make someone else an admin first.";
  if (e?.code === "TK404") return "This invite link is invalid or has expired. Ask for a new one.";
  if (e?.code === "23514") return "Give the workspace a name (up to 80 characters).";
  if (e?.code === "42501") return "Only workspace admins can do that.";
  return fallback;
}

/** Switches space and re-renders the app for it. null = personal. */
export function useSwitchWorkspace() {
  const router = useRouter();
  return useCallback(
    async (workspaceId: string | null) => {
      const result = await switchWorkspace(workspaceId);
      if (result.error) {
        toast.error(result.error);
        return false;
      }
      router.refresh();
      return true;
    },
    [router],
  );
}

export function useMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: keys.members(workspaceId ?? ""),
    enabled: workspaceId !== null,
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await createClient().rpc("workspace_member_list", { p_workspace: workspaceId! });
      if (error) throw error;
      return data.map((m) => ({
        userId: m.user_id,
        role: m.role as WorkspaceRole,
        joinedAt: m.joined_at,
        name: m.full_name,
        email: m.email,
      }));
    },
  });
}

/** Active invite links (admins only; others get an empty list from the database). */
export function useInvites(workspaceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: keys.invites(workspaceId ?? ""),
    enabled: workspaceId !== null && enabled,
    queryFn: async (): Promise<Invite[]> => {
      const { data, error } = await createClient()
        .from("workspace_invites")
        .select("id, role, created_at, expires_at, uses, revoked")
        .eq("workspace_id", workspaceId!)
        .eq("revoked", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((i) => ({
        id: i.id,
        role: i.role as WorkspaceRole,
        createdAt: i.created_at,
        expiresAt: i.expires_at,
        uses: i.uses,
        revoked: i.revoked,
      }));
    },
  });
}

/** A random URL-safe token and its SHA-256 (hex); only the hash is stored. */
async function newToken(): Promise<{ token: string; hash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { token, hash };
}

export function useWorkspaceActions(workspaceId: string | null) {
  const client = useQueryClient();
  const router = useRouter();
  const switchTo = useSwitchWorkspace();
  const refreshMembers = () => client.invalidateQueries({ queryKey: ["workspace-members"] });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await createClient().from("workspaces").insert({ name }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => void switchTo(id),
  });

  const update = useMutation({
    mutationFn: async (changes: {
      name?: string;
      members_see_activity?: boolean;
      members_create_projects?: boolean;
      members_create_tags?: boolean;
    }) => {
      const { error } = await createClient().from("workspaces").update(changes).eq("id", workspaceId!);
      if (error) throw error;
    },
    onSuccess: () => router.refresh(),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await createClient().from("workspaces").delete().eq("id", workspaceId!);
      if (error) throw error;
    },
    onSuccess: () => void switchTo(null),
  });

  const createInvite = useMutation({
    mutationFn: async (role: WorkspaceRole) => {
      const { token, hash } = await newToken();
      const { error } = await createClient()
        .from("workspace_invites")
        .insert({ workspace_id: workspaceId!, role, token_hash: hash });
      if (error) throw error;
      return `${window.location.origin}/join/${token}`;
    },
    onSettled: refreshMembers,
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("workspace_invites").update({ revoked: true }).eq("id", id);
      if (error) throw error;
    },
    onSettled: refreshMembers,
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: WorkspaceRole }) => {
      const { error } = await createClient()
        .from("workspace_members")
        .update({ role })
        .eq("workspace_id", workspaceId!)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSettled: refreshMembers,
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await createClient()
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId!)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSettled: refreshMembers,
  });

  const leave = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await createClient()
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId!)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => void switchTo(null),
  });

  return { create, update, remove, createInvite, revokeInvite, setRole, removeMember, leave };
}
