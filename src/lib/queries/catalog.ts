"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { guestQuery, useIsGuest } from "@/lib/guest";
import { inSpace, useWorkspace } from "@/lib/workspace";

export type Client = Tables<"clients">;
export type Project = Tables<"projects">;
export type Tag = Tables<"tags">;

export const catalogKeys = {
  clients: ["clients"] as const,
  projects: ["projects"] as const,
  tags: ["tags"] as const,
};

/** A plain-language message for a failed client, project or tag write. */
export function catalogErrorMessage(error: unknown, what: "client" | "project" | "tag"): string {
  const e = error as Partial<PostgrestError> | undefined;
  if (e?.code === "23505") {
    return what === "project"
      ? "A project with this name already exists for that client."
      : `A ${what} with this name already exists.`;
  }
  if (e?.code === "23514") return `Give the ${what} a name.`;
  if (e?.code === "42501") return `Only this workspace's admins can create or change ${what}s. Ask an admin.`;
  if (e?.code === "TK402")
    return "The Free plan includes up to 10 active projects. Archive one, or upgrade in Settings → Plan and billing.";
  return `Something went wrong saving the ${what}. Try again.`;
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/* ---------- Reads (each user has few of these, so load them whole) ---------- */

export function useClients() {
  const guest = useIsGuest();
  const { workspaceId } = useWorkspace();
  return useQuery({
    ...guestQuery(guest, []),
    queryKey: catalogKeys.clients,
    queryFn: async () => {
      const { data, error } = await inSpace(createClient().from("clients").select("*"), workspaceId);
      if (error) throw error;
      return data.sort(byName);
    },
  });
}

export function useProjects() {
  const guest = useIsGuest();
  const { workspaceId } = useWorkspace();
  return useQuery({
    ...guestQuery(guest, []),
    queryKey: catalogKeys.projects,
    queryFn: async () => {
      const { data, error } = await inSpace(createClient().from("projects").select("*"), workspaceId);
      if (error) throw error;
      return data.sort(byName);
    },
  });
}

export function useTags() {
  const guest = useIsGuest();
  const { workspaceId } = useWorkspace();
  return useQuery({
    ...guestQuery(guest, []),
    queryKey: catalogKeys.tags,
    queryFn: async () => {
      const { data, error } = await inSpace(createClient().from("tags").select("*"), workspaceId);
      if (error) throw error;
      return data.sort(byName);
    },
  });
}

/** Lookups by id for rendering entries. */
export function useCatalogMaps() {
  const { data: projects } = useProjects();
  const { data: clients } = useClients();
  const { data: tags } = useTags();
  return useMemo(
    () => ({
      projects: new Map((projects ?? []).map((p) => [p.id, p])),
      clients: new Map((clients ?? []).map((c) => [c.id, c])),
      tags: new Map((tags ?? []).map((t) => [t.id, t])),
    }),
    [projects, clients, tags],
  );
}

/* ---------- Writes ---------- */

function useCatalogWrite<TVars, TResult>(
  key: readonly string[],
  what: "client" | "project" | "tag",
  write: (vars: TVars) => Promise<TResult>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    onError: (e) => toast.error(catalogErrorMessage(e, what)),
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
}

export function useClientActions() {
  const { workspaceId } = useWorkspace();
  const create = useCatalogWrite(catalogKeys.clients, "client", async (values: TablesInsert<"clients">) => {
    const { data, error } = await createClient()
      .from("clients")
      .insert({ ...values, workspace_id: workspaceId })
      .select()
      .single();
    if (error) throw error;
    track("client_created");
    return data;
  });
  const update = useCatalogWrite(
    catalogKeys.clients,
    "client",
    async ({ id, changes }: { id: string; changes: TablesUpdate<"clients"> }) => {
      const { data, error } = await createClient().from("clients").update(changes).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
  );
  return { create, update };
}

export function useProjectActions() {
  const { workspaceId } = useWorkspace();
  const create = useCatalogWrite(catalogKeys.projects, "project", async (values: TablesInsert<"projects">) => {
    const { data, error } = await createClient()
      .from("projects")
      .insert({ ...values, workspace_id: workspaceId })
      .select()
      .single();
    if (error) throw error;
    track("project_created", { has_client: data.client_id !== null });
    return data;
  });
  const update = useCatalogWrite(
    catalogKeys.projects,
    "project",
    async ({ id, changes }: { id: string; changes: TablesUpdate<"projects"> }) => {
      const { data, error } = await createClient().from("projects").update(changes).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
  );
  return { create, update };
}

export function useTagActions() {
  const { workspaceId } = useWorkspace();
  const create = useCatalogWrite(catalogKeys.tags, "tag", async (name: string) => {
    const { data, error } = await createClient().from("tags").insert({ name, workspace_id: workspaceId }).select().single();
    if (error) throw error;
    track("tag_created");
    return data;
  });
  const update = useCatalogWrite(catalogKeys.tags, "tag", async ({ id, name }: { id: string; name: string }) => {
    const { data, error } = await createClient().from("tags").update({ name }).eq("id", id).select().single();
    if (error) throw error;
    return data;
  });
  const client = useQueryClient();
  // Deleting a tag removes it from its entries too (the database cascades), so refresh entries.
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    onError: (e) => toast.error(catalogErrorMessage(e, "tag")),
    onSettled: () => {
      client.invalidateQueries({ queryKey: catalogKeys.tags });
      client.invalidateQueries({ queryKey: ["entries"] });
    },
  });
  return { create, update, remove };
}

export type TagStats = { entryCount: number; trackedSeconds: number; lastUsedAt: string | null };

/** How often each tag is used, and for how long (from the tag_stats function). */
export function useTagStats() {
  const guest = useIsGuest();
  return useQuery({
    ...guestQuery(guest, new Map<string, TagStats>()),
    // Under "entries" so it refreshes whenever entries change.
    queryKey: ["entries", "tag-stats"],
    queryFn: async () => {
      const { data, error } = await createClient().rpc("tag_stats");
      if (error) throw error;
      return new Map<string, TagStats>(
        data.map((r) => [
          r.tag_id,
          { entryCount: Number(r.entry_count), trackedSeconds: Number(r.tracked_seconds), lastUsedAt: r.last_used_at },
        ]),
      );
    },
  });
}

export type ProjectStats = { trackedSeconds: number; lastTrackedAt: string | null; entryCount: number };

/** Total tracked time and last activity per project id (from the project_stats function). */
export function useProjectStats() {
  const guest = useIsGuest();
  return useQuery({
    ...guestQuery(guest, new Map<string, ProjectStats>()),
    // Under "entries" so it refreshes whenever entries change.
    queryKey: ["entries", "project-stats"],
    queryFn: async () => {
      const { data, error } = await createClient().rpc("project_stats");
      if (error) throw error;
      return new Map<string, ProjectStats>(
        data.map((r) => [
          r.project_id,
          { trackedSeconds: Number(r.tracked_seconds), lastTrackedAt: r.last_tracked_at, entryCount: Number(r.entry_count) },
        ]),
      );
    },
  });
}

export type Goal = Tables<"goals">;

export function useGoals() {
  const guest = useIsGuest();
  return useQuery({
    ...guestQuery(guest, []),
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await createClient().from("goals").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useGoalActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ["goals"] });
  const create = useMutation({
    mutationFn: async (values: TablesInsert<"goals">) => {
      const { error } = await createClient().from("goals").insert(values);
      if (error) throw error;
    },
    onError: () => toast.error("The goal couldn't be saved. Try again."),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onError: () => toast.error("The goal couldn't be deleted. Try again."),
    onSettled: refresh,
  });
  return { create, remove };
}
