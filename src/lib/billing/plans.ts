/** Plans, prices and limits. Prices must match the Flutterwave payment plans. */

export type PlanId = "free" | "standard";
export type BillingInterval = "monthly" | "yearly";

export const FREE_PROJECT_LIMIT = 10;

export const STANDARD_PRICE: Record<BillingInterval, number> = { monthly: 5, yearly: 48 };
export const CURRENCY = "USD";

export const isInterval = (value: unknown): value is BillingInterval => value === "monthly" || value === "yearly";

/**
 * Our checkout reference: "tickr_<user id>_<interval>_<random>".
 * Renewals Flutterwave creates on its own have its references, not ours.
 */
export function makeTxRef(userId: string, interval: BillingInterval, random: string): string {
  return `tickr_${userId}_${interval}_${random}`;
}

export function parseTxRef(txRef: unknown): { userId: string; interval: BillingInterval } | null {
  if (typeof txRef !== "string") return null;
  const match = /^tickr_([0-9a-f-]{36})_(monthly|yearly)_[A-Za-z0-9]+$/.exec(txRef);
  return match ? { userId: match[1], interval: match[2] as BillingInterval } : null;
}

/** The interval a payment pays for, or null if it isn't a full Standard payment in our currency. */
export function intervalForPayment(
  amount: number,
  currency: string,
  expected?: BillingInterval,
): BillingInterval | null {
  if (currency !== CURRENCY) return null;
  if (expected) return amount >= STANDARD_PRICE[expected] ? expected : null;
  if (amount >= STANDARD_PRICE.yearly) return "yearly";
  if (amount >= STANDARD_PRICE.monthly) return "monthly";
  return null;
}
