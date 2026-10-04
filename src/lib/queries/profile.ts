"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { DurationFormat } from "@/lib/time";

export type Settings = { timeZone: string; weekStart: number; durationFormat: DurationFormat };

const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const DURATION_FORMATS: DurationFormat[] = ["clock", "decimal", "classic"];

function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("profiles")
        .select("time_zone, week_start, duration_format")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

/** The signed-in user's settings; falls back to the browser's time zone until loaded. */
export function useSettings(): Settings & { loaded: boolean } {
  const { data, isSuccess } = useProfile();
  const format = data?.duration_format as DurationFormat | undefined;
  return {
    timeZone: data?.time_zone ?? browserTimeZone(),
    weekStart: data?.week_start ?? 1,
    durationFormat: format && DURATION_FORMATS.includes(format) ? format : "clock",
    loaded: isSuccess,
  };
}

/** Saves settings (creating the profile if sign-in never did) and refreshes everything that depends on them. */
export function useSaveSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Settings) => {
      const supabase = createClient();
      const { data: claims } = await supabase.auth.getClaims();
      const id = claims?.claims.sub;
      if (!id) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").upsert({
        id,
        time_zone: settings.timeZone,
        week_start: settings.weekStart,
        duration_format: settings.durationFormat,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["profile"] });
      // Day grouping depends on the time zone.
      client.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}
