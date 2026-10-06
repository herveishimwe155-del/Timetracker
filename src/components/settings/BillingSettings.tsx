"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelPlan, startCheckout } from "@/lib/billing/actions";
import { FREE_PROJECT_LIMIT, STANDARD_PRICE, type BillingInterval } from "@/lib/billing/plans";
import { OPERATOR } from "@/lib/legal";
import { useProjects } from "@/lib/queries/catalog";
import { usePlan } from "@/lib/queries/plan";
import { useSettings } from "@/lib/queries/profile";

const RESULT_MESSAGES = {
  success: { text: "Payment received. Welcome to Standard!", tone: "text-brand" },
  failed: { text: "The payment didn't go through, so nothing was charged for Standard. Try again.", tone: "text-danger" },
  cancelled: { text: "Checkout cancelled. Nothing was charged.", tone: "text-muted-foreground" },
} as const;

export type CheckoutReturn = keyof typeof RESULT_MESSAGES;

export function BillingSettings({ configured, result }: { configured: boolean; result?: CheckoutReturn }) {
  const { data: info, isPending, isError, refetch } = usePlan();
  const { data: projects = [] } = useProjects();
  const { timeZone } = useSettings();
  const [busy, setBusy] = useState<BillingInterval | "cancel" | null>(null);

  const activeProjects = projects.filter((p) => !p.archived).length;
  const formatDate = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeZone }).format(new Date(iso));

  async function upgrade(interval: BillingInterval) {
    setBusy(interval);
    const res = await startCheckout(interval);
    if ("url" in res) {
      window.location.href = res.url; // Flutterwave's checkout page
      return;
    }
    setBusy(null);
    toast.error(res.error);
  }

  async function cancel() {
    if (!window.confirm("Turn off renewal? You keep Standard until the end of the period you've paid for.")) return;
    setBusy("cancel");
    const res = await cancelPlan();
    setBusy(null);
    if (res.error) toast.error(res.error);
    else toast.success(res.success);
    void refetch();
  }

  const notice = result && RESULT_MESSAGES[result];

  return (
    <div className="flex max-w-xl flex-col items-start gap-4">
      {notice && (
        <p role="status" className={notice.tone}>
          {notice.text}
        </p>
      )}

      {isPending ? (
        <div className="h-16 w-full animate-pulse rounded-md bg-surface" role="status" aria-busy="true" aria-label="Loading your plan" />
      ) : isError ? (
        <div className="flex items-center gap-3">
          <span className="text-danger">Your plan couldn&apos;t be loaded.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : info.plan === "standard" && info.subscription ? (
        <>
          <p className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand" aria-hidden />
            <span className="font-medium">Standard</span>
            <span className="text-muted-foreground">
              · {info.subscription.interval === "yearly" ? "yearly" : "monthly"}
            </span>
          </p>
          <p className="text-muted-foreground">
            {info.subscription.status === "active"
              ? `Renews on ${formatDate(info.subscription.periodEnd)}. Unlimited projects.`
              : `Renewal is off. You have Standard until ${formatDate(info.subscription.periodEnd)}, then Free.`}
          </p>
          {info.subscription.status === "active" ? (
            <Button variant="outline" onClick={cancel} disabled={busy !== null}>
              {busy === "cancel" && <Loader2 className="animate-spin" />}
              Turn off renewal
            </Button>
          ) : (
            <UpgradeButtons busy={busy} configured={configured} onUpgrade={upgrade} label="Renew" />
          )}
        </>
      ) : (
        <>
          <p>
            <span className="font-medium">Free</span>
            <span className="text-muted-foreground">
              {" "}
              · {activeProjects} of {FREE_PROJECT_LIMIT} active projects used
            </span>
          </p>
          <p className="text-muted-foreground">
            Standard removes the project limit. Everything else stays the same.
          </p>
          <UpgradeButtons busy={busy} configured={configured} onUpgrade={upgrade} label="Upgrade" />
        </>
      )}

      <p className="text-muted-foreground">
        Subscriptions are paid by card through Flutterwave. Compare plans on the{" "}
        <Link href="/pricing" className="rounded-sm text-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          pricing page
        </Link>
        . For a school or company, <a href={`mailto:${OPERATOR.email}?subject=Tickr%20Premium`} className="rounded-sm text-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">email us about Premium</a>.
      </p>
    </div>
  );
}

function UpgradeButtons({
  busy,
  configured,
  onUpgrade,
  label,
}: {
  busy: BillingInterval | "cancel" | null;
  configured: boolean;
  onUpgrade: (interval: BillingInterval) => void;
  label: string;
}) {
  if (!configured) return <p className="text-muted-foreground">Paid plans are coming soon.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => onUpgrade("monthly")} disabled={busy !== null}>
        {busy === "monthly" ? <Loader2 className="animate-spin" /> : <CreditCard />}
        {label}: ${STANDARD_PRICE.monthly} / month
      </Button>
      <Button variant="outline" onClick={() => onUpgrade("yearly")} disabled={busy !== null}>
        {busy === "yearly" && <Loader2 className="animate-spin" />}
        ${STANDARD_PRICE.yearly} / year (save 20%)
      </Button>
    </div>
  );
}
