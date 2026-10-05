"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { BillingInterval, PlanId } from "@/lib/billing/plans";

export type PlanInfo = {
  plan: PlanId;
  /** Present once the user has ever paid. */
  subscription: {
    interval: BillingInterval;
    /** "cancelled" means it won't renew; Standard lasts until periodEnd. */
    status: "active" | "cancelled";
    periodEnd: string;
  } | null;
};

/** The user's plan, as the database decides it (paid period still running = Standard). */
export function usePlan() {
  return useQuery({
    queryKey: ["plan"],
    queryFn: async (): Promise<PlanInfo> => {
      const supabase = createClient();
      const [plan, sub] = await Promise.all([
        supabase.rpc("current_plan"),
        supabase.from("subscriptions").select("billing_interval, status, current_period_end").maybeSingle(),
      ]);
      if (plan.error) throw plan.error;
      if (sub.error) throw sub.error;
      return {
        plan: plan.data === "standard" ? "standard" : "free",
        subscription: sub.data
          ? {
              interval: sub.data.billing_interval as BillingInterval,
              status: sub.data.status as "active" | "cancelled",
              periodEnd: sub.data.current_period_end,
            }
          : null,
      };
    },
    staleTime: 60_000,
  });
}
