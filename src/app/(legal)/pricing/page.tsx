import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FREE_PROJECT_LIMIT, STANDARD_PRICE } from "@/lib/billing/plans";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Tickr is free for up to 10 projects. Standard removes the limit; Premium is for schools and companies.",
};

type Tier = {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  cta: { label: string; href: string; external?: boolean };
  highlight?: boolean;
  badge?: string;
};

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "Everything you need to track your own time.",
    features: [
      `Up to ${FREE_PROJECT_LIMIT} active projects`,
      "Unlimited time entries, clients and tags",
      "Timer, calendar, list and timesheet views",
      "Reports, goals and CSV export",
      "Two-step verification",
    ],
    cta: { label: "Start free", href: "/login" },
  },
  {
    name: "Standard",
    price: `$${STANDARD_PRICE.monthly}`,
    cadence: `per month, or $${STANDARD_PRICE.yearly} a year (save 20%)`,
    blurb: "For freelancers and anyone juggling many projects.",
    features: ["Everything in Free", "Unlimited projects", "Cancel any time; keep it until the period ends"],
    cta: { label: "Get Standard", href: "/settings#billing" },
    highlight: true,
  },
  {
    name: "Premium",
    price: "Per member",
    cadence: "per month",
    blurb: "For schools, universities, companies and other organisations.",
    features: [
      "Everything in Standard, for every member",
      "A shared workspace with members and roles",
      "Team reports across everyone's time",
      "One bill for the whole organisation",
    ],
    cta: { label: "Contact us", href: `mailto:${OPERATOR.email}?subject=Tickr%20Premium`, external: true },
    badge: "Coming soon",
  },
];

export default function PricingPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
        <p className="mt-2 text-muted-foreground">Start free. Upgrade when you outgrow it.</p>
      </div>

      <ul className="grid gap-4 md:grid-cols-3">
        {TIERS.map((tier, i) => (
          <li
            key={tier.name}
            data-reveal
            data-tilt="6"
            style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}
            className={cn(
              "flex flex-col gap-4 rounded-md bg-surface p-5 shadow-sm",
              tier.highlight && "shadow-[inset_0_0_0_1px_var(--brand)]",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">{tier.name}</h2>
              {tier.badge && <span className="rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground shadow-sm">{tier.badge}</span>}
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight">{tier.price}</p>
              <p className="text-muted-foreground">{tier.cadence}</p>
            </div>
            <p className="text-muted-foreground">{tier.blurb}</p>
            <ul className="flex flex-1 flex-col gap-2">
              {tier.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
            <Button asChild variant={tier.highlight ? "default" : "outline"} className="h-9">
              {tier.cta.external ? <a href={tier.cta.href}>{tier.cta.label}</a> : <Link href={tier.cta.href}>{tier.cta.label}</Link>}
            </Button>
          </li>
        ))}
      </ul>

      <p className="max-w-2xl text-muted-foreground">
        Prices are in US dollars. Subscriptions are paid by card through Flutterwave and renew automatically until you
        turn renewal off in Settings.
      </p>
    </div>
  );
}
