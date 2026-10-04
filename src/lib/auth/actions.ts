"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "./profile";
import { safeNextPath } from "./redirect";

export type AuthState = {
  error?: string;
  /** The field the error is about, when it is about one. */
  field?: "email" | "password";
  /** Shown after sign-up when the email still needs confirming. */
  notice?: string;
  email?: string;
};

const credentials = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters for your password.").max(72),
});

function invalid(error: z.ZodError, email: string): AuthState {
  const issue = error.issues[0];
  const field = issue.path[0] === "password" ? "password" : "email";
  return { error: issue.message, field, email };
}

function readForm(formData: FormData) {
  return {
    parsed: credentials.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    }),
    email: String(formData.get("email") ?? ""),
    next: safeNextPath(formData.get("next")?.toString()),
    timeZone: formData.get("tz")?.toString() ?? null,
  };
}

/** Plain-language messages for Supabase auth errors; unknown ones are logged. */
function authErrorMessage(error: AuthError, fallback: string): string {
  switch (error.code) {
    case "email_not_confirmed":
      return "Confirm your email first. Check your inbox (and spam) for the link.";
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Sign in instead.";
    case "weak_password":
      return "Choose a stronger password.";
    case "over_email_send_rate_limit":
      return "We just sent you an email. Check your inbox (and spam), or wait a minute before trying again.";
    case "over_request_rate_limit":
      return "Too many attempts. Wait a minute and try again.";
    case "signup_disabled":
      return "New sign-ups are turned off right now.";
  }
  if (error.status === 429) return "Too many attempts. Wait a minute and try again.";
  // The request never reached Supabase: a network failure, or a wrong NEXT_PUBLIC_SUPABASE_URL.
  if (error.name === "AuthRetryableFetchError" || !error.status) {
    console.error("Supabase auth unreachable", error.name, error.message);
    return "Can't reach the sign-in service right now. Try again in a moment.";
  }
  console.error("Supabase auth error", error.code, error.status, error.message);
  return fallback;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { parsed, email, next, timeZone } = readForm(formData);
  if (!parsed.success) return invalid(parsed.error, email);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: authErrorMessage(error, "Could not sign you in. Try again."), email };
  }

  await ensureProfile(supabase, data.user, timeZone);
  redirect(next);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { parsed, email, next, timeZone } = readForm(formData);
  if (!parsed.success) return invalid(parsed.error, email);

  const origin = (await headers()).get("origin") ?? "";
  const callback = new URL("/auth/callback", origin || "http://localhost");
  callback.searchParams.set("next", next);
  if (timeZone) callback.searchParams.set("tz", timeZone);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: callback.toString() },
  });
  if (error) {
    return { error: authErrorMessage(error, "Could not create your account. Try again."), email };
  }

  // Email confirmation off: signed in straight away.
  if (data.session && data.user) {
    await ensureProfile(supabase, data.user, timeZone);
    redirect(next);
  }
  return { notice: `Check ${parsed.data.email} for a link to confirm your account.`, email };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
