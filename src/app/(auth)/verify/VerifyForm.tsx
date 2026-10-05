"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shell/Logo";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/auth/actions";

export function VerifyForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const digits = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(digits)) return setError("Enter the 6-digit code from your authenticator app.");
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp[0];
    if (listError || !factor) {
      setPending(false);
      return setError("Couldn't load your authenticator. Refresh the page and try again.");
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: digits });
    if (error) {
      setPending(false);
      setCode("");
      return setError(
        error.code === "mfa_verification_failed" || error.status === 422
          ? "That code didn't work. Codes change every 30 seconds; try the current one."
          : "Couldn't check the code. Try again.",
      );
    }
    // The upgraded session is in the cookies now; the server renders the app for it.
    router.replace("/timer");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-md bg-surface p-6 shadow-sm">
      <div className="mb-6">
        <Logo />
      </div>
      <ShieldCheck className="size-5 text-brand" strokeWidth={1.75} aria-hidden />
      <h1 className="mt-3 text-lg font-medium tracking-tight">Two-step verification</h1>
      <p className="mt-1 text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground">Code</span>
          <Input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby="verify-error"
            className="tabular h-9 tracking-widest"
          />
        </label>
        <p id="verify-error" aria-live="polite" className="min-h-5 text-danger">
          {error}
        </p>
        <Button type="submit" className="h-9" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Verify
        </Button>
      </form>

      <form action={signOut} className="mt-4 text-center">
        <button
          type="submit"
          className="rounded-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          Use a different account
        </button>
      </form>
    </div>
  );
}
