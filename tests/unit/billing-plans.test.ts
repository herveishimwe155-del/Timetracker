import { describe, expect, it } from "vitest";
import { intervalForPayment, isInterval, makeTxRef, parseTxRef } from "@/lib/billing/plans";

const USER = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

describe("tx_ref", () => {
  it("round-trips the user and interval", () => {
    expect(parseTxRef(makeTxRef(USER, "yearly", "a1b2c3"))).toEqual({ userId: USER, interval: "yearly" });
  });

  it.each([
    null,
    42,
    "",
    "FLW-renewal-123",
    `tickr_${USER}_weekly_abc`,
    `tickr_not-a-uuid_monthly_abc`,
    `tickr_${USER}_monthly_`,
    `xtickr_${USER}_monthly_abc`,
    `tickr_${USER}_monthly_abc;drop`,
  ])("rejects %s", (value) => {
    expect(parseTxRef(value)).toBeNull();
  });
});

describe("intervalForPayment", () => {
  it("accepts the full price for the expected interval", () => {
    expect(intervalForPayment(5, "USD", "monthly")).toBe("monthly");
    expect(intervalForPayment(48, "USD", "yearly")).toBe("yearly");
  });

  it("rejects underpayment and other currencies", () => {
    expect(intervalForPayment(4.99, "USD", "monthly")).toBeNull();
    expect(intervalForPayment(5, "USD", "yearly")).toBeNull();
    expect(intervalForPayment(48, "NGN", "yearly")).toBeNull();
  });

  it("infers the interval for renewals from the amount", () => {
    expect(intervalForPayment(5, "USD")).toBe("monthly");
    expect(intervalForPayment(48, "USD")).toBe("yearly");
    expect(intervalForPayment(1, "USD")).toBeNull();
  });
});

it("isInterval", () => {
  expect(isInterval("monthly")).toBe(true);
  expect(isInterval("yearly")).toBe(true);
  expect(isInterval("weekly")).toBe(false);
  expect(isInterval(undefined)).toBe(false);
});
