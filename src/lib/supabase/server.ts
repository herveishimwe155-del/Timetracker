import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Create a new one per request; never share it.
 */
export async function createClient() {
  // Reading cookies first marks the route as per-request, so builds never prerender it.
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies. The proxy refreshes the session instead.
        }
      },
    },
  });
}

/** The signed-in user's id, verified from the session token, or null. */
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}
