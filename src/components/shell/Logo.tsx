import { cn } from "@/lib/utils";

export const APP_NAME = "Tickr";

/**
 * The Tickr mark: an emerald progress ring on a dark tile (timer filling up).
 * Same geometry as src/app/icon.svg and public/brand/. Decorative; pair it with the name.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-5 shrink-0", className)}>
      <rect width="64" height="64" rx="14" fill="var(--logo-tile)" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="var(--logo-track)" strokeWidth="7" />
      <circle
        cx="32"
        cy="32"
        r="18"
        fill="none"
        stroke="var(--logo-ring)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray="85 200"
        transform="rotate(-90 32 32)"
      />
      <circle cx="32" cy="32" r="4.5" fill="var(--logo-ring)" />
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
