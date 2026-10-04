import { addDaysToKey, dayKey, wallTimeToInstant } from "@/lib/time";

/** What the editor's date and time fields hold (minutes only). */
export type TimeFields = { date: string; start: string; end: string };

/** The entry's exact instants and how they appeared in the fields when the editor opened. */
export type OriginalTimes = TimeFields & { startAt: string; stopAt: string };

/**
 * Start and stop instants from the editor fields. Fields the user didn't change keep
 * the original instant to the second, so opening and saving an entry never rounds it.
 * A changed end at or before the start time means the next day.
 */
export function resolveTimes(fields: TimeFields, original: OriginalTimes | null, timeZone: string) {
  const startUnchanged = original !== null && fields.date === original.date && fields.start === original.start;
  const endUnchanged = original !== null && fields.date === original.date && fields.end === original.end;

  const startAt = startUnchanged ? new Date(original.startAt) : wallTimeToInstant(fields.date, fields.start, timeZone);
  const stopAt = endUnchanged
    ? new Date(original.stopAt)
    : wallTimeToInstant(fields.end <= fields.start ? addDaysToKey(fields.date, 1) : fields.date, fields.end, timeZone);

  return { startAt, stopAt, endsNextDay: dayKey(stopAt, timeZone) !== dayKey(startAt, timeZone) };
}
