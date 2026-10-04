"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type Settings = { timeZone: string; weekStart: number };

const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/** The signed-in user's settings; falls back to the browser's time zone until loaded. */
export function useSettings(): Settings {
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("profiles")
        .select("time_zone, week_start")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  return {
    timeZone: data?.time_zone ?? browserTimeZone(),
    weekStart: data?.week_start ?? 1,
  };
}
