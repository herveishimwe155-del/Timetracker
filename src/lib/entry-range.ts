type Span = { start_at: string; stop_at: string | null };

const MINUTE = 60_000;

/**
 * A sensible slot for a new entry: the gap after the latest entry, ending now (or when
 * the running timer started). With no gap, the half hour right after the latest entry.
 */
export function defaultRange(entries: Span[], running: Span | null, nowMs: number) {
  const floor = (ms: number) => Math.floor(ms / MINUTE) * MINUTE;
  const ceil = (ms: number) => Math.ceil(ms / MINUTE) * MINUTE;
  const end = running ? floor(Date.parse(running.start_at)) : floor(nowMs);
  const lastStop = Math.max(
    0,
    ...entries.map((e) => (e.stop_at ? Date.parse(e.stop_at) : 0)).filter((ms) => ms <= end),
  );

  let start = lastStop ? ceil(lastStop) : end - 30 * MINUTE;
  // A gap of many hours is probably not one piece of work; offer the last half hour.
  if (end - start > 8 * 60 * MINUTE) start = end - 30 * MINUTE;
  if (end - start >= MINUTE) return { start, end };
  const after = ceil(lastStop || nowMs);
  return { start: after, end: after + 30 * MINUTE };
}
