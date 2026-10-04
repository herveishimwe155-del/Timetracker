"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
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

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { parsed, email, next, timeZone } = readForm(formData);
  if (!parsed.success) return invalid(parsed.error, email);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "Confirm your email first. Check your inbox for the link."
        : "Email or password is incorrect.";
    return { error: message, email };
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
    const message =
      error.code === "user_already_exists"
        ? "An account with this email already exists. Sign in instead."
        : error.code === "weak_password"
          ? "Choose a stronger password."
          : "Could not create your account. Try again.";
    return { error: message, email };
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
