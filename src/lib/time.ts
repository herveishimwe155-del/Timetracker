/**
 * Time helpers. All durations are whole seconds.
 */

/** Splits a duration into hours, minutes and seconds. Negative input counts as 0. */
export function splitDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return {
    hours: Math.floor(s / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Formats a duration as a clock, H:MM:SS with at least two hour digits: 0 → "00:00:00", 3725 → "01:02:05". */
export function formatClock(totalSeconds: number): string {
  const { hours, minutes, seconds } = splitDuration(totalSeconds);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Spoken form for screen readers: 3725 → "1 hour 2 minutes 5 seconds". */
export function describeDuration(totalSeconds: number): string {
  const { hours, minutes, seconds } = splitDuration(totalSeconds);
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  const parts = [];
  if (hours) parts.push(part(hours, "hour"));
  if (minutes) parts.push(part(minutes, "minute"));
  if (seconds || parts.length === 0) parts.push(part(seconds, "second"));
  return parts.join(" ");
}
