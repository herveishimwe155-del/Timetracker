import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/profile";
import { safeNextPath } from "@/lib/auth/redirect";

/**
 * Landing point for Google sign-in and email confirmation links. Swaps the
 * one-time code for a session, creates the profile on first sign-in, then
 * continues to where the user was going.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await ensureProfile(supabase, data.user, searchParams.get("tz"));
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const failed = new URL("/login", origin);
  failed.searchParams.set("error", "link");
  return NextResponse.redirect(failed);
}
