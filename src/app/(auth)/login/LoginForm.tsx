"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/shell/Logo";
import { signIn, signUp, type AuthState } from "@/lib/auth/actions";

type Mode = "sign-in" | "sign-up";

const noSubscribe = () => () => {};
/** The browser's time zone, e.g. "Africa/Kigali"; empty during server render. */
function useBrowserTimeZone() {
  return useSyncExternalStore(
    noSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "",
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12S6.6 21.8 12 21.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export function LoginForm({ next, linkError, notice }: { next: string; linkError: boolean; notice?: string }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction, signingUp] = useActionState<AuthState, FormData>(signUp, {});
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const timeZone = useBrowserTimeZone();

  const state = mode === "sign-in" ? signInState : signUpState;
  const pending = signingIn || signingUp || googlePending;
  const error =
    googleError ?? state.error ?? (linkError ? "That sign-in link is invalid or has expired." : undefined);

  async function continueWithGoogle() {
    setGoogleError(null);
    setGooglePending(true);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);
    if (timeZone) callback.searchParams.set("tz", timeZone);

    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });
    // On success the browser is already leaving for Google.
    if (error) {
      setGoogleError("Google sign-in is unavailable right now. Use your email instead.");
      setGooglePending(false);
    }
  }

  const brand = (
    <div className="mb-6">
      <Logo />
    </div>
  );

  // After sign-up, replace the form so there's nothing to click twice.
  if (mode === "sign-up" && signUpState.notice) {
    return (
      <div className="w-full max-w-sm rounded-md bg-surface p-6 shadow-sm">
        {brand}
        <MailCheck className="size-5 text-brand" strokeWidth={1.75} aria-hidden />
        <h1 className="mt-3 text-lg font-medium tracking-tight">Check your email</h1>
        <p className="mt-1 text-muted-foreground" role="status">
          We sent a confirmation link to <span className="text-foreground">{signUpState.email}</span>. Open it to
          finish creating your account, then sign in. It can take a minute; check spam too.
        </p>
        <Button type="button" className="mt-6 h-9 w-full" onClick={() => setMode("sign-in")}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-md bg-surface p-6 shadow-sm">
      {brand}

      <h1 className="text-lg font-medium tracking-tight">
        {mode === "sign-in" ? "Sign in" : "Create your account"}
      </h1>
      <p className="mt-1 text-muted-foreground">
        {mode === "sign-in" ? "Welcome back. Pick up where you left off." : "Start tracking in under a minute."}
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-6 h-9 w-full"
        onClick={continueWithGoogle}
        disabled={pending}
      >
        {googlePending ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <form
        key={mode}
        action={mode === "sign-in" ? signInAction : signUpAction}
        className="flex flex-col gap-3"
        noValidate
      >
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="tz" value={timeZone} />

        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground">Email</span>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            aria-invalid={state.field === "email" || undefined}
            className="h-9"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground">Password</span>
          <Input
            name="password"
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            required
            minLength={8}
            aria-invalid={state.field === "password" || undefined}
            className="h-9"
          />
          {mode === "sign-up" && <span className="text-xs text-muted-foreground">At least 8 characters.</span>}
        </label>

        <div aria-live="polite" className="min-h-0">
          {error && <p className="text-danger">{error}</p>}
          {!error && (state.notice ?? notice) && <p className="text-brand">{state.notice ?? notice}</p>}
        </div>

        <Button type="submit" className="h-9 w-full" disabled={pending}>
          {(signingIn || signingUp) && <Loader2 className="animate-spin" />}
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-muted-foreground">
        {mode === "sign-in" ? "New here?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          className={cn(
            "rounded-sm text-foreground underline-offset-4 outline-none hover:underline",
            "focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {mode === "sign-in" ? "Create an account" : "Sign in"}
        </button>
      </p>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        By continuing, you agree to the{" "}
        <Link href="/terms" className="rounded-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="rounded-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          Privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
