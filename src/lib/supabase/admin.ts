import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

/**
 * Supabase client with the secret (service role) key. It bypasses row-level
 * security, so use it only on the server for writes users must not make
 * themselves, such as recording a verified payment.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createClient<Database>(supabaseEnv().url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
