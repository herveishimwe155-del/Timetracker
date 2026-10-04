import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { safeTimeZone } from "./redirect";

/**
 * Creates the user's profile on first sign-in, with the time zone detected in
 * their browser. Later sign-ins leave an existing profile untouched.
 */
export async function ensureProfile(supabase: SupabaseClient, user: User, timeZone: string | null) {
  const meta = user.user_metadata ?? {};
  const fullName: string | null = meta.full_name ?? meta.name ?? null;

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, full_name: fullName, time_zone: safeTimeZone(timeZone) },
      { onConflict: "id", ignoreDuplicates: true },
    );

  // Not fatal: the user can still use the app, and the next sign-in retries.
  if (error) console.error("Could not create profile", error.message);
}
