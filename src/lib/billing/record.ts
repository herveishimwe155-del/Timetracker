import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VerifiedTransaction } from "./flutterwave";
import { intervalForPayment, parseTxRef } from "./plans";

/**
 * Applies a transaction Flutterwave has just confirmed to us. Safe to call more
 * than once for the same transaction: the database records each id once.
 * First payments carry our reference (user id and interval); renewals are
 * matched to the subscriber by email, as Flutterwave ties subscriptions to it.
 */
export async function recordVerifiedPayment(
  tx: VerifiedTransaction,
  expectedUserId?: string,
): Promise<{ applied: true; periodEnd: string } | { applied: false; reason: string }> {
  if (tx.status !== "successful") return { applied: false, reason: `status ${tx.status}` };
  const admin = createAdminClient();
  const email = tx.customer?.email?.toLowerCase();

  const ref = parseTxRef(tx.tx_ref);
  let userId = ref?.userId ?? null;
  if (!userId && email) {
    const { data } = await admin.from("subscriptions").select("user_id").eq("customer_email", email).maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) return { applied: false, reason: "no matching user" };
  if (expectedUserId && userId !== expectedUserId) return { applied: false, reason: "different user" };

  const interval = intervalForPayment(Number(tx.amount), tx.currency, ref?.interval);
  if (!interval || !email) return { applied: false, reason: "amount, currency or email doesn't match a plan" };

  const { data, error } = await admin.rpc("apply_payment", {
    p_transaction_id: tx.id,
    p_user_id: userId,
    p_email: email,
    p_interval: interval,
    p_amount: Number(tx.amount),
    p_currency: tx.currency,
  });
  if (error) throw error;
  return { applied: true, periodEnd: data };
}
