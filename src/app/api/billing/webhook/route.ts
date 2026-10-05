import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeSubscriptions, planIdFor, verifyTransaction, webhookHashMatches } from "@/lib/billing/flutterwave";
import { recordVerifiedPayment } from "@/lib/billing/record";

type WebhookBody = {
  event?: string;
  data?: { id?: number; customer?: { email?: string } };
};

/**
 * Flutterwave webhook: renewals (charge.completed) and cancellations.
 * The verif-hash header proves it's from Flutterwave; each charge is still
 * re-checked with the API before it changes anything.
 */
export async function POST(request: NextRequest) {
  if (!webhookHashMatches(request.headers.get("verif-hash"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as WebhookBody | null;
  const event = body?.event;

  try {
    if (event === "charge.completed" && Number.isSafeInteger(body?.data?.id)) {
      const result = await recordVerifiedPayment(await verifyTransaction(body!.data!.id!));
      if (!result.applied) console.warn("Webhook charge not applied", body!.data!.id, result.reason);
    } else if (event === "subscription.cancelled" && body?.data?.customer?.email) {
      const email = body.data.customer.email.toLowerCase();
      // Only mark it if Flutterwave confirms no Tickr plan is still active for this email.
      const plans = new Set([planIdFor("monthly"), planIdFor("yearly")]);
      const active = (await activeSubscriptions(email)).filter((s) => plans.has(Number(s.plan)));
      if (active.length === 0) {
        await createAdminClient()
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("customer_email", email);
      }
    }
  } catch (error) {
    console.error("Webhook failed", event, error);
    // A non-2xx makes Flutterwave retry later.
    return NextResponse.json({ error: "retry" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
