"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Status = { state: "loading" } | { state: "off" } | { state: "on"; factorId: string } | { state: "error" };
type Enrolment = { factorId: string; qrCode: string; secret: string };

/** Authenticator-app (TOTP) two-step verification: set up, confirm, turn off. */
export function TwoFactorSettings() {
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await createClient().auth.mfa.listFactors();
    if (error) return setStatus({ state: "error" });
    const factor = data.totp[0];
    setStatus(factor ? { state: "on", factorId: factor.id } : { state: "off" });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads external auth state once
    void load();
  }, [load]);

  async function start() {
    setPending(true);
    setError(null);
    const { auth } = createClient();
    // Drop half-finished set-ups so the new one can't clash with them.
    const { data: existing } = await auth.mfa.listFactors();
    for (const f of existing?.all ?? []) {
      if (f.factor_type === "totp" && f.status === "unverified") await auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
    setPending(false);
    if (error) return setError("Couldn't start set-up. Try again.");
    setEnrolment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (!enrolment) return;
    const digits = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(digits)) return setError("Enter the 6-digit code from your authenticator app.");
    setPending(true);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrolment.factorId, code: digits });
    setPending(false);
    if (error) {
      setCode("");
      return setError("That code didn't work. Codes change every 30 seconds; try the current one.");
    }
    setEnrolment(null);
    setCode("");
    toast.success("Two-step verification is on");
    void load();
  }

  async function cancel() {
    if (enrolment) await createClient().auth.mfa.unenroll({ factorId: enrolment.factorId });
    setEnrolment(null);
    setCode("");
    setError(null);
  }

  async function turnOff() {
    if (status.state !== "on") return;
    if (!window.confirm("Turn off two-step verification? Your password alone will then be enough to sign in.")) return;
    setPending(true);
    const { error } = await createClient().auth.mfa.unenroll({ factorId: status.factorId });
    setPending(false);
    if (error) return toast.error("Couldn't turn it off. Sign out, sign in with your code, and try again.");
    toast.success("Two-step verification is off");
    void load();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <span className="font-medium">Two-step verification</span>

      {status.state === "loading" && <span className="text-muted-foreground">Checking…</span>}
      {status.state === "error" && <span className="text-danger">Couldn&apos;t load this setting. Refresh to try again.</span>}

      {status.state === "on" && (
        <>
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldCheck className="size-4 text-brand" aria-hidden />
            On. Signing in asks for a code from your authenticator app.
          </p>
          <Button type="button" variant="outline" onClick={turnOff} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <ShieldOff />}
            Turn off
          </Button>
        </>
      )}

      {status.state === "off" && !enrolment && (
        <>
          <p className="text-muted-foreground">
            Ask for a code from an authenticator app (Google Authenticator, 1Password, Authy…) when you sign in, so a
            stolen password isn&apos;t enough.
          </p>
          <Button type="button" variant="outline" onClick={start} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            Set up
          </Button>
          <p aria-live="polite" className="min-h-5 text-danger">
            {error}
          </p>
        </>
      )}

      {enrolment && (
        <form onSubmit={confirm} className="flex w-full flex-col gap-3 rounded-md p-4 shadow-sm" noValidate>
          <p className="text-muted-foreground">1. Scan this code with your authenticator app.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- an SVG data URI from Supabase */}
          <img src={enrolment.qrCode} alt="QR code for your authenticator app" className="size-44 rounded-sm bg-white p-2" />
          <p className="text-muted-foreground">
            Can&apos;t scan? Enter this key instead:{" "}
            <code className="tabular break-all text-foreground select-all">{enrolment.secret}</code>
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground">2. Enter the 6-digit code it shows</span>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              className="tabular h-9 w-40 tracking-widest"
            />
          </label>
          <p aria-live="polite" className="min-h-5 text-danger">
            {error}
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Turn on
            </Button>
            <Button type="button" variant="ghost" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
