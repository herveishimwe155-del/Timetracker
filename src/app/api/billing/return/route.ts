import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyTransaction } from "@/lib/billing/flutterwave";
import { recordVerifiedPayment } from "@/lib/billing/record";

/** Flutterwave sends the browser here after checkout (?status=&tx_ref=&transaction_id=). */
export async function GET(request: NextRequest) {
  const done = (result: "success" | "failed" | "cancelled") => {
    const url = new URL("/settings", request.url);
    url.searchParams.set("billing", result);
    url.hash = "billing";
    return NextResponse.redirect(url);
  };

  const params = request.nextUrl.searchParams;
  if (params.get("status") === "cancelled") return done("cancelled");
  const id = Number(params.get("transaction_id"));
  if (!Number.isSafeInteger(id) || id <= 0) return done("failed");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return NextResponse.redirect(new URL("/login", request.url));

  try {
    // Ignore the query's status and amount; ask Flutterwave.
    const tx = await verifyTransaction(id);
    const result = await recordVerifiedPayment(tx, userId);
    if (!result.applied) console.warn("Payment not applied", id, result.reason);
    return done(result.applied ? "success" : "failed");
  } catch (error) {
    console.error("Payment return failed", id, error);
    return done("failed");
  }
}
