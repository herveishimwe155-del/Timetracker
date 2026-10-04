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
import { track } from "@/lib/analytics";
import { addDaysToKey, dayKey, wallTimeToInstant } from "@/lib/time";

/** An entry with the ids of its tags. */
export type Entry = Tables<"time_entries"> & { time_entry_tags: { tag_id: string }[] };
export type EntryFields = Pick<Entry, "description" | "project_id" | "billable"> & { tag_ids: string[] };

/** Every entry read and write returns this shape. */
const ENTRY_SELECT = "*, time_entry_tags(tag_id)";

export const tagIdsOf = (entry: Pick<Entry, "time_entry_tags">) => entry.time_entry_tags.map((t) => t.tag_id);
const tagRows = (ids: string[] | undefined) => (ids ?? []).map((tag_id) => ({ tag_id }));

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
  if (e?.code === "23503") return "That project or tag no longer exists. Pick another one.";
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
        .select(ENTRY_SELECT)
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
          .select(ENTRY_SELECT)
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

/** Which cached queries each table's changes affect. */
const REALTIME_TABLES = {
  time_entries: [["entries"]],
  time_entry_tags: [["entries"]],
  projects: [["projects"]],
  clients: [["clients"]],
  tags: [["tags"]],
} as const;

/** Keeps entries, projects, clients and tags in sync with other tabs and devices. */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const pending = new Set<string>();
    let timeout: number | undefined;
    // Several events often arrive together (start = stop old + insert new); refetch once.
    const refresh = (table: keyof typeof REALTIME_TABLES) => {
      REALTIME_TABLES[table].forEach((key) => pending.add(JSON.stringify(key)));
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        pending.forEach((key) => queryClient.invalidateQueries({ queryKey: JSON.parse(key) }));
        pending.clear();
      }, 150);
    };

    let channel = supabase.channel("sync");
    for (const table of Object.keys(REALTIME_TABLES) as (keyof typeof REALTIME_TABLES)[]) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => refresh(table));
    }
    channel.subscribe();

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
  time_entry_tags: [],
  ...fields,
});

/* ---------- Writes ---------- */

type EntryUpdate = { id: string; changes: TablesUpdate<"time_entries">; tagIds?: string[] };

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
        p_tag_ids: fields.tag_ids ?? [],
      });
      if (error) throw error;
      return { ...data, time_entry_tags: tagRows(fields.tag_ids) } satisfies Entry;
    },
    onMutate: async (fields) => {
      const saved = await snapshot(client);
      const previous = client.getQueryData<Entry | null>(entryKeys.running);
      const nowIso = new Date().toISOString();
      if (previous) patchListed(client, (list) => [{ ...previous, stop_at: nowIso }, ...list]);
      const { tag_ids, ...rest } = fields;
      client.setQueryData(entryKeys.running, tempEntry({ ...rest, time_entry_tags: tagRows(tag_ids), start_at: nowIso }));
      return { saved };
    },
    onError: (_e, _v, ctx) => restore(client, ctx?.saved),
    onSuccess: (entry) => {
      client.setQueryData(entryKeys.running, entry);
      track("timer_started", { has_project: entry.project_id !== null, tags: entry.time_entry_tags.length });
    },
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
    onSuccess: () => track("timer_stopped"),
    onSettled: settle,
  });

  const update = useMutation({
    mutationFn: async ({ id, changes, tagIds }: EntryUpdate) => {
      const supabase = createClient();
      if (Object.keys(changes).length > 0) {
        const { error } = await supabase.from("time_entries").update(changes).eq("id", id);
        if (error) throw error;
      }
      if (tagIds) {
        const { error } = await supabase.rpc("set_entry_tags", { p_entry_id: id, p_tag_ids: tagIds });
        if (error) throw error;
      }
    },
    onMutate: async ({ id, changes, tagIds }) => {
      const saved = await snapshot(client);
      const apply = (e: Entry): Entry =>
        e.id === id ? { ...e, ...changes, ...(tagIds ? { time_entry_tags: tagRows(tagIds) } : {}) } : e;
      client.setQueryData<Entry | null>(entryKeys.running, (r) => (r ? apply(r) : r));
      patchListed(client, (list) => list.map(apply));
      return { saved };
    },
    onError: (_e, _v, ctx) => restore(client, ctx?.saved),
    onSuccess: () => track("entry_updated"),
    onSettled: settle,
  });

  const create = useMutation({
    mutationFn: async ({ tagIds, ...entry }: TablesInsert<"time_entries"> & { tagIds?: string[] }) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("time_entries").insert(entry).select("id").single();
      if (error) throw error;
      if (tagIds?.length) {
        const tags = await supabase.rpc("set_entry_tags", { p_entry_id: data.id, p_tag_ids: tagIds });
        if (tags.error) throw tags.error;
      }
      return data;
    },
    onMutate: async ({ tagIds, ...entry }) => {
      const saved = await snapshot(client);
      if (entry.stop_at) patchListed(client, (list) => [tempEntry({ ...entry, time_entry_tags: tagRows(tagIds) }), ...list]);
      return { saved };
    },
    onError: (_e, _v, ctx) => restore(client, ctx?.saved),
    onSuccess: () => track("entry_created"),
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
    onSuccess: () => track("entry_deleted"),
    onSettled: settle,
  });

  return { start, stop, update, create, remove };
}
