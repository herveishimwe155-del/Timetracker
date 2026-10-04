"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { fetchAllPages } from "@/lib/supabase/paginate";
import { rangeInstants, type DayRange } from "@/lib/reports";

/**
 * Every entry that overlaps the range (the running one included), with its tags.
 * Filtering and totals happen in `buildReport`, so changing a filter needs no refetch.
 */
export function useReportEntries(range: DayRange, timeZone: string) {
  return useQuery({
    // Under "entries" so Realtime changes and entry edits refresh reports too.
    queryKey: ["entries", "report", timeZone, range.from, range.to],
    queryFn: async () => {
      const { fromMs, toMs } = rangeInstants(range, timeZone);
      const from = new Date(fromMs).toISOString();
      const to = new Date(toMs).toISOString();
      const supabase = createClient();
      return fetchAllPages((first, last) =>
        supabase
          .from("time_entries")
          .select("id, start_at, stop_at, description, project_id, billable, time_entry_tags(tag_id)")
          .lt("start_at", to)
          .or(`stop_at.is.null,stop_at.gt.${from}`)
          .order("start_at")
          .order("id")
          .range(first, last),
      );
    },
    placeholderData: keepPreviousData,
  });
}
