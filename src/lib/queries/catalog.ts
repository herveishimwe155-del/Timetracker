"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";

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
  return `Something went wrong saving the ${what}. Try again.`;
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/* ---------- Reads (each user has few of these, so load them whole) ---------- */

export function useClients() {
  return useQuery({
    queryKey: catalogKeys.clients,
    queryFn: async () => {
      const { data, error } = await createClient().from("clients").select("*");
      if (error) throw error;
      return data.sort(byName);
    },
  });
}

export function useProjects() {
  return useQuery({
    queryKey: catalogKeys.projects,
    queryFn: async () => {
      const { data, error } = await createClient().from("projects").select("*");
      if (error) throw error;
      return data.sort(byName);
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: catalogKeys.tags,
    queryFn: async () => {
      const { data, error } = await createClient().from("tags").select("*");
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
  const create = useCatalogWrite(catalogKeys.clients, "client", async (values: TablesInsert<"clients">) => {
    const { data, error } = await createClient().from("clients").insert(values).select().single();
    if (error) throw error;
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
  const create = useCatalogWrite(catalogKeys.projects, "project", async (values: TablesInsert<"projects">) => {
    const { data, error } = await createClient().from("projects").insert(values).select().single();
    if (error) throw error;
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
  const create = useCatalogWrite(catalogKeys.tags, "tag", async (name: string) => {
    const { data, error } = await createClient().from("tags").insert({ name }).select().single();
    if (error) throw error;
    return data;
  });
  return { create };
}
