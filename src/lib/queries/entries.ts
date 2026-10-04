"use client";

import { useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { addDaysToKey, dayKey, wallTimeToInstant } from "@/lib/time";

export type Entry = Tables<"time_entries">;
export type EntryFields = Pick<Entry, "description" | "project_id" | "billable">;

/** Days of history per page of the entry list. */
const PAGE_DAYS = 7;

export const entryKeys = {
  all: ["entries"] as const,
  running: ["entries", "running"] as const,
  list: (timeZone: string) => ["entries", "list", timeZone] as const,
};

type EntryPage = { entries: Entry[]; endKey: string; hasOlder: boolean };
type EntryPages = InfiniteData<EntryPage, string | null>;

/** A plain-language message for a failed entry write. */
export function entryErrorMessage(error: unknown): string {
  const e = error as Partial<PostgrestError> | undefined;
  if (e?.code === "23P01") return "This entry overlaps another one. Change its start or end time.";
  if (e?.code === "23514") return "The end time must be after the start time.";
  if (e?.code === "23505") return "A timer is already running. Stop it first.";
  return "Something went wrong saving your entry. Try again.";
}

/* ---------- Reads ---------- */

/** The running timer, or null. */
export function useRunningEntry() {
  return useQuery({
    queryKey: entryKeys.running,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("time_entries")
        .select("*")
        .is("stop_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Finished entries, newest first, loaded a week at a time. Pages are cut at midnight
 * in the user's time zone so a day is never split across two pages.
 */
export function useEntryPages(timeZone: string) {
  return useInfiniteQuery({
    queryKey: entryKeys.list(timeZone),
    // null = the newest page, ending at tomorrow's midnight in the user's zone.
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<EntryPage> => {
      const endKey = pageParam ?? addDaysToKey(dayKey(Date.now(), timeZone), 1);
      const supabase = createClient();
      const from = wallTimeToInstant(addDaysToKey(endKey, -PAGE_DAYS), "00:00", timeZone).toISOString();
      const to = wallTimeToInstant(endKey, "00:00", timeZone).toISOString();

      const [page, older] = await Promise.all([
        supabase
          .from("time_entries")
          .select("*")
          .not("stop_at", "is", null)
          .gte("start_at", from)
          .lt("start_at", to)
          .order("start_at", { ascending: false }),
        supabase.from("time_entries").select("id").lt("start_at", from).limit(1),
      ]);
      if (page.error) throw page.error;
      if (older.error) throw older.error;
      return { entries: page.data, endKey, hasOlder: older.data.length > 0 };
    },
    getNextPageParam: (last) => (last.hasOlder ? addDaysToKey(last.endKey, -PAGE_DAYS) : undefined),
  });
}

/** Keeps entries in sync with other tabs and devices through Supabase Realtime. */
export function useEntriesRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    let timeout: number | undefined;
    // Several events often arrive together (start = stop old + insert new); refetch once.
    const refresh = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => queryClient.invalidateQueries({ queryKey: entryKeys.all }), 150);
    };

    const channel = supabase
      .channel("time_entries")
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" }, refresh)
      .subscribe();

    return () => {
      window.clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/* ---------- Cache helpers for optimistic updates ---------- */

function patchListed(client: QueryClient, update: (entries: Entry[]) => Entry[]) {
  client.setQueriesData<EntryPages>({ queryKey: ["entries", "list"] }, (data) =>
    data ? { ...data, pages: data.pages.map((p) => ({ ...p, entries: update(p.entries) })) } : data,
  );
}

async function snapshot(client: QueryClient) {
  await client.cancelQueries({ queryKey: entryKeys.all });
  return client.getQueriesData({ queryKey: entryKeys.all });
}

function restore(client: QueryClient, saved: Awaited<ReturnType<typeof snapshot>> | undefined) {
  saved?.forEach(([key, data]) => client.setQueryData(key, data));
}

const tempEntry = (fields: Partial<Entry>): Entry => ({
  id: `temp-${crypto.randomUUID()}`,
  user_id: "",
  created_at: new Date().toISOString(),
  description: "",
  project_id: null,
  billable: false,
  start_at: new Date().toISOString(),
  stop_at: null,
  ...fields,
});

/* ---------- Writes ---------- */

/** All entry writes, with instant (optimistic) updates that roll back on error. */
export function useEntryActions() {
  const client = useQueryClient();
  const settle = () => client.invalidateQueries({ queryKey: entryKeys.all });

  const start = useMutation({
    mutationFn: async (fields: Partial<EntryFields>) => {
      const { data, error } = await createClient().rpc("start_timer", {
        p_description: fields.description ?? "",
        p_project_id: fields.project_id ?? undefined,
        p_billable: fields.billable ?? false,
      });
      if (error) throw error;
      return data;
    },
    onMutate: async (fields) => {
      const saved = await snapshot(client);
      const previous = client.getQueryData<Entry | null>(entryKeys.running);
      const nowIso = new Date().toISOString();
      if (previous) patchListed(client, (list) => [{ ...previous, stop_at: nowIso }, ...list]);
      client.setQueryData(entryKeys.running, tempEntry({ ...fields, start_at: nowIso }));
      return { saved };
    },
    onError: (_e, _v, ctx) => restore(client, ctx?.saved),
    onSuccess: (entry) => client.setQueryData(entryKeys.running, entry),
    onSettled: settle,
  });

  const stop = useMutation({
    mutationFn: async () => {
      const { data, error } = await createClient().rpc("stop_timer");
      if (error) throw error;
      return data;
    },
    onMutate: async () => {
      const saved = await snapshot(client);
      const running = client.getQueryData<Entry | null>(entryKeys.running);
      if (running) {
        const stopped = { ...running, stop_at: new Date().toISOString() };
        patchListed(client, (list) => [stopped, ...list]);
      }
      client.setQueryData(entryKeys.running, null);
      return { saved };
    },
    onError: (_e, _v, ctx) => restore(client, ctx?.saved),
    onSettled: settle,
  });

  const update = useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: TablesUpdate<"time_entries"> }) => {
      const { data, error } = await createClient().from("time_entries").update(changes).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, changes }) => {
      const saved = await snapshot(client);
      client.setQueryData<Entry | null>(entryKeys.running, (r) => (r?.id === id ? { ...r, ...changes } : r));
      patchListed(client, (list) => list.map((e) => (e.id === id ? { ...e, ...changes } : e)));
      return { saved };
    },
    onError: (_e, _v, ctx) => restore(client, ctx?.saved),
    onSettled: settle,
  });

  const create = useMutation({
    mutationFn: async (entry: TablesInsert<"time_entries">) => {
      const { data, error } = await createClient().from("time_entries").insert(entry).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (entry) => {
      const saved = await snapshot(client);
      if (entry.stop_at) patchListed(client, (list) => [tempEntry(entry), ...list]);
      return { saved };
    },
    onError: (_e, _v, ctx) => restore(client, ctx?.saved),
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: async (entry: Entry) => {
      const { error } = await createClient().from("time_entries").delete().eq("id", entry.id);
      if (error) throw error;
      return entry;
    },
    onMutate: async (entry) => {
      const saved = await snapshot(client);
      client.setQueryData<Entry | null>(entryKeys.running, (r) => (r?.id === entry.id ? null : r));
      patchListed(client, (list) => list.filter((e) => e.id !== entry.id));
      return { saved };
    },
    onError: (_e, _v, ctx) => restore(client, ctx?.saved),
    onSettled: settle,
  });

  return { start, stop, update, create, remove };
}
