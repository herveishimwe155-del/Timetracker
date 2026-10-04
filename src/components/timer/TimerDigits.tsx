import { cn } from "@/lib/utils";
import { describeDuration, formatDuration, type DurationFormat } from "@/lib/time";

const sizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl font-medium tracking-tight",
} as const;

type TimerDigitsProps = {
  /** Elapsed time in whole seconds. */
  seconds: number;
  size?: keyof typeof sizes;
  /** Emerald while a timer is running. */
  running?: boolean;
  /** How to show the duration; the live timer always uses "clock". */
  format?: DurationFormat;
  className?: string;
};

/**
 * A duration (a clock by default) in JetBrains Mono with tabular numerals, so every digit
 * has the same width and the clock never shifts as it ticks.
 */
export function TimerDigits({ seconds, size = "md", running = false, format = "clock", className }: TimerDigitsProps) {
  return (
    <time
      dateTime={`PT${Math.max(0, Math.floor(seconds))}S`}
      aria-label={describeDuration(seconds)}
      className={cn(
        "tabular inline-block whitespace-nowrap leading-none",
        sizes[size],
        running ? "text-brand" : "text-foreground",
        className,
      )}
    >
      {formatDuration(seconds, format)}
    </time>
  );
}
