"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signUpUrl } from "@/lib/guest";

/** Shown to signed-out visitors above the timer bar. */
export function GuestBanner() {
  const pathname = usePathname();
  return (
    <aside aria-label="Guest mode" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-line bg-surface px-4 py-2 text-center">
      <span className="text-muted-foreground">You&apos;re looking around Tickr. Sign up free to start tracking your time.</span>
      <Link
        href={signUpUrl(pathname)}
        className="rounded-sm font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        Sign up free
      </Link>
    </aside>
  );
}
