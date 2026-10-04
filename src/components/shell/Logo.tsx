import { cn } from "@/lib/utils";

export const APP_NAME = "Tickr";

/** The Tickr mark: a tick on an emerald tile. Decorative; pair it with the name. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-5 shrink-0", className)}>
      <rect width="24" height="24" rx="6" fill="var(--brand)" />
      <path
        d="M7 12.5l3.2 3.2L17 8.8"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mark plus wordmark. */
export function Logo({ className, hideName = false }: { className?: string; hideName?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      {!hideName && <span className="font-semibold tracking-tight">{APP_NAME}</span>}
    </span>
  );
}
