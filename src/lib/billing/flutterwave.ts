import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { BillingInterval } from "./plans";

/**
 * Flutterwave v3 API, server side only. Settings (all in Vercel env vars):
 *   FLW_SECRET_KEY        secret key (FLWSECK_... ; the _TEST one in test mode)
 *   FLW_WEBHOOK_HASH      the "secret hash" set under Settings → Webhooks
 *   FLW_PLAN_MONTHLY      payment plan id for Standard monthly ($5)
 *   FLW_PLAN_YEARLY       payment plan id for Standard yearly ($48)
 */
const API = "https://api.flutterwave.com/v3";

export function billingConfigured(): boolean {
  return Boolean(
    process.env.FLW_SECRET_KEY && process.env.FLW_PLAN_MONTHLY && process.env.FLW_PLAN_YEARLY && adminKeyPresent(),
  );
}

function adminKeyPresent() {
  return Boolean(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function planIdFor(interval: BillingInterval): number {
  return Number(interval === "yearly" ? process.env.FLW_PLAN_YEARLY : process.env.FLW_PLAN_MONTHLY);
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) throw new Error("FLW_SECRET_KEY is not set");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => null)) as { status?: string; message?: string; data?: unknown } | null;
  if (!response.ok || body?.status !== "success") {
    throw new Error(`Flutterwave ${path} failed: ${response.status} ${body?.message ?? ""}`);
  }
  return body.data as T;
}

export async function createCheckout(input: {
  txRef: string;
  amount: number;
  currency: string;
  planId: number;
  redirectUrl: string;
  email: string;
  name?: string;
  title: string;
}): Promise<string> {
  const data = await call<{ link: string }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: input.amount,
      currency: input.currency,
      payment_plan: input.planId,
      redirect_url: input.redirectUrl,
      customer: { email: input.email, ...(input.name ? { name: input.name } : {}) },
      customizations: { title: input.title },
    }),
  });
  return data.link;
}

export type VerifiedTransaction = {
  id: number;
  tx_ref: string;
  status: string;
  amount: number;
  currency: string;
  customer: { email: string };
};

/** Asks Flutterwave for the transaction; never trust amounts from the browser or a webhook body. */
export function verifyTransaction(id: number): Promise<VerifiedTransaction> {
  return call<VerifiedTransaction>(`/transactions/${encodeURIComponent(String(id))}/verify`);
}

type Subscription = { id: number; plan: number; status: string; customer: { customer_email: string } };

export function activeSubscriptions(email: string): Promise<Subscription[]> {
  return call<Subscription[]>(`/subscriptions?email=${encodeURIComponent(email)}&status=active`);
}

export function cancelSubscription(id: number): Promise<unknown> {
  return call(`/subscriptions/${encodeURIComponent(String(id))}/cancel`, { method: "PUT" });
}

/** Constant-time check of the webhook's verif-hash header. */
export function webhookHashMatches(received: string | null): boolean {
  const expected = process.env.FLW_WEBHOOK_HASH;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
