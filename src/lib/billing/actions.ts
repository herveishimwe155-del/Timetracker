"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeSubscriptions, billingConfigured, cancelSubscription, createCheckout, planIdFor } from "./flutterwave";
import { CURRENCY, STANDARD_PRICE, isInterval, makeTxRef } from "./plans";

export type CheckoutResult = { url: string } | { error: string };

/** Starts a Flutterwave checkout for Standard; the browser then goes to the returned URL. */
export async function startCheckout(interval: unknown): Promise<CheckoutResult> {
  if (!isInterval(interval)) return { error: "Choose monthly or yearly." };
  if (!billingConfigured()) return { error: "Payments aren't set up yet. Try again later." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const email = typeof data?.claims.email === "string" ? data.claims.email : null;
  if (!userId) return { error: "Sign in again, then try once more." };
  if (!email) return { error: "Your account needs an email address to subscribe." };

  const { data: plan } = await supabase.rpc("current_plan");
  const { data: sub } = await supabase.from("subscriptions").select("status").maybeSingle();
  if (plan === "standard" && sub?.status === "active") return { error: "You're already on Standard." };

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (!origin) return { error: "Couldn't start checkout. Try again." };

  try {
    const url = await createCheckout({
      txRef: makeTxRef(userId, interval, randomBytes(8).toString("hex")),
      amount: STANDARD_PRICE[interval],
      currency: CURRENCY,
      planId: planIdFor(interval),
      redirectUrl: new URL("/api/billing/return", origin).toString(),
      email,
      title: `Tickr Standard (${interval})`,
    });
    return { url };
  } catch (error) {
    console.error("Checkout failed", error);
    return { error: "Couldn't reach the payment service. Try again in a moment." };
  }
}

export type CancelResult = { error?: string; success?: string };

/** Stops renewals. Standard stays on until the end of the period already paid for. */
export async function cancelPlan(): Promise<CancelResult> {
  const supabase = await createClient();
  const { data: sub } = await supabase.from("subscriptions").select("user_id, customer_email, status").maybeSingle();
  if (!sub) return { error: "You don't have a subscription." };
  if (sub.status === "cancelled") return { success: "Renewal is already off." };

  try {
    const plans = new Set([planIdFor("monthly"), planIdFor("yearly")]);
    const active = await activeSubscriptions(sub.customer_email);
    await Promise.all(active.filter((s) => plans.has(Number(s.plan))).map((s) => cancelSubscription(s.id)));
    const { error } = await createAdminClient()
      .from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("user_id", sub.user_id);
    if (error) throw error;
    return { success: "Renewal turned off. You keep Standard until the end of the period you paid for." };
  } catch (error) {
    console.error("Cancel failed", error);
    return { error: "Couldn't turn off renewal. Try again, or email us." };
  }
}
