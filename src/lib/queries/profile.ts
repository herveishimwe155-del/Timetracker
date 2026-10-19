"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { DurationFormat } from "@/lib/time";
import { guestQuery, useIsGuest } from "@/lib/guest";

export type TimeFormat = "12h" | "24h";
export type Settings = {
  timeZone: string;
  weekStart: number;
  durationFormat: DurationFormat;
  timeFormat: TimeFormat;
  fullName: string;
};

const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const DURATION_FORMATS: DurationFormat[] = ["clock", "decimal", "classic"];

function useProfile() {
  const guest = useIsGuest();
  return useQuery({
    ...guestQuery(guest, null),
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("profiles")
        .select(
          "time_zone, week_start, duration_format, time_format, full_name, require_project, require_description, require_tags, max_tags, lock_before, show_times, show_timesheet",
        )
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
    timeFormat: data?.time_format === "12h" ? "12h" : "24h",
    fullName: data?.full_name ?? "",
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
        time_format: settings.timeFormat,
        full_name: settings.fullName.trim() || null,
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

/* ---------- Time entry rules (Settings → Time entries) ---------- */

export type EntryRules = {
  requireProject: boolean;
  requireDescription: boolean;
  requireTags: boolean;
  /** At most this many tags per entry; null = no limit. Enforced by the database too. */
  maxTags: number | null;
  /** Entries starting before this day (yyyy-MM-dd, user's zone) can't change; null = none. Enforced by the database too. */
  lockBefore: string | null;
  /** Show start and end times in the list, or durations only. */
  showTimes: boolean;
  /** Offer the Timesheet view. */
  showTimesheet: boolean;
};

export const DEFAULT_RULES: EntryRules = {
  requireProject: false,
  requireDescription: false,
  requireTags: false,
  maxTags: null,
  lockBefore: null,
  showTimes: true,
  showTimesheet: true,
};

export function useEntryRules(): EntryRules & { loaded: boolean } {
  const { data, isSuccess } = useProfile();
  if (!data) return { ...DEFAULT_RULES, loaded: isSuccess };
  return {
    requireProject: data.require_project,
    requireDescription: data.require_description,
    requireTags: data.require_tags,
    maxTags: data.max_tags,
    lockBefore: data.lock_before,
    showTimes: data.show_times,
    showTimesheet: data.show_timesheet,
    loaded: isSuccess,
  };
}

export function useSaveEntryRules() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (rules: EntryRules) => {
      const supabase = createClient();
      const { data: claims } = await supabase.auth.getClaims();
      const id = claims?.claims.sub;
      if (!id) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").upsert({
        id,
        require_project: rules.requireProject,
        require_description: rules.requireDescription,
        require_tags: rules.requireTags,
        max_tags: rules.maxTags,
        lock_before: rules.lockBefore,
        show_times: rules.showTimes,
        show_timesheet: rules.showTimesheet,
      });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["profile"] }),
  });
}

/** What's missing for an entry under the user's rules, as a sentence, or null when it's fine. */
export function missingRequired(
  rules: Pick<EntryRules, "requireProject" | "requireDescription" | "requireTags" | "maxTags">,
  entry: { description: string; projectId: string | null; tagIds: string[] },
): string | null {
  const missing: string[] = [];
  if (rules.requireDescription && !entry.description.trim()) missing.push("a description");
  if (rules.requireProject && !entry.projectId) missing.push("a project");
  if (rules.requireTags && entry.tagIds.length === 0) missing.push("at least one tag");
  if (missing.length) {
    const list = missing.length > 1 ? `${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}` : missing[0];
    return `Your settings require ${list}.`;
  }
  if (rules.maxTags !== null && entry.tagIds.length > rules.maxTags) {
    return `Use at most ${rules.maxTags} tag${rules.maxTags === 1 ? "" : "s"} per entry.`;
  }
  return null;
}
