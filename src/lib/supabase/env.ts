/**
 * Supabase project URL and public key. Both are safe to expose to the browser;
 * row-level security protects the data. NEXT_PUBLIC_ values must be read with
 * literal names so Next.js can inline them into the client bundle.
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Newer Supabase projects call this the "publishable" key; older ones the "anon" key.
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase settings. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return { url, key };
}
